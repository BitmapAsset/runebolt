/**
 * RuneBolt Bridge — Relay Model
 * 
 * Handles Rune/inscription transfers using Lightning for coordination.
 * 
 * Flow:
 * 1. Sender requests transfer (specifies Rune + amount + receiver address)
 * 2. RuneBolt creates a Lightning invoice for coordination fee
 * 3. Sender pays the invoice (proves intent + covers fees)
 * 4. RuneBolt sends equivalent Rune from its inventory to receiver's address (on-chain)
 * 5. Sender sends their Rune to RuneBolt's address to replenish inventory
 * 
 * The Lightning payment is the COORDINATION layer — it proves the transfer 
 * request is real and funded, enabling near-instant fulfillment.
 */

const { v4: uuidv4 } = require('uuid');
const { AssetRegistry, ASSET_TYPES } = require('./assets');

class RuneBoltBridge {
  constructor(lndClient, options = {}) {
    this.lnd = lndClient;
    this.feeRate = options.feeRate || 0.003; // 0.3% default
    this.transfers = new Map(); // In-memory transfer tracking
    this.inventory = new Map(); // Asset inventory tracking (assetId:subId → amount)
    this.assets = new AssetRegistry();
  }

  /**
   * Get bridge status
   */
  async getStatus() {
    const info = await this.lnd.getInfo();
    const walletBalance = await this.lnd.getWalletBalance();
    const channelBalance = await this.lnd.getChannelBalance();
    const channels = await this.lnd.listChannels();

    return {
      node: {
        alias: info.alias,
        pubkey: info.identity_pubkey,
        version: info.version,
        synced: info.synced_to_chain,
        blockHeight: info.block_height,
      },
      wallet: {
        onChainBalance: parseInt(walletBalance.confirmed_balance || '0'),
        channelBalance: parseInt(channelBalance.local_balance?.sat || '0'),
        pendingBalance: parseInt(walletBalance.unconfirmed_balance || '0'),
      },
      channels: {
        active: channels.channels?.filter(c => c.active).length || 0,
        total: channels.channels?.length || 0,
        totalCapacity: channels.channels?.reduce((sum, c) => sum + parseInt(c.capacity || '0'), 0) || 0,
      },
      bridge: {
        feeRate: this.feeRate,
        activeTransfers: this.transfers.size,
        inventoryTokens: Array.from(this.inventory.keys()),
        supportedAssets: this.assets.list().map(a => ({
          id: a.id,
          type: a.type,
          name: a.name,
          fungible: a.config.fungible,
        })),
      },
    };
  }

  /**
   * Initiate a Rune transfer
   * Returns a Lightning invoice that the sender must pay to confirm the transfer
   */
  async initiateTransfer(assetType, assetId, amount, senderAddress, receiverAddress, subId = null) {
    // For Bitmaps, subId is the block number (e.g., "720143")
    const inventoryKey = subId ? `${assetId}:${subId}` : assetId;
    
    // Validate the asset is supported
    const validation = this.assets.validateTransfer(assetId, amount);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Validate inventory
    const available = this.inventory.get(inventoryKey) || 0;
    if (available < amount) {
      throw new Error(`Insufficient inventory for ${inventoryKey}. Available: ${available}, Requested: ${amount}`);
    }

    // Calculate fee using asset-aware pricing
    const feeCalc = this.assets.calculateFee(assetId, amount, this.feeRate);
    const feeSats = feeCalc.coordinationFee;

    // Create Lightning invoice for the coordination fee
    const transferId = uuidv4();
    const displayName = subId ? `${assetId}:${subId}` : `${amount} ${assetId}`;
    const memo = `RuneBolt: ${displayName} → ${receiverAddress.slice(0, 8)}...`;
    const invoice = await this.lnd.createInvoice(feeSats, memo, 1800); // 30 min expiry

    // Track the transfer
    const transfer = {
      id: transferId,
      assetType: assetType || 'rune',
      assetId,
      subId, // block number for Bitmaps, null for fungibles
      inventoryKey,
      amount,
      senderAddress,
      receiverAddress,
      feeSats,
      status: 'pending_payment', // pending_payment → paid → fulfilling → complete | expired
      paymentRequest: invoice.payment_request,
      paymentHash: Buffer.from(invoice.r_hash, 'base64').toString('hex'),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1800 * 1000).toISOString(),
    };

    this.transfers.set(transferId, transfer);

    return {
      transferId,
      paymentRequest: invoice.payment_request,
      feeSats,
      memo,
      expiresAt: transfer.expiresAt,
    };
  }

  /**
   * Check transfer status & process if paid
   */
  async checkTransfer(transferId) {
    const transfer = this.transfers.get(transferId);
    if (!transfer) throw new Error('Transfer not found');

    if (transfer.status === 'pending_payment') {
      // Check if the Lightning invoice has been paid
      try {
        const invoiceStatus = await this.lnd.lookupInvoice(transfer.paymentHash);
        if (invoiceStatus.state === 'SETTLED') {
          transfer.status = 'paid';
          transfer.paidAt = new Date().toISOString();
          
          // In production: trigger on-chain Rune transfer to receiver here
          // For now, mark as fulfilling
          transfer.status = 'fulfilling';
          
          // Deduct from inventory
          const current = this.inventory.get(transfer.inventoryKey) || 0;
          this.inventory.set(transfer.inventoryKey, current - transfer.amount);
          
          // TODO: Broadcast on-chain transfer based on asset type:
          // - RUNE: OP_RETURN Runestone encoding (bitcoinjs-lib + rune-lib)
          // - BITMAP: Ordinal inscription transfer (ord protocol)
          // - BRC-20: Two-step — inscribe transfer JSON, then send inscription
          
          transfer.status = 'complete';
          transfer.completedAt = new Date().toISOString();
        }
      } catch (err) {
        // Invoice not found or error — check expiry
        if (new Date() > new Date(transfer.expiresAt)) {
          transfer.status = 'expired';
        }
      }
    }

    return {
      id: transfer.id,
      status: transfer.status,
      runeId: transfer.runeId,
      amount: transfer.amount,
      feeSats: transfer.feeSats,
      receiverAddress: transfer.receiverAddress,
      createdAt: transfer.createdAt,
      completedAt: transfer.completedAt || null,
    };
  }

  /**
   * Add Rune inventory (when RuneBolt receives Runes)
   */
  addInventory(runeId, amount) {
    const current = this.inventory.get(runeId) || 0;
    this.inventory.set(runeId, current + amount);
    return { runeId, newBalance: this.inventory.get(runeId) };
  }

  /**
   * Get inventory status
   */
  getInventory() {
    const items = [];
    for (const [runeId, amount] of this.inventory) {
      items.push({ runeId, available: amount });
    }
    return items;
  }

  /**
   * List all transfers
   */
  listTransfers(status = null) {
    const all = Array.from(this.transfers.values());
    if (status) return all.filter(t => t.status === status);
    return all;
  }
}

module.exports = RuneBoltBridge;
