const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    // Global switch for email services
    isEmailEnabled: {
        type: Boolean,
        default: true
    },
    // Business Metadata for Emails/Invoices
    brandName: {
        type: String,
        default: "Yogi Fashion"
    },
    address: {
        type: String,
        default: "123 Fashion Street, Mumbai, Maharashtra 400001"
    },
    gstin: {
        type: String,
        default: ""
    },
    mobileNumber: {
        type: String,
        default: "+91-9876543210"
    }
}, { timestamps: true });

const Settings = mongoose.model('Settings', settingsSchema);

// Ensure a single settings document exists
const initializeSettings = async () => {
    try {
        const count = await Settings.countDocuments();
        if (count === 0) {
            await Settings.create({ isEmailEnabled: true });
            console.log("Global Settings initialized");
        }
    } catch (err) {
        console.error("Error initializing settings:", err);
    }
};

module.exports = { Settings, initializeSettings };
