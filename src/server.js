/**
 * RuneBolt API Server
 * REST API for the RuneBolt Bridge
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const LndClient = require('./lnd');
const RuneBoltBridge = require('./bridge');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize LND client & bridge
const lnd = new LndClient(
  process.env.VOLTAGE_REST_URL,
  process.env.VOLTAGE_MACAROON
);

const bridge = new RuneBoltBridge(lnd, {
  feeRate: parseFloat(process.env.RUNEBOLT_FEE_RATE || '0.003'),
});

// ── Health & Status ──────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'runebolt', timestamp: new Date().toISOString() });
});

app.get('/api/status', async (req, res) => {
  try {
    const status = await bridge.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Lightning Direct ─────────────────────────────────────────────

// Create invoice (receive sats)
app.post('/api/lightning/invoice', async (req, res) => {
  try {
    const { amount, memo, expiry } = req.body;
    if (!amount) return res.status(400).json({ error: 'amount required' });
    const invoice = await lnd.createInvoice(amount, memo || '', expiry || 3600);
    res.json({
      paymentRequest: invoice.payment_request,
      paymentHash: Buffer.from(invoice.r_hash, 'base64').toString('hex'),
      expiresAt: new Date(Date.now() + (expiry || 3600) * 1000).toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pay invoice (send sats)
app.post('/api/lightning/pay', async (req, res) => {
  try {
    const { paymentRequest, feeLimit } = req.body;
    if (!paymentRequest) return res.status(400).json({ error: 'paymentRequest required' });
    const result = await lnd.payInvoice(paymentRequest, feeLimit || 100);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Decode invoice
app.get('/api/lightning/decode/:payreq', async (req, res) => {
  try {
    const decoded = await lnd.decodeInvoice(req.params.payreq);
    res.json(decoded);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Node info
app.get('/api/lightning/info', async (req, res) => {
  try {
    const info = await lnd.getInfo();
    res.json({
      alias: info.alias,
      pubkey: info.identity_pubkey,
      channels: info.num_active_channels,
      peers: info.num_peers,
      blockHeight: info.block_height,
      synced: info.synced_to_chain,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── RuneBolt Bridge ──────────────────────────────────────────────

// List supported assets
app.get('/api/bridge/assets', (req, res) => {
  const type = req.query.type || null;
  res.json(bridge.assets.list(type));
});

// Calculate transfer fee
app.post('/api/bridge/fee', (req, res) => {
  try {
    const { assetId, amount } = req.body;
    if (!assetId || !amount) return res.status(400).json({ error: 'assetId and amount required' });
    const fee = bridge.assets.calculateFee(assetId, amount, bridge.feeRate);
    res.json(fee);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Initiate a transfer (Rune, Bitmap, or BRC-20)
app.post('/api/bridge/transfer', async (req, res) => {
  try {
    const { assetType, assetId, amount, senderAddress, receiverAddress, subId } = req.body;
    if (!assetId || !amount || !senderAddress || !receiverAddress) {
      return res.status(400).json({ error: 'assetId, amount, senderAddress, receiverAddress required' });
    }
    const result = await bridge.initiateTransfer(assetType, assetId, amount, senderAddress, receiverAddress, subId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check transfer status
app.get('/api/bridge/transfer/:id', async (req, res) => {
  try {
    const result = await bridge.checkTransfer(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// List transfers
app.get('/api/bridge/transfers', (req, res) => {
  const status = req.query.status || null;
  res.json(bridge.listTransfers(status));
});

// Get inventory
app.get('/api/bridge/inventory', (req, res) => {
  res.json(bridge.getInventory());
});

// Add inventory (admin only — would need auth in production)
app.post('/api/bridge/inventory', (req, res) => {
  const { runeId, amount } = req.body;
  if (!runeId || !amount) return res.status(400).json({ error: 'runeId and amount required' });
  const result = bridge.addInventory(runeId, amount);
  res.json(result);
});

// ── Start ────────────────────────────────────────────────────────

const PORT = process.env.RUNEBOLT_PORT || 3141;

app.listen(PORT, () => {
  console.log(`⚡ RuneBolt Bridge running on port ${PORT}`);
  console.log(`  LND: ${process.env.VOLTAGE_REST_URL}`);
  console.log(`  Fee Rate: ${process.env.RUNEBOLT_FEE_RATE || '0.3%'}`);
  
  // Verify LND connection on startup
  lnd.getInfo().then(info => {
    console.log(`  Node: ${info.alias} (${info.identity_pubkey.slice(0, 12)}...)`);
    console.log(`  Channels: ${info.num_active_channels} active`);
    console.log(`  Synced: ${info.synced_to_chain}`);
    console.log(`  ✅ Connected to Voltage LND`);
  }).catch(err => {
    console.error(`  ❌ LND connection failed: ${err.message}`);
  });
});
