const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const Mentor = require('../Models/Mentor')
const cloudinary = require('../Services/cloudinaryConfig');
const streamifier = require('streamifier');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');
const { sendOtpEmail } = require('../config/email');

const passwordResetOtps = {};

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const uploadFileToCloudinary = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: 'raw' },
          (error, result) => {
            if (error) {
              reject(new Error('Cloudinary upload failed: ' + error.message));
            } else {
              resolve(result.secure_url);
            }
          }
        );
        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
      });
  };
  

const Register = async (req, res) => {
    try {
        const { firstName, lastName, username, email, password, confirmPassword, degree } = req.body;

        if (!firstName || !lastName || !username || !email || !password || !degree || !req.fileUrl) {
            return res.status(400).json({ error: 'All fields are required, including the file' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const mentor = new Mentor({
            firstName,
            lastName,
            username,
            email,
            password: hashedPassword, // Store the hashed password
            degree,
            resume: req.fileUrl, // Cloudinary URL for the uploaded file
        });

        await mentor.save();
        res.status(201).json({ message: 'Mentor registered successfully' });
    } catch (error) {
        console.error(error); // Log error for debugging
        res.status(500).json({ error: 'Server error' });
    }
};

const Login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const mentor = await Mentor.findOne({ email });

        
        if (!mentor) {
            return res.status(404).json({ message: 'Mentor not found' });
        }

        if (mentor.isActive === 'rejected') {
            const now = new Date();
            const rejectionDate = new Date(mentor.rejectionDate);
            const daysSinceRejection = Math.floor((now - rejectionDate) / (1000 * 60 * 60 * 24));

            if (daysSinceRejection < 3) {
                return res.status(400).json({
                    message: `Your account has been rejected. You can reapply after ${3 - daysSinceRejection} day's.`
                });
            } else {
                await Mentor.deleteOne({ _id: mentor._id });
                return res.status(400).json({ message: 'Your account was rejected and has been deleted. Please reapply.' });
            }
        }


        if(mentor.isActive ==='pending'){
            return res.status(400).json({ message: 'Your account is pending verification' });
        }




       
        const match = await bcrypt.compare(password, mentor.password);

        if (!match) {
            return res.status(401).json({ message: 'Password not match' });
        }

        const accessToken = generateAccessToken(mentor);
        const refreshToken = generateRefreshToken(mentor);

        res.status(200).json({
            message: 'Login successful',
            accessToken,
            refreshToken
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'An error occurred during login' });
    }
};


const passwordResetSendOtp = async (req, res) => {

    const { email } = req.body;
    const mentor = await Mentor.findOne({email})
    if (!mentor) {
        return res.status(404).json({ message: 'Mentor not found.' });
    }
    if (mentor.isActive === 'rejected') {
        return res.status(400).json({ message: `Sorry your account is rejected ! please try after 3 day's` });
    }
    const otp = generateOtp();
    passwordResetOtps[email] = otp;
    try {
        await sendOtpEmail(email, otp);
        console.log(passwordResetOtps);
        return res.status(200).json({ message: 'OTP sent to email.' });
    } catch (error) {
        console.error('Error sending OTP email:', error);
        return res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }
};


const passwordResetVerifyOtp = (req, res) => {
    const { email, otp } = req.body;

    if (passwordResetOtps[email] && passwordResetOtps[email] === otp) {
        return res.status(200).json({ message: 'OTP verified.' });
    } else {
        return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }
};


const passwordResetResetPassword = async (req, res) => {

    const { email, newPassword } = req.body;

    try {
        const mentor = await Mentor.findOne({ email });
        if (!mentor) {
            return res.status(404).json({ message: 'Mentor not found.' });
        }

        mentor.password = await bcrypt.hash(newPassword, 10);
        await mentor.save();

        
        delete passwordResetOtps[email];

        return res.status(200).json({ message: 'Password reset successful.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to reset password. Please try again.' });
    }
};



module.exports = {
    Register,
    uploadFileToCloudinary,
    Login,
    passwordResetSendOtp,
    passwordResetVerifyOtp,
    passwordResetResetPassword
};