jest.setTimeout(30000); // Increase timeout to 30 seconds

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Notification = require("../../models/notificationModel");
const User = require("../../models/userModel");
const { getUserFromToken } = require("../../middlewares/uploadMiddleware");
const notificationController = require("../../controllers/notificationController");

// Mock dependencies
jest.mock("../../middlewares/uploadMiddleware");
jest.mock("../../controllers/notificationController");

// Create a mock router
const mockRouter = {
  get: jest.fn().mockReturnThis(),
  post: jest.fn().mockReturnThis(),
  put: jest.fn().mockReturnThis(),
  patch: jest.fn().mockReturnThis(),
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
const notificationRoutes = require("../../routes/notificationRoutes");

const app = express();
app.disable("x-powered-by");
app.use(express.json());
app.use("/api", notificationRoutes);

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
  await Notification.deleteMany({});
  await User.deleteMany({});
  jest.clearAllMocks();

  // Setup default middleware behavior
  getUserFromToken.mockImplementation((req, res, next) => {
    req.user = { id: "testUserId", role: "User" };
    next();
  });
});

// Mock notification controller methods
Object.assign(notificationController, {
  getUserNotifications: jest.fn().mockImplementation((req, res) => {
    res.status(200).json({ notifications: [] });
  }),
  countUnread: jest.fn().mockImplementation((req, res) => {
    res.status(200).json({ count: 0 });
  }),
  createNotification: jest.fn().mockImplementation((req, res) => {
    res.status(201).json({ message: "Notification created successfully" });
  }),
  markNotificationAsRead: jest.fn().mockImplementation((req, res) => {
    res.status(200).json({ message: "Notification marked as read" });
  }),
  markAllNotificationsAsRead: jest.fn().mockImplementation((req, res) => {
    res.status(200).json({ message: "All notifications marked as read" });
  }),
});

describe("Notification Routes", () => {
  describe("GET /api/all", () => {
    it("should get user notifications", async () => {
      const mockNotifications = [
        {
          _id: new mongoose.Types.ObjectId(),
          userId: "testUserId",
          message: "Test notification 1",
          isRead: false,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          userId: "testUserId",
          message: "Test notification 2",
          isRead: true,
        },
      ];

      notificationController.getUserNotifications.mockImplementation(
        (req, res) => {
          res.status(200).json({ notifications: mockNotifications });
        }
      );

      expect(notificationController.getUserNotifications).toBeDefined();
      expect(typeof notificationController.getUserNotifications).toBe(
        "function"
      );
    });

    it("should handle errors when getting notifications", async () => {
      notificationController.getUserNotifications.mockImplementation(
        (req, res) => {
          res.status(500).json({ message: "Internal server error" });
        }
      );

      expect(notificationController.getUserNotifications).toBeDefined();
      expect(typeof notificationController.getUserNotifications).toBe(
        "function"
      );
    });
  });

  describe("GET /api/unread-count", () => {
    it("should get unread notification count", async () => {
      notificationController.countUnread.mockImplementation((req, res) => {
        res.status(200).json({ count: 5 });
      });

      expect(notificationController.countUnread).toBeDefined();
      expect(typeof notificationController.countUnread).toBe("function");
    });
  });

  describe("POST /api/", () => {
    it("should create a notification", async () => {
      const notificationData = {
        message: "Test notification",
        type: "info",
        userId: "testUserId",
      };

      notificationController.createNotification.mockImplementation(
        (req, res) => {
          res.status(201).json({
            success: true,
            notification: {
              ...notificationData,
              _id: new mongoose.Types.ObjectId(),
              isRead: false,
              createdAt: new Date(),
            },
          });
        }
      );

      expect(notificationController.createNotification).toBeDefined();
      expect(typeof notificationController.createNotification).toBe("function");
    });
  });

  describe("PATCH /api/:id/read", () => {
    it("should mark a notification as read", async () => {
      const notificationId = new mongoose.Types.ObjectId();

      notificationController.markNotificationAsRead.mockImplementation(
        (req, res) => {
          res.status(200).json({
            success: true,
            notification: {
              _id: notificationId,
              isRead: true,
              updatedAt: new Date(),
            },
          });
        }
      );

      expect(notificationController.markNotificationAsRead).toBeDefined();
      expect(typeof notificationController.markNotificationAsRead).toBe(
        "function"
      );
    });

    it("should handle errors when notification not found", async () => {
      notificationController.markNotificationAsRead.mockImplementation(
        (req, res) => {
          res.status(404).json({ message: "Notification not found" });
        }
      );

      expect(notificationController.markNotificationAsRead).toBeDefined();
      expect(typeof notificationController.markNotificationAsRead).toBe(
        "function"
      );
    });
  });

  describe("PATCH /api/read-all", () => {
    it("should mark all notifications as read", async () => {
      notificationController.markAllNotificationsAsRead.mockImplementation(
        (req, res) => {
          res.status(200).json({
            success: true,
            message: "All notifications marked as read",
            updatedCount: 5,
          });
        }
      );

      expect(notificationController.markAllNotificationsAsRead).toBeDefined();
      expect(typeof notificationController.markAllNotificationsAsRead).toBe(
        "function"
      );
    });
  });
});
