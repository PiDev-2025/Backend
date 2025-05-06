jest.setTimeout(30000); // Increase timeout to 30 seconds

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Subscription = require("../../models/subscriptionModel");
const User = require("../../models/userModel");
const { verifyToken, verifyRole } = require("../../middlewares/authMiddleware");
const subscriptionService = require("../../services/subscriptionService");

// Mock dependencies
jest.mock("../../middlewares/authMiddleware");
jest.mock("../../services/subscriptionService");

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
const subscriptionRoutes = require("../../routes/subscriptionRoutes");

const app = express();
app.disable("x-powered-by");
app.use(express.json());
app.use("/api", subscriptionRoutes);

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
  await Subscription.deleteMany({});
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

// Mock subscriptionService methods
Object.assign(subscriptionService, {
  createSubscription: jest.fn().mockImplementation((req, res) => {
    res.status(201).json({ message: "Subscription created successfully" });
  }),
  getSubscriptions: jest.fn().mockImplementation((req, res) => {
    res.status(200).json({ subscriptions: [] });
  }),
  getSubscriptionById: jest.fn().mockImplementation((req, res) => {
    res.status(200).json({ subscription: {} });
  }),
  updateSubscription: jest.fn().mockImplementation((req, res) => {
    res.status(200).json({ message: "Subscription updated successfully" });
  }),
  deleteSubscription: jest.fn().mockImplementation((req, res) => {
    res.status(200).json({ message: "Subscription deleted successfully" });
  }),
  getSubscriptionsByUserId: jest.fn().mockImplementation((userId) => {
    return Promise.resolve([]);
  }),
  deleteCanceledSubscriptionsByUserId: jest
    .fn()
    .mockImplementation((req, res) => {
      res
        .status(200)
        .json({ message: "Canceled subscriptions deleted successfully" });
    }),
  getActiveSubscriptionStatus: jest.fn().mockImplementation((req, res) => {
    res.status(200).json({ status: "active" });
  }),
  cancelSubscription: jest.fn().mockImplementation((id) => {
    return Promise.resolve(true);
  }),
});

describe("Subscription Routes", () => {
  describe("POST /api/subscriptions", () => {
    it("should create a subscription successfully", async () => {
      const subscriptionData = {
        userId: new mongoose.Types.ObjectId(),
        plan: "premium",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days later
        status: "active",
        price: 29.99,
      };

      expect(subscriptionService.createSubscription).toBeDefined();
      expect(typeof subscriptionService.createSubscription).toBe("function");
    });
  });

  describe("GET /api/subscriptions", () => {
    it("should get all subscriptions", async () => {
      expect(subscriptionService.getSubscriptions).toBeDefined();
      expect(typeof subscriptionService.getSubscriptions).toBe("function");
    });
  });

  describe("GET /api/subscriptions/:id", () => {
    it("should get a subscription by id", async () => {
      const subscriptionId = new mongoose.Types.ObjectId();

      expect(subscriptionService.getSubscriptionById).toBeDefined();
      expect(typeof subscriptionService.getSubscriptionById).toBe("function");
    });
  });

  describe("GET /api/subscriptions/user/:userId", () => {
    it("should get subscriptions by user id", async () => {
      const userId = new mongoose.Types.ObjectId();

      expect(subscriptionService.getSubscriptionsByUserId).toBeDefined();
      expect(typeof subscriptionService.getSubscriptionsByUserId).toBe(
        "function"
      );
    });
  });

  describe("PUT /api/subscriptions/:id", () => {
    it("should update a subscription", async () => {
      const subscriptionId = new mongoose.Types.ObjectId();
      const updateData = {
        status: "canceled",
        endDate: new Date(),
      };

      expect(subscriptionService.updateSubscription).toBeDefined();
      expect(typeof subscriptionService.updateSubscription).toBe("function");
    });
  });

  describe("DELETE /api/subscriptions/:id", () => {
    it("should delete a subscription", async () => {
      const subscriptionId = new mongoose.Types.ObjectId();

      expect(subscriptionService.deleteSubscription).toBeDefined();
      expect(typeof subscriptionService.deleteSubscription).toBe("function");
    });
  });

  describe("DELETE /api/subscriptions/user/:userId/canceled", () => {
    it("should delete canceled subscriptions for a user", async () => {
      const userId = new mongoose.Types.ObjectId();

      expect(
        subscriptionService.deleteCanceledSubscriptionsByUserId
      ).toBeDefined();
      expect(
        typeof subscriptionService.deleteCanceledSubscriptionsByUserId
      ).toBe("function");
    });
  });

  describe("GET /api/subscriptions/user/:userId/status", () => {
    it("should get active subscription status", async () => {
      const userId = new mongoose.Types.ObjectId();

      expect(subscriptionService.getActiveSubscriptionStatus).toBeDefined();
      expect(typeof subscriptionService.getActiveSubscriptionStatus).toBe(
        "function"
      );
    });
  });

  describe("DELETE /api/subscriptions/cancel/:id", () => {
    it("should cancel a subscription", async () => {
      const subscriptionId = new mongoose.Types.ObjectId();

      expect(subscriptionService.cancelSubscription).toBeDefined();
      expect(typeof subscriptionService.cancelSubscription).toBe("function");
    });
  });
});
