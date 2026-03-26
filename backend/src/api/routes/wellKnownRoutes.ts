/**
 * Well-known routes for protocol-level discovery.
 * Similar to Lightning Address (.well-known/lnurlp), this allows
 * resolving a RuneBolt username to channel information.
 */

import { Router, Request, Response } from 'express';
import Database from '../../db/Database';
import { ChannelManager } from '../../channels/ChannelManager';
import { channelToJson } from '../../channels/ChannelState';

const router = Router();
const db = Database.getInstance();
const channelManager = new ChannelManager();

/**
 * GET /.well-known/rune-address/:username
 * Resolve a username to pubkey and channel info.
 */
router.get('/.well-known/rune-address/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const user = await db.getUserByUsername(username);
    if (!user) {
      res.status(404).json({
        success: false,
        error: `Username "${username}" not found`,
      });
      return;
    }

    const channels = await channelManager.getChannelsByPubkey(user.pubkey);
    const openChannels = channels.filter((c) => c.state === 'OPEN');

    let totalInboundCapacity = 0n;
    for (const channel of openChannels) {
      totalInboundCapacity += channel.remoteBalance;
    }

    res.json({
      success: true,
      data: {
        username: user.username,
        pubkey: user.pubkey,
        status: openChannels.length > 0 ? 'online' : 'offline',
        channels: openChannels.map(channelToJson),
        inboundCapacity: totalInboundCapacity.toString(),
        canReceive: openChannels.length > 0 && totalInboundCapacity > 0n,
        metadata: {
          protocol: 'runebolt',
          version: '0.1.0',
          rune: 'DOG\u2022GO\u2022TO\u2022THE\u2022MOON',
          runeId: '1:0',
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[wellKnownRoutes] Error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
