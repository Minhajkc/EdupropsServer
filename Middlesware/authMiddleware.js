const jwt = require('jsonwebtoken');
const config = require('../config');



const verifyTokenAdmin = (req, res, next) => {
    const token = req.cookies.accessToken;
  
    
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        if (decoded.username !== 'admin@eduprops') {
            return res.status(403).json({ message: 'Access denied. Not an admin.' });
        }
        req.user = decoded;  
        next();  
    } catch (err) {
        console.error(err);
        res.status(403).json({ message: 'Invalid token.' });
    }
};

module.exports = {  verifyTokenAdmin };
