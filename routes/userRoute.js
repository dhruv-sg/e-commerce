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
        res.status(200).json({ response, token });


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

        res.json({ token })


        res.json({ token })


    } catch (error) {
        console.log(error);

    }
})

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

module.exports = router


// hello my name is dhurv gondaliya and i m from ssasit 
// maam you take on call interview two days ago for nodejs 
// so i am not selected 
// may i know the reason so i can improve my self and 
// prepare for other interviews


// hello my name is dhruv gondaliya and i am persuing my bechlors in it enginnering 
// i discovered your website and i found that there is job vecancy for nodejs and fresher can apply so 
// i wanted to ask if your company offers internships
