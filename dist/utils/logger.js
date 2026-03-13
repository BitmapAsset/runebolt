"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createLogger = createLogger;
const pino_1 = __importDefault(require("pino"));
// Redact sensitive fields from log output
const REDACTED_PATHS = [
    'preimage',
    'privateKey',
    'privkey',
    'secret',
    'macaroon',
    'apiKey',
    'password',
    'rpcPass',
    'authorization',
    'req.headers.authorization',
    'req.headers.cookie',
];
exports.logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
    redact: {
        paths: REDACTED_PATHS,
        censor: '[REDACTED]',
    },
    transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino/file', options: { destination: 1 } }
        : undefined,
    formatters: {
        level(label) {
            return { level: label };
        },
    },
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
});
function createLogger(module) {
    return exports.logger.child({ module });
}
//# sourceMappingURL=logger.js.map