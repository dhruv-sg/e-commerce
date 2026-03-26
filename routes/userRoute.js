const express = require("express")
const router = express.Router()
const User = require("../models/userModel")
const { generateJWT, generateOneTimeToken, authMiddleware } = require('../auth')


const { upload } = require('../config/cloudinary');

router.post('/signup', upload.single('image'), async (req, res) => {
    try {
        const data = req.body;
        if (req.file) {
            data.image = req.file.path;
        }

        const newUser = new User(data)
        const response = await newUser.save()
        const payload = {
            id: response.id,
            email: response.email,
            role: response.role
        }
        const token = generateJWT(payload);

        console.log(" Data saved");
        res.status(200).json({ 
            token, 
            user: {
                id: response.id,
                name: response.name,
                email: response.email,
                role: response.role,
                image: response.image
            } 
        });


    } catch (error) {
        console.log(error);
    }
})

router.post('/login', async (req, res) => {
    try {
        //getting email,and password from body
        const { email, password } = req.body;

        const user = await User.findOne({ email: email })

        //if user not exists and even if paswrod not match retun error
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: "invalid email pr password" })
        }

        // if all goes right then generate token
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role
        }
        const token = generateJWT(payload);

        res.json({ 
            token, 
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                image: user.image
            }
        });


    } catch (error) {
        console.log(error);
    }
})

/**
 * @route   PUT /user/profile
 * @desc    Change the name or profile image of the logged-in user
 */
router.put('/profile', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { name } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        // Update name if provided
        if (name) user.name = name;

        // Update image if a new file is uploaded
        if (req.file) {
            user.image = req.file.path;
        }

        await user.save();

        res.json({ 
            message: "Profile updated successfully", 
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email,
                image: user.image 
            } 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- GOOGLE AUTH ROUTES ---
const passport = require('passport');
require('../config/passport');

router.get('/google', passport.authenticate('google', { scope: ['email', 'profile'] }));

router.get('/google/callback', 
    passport.authenticate('google', { session: false }), 
    (req, res) => {
        const payload = {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
        };
        const token = generateJWT(payload);

        // Redirect to frontend (localhost:5173) instead of sending JSON
        const userData = JSON.stringify({
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            image: req.user.image
        });

        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
        res.redirect(`${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(userData)}`);
    }
);

// --- ADDRESS ROUTES ---

/**
 * @route   GET /user/address
 * @desc    Get all addresses of the logged-in user
 */
router.get('/address', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('addresses');
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user.addresses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /user/address
 * @desc    Add a new address for the logged-in user
 */
router.post('/address', authMiddleware, upload.none(), async (req, res) => {
    try {
        const { street, city, state, zip, phone } = req.body;

        // Basic validation
        if (!street || !city || !state || !zip || !phone) {
            return res.status(400).json({ error: "All address fields are required" });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        const newAddress = { street, city, state, zip, phone };
        user.addresses.push(newAddress);
        await user.save();

        res.status(201).json({ message: "Address added successfully", addresses: user.addresses });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   PUT /user/address/:id
 * @desc    Update an existing address for the logged-in user
 */
router.put('/address/:id', authMiddleware, upload.none(), async (req, res) => {
    try {
        const { street, city, state, zip, phone } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        const address = user.addresses.id(req.params.id);
        if (!address) return res.status(404).json({ error: "Address not found" });

        // Update fields if provided
        if (street) address.street = street;
        if (city) address.city = city;
        if (state) address.state = state;
        if (zip) address.zip = zip;
        if (phone) address.phone = phone;

        await user.save();
        res.json({ message: "Address updated successfully", addresses: user.addresses });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   DELETE /user/address/:id
 * @desc    Delete an address from the logged-in user's list
 */
router.delete('/address/:id', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        user.addresses.pull({ _id: req.params.id });
        await user.save();

        res.json({ message: "Address deleted successfully", addresses: user.addresses });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const nodemailer = require('nodemailer');

// --- PASSWORD RESET ROUTES ---

/**
 * @route   POST /user/forgot-password
 * @desc    Send 6-digit OTP to user's email
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required" });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: "User not found with this email" });

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetOtp = otp;
        user.resetOtpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        const { sendEmail } = require('../utils/emailService');
        const { otpTemplate } = require('../utils/emailTemplates');

        await sendEmail(email, 'Password Reset OTP - Yogi Fashion', otpTemplate(otp));
        
        res.json({ message: "OTP sent to your email successfully" });

    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ error: "Failed to send OTP. Please try again later." });
    }
});

/**
 * @route   POST /user/verify-otp
 * @desc    Verify the OTP sent to email
 */
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

        const user = await User.findOne({ 
            email, 
            resetOtp: otp,
            resetOtpExpiry: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ error: "Invalid or expired OTP" });

        res.json({ message: "OTP verified successfully. You can now reset your password." });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /user/reset-password
 * @desc    Update password using verified OTP
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ error: "Email, OTP, and new password are required" });
        }

        const user = await User.findOne({ 
            email, 
            resetOtp: otp,
            resetOtpExpiry: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ error: "Invalid or expired OTP" });

        // Update password (pre-save hook will hash it)
        user.password = newPassword;
        user.resetOtp = null;
        user.resetOtpExpiry = null;
        await user.save();

        res.json({ message: "Password reset successful. You can now login with your new password." });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router


// hello my name is dhurv gondaliya and i m from ssasit 
// maam you take on call interview two days ago for nodejs 
// so i am not selected 
// may i know the reason so i can improve my self and 
// prepare for other interviews


// hello my name is dhruv gondaliya and i am persuing my bechlors in it enginnering 
// i discovered your website and i found that there is job vecancy for nodejs and fresher can apply so 
// i wanted to ask if your company offers internships
