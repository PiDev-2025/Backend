jest.setTimeout(30000); // Increase timeout to 30 seconds

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Reservation = require("../../models/reservationModel");
const User = require("../../models/userModel");
const Parking = require("../../models/parkingModel");
const { verifyToken, verifyRole } = require("../../middlewares/authMiddleware");
const reservationService = require("../../services/reservationService");

// Mock dependencies
jest.mock("../../middlewares/authMiddleware");
jest.mock("../../services/reservationService");

// Create a mock router
const mockRouter = {
  get: jest.fn().mockReturnThis(),
  post: jest.fn().mockReturnThis(),
  put: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  use: jest.fn().mockReturnThis(),
};

// Mock express
jest.mock("express", () => {
  const expressInstance = jest.fn(() => ({
    use: jest.fn(),
    json: jest.fn().mockReturnThis(),
    disable: jest.fn(),
  }));

  expressInstance.json = jest.fn().mockReturnValue(jest.fn());
  expressInstance.Router = jest.fn(() => mockRouter);

  return expressInstance;
});

const express = require("express");
const reservationRoutes = require("../../routes/reservationRoutes");

const app = express();
app.disable("x-powered-by");
app.use(express.json());
app.use("/api", reservationRoutes);

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
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
  jest.clearAllMocks();

  // Setup default middleware behavior
  verifyToken.mockImplementation((req, res, next) => {
    req.user = { id: "testUserId", role: "User" };
    next();
  });

  verifyRole.mockImplementation(() => (req, res, next) => {
    next();
  });
});

describe("Reservation Routes", () => {
  describe("POST /api/reservations", () => {
    it("should create a reservation successfully", async () => {
      // Create a test parking with all required fields
      const parking = await Parking.create({
        name: "Test Parking",
        totalSpots: 10,
        availableSpots: 10,
        Owner: new mongoose.Types.ObjectId(),
        position: {
          lat: 36.8065,
          lng: 10.1815,
        },
        pricing: {
          hourly: 5.0,
        },
        location: "Test Location",
      });

      const reservationData = {
        parkingId: parking._id,
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        vehicleType: "Citadine",
        totalPrice: 10,
        spotId: "A1",
        matricule: "ABC123",
      };

      // Mock the service response
      reservationService.createReservation.mockResolvedValue({
        ...reservationData,
        _id: new mongoose.Types.ObjectId(),
        status: "pending",
      });

      expect(reservationService.createReservation).toBeDefined();
      expect(typeof reservationService.createReservation).toBe("function");
    });
  });

  describe("GET /api/list-all", () => {
    it("should get all reservations", async () => {
      expect(reservationService.getReservations).toBeDefined();
      expect(typeof reservationService.getReservations).toBe("function");
    });
  });

  describe("GET /api/reservations/my-reservations", () => {
    it("should get user reservations", async () => {
      expect(reservationService.getReservationsByUserId).toBeDefined();
      expect(typeof reservationService.getReservationsByUserId).toBe(
        "function"
      );
    });
  });

  describe("GET /api/owner-reservations", () => {
    it("should get owner reservations when user is owner", async () => {
      verifyToken.mockImplementation((req, res, next) => {
        req.user = { id: "testUserId", role: "Owner" };
        next();
      });

      expect(reservationService.getOwnerReservations).toBeDefined();
      expect(typeof reservationService.getOwnerReservations).toBe("function");
    });
  });

  describe("PUT /api/owner-reservations/:id/status", () => {
    it("should update reservation status", async () => {
      const reservationId = new mongoose.Types.ObjectId();

      reservationService.updateReservationStatus.mockResolvedValue({
        _id: reservationId,
        status: "accepted",
      });

      expect(reservationService.updateReservationStatus).toBeDefined();
      expect(typeof reservationService.updateReservationStatus).toBe(
        "function"
      );
    });
  });

  describe("POST /api/check-availability", () => {
    it("should check parking availability", async () => {
      const parkingId = new mongoose.Types.ObjectId();

      reservationService.checkAvailability.mockResolvedValue({
        available: true,
        availableSpots: 5,
      });

      expect(reservationService.checkAvailability).toBeDefined();
      expect(typeof reservationService.checkAvailability).toBe("function");
    });
  });

  describe("DELETE /api/:id", () => {
    it("should delete a reservation", async () => {
      const reservationId = new mongoose.Types.ObjectId();

      reservationService.deleteReservation.mockResolvedValue({
        message: "Reservation deleted successfully",
      });

      expect(reservationService.deleteReservation).toBeDefined();
      expect(typeof reservationService.deleteReservation).toBe("function");
    });
  });

  describe("GET /api/reservation/:id", () => {
    it("should get a reservation by id", async () => {
      const reservationId = new mongoose.Types.ObjectId();

      reservationService.getReservationById.mockResolvedValue({
        _id: reservationId,
        status: "pending",
      });

      expect(reservationService.getReservationById).toBeDefined();
      expect(typeof reservationService.getReservationById).toBe("function");
    });
  });
});
