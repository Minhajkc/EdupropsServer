const express = require('express');
const studentController = require('../Controllers/studentContorller');
const {verifyTokenStudent} = require('../Middlesware/authMiddleware')
const checkBlockedStatus = require ('../Middlesware/Students/checkBlockedStatus')

const router = express.Router();
// router.use(checkBlockedStatus)

router.post('/register',studentController.createStudent);
router.post('/verify',studentController.verifyOtp)
router.post('/login',studentController.login)
router.post('/auth/google',studentController.googleauth)
router.post('/password-reset/send-otp', studentController.passwordResetSendOtp);
router.post('/password-reset/verify-otp', studentController.passwordResetVerifyOtp);
router.post('/password-reset/reset-password', studentController.passwordResetResetPassword);
router.get('/profile',verifyTokenStudent,studentController.getStudentProfile)
router.get('/courses/categories',studentController.getCategory)
router.get('/courses/category/:id',studentController.getCoursesByCategoryId)
router.get('/courses/category/selectedcourse/:courseId',studentController.getCourseFullView)
router.post('/student/logout',verifyTokenStudent,studentController.logout)
router.post('/cart/:courseId',verifyTokenStudent,studentController.addToCart)
router.get('/cart',verifyTokenStudent,studentController.getCartItems)
router.delete('/removeFromCart/:courseId',verifyTokenStudent,studentController.removeFromCart)
router.post('/createOrder',verifyTokenStudent,studentController.CreateOrder)
router.post('/verifyPayment',verifyTokenStudent,studentController.verifyPayment)
router.post('/savePurchase',verifyTokenStudent,studentController.savePurchase)
router.get('/categories/search',studentController.searchCategories);
router.get('/category/:id/courses', studentController.getCategoryCoursesById);



module.exports = router;
