const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    // Global switch for email services
    isEmailEnabled: {
        type: Boolean,
        default: true
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
