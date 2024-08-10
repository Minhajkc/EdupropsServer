const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client('997696378611-qvopoihd2m7gvegm7hi8ud1t7aftrfv5.apps.googleusercontent.com');
const Student = require('../Models/Student');
const { sendOtpEmail } = require('../config/email');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');

const otpStore = {}; // 



const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const createStudent = async (req, res) => {
    try {
        const { password, confirmPassword, email, username } = req.body;

        const existingStudent = await Student.findOne({ email });
        if (existingStudent) {
            return res.status(400).json({ message: 'Email is already registered' });
        }  

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const otp = generateOtp();
        otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 }; 
        console.log(otp);
        console.log(otpStore,'otp stored');
        
        await sendOtpEmail(email, otp);

        res.status(200).json({ message: 'OTP sent to email' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { email, otp, password, confirmPassword } = req.body;
       
        

        const storedOtp = otpStore[email];

        if (!storedOtp || storedOtp.otp !== otp || Date.now() > storedOtp.expires) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }


        const hashedPassword = await bcrypt.hash(password, 10);

        const newStudent = new Student({ ...req.body, password: hashedPassword });
        const savedStudent = await newStudent.save();

        const accessToken = generateAccessToken(savedStudent);
        const refreshToken = generateRefreshToken(savedStudent);

        
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            maxAge: 15 * 60 * 1000, // 15 minutes
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
     
        delete otpStore[email];

        res.status(201).json(savedStudent);
    } catch (error) {
        console.error(error); // Log error details for debugging
        res.status(400).json({ message: error.message });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    try {

        const user = await Student.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email' });
        }
        if(user && user.password ==='googleauth'){
            return res.status(400).json({ message: 'Please log in using Google.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid  password' });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Set secure to true in production
            maxAge: 15 * 60 * 1000, // 15 minutes
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', 
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.status(200).json({ message: 'Login successful' });
    } catch (error) {
        console.error(error); // Log error details for debugging
        res.status(500).json({ message: 'Internal server error' });
    }
};

const googleauth = async (req, res) => {
    const { idToken } = req.body;
    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;
       
        const [firstName, ...lastNameParts] = name.split(' ');
        const lastName = lastNameParts.join(' ');

        let student = await Student.findOne({ email });

        if (!student) {
            student = new Student({
                username: email, 
                email,
                password: 'googleauth',
                firstName,
                lastName,
            });

            await student.save();
        }

        student.lastLogin = new Date();
        await student.save();

        const accessToken = generateAccessToken(student);
        const refreshToken = generateRefreshToken(student);

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 15 * 60 * 1000, // 15 minutes
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', 
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.status(200).json({ message: 'Authenticated successfully!', student });
    } catch (error) {
        console.error('Error verifying ID token:', error);
        res.status(401).json({ message: 'Invalid token.' });
    }
};


module.exports = {
    createStudent,
    verifyOtp,
    login,
    googleauth
};
