const express = require('express');
const studentController = require('../Controllers/studentContorller');
const checkBlockedStatus = require ('../Middlesware/Students/checkBlockedStatus')

const router = express.Router();
// router.use(checkBlockedStatus)

router.post('/register',studentController.createStudent);
router.post('/verify',studentController.verifyOtp)
router.post('/login',studentController.login)
router.post('/auth/google',studentController.googleauth)


module.exports = router;
