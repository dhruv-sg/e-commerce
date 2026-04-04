const express = require('express');
const router = express.Router();
const { generateJWT, generateOneTimeToken, adminOnly, authMiddleware } = require('../auth')
const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const User = require('../models/userModel');
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


// GET /thumbnail/trending - returning most sold products as thumbnails
router.get('/thumbnail/trending', async (req, res) => {
  try {
    const trendingProducts = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalSold: { $sum: "$items.quantity" }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      {
        $project: {
          _id: "$productDetails._id",
          name: "$productDetails.name",
          brand: "$productDetails.brand",
          images: "$productDetails.images",
          price: "$productDetails.price",
          discountPrice: "$productDetails.discountPrice",
          totalSold: 1
        }
      }
    ]);
    res.json(trendingProducts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /thumbnail/batch - Fetch thumbnails for multiple product IDs (e.g., for Cart or Recent View)
router.post('/thumbnail/batch', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const products = await Product.find({ _id: { $in: ids } })
      .select('name brand images price discountPrice createdAt')
      .lean();

    // Optionally sort the results to match the order of IDs passed
    const productsMap = products.reduce((acc, p) => {
      acc[p._id.toString()] = p;
      return acc;
    }, {});

    const orderedProducts = ids
      .map(id => productsMap[id.toString()])
      .filter(p => p !== undefined);

    res.json(orderedProducts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /thumbnail - returning only name, brand, images, price, and discountPrice with pagination & sorting
router.get('/thumbnail', async (req, res) => {
  try {
    const { page = 1, limit = 10, sort, category } = req.query;

    const query = {};
    if (category) {
      query.category = category;
    }

    let sortOption = {};
    if (sort === 'lowToHigh') {
      sortOption = { price: 1 };
    } else if (sort === 'highToLow') {
      sortOption = { price: -1 };
    } else if (sort === 'newArrivals') {
      sortOption = { createdAt: -1 };
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .select('name brand images price discountPrice createdAt')
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Product.countDocuments(query)
    ]);

    res.json({
      products,
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /thumbnail/wishlist - returning thumbnails of wishlisted products
router.get('/thumbnail/wishlist', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('wishlist', 'name brand images price discountPrice');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user.wishlist);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /wishlist/:id - Add to wishlist
router.post('/wishlist/:id', authMiddleware, async (req, res) => {
  try {
    const productId = req.params.id;
    const mongoose = require('mongoose');
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ error: 'Invalid Product ID' });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    await User.findByIdAndUpdate(req.user.id, { $addToSet: { wishlist: productId } });
    res.json({ success: true, message: 'Added to wishlist' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// DELETE /wishlist/:id - Remove from wishlist
router.get('/wishlist/remove/:id', authMiddleware, async (req, res) => {
  try {
    const productId = req.params.id;
    const mongoose = require('mongoose');
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ error: 'Invalid Product ID' });
    }

    await User.findByIdAndUpdate(req.user.id, { $pull: { wishlist: productId } });
    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /search - Search products by name, brand, or category name
router.get('/search', async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchQuery = new RegExp(q, 'i');

    const products = await Product.aggregate([
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryDetails'
        }
      },
      {
        $match: {
          $or: [
            { name: searchQuery },
            { brand: searchQuery },
            { 'categoryDetails.name': searchQuery }
          ]
        }
      },
      {
        $project: {
          name: 1,
          brand: 1,
          images: 1,
          price: 1,
          discountPrice: 1,
          category: { $arrayElemAt: ['$categoryDetails', 0] }
        }
      },
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) }
    ]);

    const total = await Product.aggregate([
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryDetails'
        }
      },
      {
        $match: {
          $or: [
            { name: searchQuery },
            { brand: searchQuery },
            { 'categoryDetails.name': searchQuery }
          ]
        }
      },
      { $count: 'total' }
    ]);

    res.json({
      products,
      total: total.length > 0 ? total[0].total : 0,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /similar/:id - Returning similar products based on the current product's category
router.get('/similar/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const mongoose = require('mongoose');

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ error: 'Invalid Product ID' });
    }

    const currentProduct = await Product.findById(productId);
    if (!currentProduct) return res.status(404).json({ error: 'Product not found' });

    const similarProducts = await Product.find({
      category: currentProduct.category,
      _id: { $ne: productId } // Exclude current product
    })
      .select('name brand images price discountPrice')
      .limit(8)
      .lean();

    res.json(similarProducts);
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