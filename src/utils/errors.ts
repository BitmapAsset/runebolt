export class RuneBoltError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'RuneBoltError';
  }
}

export class SwapError extends RuneBoltError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'SWAP_ERROR', 400, details);
    this.name = 'SwapError';
  }
}

export class HTLCError extends RuneBoltError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'HTLC_ERROR', 500, details);
    this.name = 'HTLCError';
  }
}

export class LightningError extends RuneBoltError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'LIGHTNING_ERROR', 502, details);
    this.name = 'LightningError';
  }
}

export class IndexerError extends RuneBoltError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'INDEXER_ERROR', 502, details);
    this.name = 'IndexerError';
  }
}

export class InsufficientFundsError extends RuneBoltError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'INSUFFICIENT_FUNDS', 400, details);
    this.name = 'InsufficientFundsError';
  }
}
