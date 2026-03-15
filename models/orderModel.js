const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    variant: {
        type: mongoose.Schema.Types.ObjectId,
    },
    name: String, // Capture name at order time
    price: {      // Capture price at order time
        type: Number,
        required: true
    },
    image: String, // Capture image URL at order time
    color: String, // Added variant color
    size: String,  // Added variant size
    quantity: {
        type: Number,
        required: true,
        min: 1
    }
});

const OrderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [OrderItemSchema],
    shippingAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zip: { type: String, required: true },
        phone: { type: String, required: true }
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'Online'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['UNPAID', 'PAID', 'FAILED', 'REFUNDED'],
        default: 'UNPAID'
    },
    razorpayOrderId: {
        type: String
    },
    total: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING_PAYMENT', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'PENDING_PAYMENT'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Order', OrderSchema);
