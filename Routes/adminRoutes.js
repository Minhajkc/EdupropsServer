const express = require('express')
const AdminController = require('../Controllers/adminController')
const { verifyTokenAdmin,timeout } = require('../Middlesware/authMiddleware')
const fileUpload = require('express-fileupload');
const router = express.Router()

router.post('/Admin/login',AdminController.AdminLogin)
router.get('/Admin/checkAuth', verifyTokenAdmin, AdminController.checkAuth)
router.get('/Admin/StudentsAuth',verifyTokenAdmin,AdminController.AuthPage)
router.post('/Admin/Students/:id/block',verifyTokenAdmin,AdminController.BlockStudent)
router.post('/Admin/Students/:id/unblock',verifyTokenAdmin,AdminController.UnBlockStudent)
router.get('/Admin/Mentorauth',verifyTokenAdmin,AdminController.GetMentors)
router.patch('/Admin/Mentorauth/:id/approve',verifyTokenAdmin,AdminController.ApproveMentor)
router.patch('/Admin/Mentorauth/:id/reject',verifyTokenAdmin,AdminController.RejectMentor)
router.post('/Admin/categories',verifyTokenAdmin,AdminController.createCategory);
router.get('/Admin/categories',verifyTokenAdmin,AdminController.getCategory)
router.post('/Admin/courses', verifyTokenAdmin,  fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/'
}), AdminController.createCourse);
router.get('/Admin/coursesById', verifyTokenAdmin, AdminController.getCourses);
router.get('/Admin/courses/:id',verifyTokenAdmin,AdminController.getCategoryById)
router.delete('/Admin/categories/:id',verifyTokenAdmin,AdminController.deleteCategory)
router.put('/Admin/categories/:id',verifyTokenAdmin,AdminController.editcategory)
router.delete('/Admin/courses/:id',verifyTokenAdmin,AdminController.deleteCourse)
router.get('/Admin/getCoursebyId/:id',verifyTokenAdmin,AdminController.getCourseById)
router.put('/Admin/updateCourse/:id',verifyTokenAdmin, fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/'
}),AdminController.updateCourse)
router.put('/Admin/addVideo/:id',verifyTokenAdmin, fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/'
}),timeout(120000),AdminController.AddVideo)
router.delete('/Admin/courses/:courseId/lessons/:lessonIndex', verifyTokenAdmin,AdminController.deleteLesson);
router.post('/Admin/logout',AdminController.Logout)
router.get('/Admin/coursedetailsmentor',verifyTokenAdmin,AdminController.getCourseDetailsForMentor)
router.put('/Admin/editVideo/:courseId/:lessonId', verifyTokenAdmin, fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/'
}), timeout(120000), AdminController.editLessonVideo);
router.put('/Admin/settings',verifyTokenAdmin,AdminController.updateAdminSettings);
router.get('/Admin/settings', verifyTokenAdmin,AdminController.getAdminSettings);
router.post('/Admin/subscription/update-rates',verifyTokenAdmin,AdminController.updateSubscriptionRates);
router.get('/Admin/get-rates-subscription',AdminController.getSubscriptionRates);
router.post('/Admin/ads',verifyTokenAdmin,fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/'
}),AdminController.AddAds)
router.get('/Admin/ads',verifyTokenAdmin,AdminController.GetAds)
router.put('/Admin/ads/:id',verifyTokenAdmin,fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/'
}),AdminController.EditAds)
router.delete('/Admin/ads/:id',verifyTokenAdmin,AdminController.DeleteAds)
router.put('/Admin/courses/:courseId/instructor',verifyTokenAdmin,AdminController.updateCourseInstructor);
router.put('/Admin/editVideo/admin/:courseId/:lessonId', verifyTokenAdmin, fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/'
  }), AdminController.editLessonVideos);
  router.put('/Admin/courses/admin/:courseId/lessons/:lessonId',verifyTokenAdmin,AdminController.updatelesson)
  router.get('/Admin/dashboard-metrics', verifyTokenAdmin,AdminController.getDashboardMetrics);

module.exports = router;