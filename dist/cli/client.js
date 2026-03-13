"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRequest = apiRequest;
const API_BASE = process.env.RUNEBOLT_API_URL || 'http://localhost:3000/api/v1';
async function apiRequest(method, path, body) {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json());
    if (!res.ok) {
        throw new Error(data.message || `API error: ${res.status}`);
    }
    return data;
}
//# sourceMappingURL=client.js.map