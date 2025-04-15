const prometheus = require('prom-client');
const register = new prometheus.Registry();

// Métriques par défaut
prometheus.collectDefaultMetrics({
    app: 'parkini-backend',
    prefix: 'nodejs_',
    timeout: 5000,
    register
});

// Métriques HTTP
const httpRequestDuration = new prometheus.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'path', 'status'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    registers: [register]
});

const httpRequestTotal = new prometheus.Counter({
    name: 'http_request_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'status'],
    registers: [register]
});

// Métriques pour le monitoring des ressources
const memoryUsage = new prometheus.Gauge({
    name: 'nodejs_memory_usage_bytes',
    help: 'Process memory usage',
    labelNames: ['type'],
    registers: [register]
});

const activeRequests = new prometheus.Gauge({
    name: 'http_active_requests',
    help: 'Number of active requests',
    registers: [register]
});

// Ajout de métriques spécifiques pour les parkings
const parkingOperations = new prometheus.Counter({
    name: 'parking_operations_total',
    help: 'Total des opérations sur les parkings',
    labelNames: ['operation', 'status'],
    registers: [register]
});

const parkingRequestDuration = new prometheus.Histogram({
    name: 'parking_request_duration_seconds',
    help: 'Durée des opérations sur les parkings',
    labelNames: ['operation'],
    buckets: [0.1, 0.5, 1, 2, 5],
    registers: [register]
});

// Ajout de métriques pour les utilisateurs
const userOperations = new prometheus.Counter({
    name: 'user_operations_total',
    help: 'Total des opérations utilisateurs',
    labelNames: ['operation', 'status'],
    registers: [register]
});

// Middleware Express amélioré
const metricsMiddleware = (req, res, next) => {
    const start = process.hrtime();
    activeRequests.inc();

    // Identifier le type d'opération
    let operation = 'unknown';
    if (req.path.includes('/parkings')) {
        operation = 'parking';
    } else if (req.path.includes('/User')) {
        operation = 'user';
    }

    // Update memory metrics
    const mem = process.memoryUsage();
    memoryUsage.set({ type: 'rss' }, mem.rss);
    memoryUsage.set({ type: 'heapTotal' }, mem.heapTotal);
    memoryUsage.set({ type: 'heapUsed' }, mem.heapUsed);

    res.on('finish', () => {
        activeRequests.dec();
        const duration = process.hrtime(start);
        const durationInSeconds = duration[0] + duration[1] / 1e9;

        // Enregistrer les métriques spécifiques
        if (operation === 'parking') {
            parkingOperations.inc({
                operation: req.method,
                status: res.statusCode
            });
            parkingRequestDuration.observe({
                operation: req.method
            }, durationInSeconds);
        } else if (operation === 'user') {
            userOperations.inc({
                operation: req.method,
                status: res.statusCode
            });
        }

        httpRequestDuration.observe(
            {
                method: req.method,
                path: req.path,
                status: res.statusCode
            },
            durationInSeconds
        );

        httpRequestTotal.inc({
            method: req.method,
            path: req.path,
            status: res.statusCode
        });
    });

    next();
};

module.exports = { 
    register, 
    metricsMiddleware,
    parkingOperations,
    userOperations 
};
