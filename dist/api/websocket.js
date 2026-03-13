"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSocket = setupWebSocket;
const ws_1 = require("ws");
const logger_1 = require("../utils/logger");
const log = (0, logger_1.createLogger)('WebSocket');
function setupWebSocket(server, bolt) {
    const wss = new ws_1.WebSocketServer({ server, path: '/ws' });
    wss.on('connection', (ws) => {
        log.info('WebSocket client connected');
        ws.on('error', (err) => {
            log.error({ err }, 'WebSocket error');
        });
        ws.on('close', () => {
            log.info('WebSocket client disconnected');
        });
    });
    // Forward wallet events to all connected clients
    bolt.onUpdate((update) => {
        const message = JSON.stringify({
            event: update.event,
            data: update.data,
            timestamp: update.timestamp.toISOString(),
        });
        for (const client of wss.clients) {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.send(message);
            }
        }
    });
    log.info('WebSocket server initialized');
    return wss;
}
//# sourceMappingURL=websocket.js.map