const jwt = require('jsonwebtoken')
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

const authMiddleware = (req,res,next)=>{

    //to check request header has authorization
     const authorization = req.headers.authorization;
    if(!authorization) return res.status(401).json({error : "token not found"})

        //extract the jwt from request header
        const token  = req.headers.authorization.split(" ")[1];
        if(!token) return res.status(401).json({error : 'unauthorized'})

            try {
                

                // verify the jwt
                const decoded = jwt.verify(token,process.env.JWT_SECRET)

                req.user = decoded;
                next()
            } catch (error) {
                console.log(error);
                res.status(401).json({error:"invalid token"})
            }
}

const generateJWT = (userData)=>{
    return jwt.sign(userData,process.env.JWT_SECRET)
}

const adminOnly = (req, res, next) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
};

module.exports = {authMiddleware,generateJWT,adminOnly}
exports.generateOneTimeToken = () => uuidv4();