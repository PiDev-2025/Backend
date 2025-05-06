const mongoose = require('mongoose');
require('dotenv').config(); // Ensure dotenv is loaded if you switch to process.env

// Store the Atlas URI to share with other parts of the application
const MONGO_ATLAS_URI = 'mongodb+srv://waelmarwani:MjaHoEGuPgdVoatr@parkinicluster.6cjccjm.mongodb.net/parkiniDB?retryWrites=true&w=majority&appName=ParkiniCluster';

const connectDB = async () => {
  try {
    // Always use the Atlas URI - never try to connect to localhost/Docker
    const mongoUri = MONGO_ATLAS_URI;
    console.log(`Attempting to connect to MongoDB Atlas...`);

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Optional: Keep for faster feedback on connection issues
      socketTimeoutMS: 45000, // Optional: Default is usually fine
    });

    console.log(`✅ Connected to MongoDB Atlas: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

// Export both the connection function and the URI for use elsewhere
module.exports = connectDB;
module.exports.MONGO_ATLAS_URI = MONGO_ATLAS_URI;