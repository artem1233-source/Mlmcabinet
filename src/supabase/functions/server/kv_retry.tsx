/**
 * KV Store Retry Wrapper
 * Provides retry logic for KV store operations to handle connection errors
 */

import * as kv from './kv_store.tsx';

interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoffMultiplier?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  delayMs: 100,
  backoffMultiplier: 2
};

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for KV get operation
 */
export async function getWithRetry(
  key: string, 
  options: RetryOptions = {}
): Promise<any> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await kv.get(key);
    } catch (error) {
      lastError = error as Error;
      console.log(`KV Get Retry ${attempt + 1}/${opts.maxRetries + 1} for key "${key}": ${error}`);
      
      // Don't delay after the last attempt
      if (attempt < opts.maxRetries) {
        const delayTime = opts.delayMs * Math.pow(opts.backoffMultiplier, attempt);
        await delay(delayTime);
      }
    }
  }
  
  // All retries failed
  console.error(`KV Get Failed after ${opts.maxRetries + 1} attempts for key "${key}": ${lastError}`);
  throw lastError;
}

/**
 * Retry wrapper for KV set operation
 */
export async function setWithRetry(
  key: string, 
  value: any, 
  options: RetryOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await kv.set(key, value);
    } catch (error) {
      lastError = error as Error;
      console.log(`KV Set Retry ${attempt + 1}/${opts.maxRetries + 1} for key "${key}": ${error}`);
      
      if (attempt < opts.maxRetries) {
        const delayTime = opts.delayMs * Math.pow(opts.backoffMultiplier, attempt);
        await delay(delayTime);
      }
    }
  }
  
  console.error(`KV Set Failed after ${opts.maxRetries + 1} attempts for key "${key}": ${lastError}`);
  throw lastError;
}

/**
 * Retry wrapper for KV mget operation
 */
export async function mgetWithRetry(
  keys: string[], 
  options: RetryOptions = {}
): Promise<any[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await kv.mget(keys);
    } catch (error) {
      lastError = error as Error;
      console.log(`KV MGet Retry ${attempt + 1}/${opts.maxRetries + 1} for ${keys.length} keys: ${error}`);
      
      if (attempt < opts.maxRetries) {
        const delayTime = opts.delayMs * Math.pow(opts.backoffMultiplier, attempt);
        await delay(delayTime);
      }
    }
  }
  
  console.error(`KV MGet Failed after ${opts.maxRetries + 1} attempts: ${lastError}`);
  throw lastError;
}

/**
 * Retry wrapper for KV getByPrefix operation
 */
export async function getByPrefixWithRetry(
  prefix: string, 
  options: RetryOptions = {}
): Promise<any[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await kv.getByPrefix(prefix);
    } catch (error) {
      lastError = error as Error;
      console.log(`KV GetByPrefix Retry ${attempt + 1}/${opts.maxRetries + 1} for prefix "${prefix}": ${error}`);
      
      if (attempt < opts.maxRetries) {
        const delayTime = opts.delayMs * Math.pow(opts.backoffMultiplier, attempt);
        await delay(delayTime);
      }
    }
  }
  
  console.error(`KV GetByPrefix Failed after ${opts.maxRetries + 1} attempts for prefix "${prefix}": ${lastError}`);
  throw lastError;
}

/**
 * Retry wrapper for KV del operation
 */
export async function delWithRetry(
  key: string, 
  options: RetryOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await kv.del(key);
    } catch (error) {
      lastError = error as Error;
      console.log(`KV Del Retry ${attempt + 1}/${opts.maxRetries + 1} for key "${key}": ${error}`);
      
      if (attempt < opts.maxRetries) {
        const delayTime = opts.delayMs * Math.pow(opts.backoffMultiplier, attempt);
        await delay(delayTime);
      }
    }
  }
  
  console.error(`KV Del Failed after ${opts.maxRetries + 1} attempts for key "${key}": ${lastError}`);
  throw lastError;
}

/**
 * Retry wrapper for KV mset operation
 */
export async function msetWithRetry(
  items: Array<{ key: string; value: any }>, 
  options: RetryOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await kv.mset(items);
    } catch (error) {
      lastError = error as Error;
      console.log(`KV MSet Retry ${attempt + 1}/${opts.maxRetries + 1} for ${items.length} items: ${error}`);
      
      if (attempt < opts.maxRetries) {
        const delayTime = opts.delayMs * Math.pow(opts.backoffMultiplier, attempt);
        await delay(delayTime);
      }
    }
  }
  
  console.error(`KV MSet Failed after ${opts.maxRetries + 1} attempts: ${lastError}`);
  throw lastError;
}

/**
 * Retry wrapper for KV mdel operation
 */
export async function mdelWithRetry(
  keys: string[], 
  options: RetryOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await kv.mdel(keys);
    } catch (error) {
      lastError = error as Error;
      console.log(`KV MDel Retry ${attempt + 1}/${opts.maxRetries + 1} for ${keys.length} keys: ${error}`);
      
      if (attempt < opts.maxRetries) {
        const delayTime = opts.delayMs * Math.pow(opts.backoffMultiplier, attempt);
        await delay(delayTime);
      }
    }
  }
  
  console.error(`KV MDel Failed after ${opts.maxRetries + 1} attempts: ${lastError}`);
  throw lastError;
}
