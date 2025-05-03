const Claim = require("../models/claimModel");
const { v4: uuidv4 } = require('uuid');
const plateDetectionService = require('./plateDetectionService');
const Reservation = require("../models/reservationModel");

const standardizePlateNumber = (plateText) => {
    if (!plateText) return null;
    
    const parts = plateText.split(' ');
    if (parts.length === 3) {
        const [number1, region, number2] = parts;
        return `${number2} ${region} ${number1}`;
    }
    return plateText;
};

const findMatchingReservation = async (plateNumber) => {
    try {
        console.log('🔍 Searching for reservation with plate number:', plateNumber);
        
        // Rechercher une réservation avec la même matricule
        const matchingReservation = await Reservation.findOne({
            matricule: plateNumber,
            status: { $in: ['pending', 'active', 'accepted'] }
        }).populate('parkingId', 'name location')
          .populate('userId', 'name email');

        if (matchingReservation) {
            console.log('✅ Found matching reservation:', {
                id: matchingReservation._id,
                status: matchingReservation.status,
                matricule: matchingReservation.matricule,
                parkingName: matchingReservation.parkingId?.name
            });
        } else {
            console.log('❌ No reservation found for plate:', plateNumber);
            
            // Rechercher avec une correspondance insensible à la casse
            const altMatchingReservation = await Reservation.findOne({
                matricule: { $regex: new RegExp('^' + plateNumber + '$', 'i') },
                status: { $in: ['pending', 'active', 'accepted'] }
            }).populate('parkingId', 'name location')
              .populate('userId', 'name email');

            if (altMatchingReservation) {
                console.log('✅ Found matching reservation with case-insensitive search:', {
                    id: altMatchingReservation._id,
                    status: altMatchingReservation.status,
                    matricule: altMatchingReservation.matricule
                });
                return altMatchingReservation;
            }
        }

        return matchingReservation;
    } catch (error) {
        console.error('❌ Error finding matching reservation:', error);
        return null;
    }
};

const createClaim = async (req, res) => {
    try {
        if (!req.file || !req.body.description) {
            return res.status(400).json({ 
                message: !req.file ? "Image is required" : "Description is required" 
            });
        }

        const imageUrl = req.file.path;
        let plateNumber = null;
        let reservationId = null;
        let reservationDetails = null;
        
        try {
            const plateDetectionResult = await plateDetectionService.detectPlate(imageUrl);
            
            if (plateDetectionResult.success && plateDetectionResult.plateText) {
                plateNumber = plateDetectionResult.plateText;
                console.log('📌 Detected plate number:', plateNumber);

                // Rechercher la réservation correspondante
                const matchingReservation = await findMatchingReservation(plateNumber);
                
                if (matchingReservation) {
                    console.log('✅ Found matching reservation:', matchingReservation._id);
                    reservationId = matchingReservation._id;
                    reservationDetails = {
                        parkingName: matchingReservation.parkingId.name,
                        location: matchingReservation.parkingId.location,
                        startTime: matchingReservation.startTime,
                        endTime: matchingReservation.endTime
                    };
                } else {
                    console.log('⚠️ No matching reservation found for plate:', plateNumber);
                }
            }
        } catch (detectionError) {
            console.error('❌ Plate detection error:', detectionError);
        }

        const claim = new Claim({
            claimId: uuidv4(),
            userId: req.user._id,
            imageUrl: imageUrl,
            description: req.body.description,
            plateNumber: plateNumber,
            reservationId: reservationId,
            status: "Pending"
        });

        await claim.save();

        res.status(201).json({
            success: true,
            claim,
            plateDetected: !!plateNumber,
            reservationFound: !!reservationId,
            reservationDetails: reservationDetails
        });

    } catch (error) {
        console.error('Error in createClaim:', error);
        res.status(500).json({ 
            success: false,
            message: "Failed to create claim",
            error: error.message 
        });
    }
};

const getClaims = async (req, res) => {
    try {
        const claims = await Claim.find()
            .populate('userId', 'name email')
            .populate('reservationId', 'startTime endTime parkingSpotId');
            
        res.status(200).json({
            success: true,
            claims
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
};

const getClaimById = async (req, res) => {
    try {
        const claim = await Claim.findById(req.params.id)
            .populate('userId', 'name email')
            .populate('reservationId', 'startTime endTime parkingSpotId');
            
        if (!claim) {
            return res.status(404).json({ 
                success: false,
                message: "Claim not found" 
            });
        }
        
        res.status(200).json({
            success: true,
            claim
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
};

const updateClaim = async (req, res) => {
    try {
        const updatedClaim = await Claim.findByIdAndUpdate(
            req.params.id, 
            req.body,
            { new: true, runValidators: true }
        ).populate('userId', 'name email')
         .populate('reservationId', 'startTime endTime parkingSpotId');

        if (!updatedClaim) {
            return res.status(404).json({ 
                success: false,
                message: "Claim not found" 
            });
        }

        res.status(200).json({
            success: true,
            claim: updatedClaim
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
};

const deleteClaim = async (req, res) => {
    try {
        const deletedClaim = await Claim.findByIdAndDelete(req.params.id);
        
        if (!deletedClaim) {
            return res.status(404).json({ 
                success: false,
                message: "Claim not found" 
            });
        }
        
        res.status(200).json({
            success: true,
            message: "Claim deleted successfully"
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
};

const getClaimsByPlateNumber = async (req, res) => {
    try {
        const { plateNumber } = req.params;
        
        // Standardiser le format de la plaque d'immatriculation pour la recherche
        const standardizedPlate = standardizePlateNumber(plateNumber);
        
        // Rechercher les réclamations avec cette plaque
        const claims = await Claim.find({ plateNumber: standardizedPlate })
            .populate('userId', 'name email')
            .populate({
                path: 'reservationId',
                populate: {
                    path: 'parkingId',
                    select: 'name location'
                }
            })
            .sort({ createdAt: -1 });

        // Rechercher aussi les réservations associées
        const reservations = await Reservation.find({ 
            matricule: standardizedPlate,
            status: { $in: ['active', 'pending'] }
        }).populate('parkingId', 'name location');

        res.status(200).json({
            success: true,
            claims,
            reservations,
            plateNumber: standardizedPlate
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
};

module.exports = {
    createClaim,
    getClaims,
    getClaimById,
    updateClaim,
    deleteClaim,
    getClaimsByPlateNumber
};