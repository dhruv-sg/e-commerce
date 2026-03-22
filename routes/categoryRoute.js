const express = require('express');
const router = express.Router();
const Category = require('../models/categoryModel');
const { adminOnly, authMiddleware } = require('../auth');
const { upload } = require('../config/cloudinary');

// Create a new category (Admin only)
router.post('/', authMiddleware, adminOnly, upload.single('image'), async (req, res) => {
    try {
        const { name, slug } = req.body;
        const image = req.file ? req.file.path : '';
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

// Update category (Admin only)
router.put('/update', authMiddleware, adminOnly, upload.single('image'), async (req, res) => {
    try {
        const { id, name, slug } = req.body;
        if (!id) return res.status(400).json({ error: "Category ID (id) is required in body" });

        const mongoose = require('mongoose');
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: "Invalid category ID" });
        }

        const category = await Category.findById(id);
        if (!category) return res.status(404).json({ error: "Category not found" });

        if (name) category.name = name;
        if (slug) category.slug = slug;
        if (req.file) category.image = req.file.path;

        await category.save();
        res.json(category);
        console.log("Category updated");
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});


module.exports = router;
