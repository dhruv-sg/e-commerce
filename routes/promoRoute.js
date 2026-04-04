const express = require('express');
const router = express.Router();
const PromoCode = require('../models/promoCodeModel');
const { authMiddleware, adminOnly } = require('../auth');

// --- ADMIN ROUTES ---

/**
 * @route   POST /promo/admin
 * @desc    Create a new promo code (Admin Only)
 */
router.post('/admin', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { code, discountType, discountValue, startDate, expiryDate } = req.body;

        // Validate required fields first
        if (!code) return res.status(400).json({ error: "code is required" });
        if (!discountType) return res.status(400).json({ error: "discountType is required ('percentage' or 'fixed')" });
        if (!discountValue) return res.status(400).json({ error: "discountValue is required" });
        if (!startDate) return res.status(400).json({ error: "startDate is required" });
        if (!expiryDate) return res.status(400).json({ error: "expiryDate is required" });

        const exists = await PromoCode.findOne({ code: code.toUpperCase() });
        if (exists) return res.status(400).json({ error: "Promo code already exists" });

        const newPromo = new PromoCode({
            ...req.body,
            code: code.toUpperCase()
        });
        await newPromo.save();
        res.status(201).json(newPromo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /promo/admin
 * @desc    Get all promo codes with stats (Admin Only)
 */
router.get('/admin', authMiddleware, adminOnly, async (req, res) => {
    try {
        const promos = await PromoCode.find().sort({ createdAt: -1 });
        res.json(promos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   PUT /promo/admin/:id
 * @desc    Update a promo code (Admin Only)
 */
router.put('/admin/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const updatedPromo = await PromoCode.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedPromo) return res.status(404).json({ error: "Promo code not found" });
        res.json(updatedPromo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   DELETE /promo/admin/:id
 * @desc    Delete a promo code (Admin Only)
 */
router.delete('/admin/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const deletedPromo = await PromoCode.findByIdAndDelete(req.params.id);
        if (!deletedPromo) return res.status(404).json({ error: "Promo code not found" });
        res.json({ message: "Promo code deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   PATCH /promo/admin/:id/toggle
 * @desc    Activate or Deactivate a promo code (Admin Only)
 */
router.patch('/admin/:id/toggle', authMiddleware, adminOnly, async (req, res) => {
    try {
        const promo = await PromoCode.findById(req.params.id);
        if (!promo) return res.status(404).json({ error: "Promo code not found" });

        promo.isActive = !promo.isActive;
        await promo.save();
        res.json({ message: `Promo code ${promo.isActive ? 'activated' : 'deactivated'}`, promo });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// --- USER ROUTES ---

/**
 * @route   GET /promo
 * @desc    Get all active promo codes for users
 */
router.get('/', async (req, res) => {
    try {
        const now = new Date();
        const promos = await PromoCode.find({
            isActive: true,
            startDate: { $lte: now },
            expiryDate: { $gte: now }
        })
        .select('code description expiryDate minOrderAmount maxDiscount perUserLimit applicableProducts applicableCategories')
        .populate('applicableProducts', 'name slug')
        .populate('applicableCategories', 'name slug')
        .lean();

        res.json(promos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /promo/validate
 * @desc    Validate a promo code for the user cart
 */
router.post('/validate', authMiddleware, async (req, res) => {
    try {
        const { code, totalAmount, cartItems } = req.body;
        const userId = req.user.id;

        const promo = await PromoCode.findOne({ code: code.toUpperCase() });

        if (!promo) return res.status(404).json({ error: "Invalid promo code" });
        if (!promo.isActive) return res.status(400).json({ error: "Promo code is inactive" });

        // Date Validation
        const now = new Date();
        if (now < promo.startDate) return res.status(400).json({ error: "This promo has not started yet" });
        if (now > promo.expiryDate) return res.status(400).json({ error: "This promo has expired" });

        // Global Usage Limit
        if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
            return res.status(400).json({ error: "Max uses reached for this promo" });
        }

        // Per User Limit
        const userUsage = promo.usersUsed.find(u => u.user.toString() === userId.toString());
        if (userUsage && userUsage.count >= promo.perUserLimit) {
            return res.status(400).json({ error: "You have already reached the limit for this promo code" });
        }

        // Min Order Amount
        if (totalAmount < promo.minOrderAmount) {
            return res.status(400).json({ error: `Minimum order amount for this promo is ₹${promo.minOrderAmount}` });
        }

        // --- PRODUCT/CATEGORY RESTRICTION + ELIGIBLE SUBTOTAL CALCULATION ---
        let eligibleSubtotal = totalAmount; // default: whole cart is eligible
        const hasRestrictions = promo.applicableProducts.length > 0 || promo.applicableCategories.length > 0;

        if (hasRestrictions) {
            eligibleSubtotal = 0;
            let hasEligibleItem = false;

            for (const item of cartItems) {
                const isProductMatch = promo.applicableProducts.some(
                    p => p.toString() === item.product.toString()
                );
                const isCategoryMatch = promo.applicableCategories.some(
                    c => c.toString() === (item.category || '').toString()
                );

                if (isProductMatch || isCategoryMatch) {
                    // Only add this item's value to eligible subtotal
                    eligibleSubtotal += (item.price || 0) * (item.quantity || 1);
                    hasEligibleItem = true;
                }
            }

            if (!hasEligibleItem) {
                return res.status(400).json({ error: "This promo code is not applicable to any item in your cart" });
            }
        }

        // Min order amount check is against total cart value
        if (totalAmount < promo.minOrderAmount) {
            return res.status(400).json({ error: `Minimum order amount for this promo is ₹${promo.minOrderAmount}` });
        }

        // --- DISCOUNT CALCULATION (only on eligible items) ---
        let discountAmount = 0;
        if (promo.discountType === 'percentage') {
            discountAmount = eligibleSubtotal * (promo.discountValue / 100);
            if (promo.maxDiscount && discountAmount > promo.maxDiscount) {
                discountAmount = promo.maxDiscount;
            }
        } else {
            // Fixed discount — cap it so it doesn't exceed eligible subtotal
            discountAmount = Math.min(promo.discountValue, eligibleSubtotal);
        }

        const finalAmount = Math.max(0, totalAmount - discountAmount);

        res.json({
            valid: true,
            discountAmount: Math.round(discountAmount * 100) / 100,
            finalAmount: Math.round(finalAmount * 100) / 100,
            eligibleSubtotal,
            code: promo.code,
            description: promo.description
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
