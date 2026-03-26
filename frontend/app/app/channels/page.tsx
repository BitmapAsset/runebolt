'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, X, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import ChannelCard from '@/components/ChannelCard';
import GlassCard from '@/components/GlassCard';
import { useUnisat } from '@/hooks/useUnisat';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { demoChannels, demoUser } from '@/lib/demo-data';
import { Channel, ChannelState } from '@/lib/types';
import { formatDogAmount } from '@/lib/format';
import clsx from 'clsx';

type OpenStep = 'amount' | 'review' | 'signing' | 'waiting' | 'success';

export default function ChannelsPage() {
  const { connected, publicKey, signMessage } = useUnisat();
  const {
    getChannels,
    openChannel: apiOpenChannel,
    closeChannel: apiCloseChannel,
    authenticate,
  } = useApi();

  const [channels, setChannels] = useState<Channel[]>(demoChannels);
  const [showOpen, setShowOpen] = useState(false);
  const [openStep, setOpenStep] = useState<OpenStep>('amount');
  const [lockAmount, setLockAmount] = useState('');
  const [closingChannelId, setClosingChannelId] = useState<string | null>(null);
  const [balance, setBalance] = useState(demoUser.balance);

  // Load channels
  useEffect(() => {
    if (!connected || !publicKey) return;
    const load = async () => {
      if (!api.isAuthenticated()) {
        const result = await authenticate(publicKey, signMessage);
        if (!result) return;
      }
      const ch = await getChannels();
      if (ch) {
        setChannels(ch);
        const total = ch.reduce((sum, c) => sum + c.localBalance, 0);
        setBalance(total);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]);

  const openChannels = channels.filter((c) => c.state === ChannelState.OPEN);
  const otherChannels = channels.filter((c) => c.state !== ChannelState.OPEN);

  const handleOpenChannel = () => {
    setShowOpen(true);
    setOpenStep('amount');
    setLockAmount('');
  };

  const handleReview = () => {
    if (parseFloat(lockAmount) > 0) setOpenStep('review');
  };

  const handleSign = async () => {
    setOpenStep('signing');

    if (!api.isAuthenticated()) {
      // Demo mode
      setTimeout(() => setOpenStep('waiting'), 1500);
      setTimeout(() => setOpenStep('success'), 3500);
      return;
    }

    const result = await apiOpenChannel(parseFloat(lockAmount));
    if (result) {
      setOpenStep('success');
      // Refresh channel list
      const ch = await getChannels();
      if (ch) {
        setChannels(ch);
        const total = ch.reduce((sum, c) => sum + c.localBalance, 0);
        setBalance(total);
      }
    } else {
      setOpenStep('amount');
    }
  };

  const handleCloseModal = () => {
    setShowOpen(false);
    setOpenStep('amount');
    setLockAmount('');
  };

  const handleCloseChannel = async (channelId: string) => {
    setClosingChannelId(channelId);

    if (!api.isAuthenticated()) {
      // Demo mode
      setTimeout(() => {
        setChannels((prev) =>
          prev.map((c) =>
            c.id === channelId ? { ...c, state: ChannelState.CLOSING } : c
          )
        );
        setClosingChannelId(null);
      }, 1500);
      return;
    }

    const result = await apiCloseChannel(channelId);
    if (result) {
      const ch = await getChannels();
      if (ch) setChannels(ch);
    }
    setClosingChannelId(null);
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/runebolt/app"
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-dark-800 hover:text-white"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Payment Channels</h1>
            <span className="rounded-full bg-dark-700 px-2.5 py-0.5 font-mono text-xs font-medium text-gray-300">
              {channels.length}
            </span>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleOpenChannel}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-bitcoin to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-bitcoin/20"
        >
          <Plus size={16} />
          Open Channel
        </motion.button>
      </div>

      {/* Channel List */}
      <div className="space-y-4">
        {openChannels.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-medium text-gray-400">
              Open ({openChannels.length})
            </h2>
            <div className="space-y-3">
              {openChannels.map((channel, i) => (
                <div key={channel.id} className="relative">
                  <ChannelCard
                    channel={channel}
                    index={i}
                    onClose={handleCloseChannel}
                  />
                  {closingChannelId === channel.id && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-dark-900/80 backdrop-blur-sm">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Loader2 size={16} className="animate-spin" />
                        Closing channel...
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {otherChannels.length > 0 && (
          <div>
            <h2 className="mb-3 mt-6 text-sm font-medium text-gray-400">
              Other ({otherChannels.length})
            </h2>
            <div className="space-y-3">
              {otherChannels.map((channel, i) => (
                <ChannelCard key={channel.id} channel={channel} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Open Channel Modal */}
      <AnimatePresence>
        {showOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-dark-700 bg-dark-800 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-dark-700 px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Open New Channel</h2>
                <button
                  onClick={handleCloseModal}
                  className="rounded-lg p-1 text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <AnimatePresence mode="wait">
                  {openStep === 'amount' && (
                    <motion.div
                      key="amount"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-5"
                    >
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-400">
                          Amount to Lock
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={lockAmount}
                            onChange={(e) => setLockAmount(e.target.value)}
                            placeholder="0.00000"
                            className="w-full rounded-xl border border-dark-700 bg-dark-900/60 px-4 py-3 pr-20 font-mono text-lg text-white placeholder-gray-500 outline-none focus:border-bitcoin/50"
                          />
                          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
                            <button
                              onClick={() => setLockAmount(balance.toString())}
                              className="rounded bg-dark-600 px-2 py-0.5 text-xs text-gray-300 hover:text-white"
                            >
                              MAX
                            </button>
                            <span className="text-sm text-gray-400">DOG</span>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          Available: {formatDogAmount(balance)} DOG
                        </p>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleReview}
                        disabled={!lockAmount || parseFloat(lockAmount) <= 0}
                        className={clsx(
                          'w-full rounded-xl py-3 text-sm font-semibold transition-all',
                          parseFloat(lockAmount) > 0
                            ? 'bg-gradient-to-r from-bitcoin to-orange-600 text-white shadow-lg shadow-bitcoin/20'
                            : 'bg-dark-700 text-gray-500 cursor-not-allowed'
                        )}
                      >
                        Continue
                      </motion.button>
                    </motion.div>
                  )}

                  {openStep === 'review' && (
                    <motion.div
                      key="review"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-5"
                    >
                      <div className="rounded-xl border border-dark-700 bg-dark-900/50 p-5 text-center">
                        <p className="text-sm text-gray-400">Locking</p>
                        <p className="mt-1 font-mono text-3xl font-bold text-white">
                          {formatDogAmount(parseFloat(lockAmount))}
                        </p>
                        <p className="mt-0.5 text-sm text-gray-500">DOG</p>
                      </div>

                      <div className="space-y-2 rounded-xl border border-dark-700 bg-dark-900/50 p-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Channel with</span>
                          <span className="text-cyan">RuneBolt Hub</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Type</span>
                          <span className="text-gray-300">2-of-2 Taproot Multisig</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">On-chain fee</span>
                          <span className="font-mono text-gray-300">~1,500 sats</span>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setOpenStep('amount')}
                          className="flex-1 rounded-xl border border-dark-700 py-3 text-sm font-medium text-gray-300 hover:bg-dark-700"
                        >
                          Back
                        </button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleSign}
                          className="flex-1 rounded-xl bg-gradient-to-r from-bitcoin to-orange-600 py-3 text-sm font-semibold text-white shadow-lg shadow-bitcoin/20"
                        >
                          Sign with Unisat
                        </motion.button>
                      </div>
                    </motion.div>
                  )}

                  {openStep === 'signing' && (
                    <motion.div
                      key="signing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center py-10 text-center"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        className="mb-4 h-12 w-12 rounded-full border-4 border-dark-600 border-t-bitcoin"
                      />
                      <h3 className="text-base font-semibold text-white">
                        Opening channel...
                      </h3>
                      <p className="mt-1 text-sm text-gray-400">
                        Sending request to RuneBolt Hub
                      </p>
                    </motion.div>
                  )}

                  {openStep === 'waiting' && (
                    <motion.div
                      key="waiting"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center py-10 text-center"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="mb-4 h-12 w-12 rounded-full border-4 border-dark-600 border-t-cyan"
                      />
                      <h3 className="text-base font-semibold text-white">
                        Waiting for confirmation...
                      </h3>
                      <p className="mt-1 text-sm text-gray-400">
                        Broadcasting funding transaction
                      </p>
                    </motion.div>
                  )}

                  {openStep === 'success' && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-8 text-center"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                        className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20"
                      >
                        <Check size={32} className="text-emerald-400" />
                      </motion.div>
                      <h3 className="text-lg font-semibold text-white">Channel Opened!</h3>
                      <p className="mt-1 text-sm text-gray-400">
                        {formatDogAmount(parseFloat(lockAmount))} DOG locked in channel
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCloseModal}
                        className="mt-6 w-full rounded-xl border border-dark-700 py-3 text-sm font-medium text-white hover:bg-dark-700"
                      >
                        Done
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
