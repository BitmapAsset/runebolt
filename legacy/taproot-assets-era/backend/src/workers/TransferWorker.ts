import { Worker, isMainThread, parentPort } from 'worker_threads';
import { EventEmitter } from 'events';
import os from 'os';

interface TransferRequest {
  id: string;
  fromChannel: string;
  toChannel: string;
  fromBalance: { local: string; remote: string };
  toBalance: { local: string; remote: string };
  amount: string;
  memo?: string;
}

interface TransferResult {
  id: string;
  success: boolean;
  error?: string;
  newFromBalance?: { local: string; remote: string };
  newToBalance?: { local: string; remote: string };
  timestamp: string;
}

interface WorkerPoolConfig {
  minWorkers?: number;
  maxWorkers?: number;
  taskTimeout?: number;
  maxQueueSize?: number;
}

interface QueuedTask {
  id: number;
  type: string;
  data: unknown;
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timestamp: number;
}

/**
 * TransferWorkerPool - Manages worker threads for off-main-thread transfer processing
 * 
 * Features:
 * - Dynamic worker pool sizing based on CPU cores
 * - Task queue with backpressure
 * - Batch processing for high throughput
 * - Automatic worker restart on failure
 */
export class TransferWorkerPool extends EventEmitter {
  private workers: Worker[] = [];
  private queue: QueuedTask[] = [];
  private activeTasks: Map<number, QueuedTask> = new Map();
  private taskIdCounter: number = 0;
  
  private minWorkers: number;
  private maxWorkers: number;
  private taskTimeout: number;
  private maxQueueSize: number;
  
  private isShuttingDown: boolean = false;
  private batchTimer: NodeJS.Timeout | null = null;
  private currentBatch: QueuedTask[] = [];
  private batchSize: number = 50;
  private batchFlushInterval: number = 50; // ms

  constructor(config: WorkerPoolConfig = {}) {
    super();
    
    this.minWorkers = config.minWorkers || Math.max(2, Math.floor(os.cpus().length / 2));
    this.maxWorkers = config.maxWorkers || Math.max(4, os.cpus().length);
    this.taskTimeout = config.taskTimeout || 30000; // 30 seconds
    this.maxQueueSize = config.maxQueueSize || 10000;

    this.initializeWorkers();
    this.startBatchTimer();
  }

  /**
   * Initialize the minimum number of workers
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.minWorkers; i++) {
      this.addWorker();
    }
    console.log(`[TransferWorkerPool] Initialized with ${this.minWorkers} workers`);
  }

  /**
   * Add a new worker to the pool
   */
  private addWorker(): Worker | null {
    if (this.workers.length >= this.maxWorkers) return null;

    try {
      const worker = new Worker(__filename);
      
      worker.on('message', (result: { taskId: number; data: unknown }) => {
        this.handleWorkerMessage(worker, result);
      });

      worker.on('error', (err) => {
        console.error('[TransferWorkerPool] Worker error:', err);
        this.removeWorker(worker);
        this.addWorker(); // Replace failed worker
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`[TransferWorkerPool] Worker exited with code ${code}`);
          this.removeWorker(worker);
          if (!this.isShuttingDown) {
            this.addWorker(); // Replace crashed worker
          }
        }
      });

      this.workers.push(worker);
      return worker;
    } catch (err) {
      console.error('[TransferWorkerPool] Failed to create worker:', err);
      return null;
    }
  }

  /**
   * Remove a worker from the pool
   */
  private removeWorker(worker: Worker): void {
    const index = this.workers.indexOf(worker);
    if (index !== -1) {
      this.workers.splice(index, 1);
    }
    
    // Reassign any active tasks from this worker
    for (const [taskId, task] of this.activeTasks) {
      if (this.activeTasks.has(taskId)) {
        this.activeTasks.delete(taskId);
        this.queue.unshift(task); // Put back at front of queue
      }
    }
    
    worker.terminate().catch(() => {});
  }

  /**
   * Handle message from worker
   */
  private handleWorkerMessage(_worker: Worker, result: { taskId: number; data: unknown }): void {
    const task = this.activeTasks.get(result.taskId);
    if (task) {
      this.activeTasks.delete(result.taskId);
      const transferResult = result.data as TransferResult;
      
      if (transferResult.success) {
        task.resolve(transferResult);
      } else {
        task.reject(new Error(transferResult.error || 'Unknown error'));
      }
      
      this.processQueue();
    }
  }

  /**
   * Get available worker (one with no active task)
   */
  private getAvailableWorker(): Worker | null {
    // Simple round-robin: find worker with no active task
    const activeWorkerIds = new Set(this.activeTasks.keys());
    for (let i = 0; i < this.workers.length; i++) {
      if (!activeWorkerIds.has(i)) {
        return this.workers[i];
      }
    }
    return null;
  }

  /**
   * Start batch processing timer
   */
  private startBatchTimer(): void {
    this.batchTimer = setInterval(() => {
      this.flushBatch();
    }, this.batchFlushInterval);
  }

  /**
   * Add task to current batch
   */
  private addToBatch(task: QueuedTask): void {
    this.currentBatch.push(task);
    
    if (this.currentBatch.length >= this.batchSize) {
      this.flushBatch();
    }
  }

  /**
   * Flush current batch to workers
   */
  private flushBatch(): void {
    if (this.currentBatch.length === 0) return;

    const batch = this.currentBatch.splice(0, this.batchSize);
    
    // Distribute batch across available workers
    for (const task of batch) {
      const worker = this.getAvailableWorker() || this.addWorker();
      
      if (worker) {
        this.activeTasks.set(task.id as unknown as number, task);
        worker.postMessage({ taskId: task.id, type: task.type, data: task.data });
        
        // Set timeout for task
        setTimeout(() => {
          if (this.activeTasks.has(task.id as unknown as number)) {
            this.activeTasks.delete(task.id as unknown as number);
            task.reject(new Error('Task timeout'));
          }
        }, this.taskTimeout);
      } else {
        // No workers available, put back in queue
        task.reject(new Error('No workers available'));
      }
    }
  }

  /**
   * Process queued tasks
   */
  private processQueue(): void {
    if (this.queue.length === 0) return;

    while (this.queue.length > 0 && this.workers.length > this.activeTasks.size) {
      const task = this.queue.shift();
      if (task) {
        this.addToBatch(task);
      }
    }
  }

  /**
   * Execute a transfer in a worker thread
   */
  async executeTransfer(request: TransferRequest): Promise<TransferResult> {
    return this.execute('transfer', request) as Promise<TransferResult>;
  }

  /**
   * Execute a generic task in a worker thread
   */
  private execute(type: string, data: unknown): Promise<unknown> {
    if (this.isShuttingDown) {
      return Promise.reject(new Error('Worker pool is shutting down'));
    }

    if (this.queue.length >= this.maxQueueSize) {
      return Promise.reject(new Error('Queue is full'));
    }

    return new Promise((resolve, reject) => {
      const task: QueuedTask = {
        id: ++this.taskIdCounter,
        type,
        data,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      // Check if we can execute immediately
      const worker = this.getAvailableWorker();
      if (worker && this.currentBatch.length === 0) {
        this.activeTasks.set(task.id, task);
        worker.postMessage({ taskId: task.id, type, data });
        
        // Set timeout
        setTimeout(() => {
          if (this.activeTasks.has(task.id)) {
            this.activeTasks.delete(task.id);
            reject(new Error('Task timeout'));
          }
        }, this.taskTimeout);
      } else {
        // Queue for batch processing
        this.queue.push(task);
        this.processQueue();
      }
    });
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    workers: number;
    activeTasks: number;
    queuedTasks: number;
    batchSize: number;
  } {
    return {
      workers: this.workers.length,
      activeTasks: this.activeTasks.size,
      queuedTasks: this.queue.length,
      batchSize: this.currentBatch.length,
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(timeoutMs: number = 30000): Promise<void> {
    this.isShuttingDown = true;
    
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    // Flush remaining batch
    this.flushBatch();

    // Wait for active tasks with timeout
    const startTime = Date.now();
    while (this.activeTasks.size > 0 && Date.now() - startTime < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Terminate all workers
    await Promise.all(this.workers.map(w => w.terminate()));
    this.workers = [];
    
    // Reject any remaining queued tasks
    for (const task of this.queue) {
      task.reject(new Error('Worker pool shutdown'));
    }
    this.queue = [];
    
    console.log('[TransferWorkerPool] Shutdown complete');
  }
}

/**
 * Worker thread execution logic
 * This runs inside the worker thread, not the main thread
 */
function workerThreadLogic(): void {
  if (!parentPort) return;

  parentPort.on('message', async (message: { taskId: number; type: string; data: unknown }) => {
    const { taskId, type, data } = message;

    try {
      let result: unknown;

      switch (type) {
        case 'transfer':
          result = await processTransfer(data as TransferRequest);
          break;
        default:
          throw new Error(`Unknown task type: ${type}`);
      }

      parentPort!.postMessage({ taskId, data: result });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      parentPort!.postMessage({
        taskId,
        data: {
          success: false,
          error: errorMessage,
        },
      });
    }
  });
}

/**
 * Process a transfer (runs in worker thread)
 * This performs the actual balance calculations
 */
async function processTransfer(request: TransferRequest): Promise<TransferResult> {
  try {
    const amount = BigInt(request.amount);
    const fromLocal = BigInt(request.fromBalance.local);
    const fromRemote = BigInt(request.fromBalance.remote);
    const toLocal = BigInt(request.toBalance.local);
    const toRemote = BigInt(request.toBalance.remote);

    // Validate balances
    if (fromLocal < amount) {
      return {
        id: request.id,
        success: false,
        error: 'Insufficient balance',
        timestamp: new Date().toISOString(),
      };
    }

    if (toRemote < amount) {
      return {
        id: request.id,
        success: false,
        error: 'Insufficient recipient capacity',
        timestamp: new Date().toISOString(),
      };
    }

    // Calculate new balances
    const newFromLocal = (fromLocal - amount).toString();
    const newFromRemote = (fromRemote + amount).toString();
    const newToLocal = (toLocal + amount).toString();
    const newToRemote = (toRemote - amount).toString();

    // Simulate some processing time for cryptographic operations
    // In production, this would include signature verification, etc.
    await new Promise(resolve => setTimeout(resolve, 1));

    return {
      id: request.id,
      success: true,
      newFromBalance: {
        local: newFromLocal,
        remote: newFromRemote,
      },
      newToBalance: {
        local: newToLocal,
        remote: newToRemote,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return {
      id: request.id,
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    };
  }
}

// If this file is being run as a worker thread, start the worker logic
if (!isMainThread) {
  workerThreadLogic();
}

// Singleton instance for main thread
let poolInstance: TransferWorkerPool | null = null;

export function getTransferWorkerPool(config?: WorkerPoolConfig): TransferWorkerPool {
  if (!poolInstance) {
    poolInstance = new TransferWorkerPool(config);
  }
  return poolInstance;
}

export function resetTransferWorkerPool(): void {
  poolInstance = null;
}

export default TransferWorkerPool;
export type { TransferRequest, TransferResult };
