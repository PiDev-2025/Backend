const mongoose = require("mongoose");
const {
  createSubscription,
  getSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
} = require("../../services/subscriptionService");

// Mock the Subscription model
jest.mock("../../models/subscriptionModel");
const Subscription = require("../../models/subscriptionModel");

describe("Subscription Service", () => {
  let mockRequest, mockResponse;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = (body = {}, params = {}) => ({
      body,
      params,
    });

    mockResponse = () => {
      const res = {};
      res.status = jest.fn().mockReturnValue(res);
      res.json = jest.fn().mockReturnValue(res);
      return res;
    };
  });

  describe("createSubscription", () => {
    it("should create a new subscription successfully", async () => {
      const req = mockRequest({
        subscriptionId: "SUB-001",
        userId: "USER-001",
        parkingId: "PARK-001",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
        price: 1200,
      });
      const res = mockResponse();

      const savedSubscription = {
        _id: "mockid123",
        subscriptionId: "SUB-001",
        userId: "USER-001",
        parkingId: "PARK-001",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
        price: 1200,
        status: "Active",
      };

      // Create a mock document that will be returned by the service
      const mockDocument = {
        ...savedSubscription,
        save: jest.fn().mockResolvedValue(savedSubscription),
      };

      Subscription.mockReturnValue(mockDocument);

      await createSubscription(req, res);

      expect(Subscription).toHaveBeenCalledWith(req.body);
      expect(mockDocument.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining(savedSubscription)
      );
    });

    it("should return 400 when validation fails", async () => {
      const req = mockRequest({
        // Missing required fields
        subscriptionId: "SUB-001",
      });
      const res = mockResponse();

      const error = new Error("Validation failed");
      const mockDocument = {
        save: jest.fn().mockRejectedValue(error),
      };
      Subscription.mockReturnValue(mockDocument);

      await createSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: error.message });
    });
  });

  describe("getSubscriptions", () => {
    it("should return all subscriptions", async () => {
      const req = mockRequest();
      const res = mockResponse();

      const mockSubscriptions = [
        {
          _id: "mockid1",
          subscriptionId: "SUB-001",
          userId: "USER-001",
          parkingId: "PARK-001",
          startDate: new Date("2023-01-01"),
          endDate: new Date("2023-12-31"),
          price: 1200,
          status: "Active",
        },
        {
          _id: "mockid2",
          subscriptionId: "SUB-002",
          userId: "USER-002",
          parkingId: "PARK-002",
          startDate: new Date("2023-02-01"),
          endDate: new Date("2023-11-30"),
          price: 1000,
          status: "Active",
        },
      ];

      Subscription.find.mockResolvedValue(mockSubscriptions);

      await getSubscriptions(req, res);

      expect(Subscription.find).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSubscriptions);
    });

    it("should return 500 when database error occurs", async () => {
      const req = mockRequest();
      const res = mockResponse();

      const error = new Error("Database error");
      Subscription.find.mockRejectedValue(error);

      await getSubscriptions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: error.message });
    });
  });

  describe("getSubscriptionById", () => {
    it("should return a subscription by ID", async () => {
      const req = mockRequest({}, { id: "mockid123" });
      const res = mockResponse();

      const mockSubscription = {
        _id: "mockid123",
        subscriptionId: "SUB-001",
        userId: "USER-001",
        parkingId: "PARK-001",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
        price: 1200,
        status: "Active",
      };

      Subscription.findById.mockResolvedValue(mockSubscription);

      await getSubscriptionById(req, res);

      expect(Subscription.findById).toHaveBeenCalledWith("mockid123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSubscription);
    });

    it("should return 404 when subscription not found", async () => {
      const req = mockRequest({}, { id: "nonexistentid" });
      const res = mockResponse();

      Subscription.findById.mockResolvedValue(null);

      await getSubscriptionById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Subscription not found",
      });
    });

    it("should return 500 when database error occurs", async () => {
      const req = mockRequest({}, { id: "mockid123" });
      const res = mockResponse();

      const error = new Error("Database error");
      Subscription.findById.mockRejectedValue(error);

      await getSubscriptionById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: error.message });
    });
  });

  describe("updateSubscription", () => {
    it("should update a subscription successfully", async () => {
      const req = mockRequest(
        { status: "Cancelled", price: 1500 },
        { id: "mockid123" }
      );
      const res = mockResponse();

      const updatedSubscription = {
        _id: "mockid123",
        subscriptionId: "SUB-001",
        userId: "USER-001",
        parkingId: "PARK-001",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
        price: 1500,
        status: "Cancelled",
      };

      Subscription.findByIdAndUpdate.mockResolvedValue(updatedSubscription);

      await updateSubscription(req, res);

      expect(Subscription.findByIdAndUpdate).toHaveBeenCalledWith(
        "mockid123",
        req.body,
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedSubscription);
    });

    it("should return 404 when subscription not found", async () => {
      const req = mockRequest({ status: "Cancelled" }, { id: "nonexistentid" });
      const res = mockResponse();

      Subscription.findByIdAndUpdate.mockResolvedValue(null);

      await updateSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Subscription not found",
      });
    });

    it("should return 500 when validation fails", async () => {
      const req = mockRequest({ status: "Invalid" }, { id: "mockid123" });
      const res = mockResponse();

      const error = new Error("Validation failed");
      Subscription.findByIdAndUpdate.mockRejectedValue(error);

      await updateSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: error.message });
    });
  });

  describe("deleteSubscription", () => {
    it("should delete a subscription successfully", async () => {
      const req = mockRequest({}, { id: "mockid123" });
      const res = mockResponse();

      const deletedSubscription = {
        _id: "mockid123",
        subscriptionId: "SUB-001",
      };

      Subscription.findByIdAndDelete.mockResolvedValue(deletedSubscription);

      await deleteSubscription(req, res);

      expect(Subscription.findByIdAndDelete).toHaveBeenCalledWith("mockid123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Subscription deleted successfully",
      });
    });

    it("should return 404 when subscription not found", async () => {
      const req = mockRequest({}, { id: "nonexistentid" });
      const res = mockResponse();

      Subscription.findByIdAndDelete.mockResolvedValue(null);

      await deleteSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Subscription not found",
      });
    });

    it("should return 500 when database error occurs", async () => {
      const req = mockRequest({}, { id: "mockid123" });
      const res = mockResponse();

      const error = new Error("Database error");
      Subscription.findByIdAndDelete.mockRejectedValue(error);

      await deleteSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: error.message });
    });
  });
});
