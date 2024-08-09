const jwt = require('jsonwebtoken');


const generateAccessToken = (user) => {
    console.log(user._id,'userid'); 
    return jwt.sign({ id: user._id }, 'config.jwtSecret', { expiresIn: '15m' });
  
};

const generateRefreshToken = (user) => {
    return jwt.sign({ id: user._id }, 'config.jwtRefreshSecret', { expiresIn: '7d' });
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
};
