const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { getUserFromToken } = require('../middlewares/uploadMiddleware');
const mongoose = require('mongoose');


// Route pour obtenir les notifications de l'utilisateur connecté
router.get('/all', getUserFromToken, notificationController.getUserNotifications);

// Route pour compter les notifications non lues
//router.get('/unread-count', getUserFromToken, notificationController.countUnread);

// Route pour créer une nouvelle notification
router.post('/', getUserFromToken, notificationController.createNotification); 

// Route pour marquer une notification comme lue
router.patch('/:id/read', getUserFromToken, notificationController.markNotificationAsRead);

// Route pour marquer toutes les notifications comme lues
router.patch('/read-all', getUserFromToken, notificationController.markAllNotificationsAsRead);

module.exports = router;