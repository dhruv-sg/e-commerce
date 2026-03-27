const express = require('express');
const router = express.Router();
const { adminOnly, authMiddleware } = require('../auth');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');

// GET /admin/dashboard
router.get('/dashboard', authMiddleware, adminOnly, async (req, res) => {
    try {
        const [
            totalProducts,
            totalOrders,
            totalUsers,
            ordersByStatus,
            ordersByPaymentStatus,
            ordersByPaymentMethod,
            revenueData,
            recentOrders,
            lowStockProducts,
            topSellingProducts,
        ] = await Promise.all([

            // 1. Total product count
            Product.countDocuments(),

            // 2. Total order count
            Order.countDocuments(),

            // 3. Total user count
            User.countDocuments(),

            // 4. Order count grouped by status
            Order.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
                { $project: { status: '$_id', count: 1, _id: 0 } }
            ]),

            // 5. Order count grouped by payment status
            Order.aggregate([
                { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
                { $project: { paymentStatus: '$_id', count: 1, _id: 0 } }
            ]),

            // 6. Order count grouped by payment method (COD vs Online)
            Order.aggregate([
                { $group: { _id: '$paymentMethod', count: { $sum: 1 } } },
                { $project: { paymentMethod: '$_id', count: 1, _id: 0 } }
            ]),

            // 7. Total revenue (from paid orders only)
            Order.aggregate([
                { $match: { paymentStatus: 'PAID' } },
                { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
                { $project: { _id: 0, totalRevenue: 1 } }
            ]),

            // 8. Recent 5 orders
            Order.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('user', 'name email')
                .select('user total status paymentStatus paymentMethod createdAt'),

            // 9. Low stock products (stock <= 10)
            Product.find({ stock: { $lte: 10 } })
                .select('name brand stock hasVariant')
                .sort({ stock: 1 })
                .limit(10),

            // 10. Top selling products (by total quantity sold across all orders)
            Order.aggregate([
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.product',
                        totalSold: { $sum: '$items.quantity' },
                        productName: { $first: '$items.name' },
                        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                    }
                },
                { $sort: { totalSold: -1 } },
                { $limit: 5 },
                {
                    $project: {
                        _id: 1,
                        productName: 1,
                        totalSold: 1,
                        revenue: 1
                    }
                }
            ]),
        ]);

        res.json({
            overview: {
                totalProducts,
                totalOrders,
                totalUsers,
                totalRevenue: revenueData[0]?.totalRevenue || 0,
            },
            orders: {
                byStatus: ordersByStatus,
                byPaymentStatus: ordersByPaymentStatus,
                byPaymentMethod: ordersByPaymentMethod,
            },
            recentOrders,
            lowStockProducts,
            topSellingProducts,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /admin/customers - Get all customers with their order counts
router.get('/customers', authMiddleware, adminOnly, async (req, res) => {
    try {
        const customers = await User.aggregate([
            { $match: { role: 'user' } },
            {
                $lookup: {
                    from: 'orders', // The collection name for orders
                    localField: '_id',
                    foreignField: 'user',
                    as: 'orders'
                }
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                    image: 1,
                    role: 1,
                    createdAt: 1,
                    orderCount: { $size: '$orders' }
                }
            },
            { $sort: { orderCount: -1 } } // Sort by customers with most orders first
        ]);

        res.json(customers);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /admin/customer-orders/:userId - Get all orders for a specific customer
router.get('/customer-orders/:userId', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { userId } = req.params;
        const mongoose = require('mongoose');

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ error: 'Invalid User ID' });
        }

        const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

const { Settings } = require('../models/settingsModel');

// GET /admin/settings - Get current global settings
router.get('/settings', authMiddleware, adminOnly, async (req, res) => {
    try {
        const settings = await Settings.findOne();
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /admin/settings/email - Toggle global email service
router.put('/settings/email', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { isEmailEnabled } = req.body;
        if (typeof isEmailEnabled !== 'boolean') {
            return res.status(400).json({ error: 'isEmailEnabled must be a boolean' });
        }

        const settings = await Settings.findOneAndUpdate({}, { isEmailEnabled }, { new: true, upsert: true });
        res.json(settings);
        console.log(`Global Email Service sets to: ${isEmailEnabled}`);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
