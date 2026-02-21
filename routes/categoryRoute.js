const express = require('express');
const router = express.Router();
const Category = require('../models/categoryModel');
const { adminOnly, authMiddleware } = require('../auth');

// Create a new category (Admin only)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { name, slug, image } = req.body;
        const category = new Category({ name, slug, image });
        await category.save();
        res.status(201).json(category);
        console.log("Category added");
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

// Get all categories
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json(categories);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get a single category by slug or ID
router.get('/:slug', async (req, res) => {
    try {
        const category = await Category.findOne({ slug: req.params.slug });
        if (!category) {
            // Fallback to ID if not found by slug
            const categoryById = await Category.findById(req.params.slug).catch(() => null);
            if (!categoryById) return res.status(404).json({ error: 'Category not found' });
            return res.json(categoryById);
        }
        res.json(category);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
