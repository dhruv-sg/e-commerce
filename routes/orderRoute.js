const express = require('express');
const router = express.Router();
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const { generateJWT, generateOneTimeToken, adminOnly, staffOnly, authMiddleware } = require('../auth')
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { sendEmail } = require('../utils/emailService');
const { orderConfirmationTemplate, orderStatusUpdateTemplate } = require('../utils/emailTemplates');

const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    console.error("CRITICAL: Razorpay keys missing in process.env");
  }

  return new Razorpay({
    key_id: key_id,
    key_secret: key_secret,
  });
};

// Create new order
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { orderItems, shippingAddress, paymentMethod, promoCode, pendingOrderId } = req.body;

    console.log(`--- New Order Request ---`);
    console.log(`Payment Method: ${paymentMethod}`);
    console.log(`Promo Code: ${promoCode || 'None'}`);
    console.log(`Auth User: ${req.user ? req.user.email : 'None'}`);

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ error: 'No order items' });
    }

    // --- HANDLE ABANDONED ONLINE PAYMENT ORDERS ---

    // 1. If frontend explicitly passes the old pending order ID, delete it
    if (pendingOrderId) {
      const mongoose = require('mongoose');
      if (mongoose.isValidObjectId(pendingOrderId)) {
        await Order.deleteOne(
          { _id: pendingOrderId, user: req.user.id, status: 'PENDING_PAYMENT' }
        );
        console.log(`Deleted stale pending order: ${pendingOrderId}`);
      }
    }

    // 2. Auto-cleanup: delete any PENDING_PAYMENT orders from this user older than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    await Order.deleteMany(
      {
        user: req.user.id,
        status: 'PENDING_PAYMENT',
        createdAt: { $lt: thirtyMinutesAgo }
      }
    );

    const finalItems = [];
    let subTotal = 0;

    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json({ error: `Product ${item.product} not found` });

      let itemPrice = product.discountPrice || product.price;
      let itemImage = (product.images && product.images.length > 0) ? product.images[0] : null;

      let variantId = item.variant || product._id;
      let selectedVariant = null;

      if (item.variant && item.variant.toString() !== product._id.toString()) {
        selectedVariant = product.variants.find(v => v._id.toString() === item.variant.toString());
      }
      else if (item.color || item.size) {
        selectedVariant = product.variants.find(v =>
          (!item.color || v.color === item.color) &&
          (!item.size || v.size === item.size)
        );
      }

      if (selectedVariant) {
        variantId = selectedVariant._id;
        if (selectedVariant.stock < item.quantity) {
          return res.status(400).json({ error: `Not enough stock for ${product.name}` });
        }
        itemPrice = selectedVariant.discountPrice || selectedVariant.price || itemPrice;
        if (selectedVariant.images && selectedVariant.images.length > 0) {
          itemImage = selectedVariant.images[0];
        }
      } else if (product.variants.length > 0 && (item.variant || item.color || item.size)) {
        return res.status(400).json({ error: `Specific variant not found for ${product.name}` });
      } else {
        if (product.stock < item.quantity) {
          return res.status(400).json({ error: `Not enough stock for ${product.name}` });
        }
      }

      finalItems.push({
        product: product._id,
        variant: variantId,
        name: product.name,
        price: itemPrice,
        image: itemImage,
        color: item.color || (selectedVariant ? selectedVariant.color : null),
        size: item.size || (selectedVariant ? selectedVariant.size : null),
        quantity: item.quantity
      });

      subTotal += itemPrice * item.quantity;
    }

    // --- PROMO CODE LOGIC ---
    let discountAmount = 0;
    let appliedPromoCode = null;

    if (promoCode) {
      const PromoCode = require('../models/promoCodeModel');
      const promo = await PromoCode.findOne({ code: promoCode.toUpperCase(), isActive: true });

      if (promo) {
        const now = new Date();
        const isDateValid = now >= promo.startDate && now <= promo.expiryDate;
        const reachedUsageLimit = promo.usageLimit && promo.usedCount >= promo.usageLimit;
        const userUsage = promo.usersUsed.find(u => u.user.toString() === req.user.id.toString());
        const reachedPerUserLimit = userUsage && userUsage.count >= promo.perUserLimit;

        if (isDateValid && !reachedUsageLimit && !reachedPerUserLimit && subTotal >= promo.minOrderAmount) {

          // Calculate eligible subtotal (only restricted items, or full cart if no restrictions)
          const hasRestrictions = promo.applicableProducts.length > 0 || promo.applicableCategories.length > 0;
          let eligibleSubtotal = subTotal;

          if (hasRestrictions) {
            eligibleSubtotal = 0;
            for (const item of finalItems) {
              const isProductMatch = promo.applicableProducts.some(
                p => p.toString() === item.product.toString()
              );
              // item.category not stored on order items, match by product only here
              if (isProductMatch) {
                eligibleSubtotal += item.price * item.quantity;
              }
            }
          }

          // Discount applied only to eligible subtotal
          if (promo.discountType === 'percentage') {
            discountAmount = eligibleSubtotal * (promo.discountValue / 100);
            if (promo.maxDiscount && discountAmount > promo.maxDiscount) {
              discountAmount = promo.maxDiscount;
            }
          } else {
            discountAmount = Math.min(promo.discountValue, eligibleSubtotal);
          }
          appliedPromoCode = promo.code;
        }
      }
    }

    const finalTotal = Math.max(0, subTotal - discountAmount);

    const order = new Order({
      user: req.user.id,
      items: finalItems,
      shippingAddress,
      paymentMethod,
      subTotal: subTotal,
      discountAmount: discountAmount,
      promoCode: appliedPromoCode,
      total: finalTotal,
      status: paymentMethod === 'Online' ? 'PENDING_PAYMENT' : 'Processing',
      paymentStatus: 'UNPAID'
    });

    // 1. Create Razorpay Order if payment method is Online
    if (paymentMethod === 'Online') {
      const options = {
        amount: Math.round(finalTotal * 100), // Use final total
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      };

      const razorpayOrder = await getRazorpayInstance().orders.create(options);
      order.razorpayOrderId = razorpayOrder.id;
    }

    const createdOrder = await order.save();

    // Update Promo Stats — only for COD (confirmed immediately)
    // For Online, we update after successful payment verification to prevent quota loss on abandoned payments
    if (appliedPromoCode && paymentMethod === 'COD') {
      const PromoCode = require('../models/promoCodeModel');
      const promo = await PromoCode.findOne({ code: appliedPromoCode });
      if (promo) {
          promo.usedCount += 1;
          const userIdx = promo.usersUsed.findIndex(u => u.user.toString() === req.user.id.toString());
          if (userIdx > -1) {
              promo.usersUsed[userIdx].count += 1;
          } else {
              promo.usersUsed.push({ user: req.user.id, count: 1 });
          }
          await promo.save();
      }
    }

    // Send confirmation email for COD
    if (paymentMethod === 'COD') {
      try {
        const { Settings } = require('../models/settingsModel');
        const settings = await Settings.findOne();
        const brandName = settings?.brandName || "Yogi Fashion";
        await sendEmail(req.user.email, `Order Confirmed! 🎉 - ${brandName}`, orderConfirmationTemplate(order, settings));
      } catch (emailErr) {
        console.error("Failed to send COD confirmation email:", emailErr);
      }
    }

    // 2. Only update stock for COD immediately.
    // For Online, we update after successful payment verification.
    if (paymentMethod === 'COD') {
      for (const item of finalItems) {
        if (item.product.toString() !== item.variant.toString()) {
          await Product.updateOne(
            { _id: item.product, "variants._id": item.variant },
            { $inc: { "variants.$.stock": -item.quantity } }
          );
        } else {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
        }
      }
    }

    res.status(201).json(createdOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Verify Payment
router.post('/verify-payment', authMiddleware, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    console.log(`--- Payment Verification Attempt ---`);
    console.log(`Razorpay Order ID: ${razorpay_order_id}`);

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
      if (!order) {
        console.error(`❌ Verification Fail: Order with Razorpay ID ${razorpay_order_id} not found in DB.`);
        return res.status(404).json({ error: "Order not found" });
      }

      order.paymentStatus = 'PAID';
      order.status = 'Processing';
      await order.save();

      // Send confirmation email after payment verified
      try {
        const { Settings } = require('../models/settingsModel');
        const settings = await Settings.findOne();
        const brandName = settings?.brandName || "Yogi Fashion";
        await sendEmail(req.user.email, `Payment Received & Order Confirmed! 🎉 - ${brandName}`, orderConfirmationTemplate(order, settings));
      } catch (emailErr) {
        console.error("Failed to send Online confirmation email:", emailErr);
      }

      // Update stock after successful payment
      for (const item of order.items) {
        if (item.product.toString() !== item.variant.toString()) {
          await Product.updateOne(
            { _id: item.product, "variants._id": item.variant },
            { $inc: { "variants.$.stock": -item.quantity } }
          );
        } else {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
        }
      }

      // Update Promo Stats for Online payment — only now that payment is confirmed
      if (order.promoCode) {
        try {
          const PromoCode = require('../models/promoCodeModel');
          const promo = await PromoCode.findOne({ code: order.promoCode });
          if (promo) {
            promo.usedCount += 1;
            const userId = order.user.toString();
            const userIdx = promo.usersUsed.findIndex(u => u.user.toString() === userId);
            if (userIdx > -1) {
              promo.usersUsed[userIdx].count += 1;
            } else {
              promo.usersUsed.push({ user: order.user, count: 1 });
            }
            await promo.save();
          }
        } catch (promoErr) {
          console.error('Failed to update promo stats after payment:', promoErr);
        }
      }

      console.log(`✅ Payment Verified Successfully for Order: ${order._id}`);
      res.status(200).json({ success: true, message: "Payment verified successfully" });
    } else {
      console.error(`❌ Verification Fail: Signature Mismatch.`);
      console.log(`Expected: ${expectedSignature}`);
      console.log(`Received: ${razorpay_signature}`);
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (err) {
    console.error(`❌ CRITICAL: Payment Verification Error:`, err.message);
    res.status(500).json({ error: "Payment verification failed" });
  }
});

// Get logged in user orders
router.get('/myorders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all orders with pagination and filtering
router.get('/admin/all', authMiddleware, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { status, paymentMethod } = req.query;
    const query = {};

    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    const [orders, totalOrders] = await Promise.all([
      Order.find(query)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query)
    ]);

    res.json({
      orders,
      totalOrders,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
      limit
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single order for logged in user
router.get('/myorders/:id', authMiddleware, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Get order by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const isPartner = req.user.role === 'partner';
    const isAdmin = req.user.role === 'admin';
    const isOwner = order.user._id.toString() === req.user.id;

    if (!isOwner && !isAdmin && !isPartner) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin/Partner: Update order status
router.put('/status', authMiddleware, staffOnly, async (req, res) => {
  try {
    const { orderId, status, paymentStatus, otp } = req.body;

    if (!orderId) return res.status(400).json({ error: 'orderId is required in body' });

    const mongoose = require('mongoose');
    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ error: 'Invalid orderId' });
    }

    const order = await Order.findById(orderId).populate('user', 'email');
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Delivery Partner Verification Logic
    if (status === 'Delivered' && req.user.role === 'partner') {
      if (!otp) return res.status(400).json({ error: 'Delivery OTP is required for partners' });
      if (otp !== order.deliveryOtp) {
        return res.status(400).json({ error: 'Invalid Delivery OTP' });
      }
    }

    // Generate OTP when shipping
    if (status === 'Shipped') {
      // Only generate if not already exists (prevent overwriting if status updated multiple times)
      if (!order.deliveryOtp) {
        order.deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();
      }
    }

    if (status) order.status = status;

    // COD Auto-Payment Logic: If COD and delivered, mark as PAID
    if (order.status === 'Delivered' && order.paymentMethod === 'COD') {
      order.paymentStatus = 'PAID';
    }

    // Overwrite with manually provided status if present
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();

    // Send status update email
    if (status) {
      try {
        const { Settings } = require('../models/settingsModel');
        const settings = await Settings.findOne();
        const brandName = settings?.brandName || "Yogi Fashion";
        
        // Pass OTP to email template if it exists
        await sendEmail(
          order.user.email, 
          `Order Status Update: ${status} - ${brandName}`, 
          orderStatusUpdateTemplate(order, status, settings, order.deliveryOtp)
        );
      } catch (emailErr) {
        console.error("Failed to send status update email:", emailErr);
      }
    }

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;