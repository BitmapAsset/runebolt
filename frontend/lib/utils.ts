import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSats(sats: number): string {
  if (sats >= 100000000) {
    return `${(sats / 100000000).toFixed(8)} BTC`;
  } else if (sats >= 1000) {
    return `${sats.toLocaleString()} sats`;
  }
  return `${sats} sats`;
}

export function truncateAddress(address: string, start = 6, end = 4): string {
  if (!address) return "";
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Asset type definitions
export type AssetType = "rune" | "ordinal" | "bitmap" | "brc20";

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  symbol?: string;
  amount: number;
  image?: string;
  inscriptionId?: string;
  blockNumber?: number;
  decimals?: number;
}

export interface Transaction {
  id: string;
  type: "send" | "receive";
  asset: Asset;
  amount: number;
  from: string;
  to: string;
  status: "pending" | "completed" | "failed";
  timestamp: Date;
  txid?: string;
}
