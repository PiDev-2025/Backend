const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    parkingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parking', default: null },
    reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', default: null },
    status: { type: String, enum: ['en_attente', 'acceptée', 'refusée'], default: 'en_attente' },
    isRead: { type: Boolean, default: false },
    messageRequested: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);  