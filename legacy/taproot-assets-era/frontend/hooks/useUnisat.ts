'use client';

import { useState, useEffect, useCallback } from 'react';
import { WalletState } from '@/lib/types';

declare global {
  interface Window {
    unisat?: {
      requestAccounts: () => Promise<string[]>;
      getAccounts: () => Promise<string[]>;
      getPublicKey: () => Promise<string>;
      getBalance: () => Promise<{ confirmed: number; unconfirmed: number; total: number }>;
      signMessage: (msg: string) => Promise<string>;
      signPsbt: (psbtHex: string) => Promise<string>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

const STORAGE_KEY = 'runebolt_wallet_connected';

export function useUnisat() {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: null,
    publicKey: null,
    balance: 0,
    loading: false,
  });
  const [installed, setInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    const checkInstalled = () => {
      setInstalled(typeof window !== 'undefined' && !!window.unisat);
    };

    checkInstalled();

    const timer = setTimeout(checkInstalled, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (installed && localStorage.getItem(STORAGE_KEY) === 'true') {
      reconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installed]);

  const reconnect = async () => {
    if (!window.unisat) return;
    try {
      const accounts = await window.unisat.getAccounts();
      if (accounts.length > 0) {
        const pubKey = await window.unisat.getPublicKey();
        setWallet({
          connected: true,
          address: accounts[0],
          publicKey: pubKey,
          balance: 0,
          loading: false,
        });
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const connect = useCallback(async () => {
    if (!window.unisat) {
      window.open('https://unisat.io', '_blank');
      return;
    }

    setWallet((prev) => ({ ...prev, loading: true }));

    try {
      const accounts = await window.unisat.requestAccounts();
      const pubKey = await window.unisat.getPublicKey();

      setWallet({
        connected: true,
        address: accounts[0],
        publicKey: pubKey,
        balance: 0,
        loading: false,
      });

      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      setWallet((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet({
      connected: false,
      address: null,
      publicKey: null,
      balance: 0,
      loading: false,
    });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const signMessage = useCallback(
    async (msg: string): Promise<string | null> => {
      if (!window.unisat || !wallet.connected) return null;
      try {
        return await window.unisat.signMessage(msg);
      } catch {
        return null;
      }
    },
    [wallet.connected]
  );

  const signPsbt = useCallback(
    async (psbtHex: string): Promise<string | null> => {
      if (!window.unisat || !wallet.connected) return null;
      try {
        return await window.unisat.signPsbt(psbtHex);
      } catch {
        return null;
      }
    },
    [wallet.connected]
  );

  const getPublicKey = useCallback(async (): Promise<string | null> => {
    if (!window.unisat) return null;
    try {
      return await window.unisat.getPublicKey();
    } catch {
      return null;
    }
  }, []);

  return {
    ...wallet,
    installed,
    connect,
    disconnect,
    signMessage,
    signPsbt,
    getPublicKey,
  };
}
