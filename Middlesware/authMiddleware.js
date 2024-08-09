const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/user');

const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = await User.findById(decoded.id);
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token.' });
    }
};

module.exports = authMiddleware;
