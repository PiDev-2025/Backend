const { MongoMemoryServer } = require('mongodb-memory-server-core');

module.exports = async () => {
  const mongoServer = await MongoMemoryServer.create();
  await mongoServer.ensureInstance(); // Pre-download MongoDB binaries
  await mongoServer.stop(); // Stop the server after downloading
};
