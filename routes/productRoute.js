const express = require('express');
const router = express.Router();
const { generateJWT, generateOneTimeToken, adminOnly, authMiddleware } = require('../auth')
const Product = require('../models/productModel');
const { upload } = require('../config/cloudinary');

router.post('/', authMiddleware, adminOnly, upload.any(), async (req, res) => {
  try {
    const { name, description, price, discountPrice, category, brand, stock } = req.body;

    // 1. Process Files: Global images and Variant-specific images
    const globalImages = [];
    const variantImagesMap = {}; // { 1: [url, url], 2: [url] }

    req.files.forEach(file => {
      if (file.fieldname === 'images') {
        globalImages.push(file.path);
      } else {
        const match = file.fieldname.match(/^V(\d+)_images$/);
        if (match) {
          const vIdx = match[1];
          if (!variantImagesMap[vIdx]) variantImagesMap[vIdx] = [];
          variantImagesMap[vIdx].push(file.path);
        }
      }
    });

    // 2. Process Body: Group variant fields by their index (V1, V2, etc.)
    const variantsMap = {}; // { 1: { color: 'Red', size: 'M' } }

    Object.keys(req.body).forEach(key => {
      const match = key.match(/^V(\d+)_(.+)$/);
      if (match) {
        const vIdx = match[1];
        const field = match[2]; // color, size, price, stock
        if (!variantsMap[vIdx]) variantsMap[vIdx] = {};
        variantsMap[vIdx][field] = req.body[key];
      }
    });

    // 3. Convert variants map to array and attach images
    const parsedVariants = Object.keys(variantsMap).map(vIdx => {
      return {
        ...variantsMap[vIdx],
        images: variantImagesMap[vIdx] || []
      };
    });

    const isVariant = req.body.hasVariant === 'Yes';
    let finalPrice = price || 0;
    let finalDiscountPrice = discountPrice || 0;
    let finalStock = stock || 0;
    let finalImages = globalImages;

    // Use V1 data if variants exist and hasVariant is Yes
    if (isVariant && variantsMap["1"]) {
      finalPrice = variantsMap["1"].price || finalPrice;
      finalDiscountPrice = variantsMap["1"].discountPrice || finalDiscountPrice;
      finalStock = variantsMap["1"].stock || finalStock;
      finalImages = variantImagesMap["1"] || finalImages;
    }

    const p = new Product({
      hasVariant: req.body.hasVariant || 'No',
      name,
      description,
      price: finalPrice,
      discountPrice: finalDiscountPrice,
      category,
      brand,
      images: finalImages,
      stock: finalStock,
      variants: parsedVariants
    });

    await p.save();
    res.status(201).json(p);
    console.log("product added with pure form-data variants");
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

// GET /list - returning only name, price, images, and category
router.get('/list', async (req, res) => {
  try {
    const products = await Product.find()
      .select('hasVariant name price discountPrice images category variants')
      .populate('category', 'name slug')
      .lean();

    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /thumbnail - returning only name, brand, images, price, and discountPrice
router.get('/thumbnail', async (req, res) => {
  try {
    const products = await Product.find()
      .select('name brand images price discountPrice')
      .lean();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


//  to Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name slug').lean();
    if (!product) return res.status(404).json({ error: 'Not found' });

    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router