const nodemailer = require('nodemailer');
const { Settings } = require('../models/settingsModel');

const sendEmail = async (to, subject, html) => {
    try {
        const settings = await Settings.findOne();
        if (settings && !settings.isEmailEnabled) {
            console.log("Email Service skipped: Globally disabled in settings.");
            return { message: "Email globally disabled" };
        }

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false, // true for 465, false for 587
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            tls: {
                rejectUnauthorized: false,
            },
            family: 4, // Force IPv4
        });

        const mailOptions = {
            from: `"YourStore" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.messageId} to ${to}`);
        return info;
    } catch (error) {
        console.error("Email Service Error:", error);
        throw error;
    }
};

module.exports = { sendEmail };
