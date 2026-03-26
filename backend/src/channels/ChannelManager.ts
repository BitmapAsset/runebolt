/**
 * Main orchestrator for channel lifecycle operations.
 * Coordinates between Database, BitcoinClient, and CommitmentManager.
 */

import { v4 as uuidv4 } from 'uuid';
import Database from '../db/Database';
import { BitcoinClient } from '../bitcoin/BitcoinClient';
import { TaprootUtils } from '../bitcoin/TaprootUtils';
import {
  Channel,
  ChannelState,
  assertTransition,
  channelFromRow,
} from './ChannelState';
import { CommitmentManager } from './CommitmentManager';
import { DOG_RUNE_ID } from '../rune/RuneConstants';

export class ChannelManager {
  private db: Database;
  private bitcoin: BitcoinClient;

  constructor() {
    this.db = Database.getInstance();
    this.bitcoin = new BitcoinClient();
  }

  /**
   * Open a new payment channel.
   *
   * @param runeId - The rune ID for the asset being locked in the channel.
   *                 Defaults to DOG•GO•TO•THE•MOON.
   */
  async openChannel(
    userPubkey: string,
    amount: bigint,
    runeId: string = DOG_RUNE_ID
  ): Promise<{ channelId: string; psbt: string; channelAddress: string }> {
    console.log(
      `[ChannelManager] Opening channel: user=${userPubkey.slice(0, 16)}..., amount=${amount}, rune=${runeId}`
    );

    if (amount <= 0n) {
      throw new Error('Channel amount must be positive');
    }

    const hubKey = TaprootUtils.generateKeyPair();
    const multisig = TaprootUtils.createMultisigAddress(userPubkey, hubKey.publicKey);
    const { psbt } = this.bitcoin.createFundingPsbt(userPubkey, amount, [], runeId);
    const channelId = uuidv4();

    await this.db.createUser(userPubkey);

    await this.db.createChannel({
      id: channelId,
      user_pubkey: userPubkey,
      runebolt_pubkey: hubKey.publicKey,
      funding_txid: null,
      funding_vout: null,
      capacity: Number(amount),
      local_balance: Number(amount),
      remote_balance: 0,
      state: ChannelState.PENDING_OPEN,
    });

    await CommitmentManager.createCommitment(channelId, amount, 0n, 0);

    console.log(`[ChannelManager] Channel ${channelId} created in PENDING_OPEN state`);

    return {
      channelId,
      psbt,
      channelAddress: multisig.address,
    };
  }

  /**
   * Activate a channel after the user signs the funding PSBT.
   */
  async activateChannel(channelId: string, signedPsbt: string): Promise<Channel> {
    const row = await this.db.getChannel(channelId);
    if (!row) {
      throw new Error(`Channel ${channelId} not found`);
    }

    const channel = channelFromRow(row);
    assertTransition(channel.state, ChannelState.OPEN);

    const txid = await this.bitcoin.signAndBroadcastFundingTx(signedPsbt, 'hub_signature');

    // Verify the funding tx was accepted into the mempool
    const tx = await this.bitcoin.getTransaction(txid);
    if (!tx) {
      throw new Error(`Funding transaction ${txid} not found in mempool after broadcast`);
    }

    await this.db.updateChannel({
      id: channelId,
      funding_txid: txid,
      funding_vout: 0,
      capacity: Number(channel.capacity),
      local_balance: Number(channel.localBalance),
      remote_balance: Number(channel.remoteBalance),
      state: ChannelState.OPEN,
    });

    console.log(`[ChannelManager] Channel ${channelId} activated, funding txid: ${txid}`);

    const updatedRow = await this.db.getChannel(channelId);
    if (!updatedRow) {
      throw new Error(`Channel ${channelId} disappeared after activation`);
    }

    return channelFromRow(updatedRow);
  }

  /**
   * Initiate a cooperative channel close.
   */
  async closeChannel(channelId: string): Promise<{ psbt: string }> {
    const row = await this.db.getChannel(channelId);
    if (!row) {
      throw new Error(`Channel ${channelId} not found`);
    }

    const channel = channelFromRow(row);
    assertTransition(channel.state, ChannelState.CLOSING);

    const psbt = this.bitcoin.createClosingPsbt(
      channel,
      channel.localBalance,
      channel.remoteBalance
    );

    await this.db.updateChannelState(channelId, ChannelState.CLOSING);
    CommitmentManager.clearCommitments(channelId);

    console.log(`[ChannelManager] Channel ${channelId} closing initiated`);

    return { psbt };
  }

  /**
   * Force close a channel unilaterally.
   */
  async forceCloseChannel(channelId: string): Promise<string> {
    const row = await this.db.getChannel(channelId);
    if (!row) {
      throw new Error(`Channel ${channelId} not found`);
    }

    const channel = channelFromRow(row);
    assertTransition(channel.state, ChannelState.FORCE_CLOSING);

    const commitment = await CommitmentManager.getLatestCommitment(channelId);
    if (!commitment) {
      throw new Error(`No commitment found for channel ${channelId}`);
    }

    const closingPsbt = this.bitcoin.createClosingPsbt(
      channel,
      commitment.localBalance,
      commitment.remoteBalance
    );

    const txid = await this.bitcoin.signAndBroadcastFundingTx(closingPsbt, 'force_close_sig');

    await this.db.updateChannelState(channelId, ChannelState.FORCE_CLOSING);
    CommitmentManager.clearCommitments(channelId);

    console.log(`[ChannelManager] Channel ${channelId} force-closed, txid: ${txid}`);
    return txid;
  }

  /**
   * Get a channel by ID.
   */
  async getChannel(channelId: string): Promise<Channel> {
    const row = await this.db.getChannel(channelId);
    if (!row) {
      throw new Error(`Channel ${channelId} not found`);
    }
    return channelFromRow(row);
  }

  /**
   * Get all channels for a given pubkey.
   */
  async getChannelsByPubkey(pubkey: string): Promise<Channel[]> {
    const rows = await this.db.getChannelsByPubkey(pubkey);
    return rows.map(channelFromRow);
  }
}
