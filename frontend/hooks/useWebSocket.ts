'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { WS_URL } from '@/lib/constants';
import { Transfer } from '@/lib/types';

interface WebSocketHookOptions {
  url?: string;
  onTransfer?: (transfer: Transfer) => void;
  onChannelUpdate?: (channelId: string, state: string) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocket(options: WebSocketHookOptions = {}) {
  const {
    url = WS_URL,
    onTransfer,
    onChannelUpdate,
    autoReconnect = true,
    reconnectInterval = 3000,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [connected, setConnected] = useState(false);

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connectWs = useCallback(() => {
    cleanup();

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'transfer' && onTransfer) {
            onTransfer(data.payload as Transfer);
          }

          if (data.type === 'channel_update' && onChannelUpdate) {
            onChannelUpdate(data.payload.channelId, data.payload.state);
          }
        } catch {
          // Invalid JSON, ignore
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (autoReconnect) {
          reconnectTimerRef.current = setTimeout(connectWs, reconnectInterval);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      if (autoReconnect) {
        reconnectTimerRef.current = setTimeout(connectWs, reconnectInterval);
      }
    }
  }, [url, onTransfer, onChannelUpdate, autoReconnect, reconnectInterval, cleanup]);

  const subscribe = useCallback(
    (channelId: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'subscribe', channelId }));
      }
    },
    []
  );

  const disconnect = useCallback(() => {
    cleanup();
    setConnected(false);
  }, [cleanup]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    connected,
    connect: connectWs,
    disconnect,
    subscribe,
  };
}
