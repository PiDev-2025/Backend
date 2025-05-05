const express = require("express");
const router = express.Router();
const { getUserFromToken } = require("../middlewares/uploadMiddleware");
const Claim = require("../models/claimModel");
const Reservation = require("../models/reservationModel");
const sendEmail = require('../utils/SignUpMailVerif');
const ClaimTemplate = require('../utils/ClaimTemplate');  // Modifier cette ligne
const { sendClaimStatusEmail } = require('../utils/notificationMailer');
const { 
  createClaim, 
  getClaims, 
  getClaimById, 
  updateClaim, 
  deleteClaim,
  getClaimsByPlateNumber
} = require("../services/claimService");

// Configure Cloudinary storage for claims
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "claims",
    format: async (req, file) => "jpg",
    public_id: (req, file) => `claim-${Date.now()}`,
  },
});

const upload = multer({ storage });

// Routes with authentication and image upload
router.post("/claims", getUserFromToken, upload.single('image'), createClaim);
router.get("/claims", getUserFromToken, getClaims);
router.get("/claims/:id", getUserFromToken, getClaimById);
router.put("/claims/:id", getUserFromToken, updateClaim);
router.delete("/claims/:id", getUserFromToken, deleteClaim);

// Route to get claims for the connected driver
router.get("/driver-claims", getUserFromToken, async (req, res) => {
    try {
        // Check if user is a driver
        if (req.user.role !== "Driver") {
            return res.status(403).json({ 
                success: false,
                message: "Access denied. Must be a driver." 
            });
        }

        // Find claims where userId matches the current user's ID
        const claims = await Claim.find({ userId: req.user.id })
            .populate('userId', 'name email')
            .populate({
                path: 'reservationId',
                // Don't fail if no reservation found
                options: { retainNullValues: true },
                populate: {
                    path: 'parkingId',
                    select: 'name location'
                }
            })
            .sort({ createdAt: -1 });

        // Format response and handle null reservation IDs
        const formattedClaims = claims.map(claim => {
            const claimObj = claim.toObject();
            
            // If reservationId is null or invalid, set it to null instead of failing
            if (!claim.reservationId) {
                claimObj.reservationId = null;
            }
            
            return claimObj;
        });

        res.status(200).json({
            success: true,
            count: claims.length,
            claims: formattedClaims
        });
    } catch (error) {
        console.error("Error fetching driver claims:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch driver claims",
            error: error.message
        });
    }
});

// Route pour obtenir les réclamations par numéro de plaque
router.get("/claims/plate/:plateNumber", getUserFromToken, getClaimsByPlateNumber);

// Route pour obtenir les réclamations d'un propriétaire
router.get("/owner-claims", getUserFromToken, async (req, res) => {
    try {
        if (req.user.role !== "Owner") {
            return res.status(403).json({ message: "Access denied. Must be an owner." });
        }

        const claims = await Claim.find()
            .populate({
                path: 'userId',
                select: 'name email'
            })
            .populate({
                path: 'reservationId',
                populate: [
                    {
                        path: 'userId',
                        select: 'name email'
                    },
                    {
                        path: 'parkingId',
                        match: { Owner: req.user.id },
                        select: 'name location'
                    }
                ]
            })
            .sort({ createdAt: -1 });

        const ownerClaims = claims.filter(
            (claim) => claim.reservationId && claim.reservationId.parkingId
        );

        res.status(200).json({
            success: true,
            claims: ownerClaims
        });
    } catch (error) {
        console.error("Error fetching owner claims:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch owner claims",
            error: error.message
        });
    }
});
router.get("/All_claims", getClaims);
// Ajouter cette nouvelle route
router.put("/owner-claims/:claimId/status", getUserFromToken, async (req, res) => {
    try {
        const { claimId } = req.params;
        const { status, message } = req.body;
        
        // Vérifier que l'utilisateur est un propriétaire
        if (req.user.role !== 'Owner') {
            return res.status(403).json({ 
                message: 'Access denied. Must be an owner.' 
            });
        }

        // Trouver la réclamation et peupler les relations
        const claim = await Claim.findById(claimId)
            .populate('userId')
            .populate({
                path: 'reservationId',
                populate: [
                    { path: 'parkingId' },
                    { path: 'userId', select: 'name email' }  // Ajouter cette ligne pour obtenir les infos utilisateur
                ]
            });

        if (!claim) {
            return res.status(404).json({ message: 'Claim not found' });
        }

        // Mettre à jour le statut
        claim.status = status;
        await claim.save();

        // Préparer les détails de la réservation si disponibles
        let reservationDetails = null;
        if (claim.reservationId) {
            reservationDetails = {
                userName: claim.reservationId.userId?.name || 'Utilisateur inconnu',
                plateNumber: claim.plateNumber || claim.reservationId.matricule || 'Non spécifié',
                startTime: claim.reservationId.startTime,
                endTime: claim.reservationId.endTime
            };
        }

        // Utiliser le service d'email pour les notifications
        await sendClaimStatusEmail({
            email: claim.userId.email,
            status: status,
            userName: claim.userId.name,
            claimId: claim._id,
            parkingName: claim.reservationId?.parkingId.name || 'Parking inconnu',
            message: message,
            reservationDetails: reservationDetails
        });

        res.status(200).json({
            success: true,
            message: 'Claim status updated successfully',
            claim
        });

    } catch (error) {
        console.error('Error updating claim status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update claim status',
            error: error.message
        });
    }
});

module.exports = router;