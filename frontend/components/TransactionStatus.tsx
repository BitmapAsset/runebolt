'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ArrowRight,
  Zap
} from 'lucide-react';
import clsx from 'clsx';

export type TransactionStatus = 'pending' | 'confirming' | 'confirmed' | 'failed';
export type TransactionType = 'send' | 'receive' | 'claim' | 'deposit' | 'withdrawal';

export interface TransactionState {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  recipient?: string;
  sender?: string;
  timestamp: number;
  estimatedConfirmationTime?: number;
  error?: string;
}

interface TransactionStatusIndicatorProps {
  transaction: TransactionState;
  onClose?: () => void;
  showDetails?: boolean;
  className?: string;
}

const statusConfig = {
  pending: {
    icon: Loader2,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    borderColor: 'border-yellow-400/20',
    title: 'Sending...',
    description: 'Your transaction is being processed',
    showProgress: true,
  },
  confirming: {
    icon: Clock,
    color: 'text-cyan',
    bgColor: 'bg-cyan/10',
    borderColor: 'border-cyan/20',
    title: 'Confirming...',
    description: 'Waiting for Bitcoin confirmation',
    showProgress: true,
  },
  confirmed: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    borderColor: 'border-emerald-400/20',
    title: 'Complete!',
    description: 'Transaction confirmed successfully',
    showProgress: false,
  },
  failed: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    borderColor: 'border-red-400/20',
    title: 'Failed',
    description: 'Something went wrong',
    showProgress: false,
  },
};

export function TransactionStatusIndicator({
  transaction,
  onClose,
  showDetails = true,
  className,
}: TransactionStatusIndicatorProps) {
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const config = statusConfig[transaction.status];
  const StatusIcon = config.icon;

  // Animate progress bar
  useEffect(() => {
    if (!config.showProgress) return;

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
      setProgress((prev) => {
        if (prev >= 95) return 95;
        return prev + Math.random() * 3;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [config.showProgress]);

  // Auto-close on confirmed after delay
  useEffect(() => {
    if (transaction.status === 'confirmed' && onClose) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [transaction.status, onClose]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getTimeEstimate = () => {
    if (transaction.status === 'pending') {
      return '< 1 second';
    }
    if (transaction.status === 'confirming') {
      const remaining = Math.max(0, (transaction.estimatedConfirmationTime || 600) - elapsedTime);
      return `~${Math.ceil(remaining / 60)} minutes`;
    }
    return '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={clsx(
        'relative overflow-hidden rounded-xl border p-4',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      {/* Animated background for pending/confirming */}
      {config.showProgress && (
        <motion.div
          className={clsx('absolute bottom-0 left-0 h-1 opacity-50', config.color.replace('text-', 'bg-'))}
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      )}

      <div className="relative flex items-start gap-3">
        {/* Status Icon */}
        <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', config.bgColor)}>
          <StatusIcon 
            size={20} 
            className={clsx(config.color, transaction.status === 'pending' && 'animate-spin')} 
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className={clsx('font-semibold', config.color)}>
              {config.title}
            </h4>
            {transaction.status === 'pending' && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Zap size={12} className="text-yellow-400" />
                Instant
              </span>
            )}
          </div>

          {showDetails && (
            <>
              <p className="mt-0.5 text-sm text-gray-400">
                {config.description}
              </p>

              {/* Transaction Details */}
              <div className="mt-2 text-xs text-gray-500">
                {transaction.type === 'send' && transaction.recipient && (
                  <p>Sending to {transaction.recipient}</p>
                )}
                {transaction.type === 'receive' && transaction.sender && (
                  <p>From {transaction.sender}</p>
                )}
              </div>

              {/* Progress Info */}
              {config.showProgress && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Progress</span>
                    <span className={config.color}>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-dark-700">
                    <motion.div
                      className={clsx('h-full rounded-full', config.color.replace('text-', 'bg-'))}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Estimated time: {getTimeEstimate()}
                  </p>
                </div>
              )}

              {/* Amount */}
              {transaction.amount > 0 && (
                <div className="mt-2 flex items-center gap-1">
                  <span className="font-mono text-sm text-white">
                    {transaction.amount.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500">DOG</span>
                </div>
              )}

              {/* Error Message */}
              {transaction.status === 'failed' && transaction.error && (
                <p className="mt-2 text-xs text-red-400">
                  {transaction.error}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Toast notification component for transaction updates
interface TransactionToastProps {
  transactions: TransactionState[];
  onDismiss: (id: string) => void;
}

export function TransactionToastContainer({ transactions, onDismiss }: TransactionToastProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {transactions.map((tx) => (
          <motion.div
            key={tx.id}
            layout
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
          >
            <TransactionStatusIndicator
              transaction={tx}
              onClose={() => onDismiss(tx.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Hook for managing transaction states with WebSocket updates
export function useTransactionStatus() {
  const [transactions, setTransactions] = useState<TransactionState[]>([]);

  const addTransaction = (tx: Omit<TransactionState, 'timestamp'>) => {
    setTransactions((prev) => [
      { ...tx, timestamp: Date.now() },
      ...prev,
    ]);
  };

  const updateTransaction = (id: string, updates: Partial<TransactionState>) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx))
    );
  };

  const removeTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  };

  const dismissTransaction = (id: string) => {
    removeTransaction(id);
  };

  return {
    transactions,
    addTransaction,
    updateTransaction,
    removeTransaction,
    dismissTransaction,
  };
}

export default TransactionStatusIndicator;
