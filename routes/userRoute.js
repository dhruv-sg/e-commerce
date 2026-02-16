const express = require("express")
const router = express.Router()
const User = require("../models/userModel")
const { generateJWT, generateOneTimeToken, authMiddleware } = require('../auth')


router.post('/signup', async (req, res) => {
    try {
        const data = req.body;

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


    } catch (error) {
        console.log(error);

    }
})




module.exports = router


// hello my name is dhurv gondaliya and i m from ssasit 
// maam you take on call interview two days ago for nodejs 
// so i am not selected 
// may i know the reason so i can improve my self and 
// prepare for other interviews


// hello my name is dhruv gondaliya and i am persuing my bechlors in it enginnering 
// i discovered your website and i found that there is job vecancy for nodejs and fresher can apply so 
// i wanted to ask if your company offers internships
