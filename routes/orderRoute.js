const express = require('express');
const router = express.Router();
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const { generateJWT, generateOneTimeToken, adminOnly, authMiddleware } = require('../auth')
const Razorpay = require('razorpay');
const crypto = require('crypto');

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
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Not enough stock for ${product.name}` });
      }

      // Calculate total using database price (prefer discountPrice)
      const itemPrice = product.discountPrice || product.price;
      finalItems.push({
        product: product._id,
        name: product.name,
        price: itemPrice,
        image: product.images[0],
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

    // 2. Only update stock for COD immediately. 
    // For Online, we update after successful payment verification.
    if (paymentMethod === 'COD') {
      for (const item of orderItems) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
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

      // 3. Update stock after successful payment
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
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

// Get order by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
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

// Admin: Update order status
router.put('/:id/status', authMiddleware, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.status = req.body.status || order.status;
    if (req.body.paymentStatus) order.paymentStatus = req.body.paymentStatus;

    await order.save();
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;