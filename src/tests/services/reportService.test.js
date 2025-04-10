const mongoose = require("mongoose");
const Report = require("../../models/reportModel");
const {
  createReport,
  getReports,
  getReportById,
  updateReport,
  deleteReport,
} = require("../../services/reportService");

// Mock mongoose and Report model
jest.mock("../../models/reportModel");

// Mock request and response objects
const mockRequest = (body = {}, params = {}) => ({
  body,
  params,
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("Report Service Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe("createReport", () => {
    test("should create a new report successfully", async () => {
      const req = mockRequest({
        reportId: "REP-001",
        parkingId: "PARK-001",
        dateRange: new Date("2025-04-10"),
        totalRevenue: 1500,
      });
      const res = mockResponse();

      // This is what the service will actually return (with _id)
      const expectedResponse = {
        _id: "mockid123",
        reportId: "REP-001",
        parkingId: "PARK-001",
        dateRange: new Date("2025-04-10"),
        totalRevenue: 1500,
      };

      // Create mock instance that will be returned by the Report constructor
      const mockInstance = {
        ...req.body,
        save: jest.fn().mockResolvedValue(expectedResponse),
      };
      Report.mockReturnValue(mockInstance);

      await createReport(req, res);

      expect(Report).toHaveBeenCalledWith(req.body);
      expect(mockInstance.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);

      // Use expect.objectContaining to ignore the save method
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          reportId: "REP-001",
          parkingId: "PARK-001",
          dateRange: new Date("2025-04-10"),
          totalRevenue: 1500,
        })
      );
    });

    test("should return 400 when report creation fails", async () => {
      const req = mockRequest({
        parkingId: "PARK-001", // Missing required fields
      });
      const res = mockResponse();

      const mockInstance = {
        ...req.body,
        save: jest.fn().mockRejectedValue(new Error("Validation error")),
      };
      Report.mockReturnValue(mockInstance);

      await createReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: expect.any(String) });
    });
  });

  describe("getReports", () => {
    test("should get all reports successfully", async () => {
      const req = mockRequest();
      const res = mockResponse();

      const mockReports = [
        {
          _id: "mockid123",
          reportId: "REP-001",
          parkingId: "PARK-001",
          dateRange: new Date("2025-04-10"),
          totalRevenue: 1500,
        },
        {
          _id: "mockid456",
          reportId: "REP-002",
          parkingId: "PARK-002",
          dateRange: new Date("2025-04-11"),
          totalRevenue: 2500,
        },
      ];

      Report.find.mockResolvedValue(mockReports);

      await getReports(req, res);

      expect(Report.find).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockReports);
    });

    test("should return 500 when getting reports fails", async () => {
      const req = mockRequest();
      const res = mockResponse();

      Report.find.mockRejectedValue(new Error("Database error"));

      await getReports(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: expect.any(String) });
    });
  });

  describe("getReportById", () => {
    test("should get a report by ID successfully", async () => {
      const req = mockRequest({}, { id: "mockid123" });
      const res = mockResponse();

      const mockReport = {
        _id: "mockid123",
        reportId: "REP-001",
        parkingId: "PARK-001",
        dateRange: new Date("2025-04-10"),
        totalRevenue: 1500,
      };

      Report.findById.mockResolvedValue(mockReport);

      await getReportById(req, res);

      expect(Report.findById).toHaveBeenCalledWith("mockid123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockReport);
    });

    test("should return 404 when report is not found", async () => {
      const req = mockRequest({}, { id: "nonexistentid" });
      const res = mockResponse();

      Report.findById.mockResolvedValue(null);

      await getReportById(req, res);

      expect(Report.findById).toHaveBeenCalledWith("nonexistentid");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Report not found" });
    });

    test("should return 500 when getting report by ID fails", async () => {
      const req = mockRequest({}, { id: "mockid123" });
      const res = mockResponse();

      Report.findById.mockRejectedValue(new Error("Database error"));

      await getReportById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: expect.any(String) });
    });
  });

  describe("updateReport", () => {
    test("should update a report successfully", async () => {
      const reportId = "mockid123";
      const updateData = {
        totalRevenue: 3000,
        dateRange: new Date("2025-04-15"),
      };
      const req = mockRequest(updateData, { id: reportId });
      const res = mockResponse();

      const updatedReport = {
        _id: reportId,
        reportId: "REP-001",
        parkingId: "PARK-001",
        dateRange: new Date("2025-04-15"),
        totalRevenue: 3000,
      };

      Report.findByIdAndUpdate.mockResolvedValue(updatedReport);

      await updateReport(req, res);

      expect(Report.findByIdAndUpdate).toHaveBeenCalledWith(
        reportId,
        updateData,
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedReport);
    });

    test("should return 404 when report to update is not found", async () => {
      const reportId = "nonexistentid";
      const updateData = { totalRevenue: 3000 };
      const req = mockRequest(updateData, { id: reportId });
      const res = mockResponse();

      Report.findByIdAndUpdate.mockResolvedValue(null);

      await updateReport(req, res);

      expect(Report.findByIdAndUpdate).toHaveBeenCalledWith(
        reportId,
        updateData,
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Report not found" });
    });

    test("should return 500 when updating report fails", async () => {
      const reportId = "mockid123";
      const updateData = { totalRevenue: 3000 };
      const req = mockRequest(updateData, { id: reportId });
      const res = mockResponse();

      Report.findByIdAndUpdate.mockRejectedValue(new Error("Validation error"));

      await updateReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: expect.any(String) });
    });
  });

  describe("deleteReport", () => {
    test("should delete a report successfully", async () => {
      const reportId = "mockid123";
      const req = mockRequest({}, { id: reportId });
      const res = mockResponse();

      const deletedReport = {
        _id: reportId,
        reportId: "REP-001",
        parkingId: "PARK-001",
        dateRange: new Date("2025-04-10"),
        totalRevenue: 1500,
      };

      Report.findByIdAndDelete.mockResolvedValue(deletedReport);

      await deleteReport(req, res);

      expect(Report.findByIdAndDelete).toHaveBeenCalledWith(reportId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Report deleted successfully",
      });
    });

    test("should return 404 when report to delete is not found", async () => {
      const reportId = "nonexistentid";
      const req = mockRequest({}, { id: reportId });
      const res = mockResponse();

      Report.findByIdAndDelete.mockResolvedValue(null);

      await deleteReport(req, res);

      expect(Report.findByIdAndDelete).toHaveBeenCalledWith(reportId);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Report not found" });
    });

    test("should return 500 when deleting report fails", async () => {
      const reportId = "mockid123";
      const req = mockRequest({}, { id: reportId });
      const res = mockResponse();

      Report.findByIdAndDelete.mockRejectedValue(new Error("Database error"));

      await deleteReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: expect.any(String) });
    });
  });
});
