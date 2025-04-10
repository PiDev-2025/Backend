// __tests__/routes/userRoutes.test.js

const request = require("supertest");
const express = require("express");
const userRoutes = require("../../routes/userRoutes");
const { verifyToken } = require("../../middlewares/authMiddleware");
const { getUserFromToken } = require("../../middlewares/uploadMiddleware");
const userService = require("../../services/userService");

// Mock dependencies
jest.mock("../../middlewares/authMiddleware");
jest.mock("../../middlewares/uploadMiddleware");
jest.mock("../../services/userService");

// Create express app for testing
const app = express();
app.use(express.json());
app.use("/api", userRoutes);

describe("User Routes", () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup default middleware behavior
    verifyToken.mockImplementation((req, res, next) => {
      req.user = { _id: "testUserId", role: "Driver" };
      next();
    });

    getUserFromToken.mockImplementation((req, res, next) => {
      req.user = { _id: "testUserId", role: "Driver" };
      next();
    });
  });

  describe("POST /api/signup", () => {
    test("should call signup service with correct data", async () => {
      userService.signup.mockImplementation((req, res) => {
        res.status(200).json({ message: "Success" });
      });

      const userData = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        phone: 1234567890,
        role: "Driver",
      };

      const response = await request(app).post("/api/signup").send(userData);

      expect(response.status).toBe(200);
      expect(userService.signup).toHaveBeenCalled();
      expect(response.body).toEqual({ message: "Success" });
    });
  });

  describe("POST /api/verify-otp", () => {
    test("should call verifyOTP service with correct data", async () => {
      userService.verifyOTP.mockImplementation((req, res) => {
        res.status(200).json({ message: "OTP verified" });
      });

      const otpData = {
        email: "test@example.com",
        otp: "123456",
      };

      const response = await request(app).post("/api/verify-otp").send(otpData);

      expect(response.status).toBe(200);
      expect(userService.verifyOTP).toHaveBeenCalled();
      expect(response.body).toEqual({ message: "OTP verified" });
    });
  });

  describe("GET /api/users", () => {
    test("should return all users", async () => {
      const mockUsers = [
        { _id: "user1", name: "User 1" },
        { _id: "user2", name: "User 2" },
      ];

      userService.getUsers.mockImplementation((req, res) => {
        res.status(200).json(mockUsers);
      });

      const response = await request(app).get("/api/users");

      expect(response.status).toBe(200);
      expect(userService.getUsers).toHaveBeenCalled();
      expect(response.body).toEqual(mockUsers);
    });
  });

  describe("GET /api/users/:id", () => {
    test("should return user by id", async () => {
      const mockUser = { _id: "userId", name: "Test User" };

      userService.getUserById.mockImplementation((req, res) => {
        res.status(200).json(mockUser);
      });

      const response = await request(app).get("/api/users/userId");

      expect(response.status).toBe(200);
      expect(userService.getUserById).toHaveBeenCalled();
      expect(response.body).toEqual(mockUser);
    });
  });

  describe("POST /api/users", () => {
    test("should create a new user", async () => {
      const userData = {
        name: "New User",
        email: "new@example.com",
        password: "password123",
        role: "Driver",
      };

      const createdUser = { ...userData, _id: "newUserId" };

      userService.createUser.mockImplementation((req, res) => {
        res.status(201).json(createdUser);
      });

      const response = await request(app).post("/api/users").send(userData);

      expect(response.status).toBe(201);
      expect(userService.createUser).toHaveBeenCalled();
      expect(response.body).toEqual(createdUser);
    });
  });

  describe("PUT /api/users/:id", () => {
    test("should update a user", async () => {
      const updateData = { name: "Updated Name" };
      const updatedUser = { _id: "userId", name: "Updated Name" };

      userService.updateUser.mockImplementation((req, res) => {
        res.status(200).json(updatedUser);
      });

      const response = await request(app)
        .put("/api/users/userId")
        .send(updateData);

      expect(response.status).toBe(200);
      expect(userService.updateUser).toHaveBeenCalled();
      expect(response.body).toEqual(updatedUser);
    });
  });

  describe("DELETE /api/users/:id", () => {
    test("should delete a user", async () => {
      userService.deleteUser.mockImplementation((req, res) => {
        res.status(200).json({ message: "User deleted successfully" });
      });

      const response = await request(app).delete("/api/users/userId");

      expect(response.status).toBe(200);
      expect(userService.deleteUser).toHaveBeenCalled();
      expect(response.body).toEqual({ message: "User deleted successfully" });
    });
  });

  describe("POST /api/favorites/add/:parkingId", () => {
    test("should add a parking to favorites", async () => {
      const mockFavorite = {
        _id: "favoriteId",
        user: "userId",
        parking: "parkingId",
      };

      userService.addFavorite.mockImplementation((req, res) => {
        res.status(201).json({ success: true, favorite: mockFavorite });
      });

      const response = await request(app).post("/api/favorites/add/parkingId");

      expect(response.status).toBe(201);
      expect(userService.addFavorite).toHaveBeenCalled();
      expect(response.body).toEqual({ success: true, favorite: mockFavorite });
    });
  });

  describe("DELETE /api/favorites/remove/:parkingId", () => {
    test("should remove a parking from favorites", async () => {
      userService.removeFavorite.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).delete(
        "/api/favorites/remove/parkingId"
      );

      expect(response.status).toBe(200);
      expect(userService.removeFavorite).toHaveBeenCalled();
      expect(response.body).toEqual({ success: true });
    });
  });
});
