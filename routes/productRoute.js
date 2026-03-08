const express = require('express');
const router = express.Router();
const { generateJWT, generateOneTimeToken, adminOnly, authMiddleware } = require('../auth')
const Product = require('../models/productModel');
const { upload } = require('../config/cloudinary');

router.post('/', authMiddleware, adminOnly, upload.array('images', 5), async (req, res) => {
  try {
    const { name, description, price, discountPrice, category, brand, stock } = req.body;

    // Get URLs of uploaded images from Cloudinary
    const imageUrls = req.files.map(file => file.path);

    const p = new Product({
      name,
      description,
      price,
      discountPrice,
      category,
      brand,
      images: imageUrls,
      stock
    });

    await p.save();
    res.status(201).json(p);
    console.log("product added with images");
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate('category', 'name slug').lean();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


//  to Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name slug');
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router