const express = require('express');
const fileUpload = require('express-fileupload');
const mentorController = require('../Controllers/mentorController');

const router = express.Router();

router.use(fileUpload());

router.post('/Mentor/MentorRegister', async (req, res) => {
    try {
        if (req.files && req.files.resume) {
          const fileBuffer = req.files.resume.data;
          req.fileUrl = await mentorController.uploadFileToCloudinary(fileBuffer);
        } else {
          return res.status(400).json({ error: 'File is required' });
        }
        await mentorController.Register(req, res);
      } catch (error) {
        console.error(error); 
        res.status(500).json({ error: 'Server error' });
      }
});

router.post('/Mentor/Login',mentorController.Login)

module.exports = router;
