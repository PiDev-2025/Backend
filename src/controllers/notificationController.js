const mongoose = require('mongoose');
const Notification = require('../models/notificationModel');
const Parking = require('../models/parkingModel');

exports.getUserNotifications = async (req, res) => {
    try {
        // Vérification et conversion des paramètres de pagination avec valeurs par défaut sécurisées
        const page = Math.max(1, parseInt(req.query.page || 1));
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || 10))); // Limité à max 100 pour éviter les abus

        // Vérification approfondie de l'authentification de l'utilisateur
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: 'Utilisateur non authentifié'
            });
        }

        const userId = req.user._id;
        let query = { ownerId: userId }; // Query par défaut

        try {
            // Recherche des parkings dont l'utilisateur est employé
            const employeeParkings = await Parking.find({ id_employee: userId }).lean().exec();
            
            if (employeeParkings && Array.isArray(employeeParkings) && employeeParkings.length > 0) {
                // Récupération sécurisée des IDs de parking
                const parkingIds = employeeParkings
                    .filter(parking => parking && parking._id) // Vérifier que chaque parking a un _id
                    .map(parking => parking._id);
                
                // Modifier la requête seulement si des parkings valides ont été trouvés
                if (parkingIds.length > 0) {
                    query = {
                        $or: [
                            { ownerId: userId },
                            { parkingId: { $in: parkingIds } }
                        ]
                    };
                }
            }
        } catch (parkingError) {
            console.error("Erreur lors de la recherche des parkings associés:", parkingError);
            // Continuer avec la requête par défaut si une erreur se produit
        }

        // Exécution de la requête principale avec gestion d'erreur
        const notifications = await Notification.find(query)
            .populate('driverId', 'name email')
            .populate('ownerId', 'name email')
            .populate('parkingId')
            .populate({
                path: 'reservationId',
                select: 'parkingId messageRequested totalPrice startTime endTime spotId status',
                // Gestion des cas où la réservation pourrait être null
                match: { _id: { $ne: null } }
            })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .lean() // Utilisation de lean() pour améliorer les performances
            .exec();

        // Gestion sécurisée du comptage total avec la même requête
        const total = await Notification.countDocuments(query).exec();

        // Envoyer une réponse formatée avec vérification des données
        res.json({
            success: true,
            notifications: Array.isArray(notifications) ? notifications : [],
            currentPage: page,
            totalPages: Math.ceil(total / limit) || 1, // Au moins 1 page même si pas de résultats
            total: total || 0
        });

    } catch (err) {
        console.error("Erreur récupération notifications:", err);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des notifications",
            error: err.message || "Erreur inconnue"
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

// Dans notificationService.js
exports.createNotificationFromRequest = async (req, res) => {
    try {
        const {
            driverId,
            ownerId,
            parkingId,
            reservationId,
            status = 'en_attente'
        } = req.body;

        if (!driverId || !ownerId || !parkingId || !reservationId) {
            return res.status(400).json({
                success: false,
                message: 'Tous les champs (driverId, ownerId, parkingId, reservationId) sont requis.'
            });
        }

        const notification = await this.createNotification({
            driverId,
            ownerId,
            parkingId,
            reservationId,
            status
        });

        res.status(201).json({
            success: true,
            message: 'Notification créée avec succès',
            notification
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

exports.createNotification = async (notificationData) => {
    const newNotification = new Notification({
        driverId: notificationData.driverId,
        ownerId: notificationData.ownerId,
        parkingId: notificationData.parkingId,
        reservationId: notificationData.reservationId,
        status: notificationData.status || 'en_attente',
        isRead: false
    });

    await newNotification.save();
    return newNotification;
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
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: 'Utilisateur non authentifié'
            });
        }

        const userId = req.user._id;
        let query = { ownerId: userId, isRead: false };

        // Recherche des parkings dont l'utilisateur est employé
        const employeeParkings = await Parking.find({ id_employee: userId }).lean().exec();
        
        if (employeeParkings && employeeParkings.length > 0) {
            const parkingIds = employeeParkings.map(parking => parking._id);
            query = {
                $or: [
                    { ownerId: userId, isRead: false },
                    { parkingId: { $in: parkingIds }, isRead: false }
                ]
            };
        }

        const count = await Notification.countDocuments(query);

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
