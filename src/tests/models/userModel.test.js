// __tests__/models/userModel.test.js

const mongoose = require("mongoose");
const User = require("../../models/userModel");

describe("User Model", () => {
  beforeAll(async () => {
    // Connect to a test database or mock connection
    // This is just an example - in practice you might use mongodb-memory-server
    await mongoose.connect(
      process.env.MONGO_URI_TEST || "mongodb://localhost:27017/test-db",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  test("should create a user with required fields only", async () => {
    const userData = {
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      role: "Driver",
    };

    const user = new User(userData);
    const savedUser = await user.save();

    expect(savedUser._id).toBeDefined();
    expect(savedUser.name).toBe(userData.name);
    expect(savedUser.email).toBe(userData.email);
    expect(savedUser.role).toBe(userData.role);
    expect(savedUser.status).toBe("Active"); // Default value
  });

  test("should not create a user without required fields", async () => {
    const userData = {
      name: "Test User",
      // Missing email which is required
    };

    const user = new User(userData);

    await expect(user.save()).rejects.toThrow();
  });

  test("should not create a user with invalid role", async () => {
    const userData = {
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      role: "InvalidRole", // Not in enum
    };

    const user = new User(userData);

    await expect(user.save()).rejects.toThrow();
  });

  test("should not create a user with invalid vehicle type", async () => {
    const userData = {
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      role: "Driver",
      vehicleType: "InvalidVehicle", // Not in enum
    };

    const user = new User(userData);

    await expect(user.save()).rejects.toThrow();
  });

  test("should create a user with all fields", async () => {
    const userData = {
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      phone: 1234567890,
      status: "Active",
      role: "Driver",
      vehicleType: "Citadine",
      image: "https://example.com/image.jpg",
    };

    const user = new User(userData);
    const savedUser = await user.save();

    expect(savedUser._id).toBeDefined();
    expect(savedUser.name).toBe(userData.name);
    expect(savedUser.email).toBe(userData.email);
    expect(savedUser.phone).toBe(userData.phone);
    expect(savedUser.status).toBe(userData.status);
    expect(savedUser.role).toBe(userData.role);
    expect(savedUser.vehicleType).toBe(userData.vehicleType);
    expect(savedUser.image).toBe(userData.image);
  });

  test("should not create users with duplicate email", async () => {
    const userData = {
      name: "Test User",
      email: "duplicate@example.com",
      password: "password123",
      role: "Driver",
    };

    // Create first user
    const user1 = new User(userData);
    await user1.save();

    // Try to create second user with same email
    const user2 = new User(userData);

    await expect(user2.save()).rejects.toThrow();
  });
});
