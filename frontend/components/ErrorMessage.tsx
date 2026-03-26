'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  XCircle, 
  Lock, 
  Search, 
  Coins, 
  Rocket,
  AlertTriangle,
  Wifi,
  RefreshCw,
  ArrowRight,
  HelpCircle,
  ExternalLink,
  Mail
} from 'lucide-react';
import clsx from 'clsx';

// Error types with user-friendly messaging
export type ErrorType = 
  | 'wallet_not_connected'
  | 'connection_rejected'
  | 'wallet_locked'
  | 'network_mismatch'
  | 'insufficient_funds'
  | 'no_active_account'
  | 'transfer_failed'
  | 'recipient_not_found'
  | 'amount_too_small'
  | 'funding_pending'
  | 'mempool_congestion'
  | 'service_unavailable'
  | 'unknown';

interface UserFriendlyError {
  type: ErrorType;
  icon: React.ElementType;
  title: string;
  message: string;
  action: string;
  actionLabel: string;
  secondaryAction?: string;
  secondaryActionLabel?: string;
  showHelpLink?: boolean;
}

const errorMessages: Record<ErrorType, UserFriendlyError> = {
  wallet_not_connected: {
    type: 'wallet_not_connected',
    icon: Wallet,
    title: 'Unleash your wallet! 🔓',
    message: 'Your DOG needs a home. Connect your wallet to get started.',
    action: 'connect',
    actionLabel: 'Unleash Wallet 🐕',
    secondaryAction: 'social',
    secondaryActionLabel: 'Or create an account with email →',
  },
  connection_rejected: {
    type: 'connection_rejected',
    icon: XCircle,
    title: 'The DOG was denied entry 🚪',
    message: "You declined the connection. No worries, the DOG will wait patiently!",
    action: 'retry',
    actionLabel: 'Let the DOG in 🐾',
    secondaryAction: 'social',
    secondaryActionLabel: 'Or create an account with email',
  },
  wallet_locked: {
    type: 'wallet_locked',
    icon: Lock,
    title: 'Wallet is napping 😴',
    message: 'Your wallet is locked. Wake it up and try again!',
    action: 'open_wallet',
    actionLabel: 'Wake Up Wallet',
    showHelpLink: true,
  },
  network_mismatch: {
    type: 'network_mismatch',
    icon: Wifi,
    title: 'Wrong neighborhood! 🏘️',
    message: 'Your wallet wandered to the wrong network. Guide it back to Bitcoin Mainnet.',
    action: 'open_settings',
    actionLabel: 'Fix Network',
    showHelpLink: true,
  },
  insufficient_funds: {
    type: 'insufficient_funds',
    icon: Coins,
    title: 'Your DOG wallet is on a diet 🐕💨',
    message: 'Not enough DOG for this treat. Add more or reduce the amount.',
    action: 'add_funds',
    actionLabel: 'Feed the Wallet 🦴',
    secondaryAction: 'reduce',
    secondaryActionLabel: 'Or reduce the amount',
  },
  no_active_account: {
    type: 'no_active_account',
    icon: Rocket,
    title: 'Your DOG needs fuel! 🚀',
    message: 'Add at least 1,000 DOG to start sending instant payments. To the moon!',
    action: 'add_funds',
    actionLabel: 'Add DOG Now 🐕',
    secondaryAction: 'learn',
    secondaryActionLabel: 'Why do I need to add DOG? →',
  },
  transfer_failed: {
    type: 'transfer_failed',
    icon: AlertTriangle,
    title: 'Oops! The DOG tripped 🐕‍🦺',
    message: "Don't worry — your DOG is safe! Sometimes even good boys stumble. Try again in a sec.",
    action: 'retry',
    actionLabel: 'Try Again 🔄',
    secondaryAction: 'support',
    secondaryActionLabel: 'Still stuck? Get help →',
  },
  recipient_not_found: {
    type: 'recipient_not_found',
    icon: Search,
    title: "Can't sniff them out 🐕🔍",
    message: 'Check the spelling or send them a claim link instead!',
    action: 'search_again',
    actionLabel: 'Sniff Again',
    secondaryAction: 'claim_link',
    secondaryActionLabel: 'Send a claim link instead →',
  },
  amount_too_small: {
    type: 'amount_too_small',
    icon: Coins,
    title: 'That\'s a crumb, not a treat! 🍪',
    message: 'Minimum send is 100 DOG. Be more generous with your DOG!',
    action: 'update',
    actionLabel: 'Update Amount',
    secondaryAction: 'learn',
    secondaryActionLabel: 'Why is there a minimum? →',
  },
  funding_pending: {
    type: 'funding_pending',
    icon: RefreshCw,
    title: 'Your DOG is on its way! 🏃‍♂️',
    message: "Bitcoin is fetching your deposit. Good boy! ~10 minutes.",
    action: 'view_mempool',
    actionLabel: 'Watch it Run 👀',
    secondaryAction: 'notify',
    secondaryActionLabel: 'Notify me when ready',
  },
  mempool_congestion: {
    type: 'mempool_congestion',
    icon: AlertTriangle,
    title: 'Traffic jam on the blockchain! 🚗',
    message: 'Bitcoin is packed like a dog park on Saturday. Your tx may take a bit longer.',
    action: 'speed_up',
    actionLabel: 'Speed Up (Higher Fee) 💨',
    secondaryAction: 'wait',
    secondaryActionLabel: "I'll wait patiently like a good boy",
  },
  service_unavailable: {
    type: 'service_unavailable',
    icon: Wifi,
    title: "We're chasing our tail 🌀",
    message: "Something went wrong on our end. Your DOG is safe! Try again in a minute.",
    action: 'retry',
    actionLabel: 'Try Again 🔄',
    secondaryAction: 'status',
    secondaryActionLabel: 'Status page: status.runebolt.io',
  },
  unknown: {
    type: 'unknown',
    icon: AlertTriangle,
    title: 'Ruh roh! Something broke 🐕',
    message: 'An unexpected error occurred. Your DOG is safe though!',
    action: 'retry',
    actionLabel: 'Try Again 🔄',
    secondaryAction: 'support',
    secondaryActionLabel: 'Contact support',
  },
};

interface ErrorMessageProps {
  error?: ErrorType | string;
  technicalError?: string;
  context?: 'modal' | 'inline' | 'page' | 'toast';
  onAction?: (action: string) => void;
  onClose?: () => void;
  className?: string;
}

export function ErrorMessage({
  error = 'unknown',
  technicalError,
  context = 'inline',
  onAction,
  onClose,
  className,
}: ErrorMessageProps) {
  // Determine error type
  const errorType: ErrorType = typeof error === 'string' && error in errorMessages 
    ? (error as ErrorType) 
    : 'unknown';
  
  const errorConfig = errorMessages[errorType];
  const Icon = errorConfig.icon;

  const handleAction = (action: string) => {
    onAction?.(action);
  };

  // Compact toast version
  if (context === 'toast') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={clsx(
          'flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3',
          className
        )}
      >
        <Icon size={18} className="mt-0.5 shrink-0 text-red-400" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-400">{errorConfig.title}</p>
          <p className="text-xs text-gray-400">{errorConfig.message}</p>
        </div>
        <button
          onClick={() => handleAction(errorConfig.action)}
          className="shrink-0 text-xs font-medium text-bitcoin hover:text-orange-400"
        >
          {errorConfig.actionLabel}
        </button>
      </motion.div>
    );
  }

  // Inline compact version
  if (context === 'inline') {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className={clsx(
          'rounded-xl border border-red-500/20 bg-red-500/5 p-4',
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10">
            <Icon size={16} className="text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-red-400">{errorConfig.title}</h4>
            <p className="mt-0.5 text-sm text-gray-400">{errorConfig.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => handleAction(errorConfig.action)}
                className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30"
              >
                {errorConfig.actionLabel}
              </button>
              {errorConfig.secondaryAction && (
                <button
                  onClick={() => handleAction(errorConfig.secondaryAction!)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:bg-dark-700 hover:text-gray-300"
                >
                  {errorConfig.secondaryActionLabel}
                </button>
              )}
            </div>
          </div>
        </div>
        {technicalError && (
          <div className="mt-3 border-t border-red-500/10 pt-2">
            <p className="font-mono text-xs text-red-400/50">{technicalError}</p>
          </div>
        )}
      </motion.div>
    );
  }

  // Full modal/page version
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={clsx(
        'relative overflow-hidden rounded-2xl border border-red-500/20 bg-dark-800 p-8 text-center',
        className
      )}
    >
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent" />
      
      <div className="relative">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10"
        >
          <Icon size={32} className="text-red-400" />
        </motion.div>

        <h3 className="text-lg font-semibold text-white">{errorConfig.title}</h3>
        <p className="mx-auto mt-2 max-w-xs text-sm text-gray-400">{errorConfig.message}</p>

        {/* Primary Action */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleAction(errorConfig.action)}
          className="mx-auto mt-6 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-bitcoin to-orange-600 py-3 text-sm font-semibold text-white shadow-lg shadow-bitcoin/20"
        >
          {errorConfig.actionLabel}
          <ArrowRight size={16} />
        </motion.button>

        {/* Secondary Action */}
        {errorConfig.secondaryAction && (
          <button
            onClick={() => handleAction(errorConfig.secondaryAction!)}
            className="mx-auto mt-3 block text-sm text-gray-400 transition-colors hover:text-white"
          >
            {errorConfig.secondaryActionLabel}
          </button>
        )}

        {/* Help Link */}
        {errorConfig.showHelpLink && (
          <a
            href="https://help.runebolt.io"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto mt-4 flex items-center justify-center gap-1 text-xs text-gray-500 transition-colors hover:text-gray-400"
          >
            <HelpCircle size={12} />
            Need help? Contact support
          </a>
        )}

        {/* Technical Error (for debugging) */}
        {technicalError && (
          <div className="mt-6 rounded-lg bg-dark-900/50 p-3">
            <p className="font-mono text-xs text-gray-600">{technicalError}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Error boundary wrapper for catching React errors
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <ErrorMessage
            error="unknown"
            technicalError={this.state.error?.message}
            context="page"
            onAction={(action) => {
              if (action === 'retry') {
                window.location.reload();
              }
            }}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

// Helper to map technical errors to user-friendly types
export function mapErrorToType(error: string | Error): ErrorType {
  const message = typeof error === 'string' ? error.toLowerCase() : error.message.toLowerCase();
  
  if (message.includes('wallet') && message.includes('detected')) return 'wallet_not_connected';
  if (message.includes('rejected') || message.includes('declined')) return 'connection_rejected';
  if (message.includes('locked') || message.includes('unauthorized')) return 'wallet_locked';
  if (message.includes('network') || message.includes('mainnet')) return 'network_mismatch';
  if (message.includes('insufficient') || message.includes('balance')) return 'insufficient_funds';
  if (message.includes('channel') || message.includes('no active')) return 'no_active_account';
  if (message.includes('recipient') || message.includes('not found')) return 'recipient_not_found';
  if (message.includes('dust') || message.includes('too small')) return 'amount_too_small';
  if (message.includes('funding') && message.includes('pending')) return 'funding_pending';
  if (message.includes('fee') || message.includes('congestion')) return 'mempool_congestion';
  if (message.includes('500') || message.includes('unavailable')) return 'service_unavailable';
  if (message.includes('transfer') && message.includes('fail')) return 'transfer_failed';
  
  return 'unknown';
}

// Default export with all exports
export default ErrorMessage;
