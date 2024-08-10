const bcrypt = require('bcrypt');
const Admin = require('../Models/AdminModel');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');

const AdminLogin = async (req, res) => {
    try {
      const { username, password } = req.body;
      const admin = await Admin.findOne({ username });
      
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }
  
      const isMatch = await bcrypt.compare(password, admin.password);
  
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid password" });
      }
  
      const accessToken = generateAccessToken(admin);
      const refreshToken = generateRefreshToken(admin);;
  
 
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
  
     res.cookie('accessToken',accessToken,{
        httpOnly: true,
        maxAge: 60 * 60 * 1000, // 1 hour
     })

     res.json({ accessToken, admin });
  
    } catch (err) {
   
      console.error('Error during admin login:', err);
      res.status(500).json({ message: 'Server error' });
    }
  };

  
  const checkAuth = (req, res) => {
    if (req.user) { 
        res.json({ isAuthenticated: true, user: req.user });
    } else {
        res.json({ isAuthenticated: false });
    }
};


module.exports = checkAuth;


module.exports = {
   AdminLogin,
   checkAuth
};
