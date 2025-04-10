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

// Middleware Express amélioré
const metricsMiddleware = (req, res, next) => {
    const start = process.hrtime();
    activeRequests.inc();

    // Update memory metrics
    const mem = process.memoryUsage();
    memoryUsage.set({ type: 'rss' }, mem.rss);
    memoryUsage.set({ type: 'heapTotal' }, mem.heapTotal);
    memoryUsage.set({ type: 'heapUsed' }, mem.heapUsed);

    res.on('finish', () => {
        activeRequests.dec();
        const duration = process.hrtime(start);
        const durationInSeconds = duration[0] + duration[1] / 1e9;

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

module.exports = { register, metricsMiddleware };
