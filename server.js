const express = require("express")
const app = express()
const dotenv = require('dotenv');
const db = require("./db")

dotenv.config();
app.use(express.json());

app.get('/', (req, res) => res.json({ ok: true, msg: 'Secure E-commerce API (NODEJS)' }));

const PORT = process.env.PORT || 4000;

const userRoute = require('./routes/userRoute')
app.use("/user", userRoute)

const productRoute = require('./routes/productRoute')
app.use("/product", productRoute)


const orderRoute = require('./routes/orderRoute')
app.use("/order", orderRoute)



app.listen(PORT, (req, res) => {
    console.log('server running');
})