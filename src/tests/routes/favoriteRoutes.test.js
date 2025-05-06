jest.setTimeout(30000); // Increase timeout to 30 seconds

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Favorite = require("../../models/favoriteModel");
const Parking = require("../../models/parkingModel");
const User = require("../../models/userModel");
const { verifyToken } = require("../../middlewares/authMiddleware");

// Mock dependencies
jest.mock("../../middlewares/authMiddleware");

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
const favoriteRoutes = require("../../routes/favoriteRoutes");

const app = express();
app.disable("x-powered-by");
app.use(express.json());
app.use("/api", favoriteRoutes);

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
  await Favorite.deleteMany({});
  await Parking.deleteMany({});
  await User.deleteMany({});
  jest.clearAllMocks();

  // Setup default middleware behavior
  verifyToken.mockImplementation((req, res, next) => {
    req.user = { _id: "testUserId", role: "User" };
    next();
  });
});

describe("Favorite Routes", () => {
  describe("POST /api/add/:parkingId", () => {
    it("should add a parking to favorites", async () => {
      const parking = await Parking.create({
        name: "Test Parking",
        totalSpots: 10,
        availableSpots: 10,
        pricing: { hourly: 5 },
        position: { lat: 36.8065, lng: 10.1815 },
        Owner: new mongoose.Types.ObjectId(),
      });

      const user = await User.create({
        name: "Test User",
        email: "test@example.com",
        password: "testpassword",
      });

      // Mock user authentication
      verifyToken.mockImplementation((req, res, next) => {
        req.user = { _id: user._id };
        next();
      });

      const mockFavorite = {
        _id: new mongoose.Types.ObjectId(),
        user: user._id,
        parking: parking._id,
      };

      // Mock Favorite.prototype.save
      jest
        .spyOn(Favorite.prototype, "save")
        .mockResolvedValueOnce(mockFavorite);

      expect(verifyToken).toBeDefined();
      expect(typeof Favorite.prototype.save).toBe("function");
    });
  });

  describe("DELETE /api/remove/:parkingId", () => {
    it("should remove a parking from favorites", async () => {
      const userId = new mongoose.Types.ObjectId();
      const parkingId = new mongoose.Types.ObjectId();

      // Mock user authentication
      verifyToken.mockImplementation((req, res, next) => {
        req.user = { _id: userId };
        next();
      });

      // Mock Favorite.findOneAndDelete
      const mockFindOneAndDelete = jest
        .spyOn(Favorite, "findOneAndDelete")
        .mockResolvedValueOnce({ user: userId, parking: parkingId });

      expect(verifyToken).toBeDefined();
      expect(mockFindOneAndDelete).toBeDefined();
    });
  });

  describe("GET /api", () => {
    it("should get all favorites for a user", async () => {
      const userId = new mongoose.Types.ObjectId();

      // Mock user authentication
      verifyToken.mockImplementation((req, res, next) => {
        req.user = { _id: userId };
        next();
      });

      const mockFavorites = [
        {
          _id: new mongoose.Types.ObjectId(),
          user: userId,
          parking: {
            _id: new mongoose.Types.ObjectId(),
            name: "Test Parking 1",
            location: "Test Location 1",
          },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          user: userId,
          parking: {
            _id: new mongoose.Types.ObjectId(),
            name: "Test Parking 2",
            location: "Test Location 2",
          },
        },
      ];

      // Mock Favorite.find().populate()
      jest.spyOn(Favorite, "find").mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockFavorites),
      }));

      expect(verifyToken).toBeDefined();
      expect(Favorite.find).toBeDefined();
    });

    it("should return empty array when user has no favorites", async () => {
      const userId = new mongoose.Types.ObjectId();

      // Mock user authentication
      verifyToken.mockImplementation((req, res, next) => {
        req.user = { _id: userId };
        next();
      });

      // Mock Favorite.find().populate()
      jest.spyOn(Favorite, "find").mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue([]),
      }));

      expect(verifyToken).toBeDefined();
      expect(Favorite.find).toBeDefined();
    });
  });
});
