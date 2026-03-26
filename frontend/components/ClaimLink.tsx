'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Link as LinkIcon, 
  QrCode, 
  Copy, 
  Check, 
  Share2, 
  Gift,
  ArrowRight,
  Download
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import GlassCard from './GlassCard';
import clsx from 'clsx';

interface ClaimLinkProps {
  isOpen: boolean;
  onClose: () => void;
  maxBalance?: number;
  userPubkey?: string;
  apiBaseUrl?: string;
}

type Step = 'create' | 'generated' | 'share';

interface GeneratedLink {
  id: string;
  url: string;
  amount: number;
  memo: string;
  expiresAt: Date;
}

export default function ClaimLink({ 
  isOpen, 
  onClose, 
  maxBalance = 125000,
  userPubkey,
  apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
}: ClaimLinkProps) {
  const [step, setStep] = useState<Step>('create');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [generatedLink, setGeneratedLink] = useState<GeneratedLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const isValid = numAmount > 0 && numAmount <= maxBalance;

  const handleCreate = async () => {
    if (!isValid || !userPubkey) return;

    try {
      // In production: Call API to create claim link
      // const response = await fetch(`${apiBaseUrl}/api/v1/claims`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ amount: numAmount, memo }),
      // });
      // const data = await response.json();
      
      // Mock for now
      const linkId = Math.random().toString(36).substring(2, 10);
      const claimUrl = `https://runebolt.io/claim/${linkId}`;
      
      setGeneratedLink({
        id: linkId,
        url: claimUrl,
        amount: numAmount,
        memo: memo || 'Gift from RuneBolt!',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });
      
      setStep('generated');
    } catch (err) {
      console.error('Failed to create claim link:', err);
    }
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!generatedLink) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'You\'ve received DOG! 🐕',
          text: `${generatedLink.memo}\n\nClick to claim ${numAmount.toLocaleString()} DOG:`,
          url: generatedLink.url,
        });
      } catch (err) {
        // User cancelled or share failed
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handleClose = () => {
    setStep('create');
    setAmount('');
    setMemo('');
    setGeneratedLink(null);
    setCopied(false);
    setShowQR(false);
    onClose();
  };

  const formatExpiry = (date: Date) => {
    const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return `Expires in ${days} days`;
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
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-bitcoin/20 to-orange-500/20">
                  <Gift size={16} className="text-bitcoin" />
                </div>
                <h2 className="text-lg font-semibold text-white">
                  {step === 'create' && 'Create Gift Link'}
                  {step === 'generated' && 'Link Ready!'}
                </h2>
              </div>
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
                {step === 'create' && (
                  <motion.div
                    key="create"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-5"
                  >
                    <p className="text-sm text-gray-400">
                      Create a shareable link to send DOG to anyone — they don't even need a RuneBolt account yet!
                    </p>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-400">
                        Amount to Send
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
                          <span className="text-sm font-medium text-gray-400">DOG</span>
                        </div>
                      </div>
                      {numAmount > maxBalance && (
                        <p className="mt-1.5 text-xs text-red-400">
                          You only have {maxBalance.toLocaleString()} DOG
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-400">
                        Message (Optional)
                      </label>
                      <input
                        type="text"
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="e.g., Thanks for the pizza! 🍕"
                        maxLength={50}
                        className="w-full rounded-xl border border-dark-700 bg-dark-800 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-bitcoin/50"
                      />
                      <p className="mt-1.5 text-xs text-gray-500">
                        {memo.length}/50 characters
                      </p>
                    </div>

                    <div className="rounded-xl border border-dark-700 bg-dark-900/50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-cyan/10 text-cyan text-xs">
                          💡
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-300">How it works</p>
                          <ul className="mt-1 space-y-1 text-xs text-gray-500">
                            <li>• They click the link to claim their DOG</li>
                            <li>• No account needed to receive</li>
                            <li>• Link expires in 7 days if unclaimed</li>
                            <li>• Unclaimed DOG returns to you</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCreate}
                      disabled={!isValid}
                      className={clsx(
                        'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all',
                        isValid
                          ? 'bg-gradient-to-r from-bitcoin to-orange-600 text-white shadow-lg shadow-bitcoin/20'
                          : 'bg-dark-700 text-gray-500 cursor-not-allowed'
                      )}
                    >
                      Create Link
                      <ArrowRight size={16} />
                    </motion.button>
                  </motion.div>
                )}

                {step === 'generated' && generatedLink && (
                  <motion.div
                    key="generated"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-5"
                  >
                    <div className="text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.1 }}
                        className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-400/10"
                      >
                        <Gift size={32} className="text-emerald-400" />
                      </motion.div>
                      <h3 className="text-lg font-semibold text-white">
                        {generatedLink.amount.toLocaleString()} DOG Ready!
                      </h3>
                      <p className="text-sm text-gray-400">{generatedLink.memo}</p>
                    </div>

                    {/* Link Display */}
                    <div className="rounded-xl border border-dark-700 bg-dark-900/50 p-4">
                      <div className="flex items-center gap-2">
                        <LinkIcon size={16} className="text-gray-500" />
                        <input
                          type="text"
                          readOnly
                          value={generatedLink.url}
                          className="flex-1 bg-transparent font-mono text-xs text-gray-400 outline-none"
                        />
                        <button
                          onClick={handleCopy}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-dark-700 hover:text-white"
                        >
                          {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* QR Code Toggle */}
                    <AnimatePresence>
                      {showQR && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex justify-center"
                        >
                          <div className="rounded-xl border border-dark-700 bg-white p-4">
                            <QRCodeSVG 
                              value={generatedLink.url} 
                              size={200}
                              level="M"
                              includeMargin={false}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowQR(!showQR)}
                        className="flex items-center justify-center gap-2 rounded-xl border border-dark-700 bg-dark-800 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-dark-700 hover:text-white"
                      >
                        <QrCode size={16} />
                        {showQR ? 'Hide QR' : 'Show QR'}
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleShare}
                        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-bitcoin to-orange-600 py-3 text-sm font-semibold text-white shadow-lg shadow-bitcoin/20"
                      >
                        <Share2 size={16} />
                        Share Link
                      </motion.button>
                    </div>

                    {/* Download QR */}
                    {showQR && (
                      <button
                        onClick={() => {
                          // In production: Implement QR download
                          alert('QR download would save the image');
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dark-700 py-2.5 text-sm text-gray-400 transition-colors hover:bg-dark-700 hover:text-white"
                      >
                        <Download size={16} />
                        Download QR Code
                      </button>
                    )}

                    <div className="text-center">
                      <p className="text-xs text-gray-500">{formatExpiry(generatedLink.expiresAt)}</p>
                    </div>
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
