'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Download, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import { demoTransfers } from '@/lib/demo-data';
import { Transfer } from '@/lib/types';
import { formatDogAmount, formatAddress, formatTimeAgo } from '@/lib/format';
import clsx from 'clsx';

type FilterTab = 'all' | 'sent' | 'received' | 'onchain';

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [visibleCount, setVisibleCount] = useState(5);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'sent', label: 'Sent' },
    { key: 'received', label: 'Received' },
    { key: 'onchain', label: 'On-Chain' },
  ];

  const filteredTransfers = useMemo(() => {
    switch (activeTab) {
      case 'sent':
        return demoTransfers.filter((t) => t.direction === 'sent');
      case 'received':
        return demoTransfers.filter((t) => t.direction === 'received');
      case 'onchain':
        return [];
      default:
        return demoTransfers;
    }
  }, [activeTab]);

  const visibleTransfers = filteredTransfers.slice(0, visibleCount);
  const hasMore = visibleCount < filteredTransfers.length;

  const exportCsv = () => {
    const headers = ['Date', 'Direction', 'Amount (DOG)', 'Counterparty', 'Status'];
    const rows = filteredTransfers.map((t) => [
      t.timestamp.toISOString(),
      t.direction,
      t.amount.toFixed(5),
      t.counterpartyName || t.counterparty,
      t.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `runebolt-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/app"
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-dark-800 hover:text-white"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-white">Transaction History</h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={exportCsv}
          className="flex items-center gap-2 rounded-xl border border-dark-700 bg-dark-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-dark-600 hover:text-white"
        >
          <Download size={14} />
          Export CSV
        </motion.button>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-dark-700 bg-dark-800 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setVisibleCount(5);
            }}
            className={clsx(
              'flex-1 rounded-lg py-2 text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'bg-dark-700 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transfer List */}
      <div className="space-y-2">
        {visibleTransfers.length === 0 ? (
          <GlassCard className="py-16 text-center">
            <p className="text-gray-400">No transactions found</p>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === 'onchain'
                ? 'On-chain transactions will appear here'
                : 'Try a different filter'}
            </p>
          </GlassCard>
        ) : (
          visibleTransfers.map((transfer, i) => (
            <TransferRow key={transfer.id} transfer={transfer} index={i} />
          ))
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="mt-6 text-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setVisibleCount((prev) => prev + 5)}
            className="flex mx-auto items-center gap-2 rounded-xl border border-dark-700 bg-dark-800 px-6 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-dark-600 hover:text-white"
          >
            Load More
            <ChevronDown size={14} />
          </motion.button>
        </div>
      )}
    </div>
  );
}

function TransferRow({ transfer, index }: { transfer: Transfer; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <GlassCard className="flex items-center gap-4 px-5 py-4">
        <div
          className={clsx(
            'flex h-10 w-10 items-center justify-center rounded-full',
            transfer.direction === 'received'
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-red-500/10 text-red-400'
          )}
        >
          {transfer.direction === 'received' ? (
            <ArrowDownLeft size={20} />
          ) : (
            <ArrowUpRight size={20} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">
            {transfer.direction === 'received' ? 'Received' : 'Sent'}
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-gray-500">
            {transfer.counterpartyName
              ? `${transfer.counterpartyName}@runebolt.io`
              : formatAddress(transfer.counterparty)}
          </p>
        </div>

        <div className="hidden text-right sm:block">
          <p className="text-xs text-gray-400">
            {transfer.timestamp.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {transfer.timestamp.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
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
          <p className="mt-0.5 text-xs text-gray-500 sm:hidden">
            {formatTimeAgo(transfer.timestamp)}
          </p>
          <span
            className={clsx(
              'mt-1 hidden text-xs sm:inline-block',
              transfer.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'
            )}
          >
            {transfer.status}
          </span>
        </div>
      </GlassCard>
    </motion.div>
  );
}
