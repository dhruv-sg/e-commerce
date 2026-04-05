const express = require("express")
const cors = require("cors")
const app = express()
const dotenv = require('dotenv');
const db = require("./db")

dotenv.config();

const { initializeSettings } = require('./models/settingsModel');
initializeSettings();

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

const passport = require('passport');
app.use(passport.initialize());

app.get('/', (req, res) => res.json({ ok: true, msg: 'Secure E-commerce API (NODEJS)' }));

const PORT = process.env.PORT || 4000;

const userRoute = require('./routes/userRoute')
app.use("/user", userRoute)

const productRoute = require('./routes/productRoute')
app.use("/product", productRoute)


const orderRoute = require('./routes/orderRoute')
app.use("/order", orderRoute)

const categoryRoute = require('./routes/categoryRoute')
app.use("/api/categories", categoryRoute)

const promoRoute = require('./routes/promoRoute')
app.use("/promo", promoRoute)

const adminRoute = require('./routes/adminRoute')
app.use("/admin", adminRoute)

const subscriberRoute = require('./routes/subscriberRoute')
app.use("/subscribe", subscriberRoute)

const heroRoute = require('./routes/heroRoute')
app.use("/hero", heroRoute)



app.listen(PORT, (req, res) => {
    console.log('server running');
})