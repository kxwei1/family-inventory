import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

interface Backend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  delete(prefix: string): Promise<void>;
  close(): Promise<void>;
}

class MemoryBackend implements Backend {
  private readonly entries = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async delete(prefix: string): Promise<void> {
    for (const key of [...this.entries.keys()]) {
      if (key.startsWith(prefix)) this.entries.delete(key);
    }
  }

  async close(): Promise<void> {
    this.entries.clear();
  }
}

class RedisBackend implements Backend {
  constructor(private readonly client: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, "EX", ttlSeconds);
  }

  async delete(prefix: string): Promise<void> {
    const stream = this.client.scanStream({ match: `${prefix}*`, count: 100 });
    const pipeline = this.client.pipeline();
    let pending = 0;
    for await (const keys of stream) {
      for (const key of keys as string[]) {
        pipeline.del(key);
        pending += 1;
      }
    }
    if (pending > 0) await pipeline.exec();
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly memory = new MemoryBackend();
  private redis: RedisBackend | null = null;
  private backend: Backend = this.memory;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>("REDIS_URL");
    if (!url) {
      this.logger.log("REDIS_URL not set; using in-memory cache");
      return;
    }

    try {
      const client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
      await client.connect();
      this.redis = new RedisBackend(client);
      this.backend = this.redis;
      this.logger.log("Redis cache connected");

      client.on("error", (error) => {
        this.logger.warn(`Redis error, falling back to memory: ${error.message}`);
        this.backend = this.memory;
      });
    } catch (error) {
      this.logger.warn(
        `Could not connect to Redis (${(error as Error).message}); using in-memory cache`,
      );
      this.backend = this.memory;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) await this.redis.close().catch(() => undefined);
    await this.memory.close();
  }

  async wrap<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.backend.get(key);
    if (cached !== null) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        // ignore: corrupt cache, fall through to factory
      }
    }
    const value = await factory();
    await this.backend.set(key, JSON.stringify(value), ttlSeconds).catch((error) => {
      this.logger.warn(`Failed to write cache for ${key}: ${(error as Error).message}`);
    });
    return value;
  }

  async invalidate(prefix: string): Promise<void> {
    await this.backend.delete(prefix).catch((error) => {
      this.logger.warn(`Failed to invalidate ${prefix}: ${(error as Error).message}`);
    });
  }

  /**
   * Convenience: drops every cached aggregation for a given family so the next
   * read (dashboard, statistics, …) recomputes from the source of truth.
   */
  async invalidateFamilyAggregates(familyId: string): Promise<void> {
    await Promise.all([
      this.invalidate(`dashboard:${familyId}`),
      this.invalidate(`statistics:${familyId}`),
    ]);
  }

  /** Test seam: swap the backend to a memory-only instance. */
  resetForTest(): void {
    this.backend = this.memory;
  }
}
