const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authController.getMe);
router.get('/admin/users', authController.getAllUsersAdmin);
router.patch('/admin/users/:id/role', authController.updateUserRole);
router.patch('/admin/users/:id/activity', authController.updateUserActivity);
router.post('/request-admin', authController.requestAdminAction);
router.get('/admin/logs', authController.getAdminLogs);

module.exports = router;
