const express = require('express')
const AdminController = require('../Controllers/adminController')
const { verifyTokenAdmin } = require('../Middlesware/authMiddleware')
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
router.post('/Admin/courses', verifyTokenAdmin, AdminController.createCourse);
router.get('/Admin/coursesById', verifyTokenAdmin, AdminController.getCourses);
router.get('/Admin/courses/:id',verifyTokenAdmin,AdminController.getCategoryById)
router.delete('/Admin/categories/:id',verifyTokenAdmin,AdminController.deleteCategory)
router.put('/Admin/categories/:id',verifyTokenAdmin,AdminController.editcategory)
router.delete('/Admin/courses/:id',verifyTokenAdmin,AdminController.deleteCourse)
router.post('/Admin/logout',AdminController.Logout)



module.exports = router;