const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const UserService = require('../../services/userService');
const User = require('../../models/userModel');
const jwt = require('jsonwebtoken');
const sendEmail = require('../../utils/SignUpMailVerif'); // Mock this

jest.mock('../../utils/SignUpMailVerif', () => jest.fn()); // Mock sendEmail

// Mock tempUsers and tempUserslogin
const tempUsers = new Map();
const tempUserslogin = new Map();

// Mock hashPassword function
const hashPassword = async (password) => {
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
  jest.clearAllMocks(); // Clear mocks before each test
});

describe('User Service - Simple Operations', () => {
  describe('Signup and OTP Verification', () => {
    it('should signup a user and send OTP', async () => {
      const req = {
        body: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          phone: '123456789',
          role: 'Driver', // Updated to valid enum value
          vehicleType: 'Citadine',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await UserService.signup(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Code OTP envoyé. Veuillez le valider pour finaliser l'inscription.",
      });
      expect(sendEmail).toHaveBeenCalled(); // Ensure sendEmail is called
    });

  
  });

  describe('Login and OTP Verification', () => {
    it('should login a user and send OTP', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: await hashPassword('password123'), // Use hashPassword
        phone: '123456789',
        role: 'Driver', // Updated to valid enum value
        vehicleType: 'Citadine',
      });

      const req = { body: { email: user.email, password: 'password123' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await UserService.loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Code OTP envoyé' });
      expect(sendEmail).toHaveBeenCalled(); // Ensure sendEmail is called
    });

   
  });

  describe('Get User Profile', () => {
    it('should return user profile from token', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedPassword',
        phone: '123456789',
        role: 'Driver', // Updated to valid enum value
        vehicleType: 'Citadine',
      });

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: '1h',
      });

      const req = { header: jest.fn().mockReturnValue(`Bearer ${token}`) };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await UserService.userProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ email: user.email }));
    });
  });

  describe('Update User', () => {
    it('should update user details', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedPassword',
        phone: '123456789',
        role: 'Driver', // Updated to valid enum value
        vehicleType: 'Citadine',
      });

      const req = {
        params: { id: user._id },
        body: { name: 'Updated User' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await UserService.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated User' }));
    });
  });

  describe('Delete User', () => {
    it('should delete a user', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedPassword',
        phone: '123456789',
        role: 'Driver', // Updated to valid enum value
        vehicleType: 'Citadine',
      });

      const req = { params: { id: user._id } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await UserService.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'User deleted successfully' });

      const deletedUser = await User.findById(user._id);
      expect(deletedUser).toBeNull();
    });
  });

  describe('Change User Status', () => {
    it('should toggle user status', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedPassword',
        phone: '123456789',
        role: 'Driver', // Updated to valid enum value
        vehicleType: 'Citadine',
        status: 'Active',
      });

      const req = { params: { userId: user._id } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await UserService.changeUserStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'User status updated' })
      );

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.status).toBe('Blocked');
    });
  });
});
