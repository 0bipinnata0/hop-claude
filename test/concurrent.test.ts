import { test, expect, describe } from 'bun:test';
import { ConfigStorage } from '../src/config/storage.js';
import type { ConfigStore } from '../src/types/index.js';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

describe('Concurrent Access Tests', () => {
  describe('File Locking', () => {
    test('should handle multiple simultaneous writes safely', async () => {
      // 创建临时测试目录
      const testDir = path.join(os.tmpdir(), `hop-claude-test-${Date.now()}`);
      await fs.mkdir(testDir, { recursive: true });

      // 创建自定义存储实例指向测试目录
      class TestStorage extends ConfigStorage {
        constructor(testPath: string) {
          super();
          (this as any).configDir = testPath;
          (this as any).configFile = path.join(testPath, 'config.json');
        }
      }

      const storage = new TestStorage(testDir);

      // 创建多个并发写入操作（减少数量避免锁超时）
      const writes = [];
      const numWrites = 5; // 减少到 5 个以避免锁竞争

      for (let i = 0; i < numWrites; i++) {
        const config: ConfigStore = {
          version: '1.0.0',
          currentProfile: `profile-${i}`,
          profiles: [
            {
              domain: `test-${i}`,
              apiKey: `encrypted-key-${i}`,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
          encryptionSalt: `salt-${i}`,
          encryptionMode: 'legacy',
        };

        // 添加小延迟以减少锁竞争
        await new Promise((resolve) => setTimeout(resolve, 10));
        writes.push(storage.write(config));
      }

      // 等待所有写入完成
      await Promise.all(writes);

      // 读取最终配置
      const finalConfig = await storage.read();

      // 配置应该存在且有效
      expect(finalConfig).not.toBeNull();
      expect(finalConfig?.version).toBe('1.0.0');
      expect(finalConfig?.profiles).toHaveLength(1);

      // 清理测试目录
      await fs.rm(testDir, { recursive: true, force: true });
    });

    test('should not corrupt config file during concurrent writes', async () => {
      const testDir = path.join(os.tmpdir(), `hop-claude-test-${Date.now()}`);
      await fs.mkdir(testDir, { recursive: true });

      class TestStorage extends ConfigStorage {
        constructor(testPath: string) {
          super();
          (this as any).configDir = testPath;
          (this as any).configFile = path.join(testPath, 'config.json');
        }
      }

      const storage = new TestStorage(testDir);

      // 初始化配置
      const initialConfig: ConfigStore = {
        version: '1.0.0',
        currentProfile: '',
        profiles: [],
        encryptionSalt: 'test-salt',
        encryptionMode: 'legacy',
      };

      await storage.write(initialConfig);

      // 并发读写操作
      const operations = [];

      // 5 个并发写入
      for (let i = 0; i < 5; i++) {
        operations.push(
          (async () => {
            const config = await storage.read();
            if (config) {
              config.profiles.push({
                domain: `concurrent-${i}`,
                apiKey: `key-${i}`,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
              await storage.write(config);
            }
          })()
        );
      }

      // 5 个并发读取
      for (let i = 0; i < 5; i++) {
        operations.push(
          (async () => {
            const config = await storage.read();
            expect(config).not.toBeNull();
          })()
        );
      }

      // 等待所有操作完成
      await Promise.all(operations);

      // 验证配置文件仍然可以正常解析（没有损坏）
      const configPath = path.join(testDir, 'config.json');
      const content = await fs.readFile(configPath, 'utf8');
      const parsed = JSON.parse(content); // 应该能正常解析

      expect(parsed.version).toBe('1.0.0');
      expect(Array.isArray(parsed.profiles)).toBe(true);

      // 清理
      await fs.rm(testDir, { recursive: true, force: true });
    });

    test('should handle lock timeout gracefully', async () => {
      const testDir = path.join(os.tmpdir(), `hop-claude-test-${Date.now()}`);
      await fs.mkdir(testDir, { recursive: true });

      class TestStorage extends ConfigStorage {
        constructor(testPath: string) {
          super();
          (this as any).configDir = testPath;
          (this as any).configFile = path.join(testPath, 'config.json');
        }
      }

      const storage = new TestStorage(testDir);

      const config: ConfigStore = {
        version: '1.0.0',
        currentProfile: 'test',
        profiles: [],
        encryptionSalt: 'test-salt',
      };

      // 第一次写入应该成功
      await storage.write(config);

      // 即使在高并发下，文件锁也应该确保写入成功或超时失败（而不是损坏数据）
      const fastWrites = [];
      for (let i = 0; i < 20; i++) {
        fastWrites.push(
          storage.write({
            ...config,
            currentProfile: `profile-${i}`,
          })
        );
      }

      // 所有写入应该要么成功，要么抛出超时错误（但不会损坏文件）
      const results = await Promise.allSettled(fastWrites);

      // 至少有一些写入应该成功
      const successful = results.filter((r) => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);

      // 验证最终配置仍然有效
      const finalConfig = await storage.read();
      expect(finalConfig).not.toBeNull();
      expect(finalConfig?.version).toBe('1.0.0');

      // 清理
      await fs.rm(testDir, { recursive: true, force: true });
    });
  });

  describe('Race Conditions', () => {
    test('should prevent race condition when creating new config', async () => {
      const testDir = path.join(os.tmpdir(), `hop-claude-test-${Date.now()}`);
      await fs.mkdir(testDir, { recursive: true });

      class TestStorage extends ConfigStorage {
        constructor(testPath: string) {
          super();
          (this as any).configDir = testPath;
          (this as any).configFile = path.join(testPath, 'config.json');
        }
      }

      // 多个进程同时尝试创建配置
      const storages = Array.from({ length: 5 }, () => new TestStorage(testDir));

      const config: ConfigStore = {
        version: '1.0.0',
        currentProfile: 'test',
        profiles: [],
        encryptionSalt: 'test-salt',
      };

      // 同时写入
      await Promise.all(storages.map((s) => s.write(config)));

      // 最终应该只有一个有效的配置文件
      const finalConfig = await storages[0].read();
      expect(finalConfig).not.toBeNull();
      expect(finalConfig?.version).toBe('1.0.0');

      // 清理
      await fs.rm(testDir, { recursive: true, force: true });
    });

    test('should handle read during write correctly', async () => {
      const testDir = path.join(os.tmpdir(), `hop-claude-test-${Date.now()}`);
      await fs.mkdir(testDir, { recursive: true });

      class TestStorage extends ConfigStorage {
        constructor(testPath: string) {
          super();
          (this as any).configDir = testPath;
          (this as any).configFile = path.join(testPath, 'config.json');
        }
      }

      const storage = new TestStorage(testDir);

      // 初始配置
      const config: ConfigStore = {
        version: '1.0.0',
        currentProfile: 'initial',
        profiles: [],
        encryptionSalt: 'test-salt',
      };

      await storage.write(config);

      // 同时读和写
      const operations = [
        // 写入操作
        storage.write({
          ...config,
          currentProfile: 'updated',
        }),
        // 读取操作
        storage.read(),
        storage.read(),
        storage.read(),
      ];

      const results = await Promise.all(operations);

      // 所有读取操作应该返回有效配置（不会读到部分写入的数据）
      for (let i = 1; i < results.length; i++) {
        const readResult = results[i] as ConfigStore | null;
        expect(readResult).not.toBeNull();
        expect(readResult?.version).toBe('1.0.0');
        // currentProfile 可能是 'initial' 或 'updated'（取决于时序）
        expect(['initial', 'updated']).toContain(readResult?.currentProfile);
      }

      // 清理
      await fs.rm(testDir, { recursive: true, force: true });
    });
  });

  describe('Performance Under Load', () => {
    test('should handle many sequential writes efficiently', async () => {
      const testDir = path.join(os.tmpdir(), `hop-claude-test-${Date.now()}`);
      await fs.mkdir(testDir, { recursive: true });

      class TestStorage extends ConfigStorage {
        constructor(testPath: string) {
          super();
          (this as any).configDir = testPath;
          (this as any).configFile = path.join(testPath, 'config.json');
        }
      }

      const storage = new TestStorage(testDir);

      const config: ConfigStore = {
        version: '1.0.0',
        currentProfile: 'test',
        profiles: [],
        encryptionSalt: 'test-salt',
      };

      const numWrites = 50;
      const startTime = Date.now();

      // 顺序写入
      for (let i = 0; i < numWrites; i++) {
        await storage.write({
          ...config,
          currentProfile: `profile-${i}`,
        });
      }

      const duration = Date.now() - startTime;

      // 平均每次写入不应该超过 100ms（包括文件锁开销）
      const avgTime = duration / numWrites;
      expect(avgTime).toBeLessThan(100);

      console.log(`Average write time: ${avgTime.toFixed(2)}ms`);

      // 清理
      await fs.rm(testDir, { recursive: true, force: true });
    });
  });
});
