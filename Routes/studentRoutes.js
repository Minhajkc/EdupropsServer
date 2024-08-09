const express = require('express');
const studentController = require('../Controllers/studentContorller');

const router = express.Router();

router.post('/register',studentController.createStudent);
router.post('/verify',studentController.verifyOtp)
router.post('/login',studentController.login)
router.post('/auth/google',studentController.googleauth)


module.exports = router;
