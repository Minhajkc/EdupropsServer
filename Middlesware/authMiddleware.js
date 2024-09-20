const jwt = require('jsonwebtoken');
const config = require('../config');
const Student = require('../Models/Student')



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

const verifyTokenStudent = async (req, res, next) => {

    let accessToken = req.cookies.accessToken;
    let refreshToken = req.cookies.refreshToken;
    
    if (!accessToken && !refreshToken) {
        return res.status(401).json({ message: 'No token provided. Please log in.' });
    }

    try {
        const decodedRefreshToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const student = await Student.findById(decodedRefreshToken.id);
        if (!student) {
            return res.status(403).json({ message: 'User not found.' });
        }

        if (student.refreshToken !== refreshToken || new Date() > student.refreshTokenExpires) {
            return res.status(403).json({ message: 'Invalid or expired refresh token.' });
        }

        accessToken = jwt.sign(
            { id: student._id, role: 'student' }, 
            process.env.ACCESS_TOKEN_SECRET, 
            { expiresIn: '15m' } 
        );

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', 
            maxAge: 15 * 60 * 1000, 
        });


        req.user = decodedRefreshToken; 
        req.student = decodedRefreshToken.id;
        next()


      
    } catch (err) {
        console.error(err);
        res.status(403).json({ message: 'Invalid token.' });
    }
};

const timeout = (ms) => {
    return (req, res, next) => {
        req.setTimeout(ms, () => {
            res.status(408).json({ message: 'Request Timeout' });
        });
        next();
    };
};

module.exports = { verifyTokenAdmin, verifyTokenStudent,timeout};
