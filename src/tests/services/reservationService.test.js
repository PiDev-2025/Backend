jest.setTimeout(30000); // Increase timeout to 30 seconds

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const ReservationService = require('../../services/reservationService');
const Reservation = require('../../models/reservationModel');
const Parking = require('../../models/parkingModel');
const User = require('../../models/userModel');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await Reservation.deleteMany({});
  await Parking.deleteMany({});
  await User.deleteMany({});
});

describe('Reservation Service - Simple Operations', () => {
  describe('createReservation', () => {
    it('should create a reservation successfully', async () => {
      const parking = await Parking.create({
        name: 'Test Parking',
        totalSpots: 100,
        availableSpots: 100,
        pricing: { hourly: 5 },
        position: { lat: 36.8065, lng: 10.1815 }, // Added position field
        Owner: new mongoose.Types.ObjectId(),
      });

      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
      });

      const reservationData = {
        parkingId: parking._id,
        userId: user._id,
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000), // 1 hour later
        vehicleType: 'Citadine',
        totalPrice: 5,
        paymentMethod: 'cash',
        spotId: 'parking-spot-1', // Added required spotId
      };

      const reservation = await ReservationService.createReservation(reservationData);

      expect(reservation).toBeTruthy();
      expect(reservation.parkingId.toString()).toBe(parking._id.toString());
      expect(reservation.userId.toString()).toBe(user._id.toString());
      expect(reservation.totalPrice).toBe(5);
    });

    it('should throw an error if parking is not found', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
      });

      const reservationData = {
        parkingId: new mongoose.Types.ObjectId(),
        userId: user._id,
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        vehicleType: 'Citadine',
        totalPrice: 5,
        paymentMethod: 'cash',
        spotId: 'parking-spot-1', // Added required spotId
      };

      await expect(ReservationService.createReservation(reservationData)).rejects.toThrow('Parking non trouvé');
    });
  });

 

  describe('deleteReservation', () => {
    it('should delete a reservation and restore parking spot', async () => {
      const parking = await Parking.create({
        name: 'Test Parking',
        totalSpots: 100,
        availableSpots: 99,
        pricing: { hourly: 5 },
        position: { lat: 36.8065, lng: 10.1815 }, // Added position field
        Owner: new mongoose.Types.ObjectId(),
      });

      const reservation = await Reservation.create({
        parkingId: parking._id,
        userId: new mongoose.Types.ObjectId(),
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        vehicleType: 'Citadine',
        totalPrice: 5,
        status: 'accepted', // Ensure status is 'accepted' to trigger parking spot restoration
        paymentMethod: 'cash',
        spotId: 'parking-spot-1', // Added required spotId
      });

      const mockReq = { params: { id: reservation._id } };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await ReservationService.deleteReservation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Réservation supprimée' });

      const deletedReservation = await Reservation.findById(reservation._id);
      expect(deletedReservation).toBeNull();

      const updatedParking = await Parking.findById(parking._id);
      expect(updatedParking.availableSpots).toBe(100); // Ensure parking spot is restored
    });
  });
});
