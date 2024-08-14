const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const Mentor = require('../Models/Mentor')
const cloudinary = require('../Services/cloudinaryConfig');
const streamifier = require('streamifier');



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

        const mentor = new Mentor({
            firstName,
            lastName,
            username,
            email,
            password,
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

module.exports = {
    Register,
    uploadFileToCloudinary
};