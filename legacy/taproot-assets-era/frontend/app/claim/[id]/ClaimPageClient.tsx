'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Check, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import ShibaInu from '@/components/ShibaInu';
import Confetti from '@/components/Confetti';
import { demoClaimLink } from '@/lib/demo-data';
import { formatDogAmount } from '@/lib/format';

type ClaimState = 'not-connected' | 'no-channel' | 'ready' | 'claiming' | 'success';

export default function ClaimPageClient() {
  const [state, setState] = useState<ClaimState>('not-connected');
  const [timeLeft, setTimeLeft] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  const claim = demoClaimLink;

  useEffect(() => {
    if (!claim.expiresAt) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = claim.expiresAt!.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [claim.expiresAt]);

  const handleConnect = () => setState('no-channel');
  const handleOpenChannel = () => setState('ready');
  const handleClaim = () => {
    setState('claiming');
    setTimeout(() => {
      setState('success');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#111111] to-[#1a1a2e] py-20 px-4">
      <Confetti active={showConfetti} />

      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="mx-auto mb-4"
          >
            <ShibaInu
              size="xl"
              mood={state === 'success' ? 'excited' : 'happy'}
              animate
            />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-white mb-2"
          >
            {state === 'success' ? 'DOG Claimed! 🎉' : 'Someone sent you DOG! 🐕'}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400"
          >
            {state === 'success'
              ? 'Much wow. Very generous. Such crypto.'
              : 'Quick, claim it before the DOG runs away! 🏃‍♂️'}
          </motion.p>
        </div>

        {/* Claim Card - Gift Card Aesthetic */}
        {state !== 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard className="mb-6 overflow-hidden">
              {/* Gift card header */}
              <div className="relative bg-gradient-to-br from-bitcoin/20 via-orange-600/10 to-cyan/10 p-8 text-center">
                {/* Decorative dots */}
                <div className="absolute top-3 left-3 flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-bitcoin/30" />
                  <div className="w-2 h-2 rounded-full bg-bitcoin/20" />
                  <div className="w-2 h-2 rounded-full bg-bitcoin/10" />
                </div>
                <div className="absolute top-3 right-3 text-sm text-bitcoin/40 font-mono">
                  GIFT
                </div>

                {/* Amount */}
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.4 }}
                >
                  <div className="text-6xl font-bold text-white mb-2 font-mono">
                    {formatDogAmount(claim.amount)}
                  </div>
                  <div className="text-bitcoin font-bold text-lg">
                    DOG•GO•TO•THE•MOON 🌙
                  </div>
                </motion.div>
              </div>

              {/* Card details */}
              <div className="border-t border-white/5 p-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">From</span>
                  <span className="text-white font-medium">
                    @{claim.senderName || 'anonymous'} 🤝
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Message</span>
                  <span className="text-white">{claim.message}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Expires in</span>
                  <span className={timeLeft === 'Expired' ? 'text-red-400' : 'text-yellow-400'}>
                    {timeLeft === 'Expired' ? 'DOG ran away! 🐕💨' : `${timeLeft} ⏰`}
                  </span>
                </div>
              </div>

              {/* Urgency bar */}
              {timeLeft !== 'Expired' && (
                <div className="px-5 pb-4">
                  <div className="h-1 rounded-full bg-dark-700 overflow-hidden">
                    <motion.div
                      initial={{ width: '100%' }}
                      animate={{ width: '60%' }}
                      transition={{ duration: 2, delay: 1 }}
                      className="h-full rounded-full bg-gradient-to-r from-bitcoin to-cyan"
                    />
                  </div>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}

        {/* Action Buttons */}
        {state === 'not-connected' && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConnect}
            className="w-full fun-button flex items-center justify-center gap-2"
          >
            <Wallet className="w-5 h-5" />
            Unleash Your Wallet 🔓
          </motion.button>
        )}

        {state === 'no-channel' && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleOpenChannel}
            className="w-full fun-button flex items-center justify-center gap-2"
          >
            ⚡ Open Channel & Claim
          </motion.button>
        )}

        {state === 'ready' && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClaim}
            className="w-full fun-button flex items-center justify-center gap-2 animate-glow-pulse"
          >
            <Check className="w-5 h-5" />
            Claim {formatDogAmount(claim.amount)} DOG 🐕
          </motion.button>
        )}

        {state === 'claiming' && (
          <div className="w-full py-4 bg-dark-800 border border-dark-700 rounded-2xl font-semibold text-white flex items-center justify-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Clock className="w-5 h-5 text-bitcoin" />
            </motion.div>
            Fetching your DOG... good boy! 🐾
          </div>
        )}

        {state === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <GlassCard className="p-8 mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Check className="w-8 h-8 text-emerald-400" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {formatDogAmount(claim.amount)} DOG is yours! 🎉
              </h2>
              <p className="text-gray-400 text-sm">
                DOG delivered! Much speed. Very instant. 🚀
              </p>
            </GlassCard>

            <Link
              href="/app"
              className="inline-flex items-center gap-2 fun-button !text-sm"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>

            <motion.a
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              href={`https://x.com/intent/tweet?text=${encodeURIComponent(`Just claimed ${formatDogAmount(claim.amount)} DOG via @RuneBolt! 🐕⚡\n\nInstant DOG transfers on Bitcoin. The future is now.\n\n#DOG #Bitcoin #RuneBolt`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Flex this on X 📱
            </motion.a>
          </motion.div>
        )}
      </div>
    </div>
  );
}
