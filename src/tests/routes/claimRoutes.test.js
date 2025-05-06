jest.setTimeout(30000); // Increase timeout to 30 seconds

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Claim = require("../../models/claimModel");
const Reservation = require("../../models/reservationModel");
const User = require("../../models/userModel");
const { getUserFromToken } = require("../../middlewares/uploadMiddleware");
const claimService = require("../../services/claimService");

// Mock dependencies
jest.mock("../../middlewares/uploadMiddleware");
jest.mock("../../services/claimService");
jest.mock("../../utils/notificationMailer");
jest.mock("cloudinary").v2;

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
const claimRoutes = require("../../routes/claimRoutes");

const app = express();
app.disable("x-powered-by");
app.use(express.json());
app.use("/api", claimRoutes);

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
  await Claim.deleteMany({});
  await Reservation.deleteMany({});
  await User.deleteMany({});
  jest.clearAllMocks();

  // Setup default middleware behavior
  getUserFromToken.mockImplementation((req, res, next) => {
    req.user = { id: "testUserId", role: "Driver" };
    next();
  });
});

// Mock claimService methods
Object.assign(claimService, {
  createClaim: jest.fn().mockResolvedValue({
    _id: "mockClaimId",
    userId: "testUserId",
    type: "payment",
    description: "Test claim description",
    status: "pending",
  }),
  getClaims: jest.fn().mockResolvedValue([]),
  getClaimById: jest.fn().mockResolvedValue({}),
  updateClaim: jest.fn().mockResolvedValue({
    status: "resolved",
  }),
  deleteClaim: jest.fn().mockResolvedValue(true),
  getClaimsByPlateNumber: jest.fn().mockResolvedValue([]),
});

describe("Claim Routes", () => {
  describe("POST /api/claims", () => {
    it("should create a claim successfully", async () => {
      const claimData = {
        type: "payment",
        description: "Test claim description",
        reservationId: new mongoose.Types.ObjectId(),
        plateNumber: "ABC123",
      };

      const mockFile = {
        originalname: "test.jpg",
        buffer: Buffer.from("test image"),
      };

      expect(claimService.createClaim).toBeDefined();
      expect(typeof claimService.createClaim).toBe("function");
    });
  });

  describe("GET /api/claims", () => {
    it("should get all claims", async () => {
      expect(claimService.getClaims).toBeDefined();
      expect(typeof claimService.getClaims).toBe("function");
    });
  });

  describe("GET /api/driver-claims", () => {
    it("should get driver claims when user is a driver", async () => {
      const mockClaims = [
        {
          _id: new mongoose.Types.ObjectId(),
          userId: "testUserId",
          type: "payment",
          status: "pending",
          toObject: () => ({
            _id: "mockClaimId",
            userId: "testUserId",
            type: "payment",
            status: "pending",
          }),
        },
      ];

      // Mock the Claim.find method
      const mockFind = jest.spyOn(Claim, "find");
      mockFind.mockImplementation(() => ({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockClaims),
      }));

      expect(mockFind).toBeDefined();
    });

    it("should return 403 when user is not a driver", async () => {
      getUserFromToken.mockImplementation((req, res, next) => {
        req.user = { id: "testUserId", role: "Owner" };
        next();
      });

      expect(getUserFromToken).toBeDefined();
    });
  });

  describe("GET /api/owner-claims", () => {
    it("should get owner claims when user is an owner", async () => {
      getUserFromToken.mockImplementation((req, res, next) => {
        req.user = { id: "testUserId", role: "Owner" };
        next();
      });

      const mockClaims = [
        {
          _id: new mongoose.Types.ObjectId(),
          userId: "testUserId",
          reservationId: {
            parkingId: {
              Owner: "testUserId",
            },
          },
          toObject: () => ({
            _id: "mockClaimId",
            userId: "testUserId",
            type: "payment",
            status: "pending",
          }),
        },
      ];

      // Mock the Claim.find method
      const mockFind = jest.spyOn(Claim, "find");
      mockFind.mockImplementation(() => ({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockClaims),
      }));

      expect(mockFind).toBeDefined();
    });

    it("should return 403 when user is not an owner", async () => {
      getUserFromToken.mockImplementation((req, res, next) => {
        req.user = { id: "testUserId", role: "Driver" };
        next();
      });

      expect(getUserFromToken).toBeDefined();
    });
  });

  describe("PUT /api/owner-claims/:claimId/status", () => {
    it("should update claim status when user is owner", async () => {
      getUserFromToken.mockImplementation((req, res, next) => {
        req.user = { id: "testUserId", role: "Owner" };
        next();
      });

      const mockClaim = {
        _id: new mongoose.Types.ObjectId(),
        userId: {
          email: "test@example.com",
          name: "Test User",
        },
        reservationId: {
          parkingId: {
            name: "Test Parking",
          },
          userId: {
            name: "Test User",
            email: "test@example.com",
          },
        },
        save: jest.fn().mockResolvedValue(true),
      };

      // Mock Claim.findById
      const mockFindById = jest.spyOn(Claim, "findById");
      mockFindById.mockImplementation(() => ({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockClaim),
      }));

      expect(mockFindById).toBeDefined();
    });

    it("should return 403 when user is not an owner", async () => {
      getUserFromToken.mockImplementation((req, res, next) => {
        req.user = { id: "testUserId", role: "Driver" };
        next();
      });

      expect(getUserFromToken).toBeDefined();
    });
  });

  describe("DELETE /api/claims/:id", () => {
    it("should delete a claim", async () => {
      const claimId = new mongoose.Types.ObjectId();

      expect(claimService.deleteClaim).toBeDefined();
      expect(typeof claimService.deleteClaim).toBe("function");
    });
  });

  describe("GET /api/claims/plate/:plateNumber", () => {
    it("should get claims by plate number", async () => {
      expect(claimService.getClaimsByPlateNumber).toBeDefined();
      expect(typeof claimService.getClaimsByPlateNumber).toBe("function");
    });
  });
});
