// src/tests/services/claimService.test.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Claim = require('../../models/claimModel');
const claimController = require('../../services/claimService');

// Mock Express req, res objects
const mockRequest = (body = {}, params = {}) => ({
  body,
  params
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

let mongoServer;

// Setup and teardown
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear the database before each test
  await Claim.deleteMany({});
});

describe('Claim Controller Tests', () => {
  // Test data
  const testClaim = {
    claimId: 'CLM12345',
    reservationId: 'RES12345',
    userId: 'USR12345',
    description: 'Test claim description',
    status: 'Pending'
  };

  // Test creating a claim
  describe('createClaim', () => {
    it('should create a new claim', async () => {
      const req = mockRequest(testClaim);
      const res = mockResponse();
      
      await claimController.createClaim(req, res);
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      
      // Verify the claim was created in the database
      const claims = await Claim.find();
      expect(claims.length).toBe(1);
      expect(claims[0].claimId).toBe(testClaim.claimId);
    });

    it('should return 400 for invalid data', async () => {
      const req = mockRequest({
        // Missing required fields
        status: 'Pending'
      });
      const res = mockResponse();
      
      await claimController.createClaim(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });
  });

  // Test getting all claims
  describe('getClaims', () => {
    it('should return all claims', async () => {
      // Create some test claims first
      await Claim.create(testClaim);
      await Claim.create({
        ...testClaim,
        claimId: 'CLM12346',
        description: 'Another test claim'
      });
      
      const req = mockRequest();
      const res = mockResponse();
      
      await claimController.getClaims(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      
      // Check if the handler was called with array containing 2 claims
      const responseData = res.json.mock.calls[0][0];
      expect(Array.isArray(responseData)).toBe(true);
      expect(responseData.length).toBe(2);
    });
  });

  // Test getting a claim by ID
  describe('getClaimById', () => {
    it('should return a claim by ID', async () => {
      const claim = await Claim.create(testClaim);
      
      const req = mockRequest({}, { id: claim._id.toString() });
      const res = mockResponse();
      
      await claimController.getClaimById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      
      // Check if response contains the correct claim
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.claimId).toBe(testClaim.claimId);
    });

    it('should return 404 if claim not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const req = mockRequest({}, { id: nonExistentId.toString() });
      const res = mockResponse();
      
      await claimController.getClaimById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
    });
  });

  // Test updating a claim
  describe('updateClaim', () => {
    it('should update a claim', async () => {
      const claim = await Claim.create(testClaim);
      
      const updateData = {
        description: 'Updated description',
        status: 'Resolved'
      };
      
      const req = mockRequest(updateData, { id: claim._id.toString() });
      const res = mockResponse();
      
      await claimController.updateClaim(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      
      // Verify the claim was updated in database
      const updatedClaim = await Claim.findById(claim._id);
      expect(updatedClaim.description).toBe(updateData.description);
      expect(updatedClaim.status).toBe(updateData.status);
    });

    it('should return 404 if claim to update not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const req = mockRequest({ description: 'Updated' }, { id: nonExistentId.toString() });
      const res = mockResponse();
      
      await claimController.updateClaim(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
    });
  });

  // Test deleting a claim
  describe('deleteClaim', () => {
    it('should delete a claim', async () => {
      const claim = await Claim.create(testClaim);
      
      const req = mockRequest({}, { id: claim._id.toString() });
      const res = mockResponse();
      
      await claimController.deleteClaim(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      
      // Verify it's deleted from database
      const deletedClaim = await Claim.findById(claim._id);
      expect(deletedClaim).toBeNull();
    });

    it('should return 404 if claim to delete not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const req = mockRequest({}, { id: nonExistentId.toString() });
      const res = mockResponse();
      
      await claimController.deleteClaim(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalled();
    });
  });
});
