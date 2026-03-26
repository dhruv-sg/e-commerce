const express = require('express');
const router = express.Router();
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const { generateJWT, generateOneTimeToken, adminOnly, authMiddleware } = require('../auth')
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
    const { orderItems, shippingAddress, paymentMethod } = req.body;

    console.log(`--- New Order Request ---`);
    console.log(`Payment Method: ${paymentMethod}`);
    console.log(`Auth User: ${req.user ? req.user.email : 'None'}`);

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ error: 'No order items' });
    }

    const finalItems = [];
    let calculatedTotal = 0;

    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json({ error: `Product ${item.product} not found` });

      let itemPrice = product.discountPrice || product.price;
      let itemImage = (product.images && product.images.length > 0) ? product.images[0] : null;

      let variantId = item.variant || product._id;
      let selectedVariant = null;

      // 1. Try finding by explicit variant ID first
      if (item.variant && item.variant.toString() !== product._id.toString()) {
        selectedVariant = product.variants.find(v => v._id.toString() === item.variant.toString());
      }
      // 2. Fallback to color/size matching if ID not provided or not found
      else if (item.color || item.size) {
        selectedVariant = product.variants.find(v =>
          (!item.color || v.color === item.color) &&
          (!item.size || v.size === item.size)
        );
      }

      if (selectedVariant) {
        variantId = selectedVariant._id;
        if (selectedVariant.stock < item.quantity) {
          return res.status(400).json({ error: `Not enough stock for ${product.name} (${selectedVariant.color || ''} ${selectedVariant.size || ''})` });
        }
        itemPrice = selectedVariant.discountPrice || selectedVariant.price || itemPrice;
        if (selectedVariant.images && selectedVariant.images.length > 0) {
          itemImage = selectedVariant.images[0];
        }
      } else if (product.variants.length > 0 && (item.variant || item.color || item.size)) {
        return res.status(400).json({ error: `Specific variant not found for ${product.name}` });
      } else {
        // No variant selected/found, check global stock
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

      calculatedTotal += itemPrice * item.quantity;
    }

    const order = new Order({
      user: req.user.id,
      items: finalItems,
      shippingAddress,
      paymentMethod,
      total: calculatedTotal,
      status: paymentMethod === 'Online' ? 'PENDING_PAYMENT' : 'Processing',
      paymentStatus: 'UNPAID'
    });

    // 1. Create Razorpay Order if payment method is Online
    if (paymentMethod === 'Online') {
      const options = {
        amount: calculatedTotal * 100, // Razorpay works in paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      };

      const razorpayOrder = await getRazorpayInstance().orders.create(options);
      order.razorpayOrderId = razorpayOrder.id;
    }

    const createdOrder = await order.save();

    // Send confirmation email for COD (Non-blocking background task)
    if (paymentMethod === 'COD') {
      sendEmail(req.user.email, 'Order Confirmed! 🎉 - Yogi Fashion', orderConfirmationTemplate(createdOrder))
        .catch(emailErr => console.error("Background Email Error (COD Confirmation):", emailErr));
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

      // Send confirmation email after payment verified (Non-blocking background task)
      sendEmail(req.user.email, 'Payment Received & Order Confirmed! 🎉 - Yogi Fashion', orderConfirmationTemplate(order))
        .catch(emailErr => console.error("Background Email Error (Online Confirmation):", emailErr));

      // 3. Update stock after successful payment
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

// Admin: Get all orders
router.get('/admin/all', authMiddleware, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find().populate('user', 'name email').sort({ createdAt: -1 });
    res.json(orders);
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

    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Update order status
router.put('/status', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { orderId, status, paymentStatus } = req.body;

    if (!orderId) return res.status(400).json({ error: 'orderId is required in body' });

    const mongoose = require('mongoose');
    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ error: 'Invalid orderId' });
    }

    const order = await Order.findById(orderId).populate('user', 'email');
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();

    // Send status update email (Non-blocking background task)
    if (status) {
      sendEmail(order.user.email, `Order Status Update: ${status} - Yogi Fashion`, orderStatusUpdateTemplate(order, status))
        .catch(emailErr => console.error("Background Email Error (Status Update):", emailErr));
    }

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;