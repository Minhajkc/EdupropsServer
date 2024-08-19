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
router.post('/Admin/logout',AdminController.Logout)



module.exports = router;