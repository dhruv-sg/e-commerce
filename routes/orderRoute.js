const express = require('express');
const router = express.Router();
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const { generateJWT, generateOneTimeToken, adminOnly, authMiddleware } = require('../auth')
const OneTimeAction = require('../OneTimeAction');
const { v4: uuidv4 } = require('uuid');

// this will generate perchase token
router.post('/token/:productId', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // validy 5 min.

    const action = new OneTimeAction({
      user: req.user.id,
      actionType: 'purchase',
      product: productId,
      token,
      expiresAt,
    });

    await action.save();

    res.json({ token, expiresAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create token' });
  }
});

//Use token to puchase
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { token, quantity } = req.body;

    // validate token
    const action = await OneTimeAction.findOne({ token, used: false });
    if (!action) return res.status(400).json({ error: 'Invalid or already used token' });
    if (action.actionType !== 'purchase') return res.status(400).json({ error: 'Invalid action type' });
    if (action.expiresAt < Date.now()) return res.status(400).json({ error: 'Token expired' });

    // check product
    const product = await Product.findById(action.product);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stock < quantity) return res.status(400).json({ error: 'Not enough stock' });

    // calculate total price
    const total = product.price * quantity;

    // create order
    const order = new Order({
      user: req.user.id,
      items: [{ product: product._id, quantity }],
      total
    });
    await order.save();

    // update stock
    product.stock -= quantity;
    await product.save();

    // mark token as used
    action.used = true;
    await action.save();

    res.status(201).json({ message: 'Order created successfully', order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Purchase failed' });
  }
});

router.get('/all', authMiddleware, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.product', 'title price')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch all orders' });
  }
});



module.exports = router