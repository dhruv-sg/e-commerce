const express = require('express');
const router = express.Router();
const Subscriber = require('../models/subscriberModel');
const { sendEmail } = require('../utils/emailService');

// POST /subscribe - Join the newsletter
router.post('/', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const existingSubscriber = await Subscriber.findOne({ email: email.toLowerCase() });

        if (existingSubscriber) {
            return res.status(400).json({ error: 'Email is already subscribed' });
        }

        const newSubscriber = new Subscriber({ email });
        await newSubscriber.save();

        const { Settings } = require('../models/settingsModel');
        const settings = await Settings.findOne();
        const brandName = settings?.brandName || "Yogi Fashion";

        // Send a "Thank You" email
        try {
            const { welcomeNewsletterTemplate } = require('../utils/emailTemplates');
            await sendEmail(email, `Welcome to ${brandName}! ✨`, welcomeNewsletterTemplate(settings));
        } catch (emailErr) {
            console.error("Welcome email failed to send:", emailErr);
            // We don't return an error here so that the subscription still "works" database-wise
        }

        res.status(200).json({ success: true, message: 'Subcribed successfully! Check your email for a warm welcome.' });
    } catch (err) {
        console.error("Subscription Error:", err);
        res.status(500).json({ error: 'Server error during subscription' });
    }
});

module.exports = router;
