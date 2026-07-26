'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import AddressInput from '@/components/AddressInput';
import GlassCard from '@/components/GlassCard';
import ShibaInu from '@/components/ShibaInu';
import Confetti from '@/components/Confetti';
import { formatDogAmount, formatUsd } from '@/lib/format';
import { DEMO_USD_RATE } from '@/lib/constants';
import { useUnisat } from '@/hooks/useUnisat';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { FeeStatus } from '@/lib/types';
import { demoUser } from '@/lib/demo-data';
import clsx from 'clsx';

type Step = 'input' | 'review' | 'sending' | 'success' | 'error';

export default function SendPage() {
  const [step, setStep] = useState<Step>('input');
  const [recipient, setRecipient] = useState('');
  const [recipientType, setRecipientType] = useState<'runebolt' | 'bitcoin' | null>(null);
  const [amount, setAmount] = useState('');
  const [showUsd, setShowUsd] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { connected, publicKey } = useUnisat();
  const { sendTransfer, getFeeStatus } = useApi();
  const [feeStatus, setFeeStatus] = useState<FeeStatus | null>(null);
  const [balance, setBalance] = useState(demoUser.balance);

  // Load fee status and balance
  useEffect(() => {
    if (!connected || !publicKey || !api.isAuthenticated()) return;
    (async () => {
      const fee = await getFeeStatus(publicKey);
      if (fee) setFeeStatus(fee);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]);

  const numAmount = parseFloat(amount) || 0;
  const usdAmount = numAmount * DEMO_USD_RATE;
  const isValid = recipientType !== null && numAmount > 0 && numAmount <= balance;

  // Fee calculation
  const isFree = feeStatus ? feeStatus.isFree : true;
  const feeRate = feeStatus ? feeStatus.feeRate : 0;
  const fee = isFree ? 0 : numAmount * feeRate;

  const handleReview = () => {
    if (isValid) setStep('review');
  };

  const handleSend = async () => {
    setStep('sending');

    if (!api.isAuthenticated()) {
      // Demo mode - simulate
      setTimeout(() => {
        setStep('success');
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }, 1500);
      return;
    }

    const result = await sendTransfer(recipient, numAmount);
    if (result) {
      setStep('success');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    } else {
      setErrorMsg('Transfer failed. Please try again.');
      setStep('error');
    }
  };

  const handleReset = () => {
    setStep('input');
    setRecipient('');
    setAmount('');
    setRecipientType(null);
    setErrorMsg('');
  };

  return (
    <div className="mx-auto max-w-lg">
      <Confetti active={showConfetti} />

      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/runebolt/app"
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-dark-800 hover:text-white"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-white">Send DOG 🐕</h1>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Input */}
        {step === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Recipient */}
            <GlassCard className="p-6">
              <label className="mb-3 block text-sm font-medium text-gray-400">
                Who&apos;s the lucky doge? 🎯
              </label>
              <AddressInput
                value={recipient}
                onChange={setRecipient}
                onResolve={setRecipientType}
              />
            </GlassCard>

            {/* Amount */}
            <GlassCard className="p-6">
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-400">How much DOG? 💰</label>
                <button
                  onClick={() => setShowUsd(!showUsd)}
                  className="text-xs font-medium text-gray-500 transition-colors hover:text-gray-300"
                >
                  {showUsd ? 'Show DOG' : 'Show USD'}
                </button>
              </div>

              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00000"
                  className="w-full bg-transparent font-mono text-4xl font-bold text-white placeholder-dark-600 outline-none"
                />
                <div className="mt-2 flex items-center justify-between">
                  <p className="font-mono text-sm text-gray-500">
                    {showUsd ? `${formatDogAmount(numAmount)} DOG` : formatUsd(usdAmount)}
                  </p>
                  <button
                    onClick={() => setAmount(balance.toString())}
                    className="rounded-md bg-dark-700 px-2.5 py-1 text-xs font-medium text-gray-300 transition-colors hover:bg-dark-600 hover:text-white"
                  >
                    YOLO MAX
                  </button>
                </div>
              </div>

              {numAmount > balance && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle size={12} />
                  Your DOG wallet is on a diet 🐕💨
                </p>
              )}
            </GlassCard>

            {/* Fee estimate */}
            <GlassCard className="p-5">
              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Network Fee</span>
                  <span className="font-mono text-gray-300">
                    {recipientType === 'runebolt'
                      ? isFree
                        ? '0 DOG (free! 🎉)'
                        : `${formatDogAmount(fee)} DOG (${(feeRate * 100).toFixed(1)}%)`
                      : '~500 sats'}
                  </span>
                </div>
                {feeStatus && recipientType === 'runebolt' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Free txs remaining</span>
                    <span className="font-mono text-cyan">{feeStatus.freeRemaining}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Speed</span>
                  <span className="font-mono text-gray-300">
                    {recipientType === 'runebolt' ? 'Instant ⚡' : '~10 min 🐢'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">You Send</span>
                  <span className="font-mono font-medium text-white">
                    {formatDogAmount(numAmount)} DOG
                  </span>
                </div>
              </div>
            </GlassCard>

            <motion.button
              whileHover={isValid ? { scale: 1.02 } : undefined}
              whileTap={isValid ? { scale: 0.98 } : undefined}
              onClick={handleReview}
              disabled={!isValid}
              className={clsx(
                'flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all',
                isValid
                  ? 'fun-button'
                  : 'bg-dark-700 text-gray-500 cursor-not-allowed'
              )}
            >
              Review Transfer 🐕
              <ArrowRight size={16} />
            </motion.button>
          </motion.div>
        )}

        {/* Step 2: Review */}
        {step === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <GlassCard className="overflow-hidden">
              <div className="bg-gradient-to-r from-bitcoin/10 to-cyan/5 p-8 text-center">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-4xl mb-3"
                >
                  🐕
                </motion.div>
                <p className="text-sm text-gray-400">You&apos;re about to yeet</p>
                <p className="mt-2 font-mono text-4xl font-bold text-white">
                  {formatDogAmount(numAmount)}
                </p>
                <p className="mt-1 text-bitcoin font-semibold">DOG</p>
                <p className="mt-1 font-mono text-sm text-gray-500">{formatUsd(usdAmount)}</p>
              </div>
              <div className="space-y-3 p-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">To</span>
                  <span className="font-mono text-white">{recipient}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Speed</span>
                  <span className="text-cyan">
                    {recipientType === 'runebolt' ? 'Off-Chain (Instant ⚡)' : 'On-Chain 🐢'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Fee</span>
                  <span className="font-mono text-emerald-400">
                    {isFree ? 'FREE 🎉' : `${formatDogAmount(fee)} DOG`}
                  </span>
                </div>
                <div className="border-t border-dark-700 pt-3">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-gray-300">Total</span>
                    <span className="font-mono text-white">{formatDogAmount(numAmount + fee)} DOG</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            <p className="text-center text-xs text-gray-500">
              No takebacks! Make sure everything looks right 👀
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('input')}
                className="flex-1 rounded-2xl border border-dark-700 py-3.5 text-sm font-medium text-gray-300 transition-colors hover:bg-dark-700"
              >
                Wait, go back
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSend}
                className="flex-1 fun-button !py-3.5 !text-sm"
              >
                Send it! 🚀
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Sending */}
        {step === 'sending' && (
          <motion.div
            key="sending"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center py-16 text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="mb-6 h-16 w-16 rounded-full border-4 border-dark-600 border-t-bitcoin flex items-center justify-center"
            >
              <span className="text-xl">🐕</span>
            </motion.div>
            <h3 className="text-lg font-semibold text-white">Sending DOG...</h3>
            <p className="mt-1 text-sm text-gray-400">Your DOG is on its way! Much speed. Very instant. 🚀</p>
          </motion.div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-12 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1, stiffness: 200 }}
              className="mb-4"
            >
              <ShibaInu size="xl" mood="excited" animate />
            </motion.div>

            <h3 className="text-2xl font-bold text-white">DOG Delivered! 🎉</h3>
            <p className="mt-2 text-gray-400">
              Much speed. Very instant. Wow.
            </p>
            <p className="mt-1 text-sm text-cyan">
              {formatDogAmount(numAmount)} DOG sent to {recipient}
            </p>

            {/* Share on X button */}
            <motion.a
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              href={`https://x.com/intent/tweet?text=${encodeURIComponent(`Just sent ${formatDogAmount(numAmount)} DOG instantly with @RuneBolt! ⚡🐕\n\nNo waiting for blocks. No long addresses. Just vibes.\n\n#DOG #Bitcoin #RuneBolt`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-dark-600 bg-dark-800 px-5 py-2.5 text-sm font-medium text-gray-300 transition-all hover:border-cyan/30 hover:text-white"
            >
              Flex this on X 📱
            </motion.a>

            <div className="mt-8 flex w-full gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleReset}
                className="flex-1 rounded-2xl border border-dark-700 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-dark-700"
              >
                Send More DOG 🐕
              </motion.button>
              <Link href="/runebolt/app" className="flex-1">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full fun-button !py-3 !text-sm"
                >
                  Back to Dashboard
                </motion.button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Step 5: Error */}
        {step === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-12 text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <AlertCircle size={32} className="text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Transfer Failed</h3>
            <p className="mt-1 text-sm text-gray-400">{errorMsg}</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleReset}
              className="mt-6 w-full fun-button !py-3 !text-sm"
            >
              Try Again 🐕
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
