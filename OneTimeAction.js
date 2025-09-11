const mongoose = require('mongoose');

// onetime token only for one time action..
const OneTimeActionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    actionType: {
        type: String,
        enum: ['purchase', 'review'],
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    payload: {
        type: Object
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    used: {
        type: Boolean,
        default: false
    },
    expiresAt: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// document removed automatically fter expires
OneTimeActionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OneTimeAction', OneTimeActionSchema);
