'use client';

import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';
import { Transfer } from '@/lib/types';
import { formatDogAmount, formatAddress, formatTimeAgo } from '@/lib/format';
import Link from 'next/link';
import clsx from 'clsx';

interface TransferListProps {
  transfers: Transfer[];
  showAllLink?: string;
  maxItems?: number;
}

const statusEmoji = {
  sent: '🚀',
  received: '🎁',
  pending: '⏳',
};

export default function TransferList({ transfers, showAllLink, maxItems }: TransferListProps) {
  const items = maxItems ? transfers.slice(0, maxItems) : transfers;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mb-3 text-4xl"
        >
          🐕
        </motion.div>
        <p className="text-sm text-gray-400">No transfers yet</p>
        <p className="mt-1 text-xs text-gray-500">
          Send some DOG to get the party started! 🎉
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-1">
        {items.map((transfer, index) => {
          const emoji = transfer.status === 'pending'
            ? statusEmoji.pending
            : statusEmoji[transfer.direction as keyof typeof statusEmoji] || '⚡';

          return (
            <motion.div
              key={transfer.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex items-center gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-dark-700/50 group"
            >
              {/* Emoji status */}
              <motion.div
                whileHover={{ scale: 1.3, rotate: [0, -10, 10, 0] }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-dark-700/50 text-xl"
              >
                {emoji}
              </motion.div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  {transfer.direction === 'received' ? 'Received' : 'Sent'}
                  {transfer.counterpartyName && (
                    <span className="text-gray-400">
                      {transfer.direction === 'received' ? ' from ' : ' to '}
                      <span className="text-cyan">@{transfer.counterpartyName}</span>
                    </span>
                  )}
                </p>
                <p className="mt-0.5 truncate font-mono text-xs text-gray-500">
                  {transfer.counterpartyName
                    ? `${transfer.counterpartyName}@runebolt.io`
                    : formatAddress(transfer.counterparty)}
                </p>
              </div>

              <div className="text-right">
                <p
                  className={clsx(
                    'font-mono text-sm font-medium',
                    transfer.direction === 'received' ? 'text-emerald-400' : 'text-white'
                  )}
                >
                  {transfer.direction === 'received' ? '+' : '-'}
                  {formatDogAmount(transfer.amount)}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {formatTimeAgo(transfer.timestamp)}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {showAllLink && (
        <div className="mt-4 text-center">
          <Link
            href={showAllLink}
            className="text-sm font-medium text-bitcoin transition-colors hover:text-orange-400"
          >
            View All Transfers 📜
          </Link>
        </div>
      )}
    </div>
  );
}
