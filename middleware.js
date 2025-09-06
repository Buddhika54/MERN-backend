const jwt = require('jsonwebtoken');
const Admin = require('./model/model');

const verifyUser = async (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        if(!token){
            return res.status(404).json({success: false, error: "Token not provided"})
        }

        const decoded = jwt.verify(token, "jwtScreteKeyAAA333@@@###8889999jjdd")
        if(!decoded){
            return res.status(404).json({success: false, error: "Token not valid"})
        }

        const admin = await Admin.findById({_id: decoded._id}).select('-password')

        if(!admin){
             return res.status(404).json({success: false, error: "User not found"})
             
        }

        req.admin = admin
        next()
    } catch (error) {
         return res.status(500).json({success: false, error: "server side error"})
    }
}

module.exports = verifyUser;