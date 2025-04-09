const mongoose = require('mongoose');
const Notification = require('../models/notificationModel');


exports.getUserNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: 'Utilisateur non authentifié'
            });
        }

        const userId = req.user._id;

        const query = { ownerId: userId };

        const notifications = await Notification.find(query)
            .populate('driverId', 'name email') // ou autre champ que tu veux
            .populate('ownerId', 'name email')  // optionnel, mais utile si tu veux des infos du propriétaire
            .populate('parkingId')         // tu peux aussi faire `.populate({ path: 'reservationId', populate: { path: 'parkingId' } })` si tu veux remonter plus loin
            .populate('reservationId', 'messageRequested totalPrice startTime endTime')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Notification.countDocuments(query);

        res.json({
            success: true,
            notifications,
            currentPage: Number(page),
            totalPages: Math.ceil(total / limit),
            total
        });

    } catch (err) {
        console.error("Erreur récupération notifications:", err);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des notifications",
            error: err.message
        });
    }
};


exports.createNotification = async (req, res) => {
    try {
        const {
            driverId,
            ownerId,
            parkingId,
            reservationId,
            status = 'en_attente' // par défaut
        } = req.body;

        // Vérification rapide des champs obligatoires
        if (!driverId || !ownerId || !parkingId || !reservationId) {
            return res.status(400).json({
                success: false,
                message: 'Tous les champs (driverId, ownerId, parkingId, reservationId) sont requis.'
            });
        }

        const newNotification = new Notification({
            driverId,
            ownerId,
            parkingId,
            reservationId,
            status,
            isRead: false
        });

        await newNotification.save();

        res.status(201).json({
            success: true,
            message: 'Notification créée avec succès',
            notification: newNotification
        });
    } catch (error) {
        console.error("❌ Erreur lors de la création de la notification :", error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la création de la notification',
            error: error.message
        });
    }
};

// Marquer une notification comme lue
exports.markNotificationAsRead = async (req, res) => {
    try {
        const notificationId = req.params.id;

        // Vérifier que req.user._id existe
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: 'Utilisateur non authentifié'
            });
        }

        // Trouver la notification et vérifier qu'elle appartient à l'utilisateur
        const notification = await Notification.findOne({
            _id: notificationId,
            ownerId: req.user._id
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification non trouvée ou non autorisée'
            });
        }

        // Marquer comme lue si elle ne l'est pas déjà
        if (!notification.isRead) {
            notification.isRead = true;
            await notification.save();
        }

        res.status(200).json({
            success: true,
            message: 'Notification marquée comme lue',
            notification
        });
    } catch (err) {
        console.error("Erreur marquage notification:", err);
        res.status(500).json({
            success: false,
            message: "Erreur lors du marquage de la notification",
            error: err.message
        });
    }
};

// Marquer toutes les notifications comme lues
exports.markAllNotificationsAsRead = async (req, res) => {
    try {
        // Vérifier que req.user._id existe
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: 'Utilisateur non authentifié'
            });
        }

        // Mettre à jour toutes les notifications non lues de l'utilisateur
        const result = await Notification.updateMany(
            {
                ownerId: req.user._id,
                isRead: false
            },
            {
                $set: { isRead: true }
            }
        );

        res.status(200).json({
            success: true,
            message: 'Toutes les notifications ont été marquées comme lues',
            modifiedCount: result.modifiedCount
        });
    } catch (err) {
        console.error("Erreur marquage notifications:", err);
        res.status(500).json({
            success: false,
            message: "Erreur lors du marquage des notifications",
            error: err.message
        });
    }
};


// Supprimer une notification
exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        // Vérifier si l'ID est valide
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de notification invalide'
            });
        }

        // Trouver et supprimer la notification
        const notification = await Notification.findOneAndDelete({
            _id: id,
            recipient: req.user._id
        });

        // Vérifier si la notification existe et appartient à l'utilisateur
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification non trouvée ou vous n\'êtes pas autorisé à la supprimer'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Notification supprimée avec succès',
            notification
        });
    } catch (error) {
        console.error("❌ Erreur suppression notification:", error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression de la notification',
            error: error.message
        });
    }
};

// Compter les notifications non lues
exports.countUnread = async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            recipient: req.user._id,
            isRead: false
        });

        res.status(200).json({
            success: true,
            count
        });
    } catch (error) {
        console.error("❌ Erreur comptage notifications:", error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du comptage des notifications',
            error: error.message
        });
    }
};