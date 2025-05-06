const mongoose = require("mongoose");
const Claim = require("../../models/claimModel");
const Reservation = require("../../models/reservationModel");
const plateDetectionService = require("../../services/plateDetectionService");
const {
  createClaim,
  getClaims,
  getClaimById,
  updateClaim,
  deleteClaim,
  getClaimsByPlateNumber,
} = require("../../services/claimService");

// Mock dependencies
jest.mock("../../models/claimModel");
jest.mock("../../models/reservationModel");
jest.mock("../../services/plateDetectionService");
jest.mock("uuid", () => ({
  v4: () => "test-uuid",
}));

describe("Claim Service", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      user: { _id: "testUserId" },
      file: { path: "test/image/path.jpg" },
      body: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("createClaim", () => {
    beforeEach(() => {
      req.body.description = "Test claim description";
      plateDetectionService.detectPlate.mockResolvedValue({
        success: true,
        plateText: "ABC123",
      });

      const mockReservation = {
        _id: "reservationId",
        parkingId: { name: "Test Parking", location: "Test Location" },
        userId: { name: "Test User", email: "test@example.com" },
        startTime: new Date(),
        endTime: new Date(),
      };

      const populateChain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockReservation),
        }),
      };

      Reservation.findOne.mockReturnValue(populateChain);
    });

    test("should create a claim successfully with plate detection", async () => {
      const mockClaim = {
        claimId: "test-uuid",
        userId: "testUserId",
        imageUrl: "test/image/path.jpg",
        description: "Test claim description",
        plateNumber: "ABC123",
        reservationId: "reservationId",
        status: "Pending",
        save: jest.fn().mockResolvedValue(true),
      };

      Claim.mockImplementation(() => mockClaim);

      await createClaim(req, res);

      expect(plateDetectionService.detectPlate).toHaveBeenCalledWith(
        "test/image/path.jpg"
      );
      expect(Reservation.findOne).toHaveBeenCalledWith({
        matricule: "ABC123",
        status: { $in: ["pending", "active", "accepted"] },
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        claim: mockClaim,
        plateDetected: true,
        reservationFound: true,
        reservationDetails: {
          parkingName: "Test Parking",
          location: "Test Location",
          startTime: expect.any(Date),
          endTime: expect.any(Date),
        },
      });
    });

    test("should create a claim without plate detection", async () => {
      plateDetectionService.detectPlate.mockRejectedValue(
        new Error("Detection failed")
      );

      const mockClaim = {
        claimId: "test-uuid",
        userId: "testUserId",
        imageUrl: "test/image/path.jpg",
        description: "Test claim description",
        status: "Pending",
        save: jest.fn().mockResolvedValue(true),
      };

      Claim.mockImplementation(() => mockClaim);

      await createClaim(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        claim: mockClaim,
        plateDetected: false,
        reservationFound: false,
        reservationDetails: null,
      });
    });

    test("should return 400 if image is missing", async () => {
      req.file = null;

      await createClaim(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Image is required",
      });
    });
  });

  describe("getClaims", () => {
    test("should return all claims", async () => {
      const mockClaims = [
        { _id: "claim1", description: "Claim 1" },
        { _id: "claim2", description: "Claim 2" },
      ];

      Claim.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockClaims),
        }),
      });

      await getClaims(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        claims: mockClaims,
      });
    });
  });

  describe("getClaimById", () => {
    test("should return claim if found", async () => {
      const mockClaim = { _id: "claim1", description: "Test Claim" };
      req.params.id = "claim1";

      Claim.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockClaim),
        }),
      });

      await getClaimById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        claim: mockClaim,
      });
    });

    test("should return 404 if claim not found", async () => {
      req.params.id = "nonexistentId";

      Claim.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });

      await getClaimById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Claim not found",
      });
    });
  });

  describe("updateClaim", () => {
    test("should update claim successfully", async () => {
      const mockUpdatedClaim = {
        _id: "claim1",
        description: "Updated description",
      };
      req.params.id = "claim1";
      req.body = { description: "Updated description" };

      Claim.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockUpdatedClaim),
        }),
      });

      await updateClaim(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        claim: mockUpdatedClaim,
      });
    });
  });

  describe("deleteClaim", () => {
    test("should delete claim successfully", async () => {
      req.params.id = "claim1";
      Claim.findByIdAndDelete.mockResolvedValue({ _id: "claim1" });

      await deleteClaim(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Claim deleted successfully",
      });
    });

    test("should return 404 if claim not found", async () => {
      req.params.id = "nonexistentId";
      Claim.findByIdAndDelete.mockResolvedValue(null);

      await deleteClaim(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Claim not found",
      });
    });
  });

  describe("getClaimsByPlateNumber", () => {
    test("should return claims and reservations for plate number", async () => {
      const plateNumber = "ABC123";
      req.params.plateNumber = plateNumber;

      const mockClaims = [{ _id: "claim1", plateNumber }];

      const mockReservations = [
        { _id: "reservation1", matricule: plateNumber },
      ];

      Claim.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockClaims),
          }),
        }),
      });

      Reservation.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockReservations),
      });

      await getClaimsByPlateNumber(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        claims: mockClaims,
        reservations: mockReservations,
        plateNumber: expect.any(String),
      });
    });
  });
});
