// Global teardown file for Jest

const mongoose = require('mongoose');

module.exports = async () => {
  console.log('Starting global test teardown...');
  
  // Close MongoDB connection if open
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('Closed mongoose connection');
  }
  
  // Force close any remaining open handles
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('Global test teardown completed.');
};
