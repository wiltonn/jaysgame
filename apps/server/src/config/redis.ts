import Redis from 'ioredis';
import { env } from './env';

/**
 * Redis client for caching and pub/sub
 */
export const redisClient = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

/**
 * Redis subscriber client for Socket.IO adapter
 */
export const redisSubscriber = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Connection event handlers
redisClient.on('connect', () => {
  console.info('✓ Redis client connected');
});

redisClient.on('error', (error) => {
  console.error('✗ Redis client error:', error.message);
});

redisSubscriber.on('connect', () => {
  console.info('✓ Redis subscriber connected');
});

redisSubscriber.on('error', (error) => {
  console.error('✗ Redis subscriber error:', error.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await redisClient.quit();
  await redisSubscriber.quit();
});
