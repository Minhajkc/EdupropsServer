const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const Mentor = require('../Models/Mentor')
const cloudinary = require('../Services/cloudinaryConfig');
const streamifier = require('streamifier');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');



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
    console.log('Login attempt');

    const { email, password } = req.body;
    console.log(email, password);

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const mentor = await Mentor.findOne({ email });

        
        if (!mentor) {
            return res.status(404).json({ message: 'Mentor not found' });
        }

        
        if(mentor.isActive==='pending'){
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
module.exports = {
    Register,
    uploadFileToCloudinary,
    Login
};