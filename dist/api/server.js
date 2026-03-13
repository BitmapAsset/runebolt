"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const RuneBolt_1 = require("../core/RuneBolt");
const routes_1 = require("./routes");
const websocket_1 = require("./websocket");
const config_1 = require("../utils/config");
const logger_1 = require("../utils/logger");
const log = (0, logger_1.createLogger)('Server');
async function main() {
    const config = (0, config_1.loadConfig)();
    const bolt = new RuneBolt_1.RuneBolt(config);
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({ origin: config.server.corsOrigins }));
    app.use(express_1.default.json({ limit: '100kb' }));
    app.disable('x-powered-by');
    // Security headers
    app.use((_req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        next();
    });
    app.use('/api/v1', (0, routes_1.createRouter)(bolt));
    app.use(routes_1.errorHandler);
    const server = http_1.default.createServer(app);
    (0, websocket_1.setupWebSocket)(server, bolt);
    // Connect to daemons
    try {
        await bolt.connect();
    }
    catch (err) {
        log.warn({ err }, 'Daemon connection issues (LND/tapd may not be available)');
    }
    server.listen(config.server.port, config.server.host, () => {
        log.info({ port: config.server.port, host: config.server.host }, 'RuneBolt API server started');
        log.info(`REST API: http://${config.server.host}:${config.server.port}/api/v1`);
        log.info(`WebSocket: ws://${config.server.host}:${config.server.port}/ws`);
        log.info('No telemetry. No tracking. Self-sovereign.');
    });
    const shutdown = async () => {
        log.info('Shutting down...');
        bolt.lock();
        await bolt.disconnect();
        server.close();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
main().catch((err) => {
    log.error({ err }, 'Fatal error');
    process.exit(1);
});
//# sourceMappingURL=server.js.map