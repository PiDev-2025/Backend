
jest.setTimeout(30000); // Increase timeout to 30 seconds

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const parkingRoutes = require('../../routes/parkingRoutes');
const Parking = require('../../models/parkingModel');
const ParkingRequest = require('../../models/parkingRequestModel');
const User = require('../../models/userModel');

const app = express();
app.use(express.json());
app.use('/api', parkingRoutes);

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await Parking.deleteMany({});
  await ParkingRequest.deleteMany({});
  await User.deleteMany({});
});

describe('Parking Routes', () => {
  describe('PUT /requests/:id', () => {
    it('should approve parking request', async () => {
      // Créer d'abord un propriétaire
      const owner = await User.create({
        name: 'Test Owner',
        email: 'owner@test.com',
        password: 'password123',
        role: 'Owner'
      });

      // Créer une demande de parking avec toutes les données requises
      const parkingRequest = await ParkingRequest.create({
        action: 'create',
        status: 'pending',
        name: 'Test Parking',
        description: 'Test Description',
        position: { lat: 36.8065, lng: 10.1815 },
        totalSpots: 100,
        availableSpots: 100,
        pricing: { hourly: 5 },
        vehicleTypes: ['Citadine'],
        Owner: owner._id,
        images: ['image1.jpg', 'image2.jpg', 'image3.jpg', 'image4.jpg']
      });

      // Simuler un utilisateur Admin
      const admin = await User.create({
        name: 'Test Admin',
        email: 'admin@test.com',
        password: 'password123',
        role: 'Admin'
      });

      const response = await request(app)
        .put(`/api/requests/${parkingRequest._id}`)
        .send({ 
          status: 'accepted',
          user: { role: 'Admin', _id: admin._id }
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', expect.stringContaining('accepted'));

      // Vérifier que le parking a été créé
      const createdParking = await Parking.findOne({ name: 'Test Parking' });
      expect(createdParking).toBeTruthy();
      expect(createdParking.status).toBe('accepted');
    });

    it('should reject request with invalid status', async () => {
      const owner = await User.create({
        name: 'Test Owner',
        email: 'owner2@test.com',
        password: 'password123',
        role: 'Owner'
      });

      const parkingRequest = await ParkingRequest.create({
        action: 'create',
        status: 'pending',
        name: 'Test Parking',
        description: 'Test Description',
        position: { lat: 36.8065, lng: 10.1815 },
        totalSpots: 100,
        availableSpots: 100,
        pricing: { hourly: 5 },
        vehicleTypes: ['Citadine'],
        Owner: owner._id,
        images: ['image1.jpg', 'image2.jpg', 'image3.jpg', 'image4.jpg']
      });

      const response = await request(app)
        .put(`/api/requests/${parkingRequest._id}`)
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Statut invalide');
    });
  });

  
});
