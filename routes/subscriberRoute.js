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

        // Send a "Thank You" email
        try {
            const welcomeHtml = `
                <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 40px; text-align: center;">
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                        <h1 style="color: #004d40;">Experience brilliance.</h1>
                        <p style="font-size: 16px; color: #555;">Thank you for joining <strong>Yogi Fashion</strong>.</p>
                        <p style="font-size: 14px; color: #777; margin-bottom: 20px;">You are now part of our inner circle and will receive priority access to our signature collections and exclusive launch events.</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="font-size: 12px; color: #999;">If you didn't subscribe to this newsletter, you can safely ignore this email.</p>
                        <p style="font-size: 14px; font-weight: bold; color: #333; margin-top: 20px;">Stay tuned for more!</p>
                    </div>
                </div>
            `;
            await sendEmail(email, 'Welcome to Yogi Fashion! ✨', welcomeHtml);
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
