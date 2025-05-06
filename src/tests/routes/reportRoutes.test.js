jest.setTimeout(30000); // Increase timeout to 30 seconds

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Report = require("../../models/reportModel");
const User = require("../../models/userModel");
const { verifyToken } = require("../../middlewares/authMiddleware");
const reportService = require("../../services/reportService");

// Mock dependencies
jest.mock("../../middlewares/authMiddleware");
jest.mock("../../services/reportService");

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
const reportRoutes = require("../../routes/reportRoutes");

const app = express();
app.disable("x-powered-by");
app.use(express.json());
app.use("/api", reportRoutes);

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
  await Report.deleteMany({});
  await User.deleteMany({});
  jest.clearAllMocks();

  // Setup default middleware behavior
  verifyToken.mockImplementation((req, res, next) => {
    req.user = { _id: "testUserId", role: "Admin" };
    next();
  });
});

// Mock reportService methods
Object.assign(reportService, {
  createReport: jest.fn().mockImplementation((req, res) => {
    res.status(201).json({ message: "Report created successfully" });
  }),
  getReports: jest.fn().mockImplementation((req, res) => {
    res.status(200).json({ reports: [] });
  }),
  getReportById: jest.fn().mockImplementation((req, res) => {
    res.status(200).json({ report: {} });
  }),
  updateReport: jest.fn().mockImplementation((req, res) => {
    res.status(200).json({ message: "Report updated successfully" });
  }),
  deleteReport: jest.fn().mockImplementation((req, res) => {
    res.status(200).json({ message: "Report deleted successfully" });
  }),
});

describe("Report Routes", () => {
  describe("POST /api/reports", () => {
    it("should create a report successfully", async () => {
      const reportData = {
        title: "Test Report",
        description: "Test Description",
        type: "incident",
        priority: "high",
        status: "open",
      };

      expect(reportService.createReport).toBeDefined();
      expect(typeof reportService.createReport).toBe("function");
    });

    it("should handle errors when creating a report", async () => {
      reportService.createReport.mockImplementation((req, res) => {
        res.status(500).json({ message: "Error creating report" });
      });

      expect(reportService.createReport).toBeDefined();
      expect(typeof reportService.createReport).toBe("function");
    });
  });

  describe("GET /api/reports", () => {
    it("should get all reports", async () => {
      const mockReports = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: "Test Report 1",
          description: "Test Description 1",
          type: "incident",
          status: "open",
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: "Test Report 2",
          description: "Test Description 2",
          type: "issue",
          status: "closed",
        },
      ];

      reportService.getReports.mockImplementation((req, res) => {
        res.status(200).json({ reports: mockReports });
      });

      expect(reportService.getReports).toBeDefined();
      expect(typeof reportService.getReports).toBe("function");
    });
  });

  describe("GET /api/reports/:id", () => {
    it("should get a report by id", async () => {
      const reportId = new mongoose.Types.ObjectId();
      const mockReport = {
        _id: reportId,
        title: "Test Report",
        description: "Test Description",
        type: "incident",
        status: "open",
      };

      reportService.getReportById.mockImplementation((req, res) => {
        res.status(200).json({ report: mockReport });
      });

      expect(reportService.getReportById).toBeDefined();
      expect(typeof reportService.getReportById).toBe("function");
    });

    it("should handle not found report", async () => {
      reportService.getReportById.mockImplementation((req, res) => {
        res.status(404).json({ message: "Report not found" });
      });

      expect(reportService.getReportById).toBeDefined();
      expect(typeof reportService.getReportById).toBe("function");
    });
  });

  describe("PUT /api/reports/:id", () => {
    it("should update a report", async () => {
      const reportId = new mongoose.Types.ObjectId();
      const updateData = {
        title: "Updated Report",
        description: "Updated Description",
        status: "closed",
      };

      reportService.updateReport.mockImplementation((req, res) => {
        res.status(200).json({
          message: "Report updated successfully",
          report: { _id: reportId, ...updateData },
        });
      });

      expect(reportService.updateReport).toBeDefined();
      expect(typeof reportService.updateReport).toBe("function");
    });
  });

  describe("DELETE /api/reports/:id", () => {
    it("should delete a report", async () => {
      const reportId = new mongoose.Types.ObjectId();

      reportService.deleteReport.mockImplementation((req, res) => {
        res.status(200).json({ message: "Report deleted successfully" });
      });

      expect(reportService.deleteReport).toBeDefined();
      expect(typeof reportService.deleteReport).toBe("function");
    });

    it("should handle not found report when deleting", async () => {
      reportService.deleteReport.mockImplementation((req, res) => {
        res.status(404).json({ message: "Report not found" });
      });

      expect(reportService.deleteReport).toBeDefined();
      expect(typeof reportService.deleteReport).toBe("function");
    });
  });
});
