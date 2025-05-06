const mongoose = require("mongoose");
const Contract = require("../../models/contractModel");
const {
  createContract,
  getContracts,
  getContractById,
  updateContract,
  deleteContract,
} = require("../../services/contractService");

// Mock the Contract model
jest.mock("../../models/contractModel");

describe("Contract Service", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Clear all mocks between tests
    jest.clearAllMocks();
  });

  describe("createContract", () => {
    beforeEach(() => {
      req.body = {
        // Add your contract properties here
        title: "Test Contract",
        description: "Test Description",
      };
    });

    test("should create a new contract and return 201", async () => {
      const mockContract = {
        ...req.body,
        _id: "contractId",
        save: jest.fn().mockResolvedValue(true),
      };

      Contract.mockImplementation(() => mockContract);

      await createContract(req, res);

      expect(mockContract.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockContract);
    });

    test("should return 400 if there is an error during contract creation", async () => {
      const errorMessage = "Invalid data";
      Contract.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error(errorMessage)),
      }));

      await createContract(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
    });
  });

  describe("getContracts", () => {
    test("should return all contracts with status 200", async () => {
      const mockContracts = [
        { _id: "contract1", title: "Contract 1" },
        { _id: "contract2", title: "Contract 2" },
      ];
      Contract.find.mockResolvedValue(mockContracts);

      await getContracts(req, res);

      expect(Contract.find).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockContracts);
    });

    test("should return 500 if there is an error", async () => {
      const errorMessage = "Database error";
      Contract.find.mockRejectedValue(new Error(errorMessage));

      await getContracts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: errorMessage });
    });
  });

  describe("getContractById", () => {
    beforeEach(() => {
      req.params = { id: "contractId" };
    });

    test("should return contract with status 200 if found", async () => {
      const mockContract = {
        _id: "contractId",
        title: "Test Contract",
      };
      Contract.findById.mockResolvedValue(mockContract);

      await getContractById(req, res);

      expect(Contract.findById).toHaveBeenCalledWith("contractId");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockContract);
    });

    test("should return 404 if contract is not found", async () => {
      Contract.findById.mockResolvedValue(null);

      await getContractById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Contract not found" });
    });
  });

  describe("updateContract", () => {
    beforeEach(() => {
      req.params = { id: "contractId" };
      req.body = { title: "Updated Contract" };
    });

    test("should update contract and return status 200", async () => {
      const updatedContract = {
        _id: "contractId",
        title: "Updated Contract",
      };
      Contract.findByIdAndUpdate.mockResolvedValue(updatedContract);

      await updateContract(req, res);

      expect(Contract.findByIdAndUpdate).toHaveBeenCalledWith(
        "contractId",
        { title: "Updated Contract" },
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedContract);
    });

    test("should return 404 if contract is not found", async () => {
      Contract.findByIdAndUpdate.mockResolvedValue(null);

      await updateContract(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Contract not found" });
    });
  });

  describe("deleteContract", () => {
    beforeEach(() => {
      req.params = { id: "contractId" };
    });

    test("should delete contract and return status 200", async () => {
      const deletedContract = { _id: "contractId", title: "Test Contract" };
      Contract.findByIdAndDelete.mockResolvedValue(deletedContract);

      await deleteContract(req, res);

      expect(Contract.findByIdAndDelete).toHaveBeenCalledWith("contractId");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Contract deleted successfully",
      });
    });

    test("should return 404 if contract is not found", async () => {
      Contract.findByIdAndDelete.mockResolvedValue(null);

      await deleteContract(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Contract not found" });
    });
  });
});
