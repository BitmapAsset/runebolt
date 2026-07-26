'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Check, Link2, Share2 } from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import GlassCard from '@/components/GlassCard';
import { useUnisat } from '@/hooks/useUnisat';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { Transfer } from '@/lib/types';
import { demoUser, demoTransfers } from '@/lib/demo-data';
import { formatDogAmount, formatTimeAgo } from '@/lib/format';

export default function ReceivePage() {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [claimAmount, setClaimAmount] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  const { connected, address } = useUnisat();
  const { getTransfers, createClaimLink } = useApi();
  const [recentReceived, setRecentReceived] = useState<Transfer[]>(
    demoTransfers.filter((t) => t.direction === 'received').slice(0, 3)
  );

  const runeboltAddress = connected && address
    ? `${address.slice(0, 8)}@runebolt.io`
    : demoUser.runeboltAddress;

  useEffect(() => {
    if (!connected || !api.isAuthenticated()) return;
    (async () => {
      const result = await getTransfers(10);
      if (result) {
        setRecentReceived(
          result.transfers.filter((t) => t.direction === 'received').slice(0, 3)
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(runeboltAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const copyLink = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My RuneBolt Address',
          text: `Send me DOG at ${runeboltAddress}`,
        });
      } catch {
        // user cancelled
      }
    } else {
      copyAddress();
    }
  };

  const generateClaimLink = async () => {
    const amount = parseFloat(claimAmount);
    if (amount <= 0) return;

    if (!api.isAuthenticated()) {
      // Demo mode
      setGeneratedLink(`https://runebolt.io/claim/demo_${Math.random().toString(36).slice(2, 10)}`);
      return;
    }

    const result = await createClaimLink(amount);
    if (result) {
      setGeneratedLink(`https://runebolt.io/claim/${result.id}`);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/runebolt/app"
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-dark-800 hover:text-white"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-white">Receive DOG</h1>
      </div>

      <div className="space-y-6">
        {/* Your RuneBolt Address */}
        <GlassCard className="p-6">
          <h2 className="mb-4 text-sm font-medium text-gray-400">Your RuneBolt Address</h2>

          <div className="mb-6 flex justify-center">
            <div className="rounded-2xl border border-dark-700 bg-white p-4">
              <QRCodeSVG
                value={runeboltAddress}
                size={180}
                bgColor="#ffffff"
                fgColor="#0a0a0a"
                level="M"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={copyAddress}
            className="flex w-full items-center justify-between rounded-xl border border-dark-700 bg-dark-900/60 px-4 py-3 transition-colors hover:border-dark-600"
          >
            <span className="font-mono text-sm text-cyan">{runeboltAddress}</span>
            {copiedAddress ? (
              <Check size={16} className="text-emerald-400" />
            ) : (
              <Copy size={16} className="text-gray-400" />
            )}
          </motion.button>

          <div className="mt-3 flex gap-2">
            <button
              onClick={handleShare}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dark-700 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-dark-700 hover:text-white"
            >
              <Share2 size={14} />
              Share
            </button>
          </div>

          <p className="mt-2 text-center text-xs text-gray-500">
            Share this address to receive DOG instantly
          </p>
        </GlassCard>

        {/* Create Claim Link */}
        <GlassCard className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Link2 size={18} className="text-bitcoin" />
            <h2 className="text-sm font-medium text-gray-400">Create Claim Link</h2>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type="number"
                value={claimAmount}
                onChange={(e) => {
                  setClaimAmount(e.target.value);
                  setGeneratedLink('');
                }}
                placeholder="Amount in DOG"
                className="w-full rounded-xl border border-dark-700 bg-dark-900/60 px-4 py-3 font-mono text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-bitcoin/50"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={generateClaimLink}
              disabled={!claimAmount || parseFloat(claimAmount) <= 0}
              className="rounded-xl bg-gradient-to-r from-bitcoin to-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-bitcoin/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Generate
            </motion.button>
          </div>

          {generatedLink && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <p className="mb-2 text-xs text-gray-400">
                Claim link for {formatDogAmount(parseFloat(claimAmount))} DOG
              </p>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={copyLink}
                className="flex w-full items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 transition-colors hover:border-emerald-500/30"
              >
                <span className="truncate font-mono text-xs text-emerald-400">
                  {generatedLink}
                </span>
                {copiedLink ? (
                  <Check size={14} className="ml-2 flex-shrink-0 text-emerald-400" />
                ) : (
                  <Copy size={14} className="ml-2 flex-shrink-0 text-gray-400" />
                )}
              </motion.button>
            </motion.div>
          )}
        </GlassCard>

        {/* Pending Incoming */}
        <GlassCard className="p-6">
          <h2 className="mb-4 text-sm font-medium text-gray-400">Recent Received</h2>
          <div className="space-y-3">
            {recentReceived.map((transfer) => (
              <div
                key={transfer.id}
                className="flex items-center justify-between rounded-xl bg-dark-900/40 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {transfer.counterpartyName || 'Unknown'}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatTimeAgo(transfer.timestamp)}
                  </p>
                </div>
                <p className="font-mono text-sm font-medium text-emerald-400">
                  +{formatDogAmount(transfer.amount)}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
