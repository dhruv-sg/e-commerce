const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    hasVariant: {
        type: String,
        enum: ['Yes', 'No'],
        default: 'No'
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    discountPrice: {
        type: Number,
        default: 0
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    brand: {
        type: String,
        required: true
    },
    images: [
        {
            type: String,
        }
    ],
    variants: [
        {
            color: String,
            size: String,
            price: Number,
            discountPrice: Number,
            stock: Number,
            images: [String]
        }
    ],
    stock: {
        type: Number,
        default: 0
    },
    ratings: {
        type: Number,
        default: 0
    },
    numReviews: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Product', ProductSchema);
