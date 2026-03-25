const mongoose = require('mongoose')
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    image: {
        type: String,
        default: ''
    },
    wishlist: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }
    ],
    addresses: [{
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zip: { type: String, required: true },
        phone: { type: String, required: true }
    }]
})

userSchema.pre('save', async function (next) {

    if (!this.isModified('password')) return next();


    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);


    next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    try {

        const ismatch = await bcrypt.compare(candidatePassword, this.password)
        return ismatch;
    } catch (error) {
        throw error;
    }
}


const User = mongoose.model("User", userSchema)
module.exports = User