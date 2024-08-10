const express = require('express')
const AdminController = require('../Controllers/adminController')
const { verifyTokenAdmin } = require('../Middlesware/authMiddleware')
const router = express.Router()
router.post('/Admin/login',AdminController.AdminLogin)
router.get('/Admin/checkAuth', verifyTokenAdmin, AdminController.checkAuth)


module.exports = router;