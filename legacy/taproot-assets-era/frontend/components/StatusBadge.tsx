'use client';

import clsx from 'clsx';
import { ChannelState } from '@/lib/types';

interface StatusBadgeProps {
  status: ChannelState | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; color: string; pulse: boolean }> = {
  [ChannelState.OPEN]: {
    label: 'Open',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    pulse: true,
  },
  [ChannelState.PENDING_OPEN]: {
    label: 'Pending',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    pulse: true,
  },
  [ChannelState.CLOSING]: {
    label: 'Closing',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    pulse: true,
  },
  [ChannelState.CLOSED]: {
    label: 'Closed',
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    pulse: false,
  },
  [ChannelState.FORCE_CLOSING]: {
    label: 'Force Closing',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    pulse: true,
  },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    pulse: false,
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.color,
        className
      )}
    >
      {config.pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={clsx(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              status === ChannelState.OPEN && 'bg-emerald-400',
              status === ChannelState.PENDING_OPEN && 'bg-amber-400',
              status === ChannelState.CLOSING && 'bg-orange-400',
              status === ChannelState.FORCE_CLOSING && 'bg-red-400'
            )}
          />
          <span
            className={clsx(
              'relative inline-flex h-1.5 w-1.5 rounded-full',
              status === ChannelState.OPEN && 'bg-emerald-400',
              status === ChannelState.PENDING_OPEN && 'bg-amber-400',
              status === ChannelState.CLOSING && 'bg-orange-400',
              status === ChannelState.FORCE_CLOSING && 'bg-red-400'
            )}
          />
        </span>
      )}
      {config.label}
    </span>
  );
}
