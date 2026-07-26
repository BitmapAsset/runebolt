'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Check, AlertCircle } from 'lucide-react';
import AddressInput from './AddressInput';
import { formatDogAmount, formatUsd } from '@/lib/format';
import { DEMO_USD_RATE } from '@/lib/constants';
import clsx from 'clsx';

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend?: (recipient: string, amount: number) => void;
  maxBalance?: number;
}

type Step = 'input' | 'review' | 'success' | 'error';

export default function SendModal({ isOpen, onClose, onSend, maxBalance = 125000 }: SendModalProps) {
  const [step, setStep] = useState<Step>('input');
  const [recipient, setRecipient] = useState('');
  const [recipientType, setRecipientType] = useState<'runebolt' | 'bitcoin' | null>(null);
  const [amount, setAmount] = useState('');

  const numAmount = parseFloat(amount) || 0;
  const isValid = recipientType !== null && numAmount > 0 && numAmount <= maxBalance;

  const handleReview = () => {
    if (isValid) setStep('review');
  };

  const handleConfirm = () => {
    onSend?.(recipient, numAmount);
    setStep('success');
  };

  const handleClose = () => {
    setStep('input');
    setRecipient('');
    setAmount('');
    setRecipientType(null);
    onClose();
  };

  const handleMax = () => {
    setAmount(maxBalance.toString());
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-dark-700 bg-dark-800 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-dark-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">
                {step === 'input' && 'Send DOG'}
                {step === 'review' && 'Review Transfer'}
                {step === 'success' && 'Transfer Complete'}
                {step === 'error' && 'Transfer Failed'}
              </h2>
              <button
                onClick={handleClose}
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-dark-700 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                {step === 'input' && (
                  <motion.div
                    key="input"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-5"
                  >
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-400">
                        Recipient
                      </label>
                      <AddressInput
                        value={recipient}
                        onChange={setRecipient}
                        onResolve={setRecipientType}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-400">
                        Amount
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00000"
                          className="w-full rounded-xl border border-dark-700 bg-dark-800 px-4 py-3 pr-24 font-mono text-lg text-white placeholder-gray-500 outline-none transition-colors focus:border-bitcoin/50"
                        />
                        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
                          <button
                            onClick={handleMax}
                            className="rounded-md bg-dark-600 px-2 py-0.5 text-xs font-medium text-gray-300 transition-colors hover:bg-dark-700 hover:text-white"
                          >
                            MAX
                          </button>
                          <span className="text-sm font-medium text-gray-400">DOG</span>
                        </div>
                      </div>
                      {numAmount > 0 && (
                        <p className="mt-1.5 text-xs text-gray-500">
                          {formatUsd(numAmount * DEMO_USD_RATE)} USD
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-dark-700 bg-dark-900/50 p-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Network Fee</span>
                        <span className="font-mono text-gray-300">0 DOG (off-chain)</span>
                      </div>
                      <div className="mt-1.5 flex justify-between text-xs">
                        <span className="text-gray-400">Estimated Time</span>
                        <span className="font-mono text-gray-300">&lt; 1 second</span>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleReview}
                      disabled={!isValid}
                      className={clsx(
                        'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all',
                        isValid
                          ? 'bg-gradient-to-r from-bitcoin to-orange-600 text-white shadow-lg shadow-bitcoin/20'
                          : 'bg-dark-700 text-gray-500 cursor-not-allowed'
                      )}
                    >
                      Review Transfer
                      <ArrowRight size={16} />
                    </motion.button>
                  </motion.div>
                )}

                {step === 'review' && (
                  <motion.div
                    key="review"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <div className="rounded-xl border border-dark-700 bg-dark-900/50 p-5 text-center">
                      <p className="text-sm text-gray-400">Sending</p>
                      <p className="mt-1 font-mono text-3xl font-bold text-white">
                        {formatDogAmount(numAmount)}
                      </p>
                      <p className="mt-0.5 text-sm text-gray-500">DOG</p>
                    </div>

                    <div className="space-y-3 rounded-xl border border-dark-700 bg-dark-900/50 p-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">To</span>
                        <span className="font-mono text-white">{recipient}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Type</span>
                        <span className="text-cyan">
                          {recipientType === 'runebolt' ? 'Off-Chain' : 'On-Chain'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Fee</span>
                        <span className="font-mono text-gray-300">0 DOG</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep('input')}
                        className="flex-1 rounded-xl border border-dark-700 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-dark-700"
                      >
                        Back
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleConfirm}
                        className="flex-1 rounded-xl bg-gradient-to-r from-bitcoin to-orange-600 py-3 text-sm font-semibold text-white shadow-lg shadow-bitcoin/20"
                      >
                        Confirm & Send
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {step === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center py-6 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
                      className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20"
                    >
                      <Check size={32} className="text-emerald-400" />
                    </motion.div>
                    <h3 className="text-lg font-semibold text-white">Transfer Sent!</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      {formatDogAmount(numAmount)} DOG sent to {recipient}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleClose}
                      className="mt-6 w-full rounded-xl border border-dark-700 py-3 text-sm font-medium text-white transition-colors hover:bg-dark-700"
                    >
                      Done
                    </motion.button>
                  </motion.div>
                )}

                {step === 'error' && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center py-6 text-center"
                  >
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                      <AlertCircle size={32} className="text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Transfer Failed</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      Something went wrong. Please try again.
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setStep('input')}
                      className="mt-6 w-full rounded-xl bg-gradient-to-r from-bitcoin to-orange-600 py-3 text-sm font-semibold text-white"
                    >
                      Try Again
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
