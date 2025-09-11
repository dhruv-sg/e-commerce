const mongoose = require("mongoose")

const mongoURL = 'mongodb+srv://admin:hellodhruv@votingapp.fle2nxm.mongodb.net/E-com'

mongoose.connect(mongoURL)

const db = mongoose.connection

db.on("connected",()=>{
    console.log("db connected");
    
})

module.exports = db