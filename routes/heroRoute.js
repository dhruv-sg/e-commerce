const express = require('express');
const router = express.Router();
const Hero = require('../models/heroModel');
const { adminOnly, authMiddleware } = require('../auth');
const { upload } = require('../config/cloudinary');

// --- USER ROUTES ---

/**
 * @route   GET /hero
 * @desc    Get all active hero slides for the frontend carousel
 */
router.get('/', async (req, res) => {
    try {
        const slides = await Hero.find({ isActive: true }).sort({ createdAt: -1 });
        res.json(slides);
    } catch (err) {
        console.error("Hero GET error:", err);
        res.status(500).json({ error: 'Server error fetching hero slides' });
    }
});


// --- ADMIN ROUTES ---

/**
 * @route   POST /hero/admin
 * @desc    Create a new hero slide (Admin Only)
 */
router.post('/admin', authMiddleware, adminOnly, upload.single('image'), async (req, res) => {
    try {
        const { title, subtitle } = req.body;
        const image = req.file ? req.file.path : '';

        if (!title || !subtitle || !image) {
            return res.status(400).json({ error: "Title, Subtitle, and Image are required" });
        }

        const newSlide = new Hero({ title, subtitle, image });
        await newSlide.save();
        res.status(201).json(newSlide);
    } catch (err) {
        console.error("Hero POST Admin error:", err);
        res.status(400).json({ error: err.message });
    }
});

/**
 * @route   GET /hero/admin
 * @desc    Get all hero slides for the admin management table
 */
router.get('/admin', authMiddleware, adminOnly, async (req, res) => {
    try {
        const slides = await Hero.find().sort({ createdAt: -1 });
        res.json(slides);
    } catch (err) {
        console.error("Hero GET Admin error:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   PUT /hero/admin/:id
 * @desc    Update a hero slide (Admin Only)
 */
router.put('/admin/:id', authMiddleware, adminOnly, upload.single('image'), async (req, res) => {
    try {
        const { title, subtitle, isActive } = req.body;
        const slide = await Hero.findById(req.params.id);

        if (!slide) return res.status(404).json({ error: "Hero slide not found" });

        if (title) slide.title = title;
        if (subtitle) slide.subtitle = subtitle;
        if (isActive !== undefined) slide.isActive = isActive;
        if (req.file) slide.image = req.file.path;

        await slide.save();
        res.json(slide);
    } catch (err) {
        console.error("Hero PUT Admin error:", err);
        res.status(400).json({ error: err.message });
    }
});

/**
 * @route   DELETE /hero/admin/:id
 * @desc    Delete a hero slide (Admin Only)
 */
router.delete('/admin/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const slide = await Hero.findByIdAndDelete(req.params.id);
        if (!slide) return res.status(404).json({ error: "Hero slide not found" });
        res.json({ message: "Hero slide deleted successfully" });
    } catch (err) {
        console.error("Hero DELETE Admin error:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
