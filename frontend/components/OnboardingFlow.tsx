'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  Mail, 
  Wallet, 
  User,
  Check,
  Loader2,
  Zap,
  Sparkles
} from 'lucide-react';
import clsx from 'clsx';

// Social login providers
const providers = [
  {
    id: 'google',
    name: 'Google',
    icon: 'G',
    color: 'bg-white text-gray-800 hover:bg-gray-50',
  },
  {
    id: 'apple',
    name: 'Apple',
    icon: 'A',
    color: 'bg-white text-gray-800 hover:bg-gray-50',
  },
  {
    id: 'email',
    name: 'Email',
    icon: <Mail size={18} />,
    color: 'bg-cyan/10 text-cyan border border-cyan/20 hover:bg-cyan/20',
  },
];

type AuthStep = 'method' | 'username' | 'complete';
type AuthMethod = 'social' | 'wallet' | null;

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (data: { method: string; username?: string; pubkey?: string }) => void;
}

export default function OnboardingFlow({
  isOpen,
  onClose,
  onComplete,
}: OnboardingFlowProps) {
  const [step, setStep] = useState<AuthStep>('method');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleProviderSelect = async (providerId: string) => {
    setIsLoading(true);
    setSelectedProvider(providerId);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      setStep('username');
    } catch (err) {
      setError('Failed to connect. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletConnect = async () => {
    setIsLoading(true);

    try {
      if (typeof window !== 'undefined' && !(window as any).unisat) {
        window.open('https://unisat.io', '_blank');
        setError('Please install Unisat wallet and refresh.');
        setIsLoading(false);
        return;
      }

      const accounts = await (window as any).unisat.requestAccounts();
      if (accounts && accounts.length > 0) {
        setStep('username');
      }
    } catch (err) {
      setError('Connection declined. Try again or use email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUsername(username)) {
      setError('3-20 characters, letters/numbers/underscores only');
      return;
    }

    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setStep('complete');
      
      setTimeout(() => {
        onComplete?.({ method: selectedProvider || 'wallet', username });
        handleClose();
      }, 1500);
    } catch (err) {
      setError('Username taken. Try another.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('method');
    setSelectedProvider(null);
    setUsername('');
    setError('');
    onClose();
  };

  const isValidUsername = (name: string) => {
    return /^[a-zA-Z0-9_]{3,20}$/.test(name);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-dark-700 bg-dark-800 shadow-2xl"
        >
          {/* Progress Bar */}
          <div className="absolute left-0 right-0 top-0 h-1 bg-dark-700">
            <motion.div
              className="h-full bg-gradient-to-r from-bitcoin to-orange-500"
              initial={{ width: '0%' }}
              animate={{ 
                width: step === 'method' ? '33%' : 
                       step === 'username' ? '66%' : '100%' 
              }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Choose Method */}
            {step === 'method' && (
              <motion.div
                key="method"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.1 }}
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-bitcoin/20 to-orange-500/10"
                  >
                    <Zap size={32} className="text-bitcoin" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-white">Welcome to RuneBolt</h2>
                  <p className="mt-2 text-sm text-gray-400">
                    Send DOG instantly on Bitcoin. No channel management required.
                  </p>
                </div>

                <div className="mt-8 space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Continue with
                  </p>
                  
                  {providers.map((provider) => (
                    <motion.button
                      key={provider.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleProviderSelect(provider.id)}
                      disabled={isLoading}
                      className={clsx(
                        'flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 font-medium transition-all',
                        provider.color
                      )}
                    >
                      <span className="flex h-5 w-5 items-center justify-center">{provider.icon}</span>
                      {isLoading && selectedProvider === provider.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        `Continue with ${provider.name}`
                      )}
                    </motion.button>
                  ))}
                </div>

                <div className="mt-6 flex items-center gap-4">
                  <div className="h-px flex-1 bg-dark-700" />
                  <span className="text-xs text-gray-500">or</span>
                  <div className="h-px flex-1 bg-dark-700" />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleWalletConnect}
                  disabled={isLoading}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-dark-600 bg-dark-800 px-4 py-3 text-sm font-medium text-gray-300 transition-colors hover:border-dark-500 hover:text-white"
                >
                  <Wallet size={18} />
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Connect Bitcoin Wallet'}
                </motion.button>

                {error && (
                  <p className="mt-4 text-center text-sm text-red-400">{error}</p>
                )}

                <p className="mt-6 text-center text-xs text-gray-500">
                  By continuing, you agree to our Terms and Privacy Policy
                </p>
              </motion.div>
            )}

            {/* Step 2: Username */}
            {step === 'username' && (
              <motion.div
                key="username"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <button
                  onClick={() => setStep('method')}
                  className="mb-4 text-sm text-gray-400 hover:text-white"
                >
                  ← Back
                </button>

                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                    <User size={32} className="text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Choose your username</h2>
                  <p className="mt-2 text-sm text-gray-400">
                    This is how people will find you on RuneBolt.
                  </p>
                </div>

                <form onSubmit={handleUsernameSubmit} className="mt-8 space-y-4">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value.toLowerCase());
                        setError('');
                      }}
                      placeholder="username"
                      maxLength={20}
                      className="w-full rounded-xl border border-dark-700 bg-dark-900 py-3 pl-8 pr-4 font-mono text-white placeholder-gray-500 outline-none transition-colors focus:border-emerald-500/50"
                    />
                  </div>

                  {username && isValidUsername(username) && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-emerald-400"
                    >
                      ✓ Available! Your profile will be: runebolt.io/{username}
                    </motion.p>
                  )}

                  {error && (
                    <p className="text-sm text-red-400">{error}</p>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading || !isValidUsername(username)}
                    className={clsx(
                      'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all',
                      isValidUsername(username)
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20'
                        : 'bg-dark-700 text-gray-500 cursor-not-allowed'
                    )}
                  >
                    {isLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        Claim Username
                        <ArrowRight size={18} />
                      </>
                    )}
                  </motion.button>
                </form>

                <p className="mt-4 text-center text-xs text-gray-500">
                  You can change this later in settings
                </p>
              </motion.div>
            )}

            {/* Step 3: Complete */}
            {step === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-400/10"
                >
                  <Check size={40} className="text-emerald-400" />
                </motion.div>
                
                <h2 className="text-2xl font-bold text-white">You're all set!</h2>
                <p className="mt-2 text-sm text-gray-400">
                  Welcome to RuneBolt, @{username}!
                </p>

                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Sparkles size={16} className="text-bitcoin" />
                  Redirecting to your wallet...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
