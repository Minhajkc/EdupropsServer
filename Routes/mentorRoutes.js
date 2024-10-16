const express = require('express');
const fileUpload = require('express-fileupload');
const mentorController = require('../Controllers/mentorController');
const {verifyTokenMentor} = require('../Middlesware/authMiddleware')

const router = express.Router();



router.post('/Mentor/MentorRegister', fileUpload(),async (req, res) => {
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
router.post('/Mentor/password-reset/send-otp',mentorController.passwordResetSendOtp);
router.post('/Mentor/password-reset/verify-otp',mentorController.passwordResetVerifyOtp );
router.post('/Mentor/password-reset/reset-password',mentorController.passwordResetResetPassword );
router.get('/Mentor/Profile',verifyTokenMentor,mentorController.getMentorProfile)
router.post('/mentor/logout', verifyTokenMentor,mentorController.logoutMentor);
router.post('/Mentor/mentorchat',verifyTokenMentor,mentorController.sendChatMessage);
router.get('/Mentor/chats',verifyTokenMentor,mentorController.retrieveChatMessage);
router.post('/Mentor/scheduleMeeting/:courseId',verifyTokenMentor,mentorController.scheduleMeet);
router.get('/Mentor/scheduledMeets/:courseId', verifyTokenMentor, mentorController.getScheduledMeets);
router.put('/Mentor/course/:courseId/meeting/:meetingId',verifyTokenMentor,mentorController.updateMeeting); // Update meeting
router.delete('/Mentor/course/:courseId/meeting/:meetingId',verifyTokenMentor,mentorController.deleteMeeting)
router.get('/Mentor/students/mystudents',verifyTokenMentor,mentorController.getStudentsByCourse);


module.exports = router;
