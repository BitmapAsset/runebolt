/**
 * RuneBolt API Server
 * REST API for the RuneBolt Bridge
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const LndClient = require('./lnd');
const RuneBoltBridge = require('./bridge');
const { getAssetBalance, clearAddressCache, verifyAssetOwnership } = require('../dist/indexer');
const {
  createHTLCScript,
  buildLockTransaction,
  buildClaimTransaction,
  buildRefundTransaction,
  generatePreimage
} = require('../dist/wallet/psbt');

const app = express();

// ── Security Headers ────────────────────────────────────────────
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// ── Request Logging ─────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Rate Limiting ───────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const lightningLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Lightning rate limit exceeded' },
});

const htlcLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'HTLC rate limit exceeded' },
});

app.use('/api/', apiLimiter);
app.use('/api/lightning/', lightningLimiter);
app.use('/api/bridge/htlc/', htlcLimiter);

// ── CORS & Body Parsing ────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '100kb' }));

// Initialize LND client & bridge
const lnd = new LndClient(
  process.env.VOLTAGE_REST_URL,
  process.env.VOLTAGE_MACAROON
);

const bridge = new RuneBoltBridge(lnd, {
  feeRate: parseFloat(process.env.RUNEBOLT_FEE_RATE || '0.003'),
});

// In-memory store for pending swaps (would use Redis in production)
const pendingSwaps = new Map();

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

// ── Runes Indexer ────────────────────────────────────────────────

// Get asset balances for an address
app.get('/api/runes/:address/balances', async (req, res) => {
  try {
    const { address } = req.params;
    const network = req.query.network || 'mainnet';
    
    if (!address || !address.match(/^(bc1|tb1|bcrt1)/)) {
      return res.status(400).json({ error: 'Invalid Bitcoin address' });
    }

    const balances = await getAssetBalance(address, network);
    res.json(balances);
  } catch (err) {
    console.error('Error fetching balances:', err);
    res.status(500).json({ error: err.message });
  }
});

// Verify asset ownership
app.get('/api/runes/:address/verify', async (req, res) => {
  try {
    const { address } = req.params;
    const { assetType, assetId, amount, network } = req.query;
    
    if (!assetType || !assetId) {
      return res.status(400).json({ error: 'assetType and assetId required' });
    }

    const owns = await verifyAssetOwnership(
      address, 
      assetType, 
      assetId, 
      parseInt(amount) || 1, 
      network || 'mainnet'
    );
    
    res.json({ address, assetType, assetId, owns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear cache for an address (call after transactions)
app.post('/api/runes/:address/clear-cache', (req, res) => {
  const { address } = req.params;
  clearAddressCache(address);
  res.json({ success: true, message: 'Cache cleared' });
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

// Check invoice status
app.get('/api/lightning/invoice/:paymentHash', async (req, res) => {
  try {
    const { paymentHash } = req.params;
    const invoice = await lnd.lookupInvoice(paymentHash);
    res.json({
      settled: invoice.state === 'SETTLED',
      state: invoice.state,
      amount: invoice.value,
      memo: invoice.memo,
      creationDate: invoice.creation_date,
      settleDate: invoice.settle_date,
      paymentHash,
    });
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

// ── HTLC Bridge Operations ───────────────────────────────────────

// Create HTLC lock address
app.post('/api/bridge/htlc/create', async (req, res) => {
  try {
    const { 
      senderPubkey, 
      recipientPubkey, 
      timeoutBlockHeight, 
      network = 'testnet',
      assetId 
    } = req.body;

    if (!senderPubkey || !recipientPubkey || !timeoutBlockHeight) {
      return res.status(400).json({ 
        error: 'senderPubkey, recipientPubkey, and timeoutBlockHeight required' 
      });
    }

    // Generate random preimage for this HTLC
    const { preimage, paymentHash } = generatePreimage();

    // Create HTLC script
    const htlc = createHTLCScript({
      senderPubkey: Buffer.from(senderPubkey, 'hex'),
      recipientPubkey: Buffer.from(recipientPubkey, 'hex'),
      paymentHash,
      timeoutBlockHeight,
      assetId: assetId || 'BTC',
      network,
    });

    // Store swap details
    const swapId = paymentHash.toString('hex');
    pendingSwaps.set(swapId, {
      id: swapId,
      preimage: preimage.toString('hex'),
      paymentHash: swapId,
      senderPubkey,
      recipientPubkey,
      timeoutBlockHeight,
      htlcAddress: htlc.p2shAddress,
      status: 'pending_lock',
      createdAt: new Date().toISOString(),
    });

    res.json({
      swapId,
      htlcAddress: htlc.p2shAddress,
      redeemScript: htlc.redeemScript.toString('hex'),
      paymentHash: swapId,
      timeoutBlockHeight,
      network,
    });
  } catch (err) {
    console.error('HTLC creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Build lock transaction (PSBT)
app.post('/api/bridge/build-lock-tx', async (req, res) => {
  try {
    const {
      senderAddress,
      htlcAddress,
      assetAmount,
      fundingUTXOs,
      changeAddress,
      feeRate,
      network = 'testnet',
    } = req.body;

    if (!senderAddress || !htlcAddress || !fundingUTXOs || !changeAddress) {
      return res.status(400).json({ 
        error: 'senderAddress, htlcAddress, fundingUTXOs, and changeAddress required' 
      });
    }

    const result = buildLockTransaction({
      senderAddress,
      htlcAddress,
      assetAmount: assetAmount || 10000,
      fundingUTXOs,
      changeAddress,
      feeRate: feeRate || 2,
      network,
    });

    res.json({
      psbtBase64: result.psbtBase64,
      htlcAddress,
      assetAmount: assetAmount || 10000,
    });
  } catch (err) {
    console.error('Build lock tx error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Build claim transaction (PSBT)
app.post('/api/bridge/build-claim-tx', async (req, res) => {
  try {
    const {
      htlcUTXO,
      redeemScript,
      preimage,
      recipientAddress,
      feeRate,
      network = 'testnet',
    } = req.body;

    if (!htlcUTXO || !redeemScript || !preimage || !recipientAddress) {
      return res.status(400).json({ 
        error: 'htlcUTXO, redeemScript, preimage, and recipientAddress required' 
      });
    }

    // Note: This returns an unsigned PSBT - client must sign with recipientPrivkey
    // For production, we might use a different flow with server-side signing
    res.json({
      htlcUTXO,
      redeemScript,
      preimage,
      recipientAddress,
      feeRate: feeRate || 2,
      network,
      instructions: 'Sign this PSBT with recipient private key and broadcast',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Build refund transaction (PSBT)
app.post('/api/bridge/build-refund-tx', async (req, res) => {
  try {
    const {
      htlcUTXO,
      redeemScript,
      senderAddress,
      timeoutBlockHeight,
      feeRate,
      network = 'testnet',
    } = req.body;

    if (!htlcUTXO || !redeemScript || !senderAddress || !timeoutBlockHeight) {
      return res.status(400).json({ 
        error: 'htlcUTXO, redeemScript, senderAddress, and timeoutBlockHeight required' 
      });
    }

    res.json({
      htlcUTXO,
      redeemScript,
      senderAddress,
      timeoutBlockHeight,
      feeRate: feeRate || 2,
      network,
      instructions: 'This transaction can only be broadcast after timeoutBlockHeight',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get swap status
app.get('/api/bridge/swap/:swapId', (req, res) => {
  const swap = pendingSwaps.get(req.params.swapId);
  if (!swap) {
    return res.status(404).json({ error: 'Swap not found' });
  }
  res.json(swap);
});

// Update swap status
app.post('/api/bridge/swap/:swapId/status', (req, res) => {
  const { status, txid } = req.body;
  const swap = pendingSwaps.get(req.params.swapId);
  if (!swap) {
    return res.status(404).json({ error: 'Swap not found' });
  }
  
  swap.status = status;
  if (txid) swap.txid = txid;
  swap.updatedAt = new Date().toISOString();
  
  res.json(swap);
});

// ── RuneBolt Bridge (Legacy) ─────────────────────────────────────

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

// ── 404 Handler ─────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// ── Error Handling Middleware ────────────────────────────────────

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  if (status >= 500) {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.stack || err.message);
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ── Process-level Error Handlers ────────────────────────────────

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

// ── Graceful Shutdown ───────────────────────────────────────────

let server;

function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ── Start ────────────────────────────────────────────────────────

const PORT = process.env.RUNEBOLT_PORT || 3141;

server = app.listen(PORT, () => {
  console.log(`⚡ RuneBolt Bridge running on port ${PORT}`);
  console.log(`  LND: ${process.env.VOLTAGE_REST_URL}`);
  console.log(`  Fee Rate: ${process.env.RUNEBOLT_FEE_RATE || '0.3%'}`);
  console.log(`  Rate Limits: API=100/15m, Lightning=20/m, HTLC=10/m`);

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
