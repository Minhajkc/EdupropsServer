const bcrypt = require('bcrypt');
const Admin = require('../Models/AdminModel');
const Student = require('../Models/Student');
const Mentor = require('../Models/Mentor')
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
        res.status(200).json({ user: req.user }); // Authenticated: 200 OK
    } else {
        res.status(401).json({ message: 'Unauthorized' }); // Unauthenticated: 401 Unauthorized
    }
};



const Logout = async (req,res) =>{
    try {

        res.cookie('accessToken', '', {
          maxAge: 0, 
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production', 
          sameSite: 'Strict' 
        });
    
        res.status(200).json({ message: 'Successfully logged out' });
      } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'An error occurred while logging out' });
      }
}

const AuthPage = async(req,res) =>{
    try {
        const students = await Student.find();
        console.log(students);
        
        res.status(200).json(students);
      } catch (error) {
        res.status(500).json({ message: 'Error fetching students' });
      }
}

const BlockStudent = async (req, res) => {
    try {
      const student = await Student.findById(req.params.id);
  
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }
  
      if (typeof student.blocked === 'undefined') {
        student.blocked = true;  
      } else {
        student.blocked = true;  
      }
  
      await student.save();
      res.status(200).json(student);
    } catch (err) {
      res.status(500).json({ message: 'Failed to block student' });
    }
  };
  
  const UnBlockStudent = async (req, res) => {
    try {
      const student = await Student.findById(req.params.id);
  
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }
  
      if (typeof student.blocked === 'undefined') {
        student.blocked = false;  
      } else {
        student.blocked = false;  
      }
  
      await student.save();
      res.status(200).json(student);
    } catch (err) {
      res.status(500).json({ message: 'Failed to unblock student' });
    }
  };
  
  const GetMentors = async (req, res) => {
    try {
        const mentors = await Mentor.find();
        res.status(200).json(mentors);
    } catch (err) {
        console.error('Error fetching mentors:', err);
        res.status(500).json({ error: 'Failed to fetch mentors' });
    }
};

const ApproveMentor = async (req,res)=>{
    try {
        const mentorId = req.params.id;
        
        const mentor = await Mentor.findByIdAndUpdate(
            mentorId,
            { isActive: 'Active' },
            { new: true } // Return the updated document
        );

        if (!mentor) {
            return res.status(404).json({ message: 'Mentor not found' });
        }

        res.json(mentor);
    } catch (err) {
        console.error('Error approving mentor:', err);
        res.status(500).json({ message: 'Failed to approve mentor' });
    }
}


module.exports = {
   AdminLogin,
   checkAuth,
   Logout,
   AuthPage,
   BlockStudent,
   UnBlockStudent,
   GetMentors,
   ApproveMentor
};
