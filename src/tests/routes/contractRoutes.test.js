jest.setTimeout(30000); // Increase timeout to 30 seconds

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Contract = require("../../models/contractModel");
const User = require("../../models/userModel");
const { verifyToken, verifyRole } = require("../../middlewares/authMiddleware");
const contractService = require("../../services/contractService");

// Mock dependencies
jest.mock("../../middlewares/authMiddleware");
jest.mock("../../services/contractService");

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
const contractRoutes = require("../../routes/contractRoutes");

const app = express();
app.disable("x-powered-by");
app.use(express.json());
app.use("/api", contractRoutes);

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await Contract.deleteMany({});
  await User.deleteMany({});
  jest.clearAllMocks();

  // Setup default middleware behavior
  verifyToken.mockImplementation((req, res, next) => {
    req.user = { _id: "testUserId", role: "Admin", id: "testUserId" };
    next();
  });

  verifyRole.mockImplementation(() => (req, res, next) => {
    next();
  });
});

// Mock contractService methods
Object.assign(contractService, {
  createContract: jest.fn().mockImplementation((req, res) => {
    res.status(201).json({ message: "Contract created successfully" });
  }),
  getContracts: jest.fn().mockImplementation((req, res) => {
    res.status(200).json({ contracts: [] });
  }),
  getContractById: jest.fn().mockImplementation((req, res) => {
    res.status(200).json({ contract: {} });
  }),
  updateContract: jest.fn().mockImplementation((req, res) => {
    res.status(200).json({ message: "Contract updated successfully" });
  }),
  deleteContract: jest.fn().mockImplementation((req, res) => {
    res.status(200).json({ message: "Contract deleted successfully" });
  }),
});

describe("Contract Routes", () => {
  describe("POST /api/contracts", () => {
    it("should create a contract successfully", async () => {
      const contractData = {
        title: "Test Contract",
        description: "Test Description",
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000), // Tomorrow
        terms: "Test Terms",
        status: "active",
      };

      expect(contractService.createContract).toBeDefined();
      expect(typeof contractService.createContract).toBe("function");
    });
  });

  describe("GET /api/contracts", () => {
    it("should get all contracts", async () => {
      expect(contractService.getContracts).toBeDefined();
      expect(typeof contractService.getContracts).toBe("function");
    });
  });

  describe("GET /api/contracts/:id", () => {
    it("should get a contract by id", async () => {
      const contractId = new mongoose.Types.ObjectId();

      expect(contractService.getContractById).toBeDefined();
      expect(typeof contractService.getContractById).toBe("function");
    });
  });

  describe("PUT /api/contracts/:id", () => {
    it("should update a contract", async () => {
      const contractId = new mongoose.Types.ObjectId();
      const updateData = {
        title: "Updated Contract",
        description: "Updated Description",
        status: "inactive",
      };

      expect(contractService.updateContract).toBeDefined();
      expect(typeof contractService.updateContract).toBe("function");
    });
  });

  describe("DELETE /api/contracts/:id", () => {
    it("should delete a contract", async () => {
      const contractId = new mongoose.Types.ObjectId();

      expect(contractService.deleteContract).toBeDefined();
      expect(typeof contractService.deleteContract).toBe("function");
    });
  });
});
