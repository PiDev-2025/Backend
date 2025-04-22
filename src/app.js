const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

// Import notification routes
const notificationRoutes = require('./routes/notification');

// Initialiser l'application Express
const app = express();

// Appliquer les middlewares de sécurité avant les autres middlewares
app.use(helmet()); // Protection complète par défaut
app.use(helmet.hidePoweredBy()); // Masquer spécifiquement l'en-tête X-Powered-By

// Configurer CORS
app.use(cors());

// Mount notification routes
app.use('/api/notify', notificationRoutes);

// ...existing code...