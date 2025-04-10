// ...existing code...

// Import notification routes
const notificationRoutes = require('./routes/notification');

// ...existing code...

// Mount notification routes
app.use('/api/notify', notificationRoutes);

// ...existing code...