'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Channel, ChannelState } from '@/lib/types';
import { formatDogAmount, formatChannelId } from '@/lib/format';
import StatusBadge from './StatusBadge';
import GlassCard from './GlassCard';

interface ChannelCardProps {
  channel: Channel;
  onClose?: (channelId: string) => void;
  index?: number;
}

export default function ChannelCard({ channel, onClose, index = 0 }: ChannelCardProps) {
  const localPercent = channel.capacity > 0 ? (channel.localBalance / channel.capacity) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <GlassCard className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <p className="font-mono text-sm font-medium text-white">
                {formatChannelId(channel.id)}
              </p>
              <StatusBadge status={channel.state} />
            </div>
            <p className="mt-1 font-mono text-xs text-gray-500">
              Capacity: {formatDogAmount(channel.capacity)} DOG
            </p>
          </div>
          {channel.state === ChannelState.OPEN && onClose && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onClose(channel.id)}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-dark-700 hover:text-red-400"
              title="Close Channel"
            >
              <X size={16} />
            </motion.button>
          )}
        </div>

        {/* Capacity bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Local</span>
            <span>Remote</span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-dark-700">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${localPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.1 + 0.3 }}
              className="h-full rounded-full bg-gradient-to-r from-bitcoin to-orange-500"
            />
          </div>
          <div className="mt-2 flex justify-between">
            <span className="font-mono text-xs text-bitcoin">
              {formatDogAmount(channel.localBalance)}
            </span>
            <span className="font-mono text-xs text-cyan">
              {formatDogAmount(channel.remoteBalance)}
            </span>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
