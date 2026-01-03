import { test, expect, describe, beforeEach } from 'bun:test';
import { ConfigManager } from '../src/config/config-manager.js';
import { Encryption } from '../src/config/encryption.js';
import { PassphraseEncryption } from '../src/config/encryption-v2.js';
import { ConfigStorage } from '../src/config/storage.js';
import type { ConfigStore, DecryptedProfile, EncryptionMode } from '../src/types/index.js';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

// 创建测试用的 ConfigManager
class TestConfigManager extends ConfigManager {
  constructor(testDir: string) {
    super();
    // 覆盖 storage 使用测试目录
    (this as any).storage = new TestConfigStorage(testDir);
  }
}

class TestConfigStorage extends ConfigStorage {
  constructor(testPath: string) {
    super();
    (this as any).configDir = testPath;
    (this as any).configFile = path.join(testPath, 'config.json');
  }
}

describe('Migration Tests', () => {
  let testDir: string;
  let configManager: TestConfigManager;

  beforeEach(async () => {
    // 每个测试使用独立的临时目录
    testDir = path.join(os.tmpdir(), `hop-claude-migration-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    configManager = new TestConfigManager(testDir);
  });

  describe('Legacy to Passphrase Migration', () => {
    test('should migrate from legacy to passphrase without data loss', async () => {
      // 创建 legacy 模式配置
      const testProfile: DecryptedProfile = {
        domain: 'test-profile',
        apiKey: 'sk-ant-test-key-12345',
        baseUrl: 'https://api.test.com',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await configManager.saveProfile(testProfile);
      await configManager.setCurrentProfile('test-profile');

      // 验证 legacy 模式
      const modeBefore = await configManager.getEncryptionMode();
      expect(modeBefore).toBe('legacy');

      // 迁移到 passphrase 模式
      const passphrase = 'test-passphrase-123';
      await configManager.switchEncryptionMode('passphrase', passphrase);

      // 验证迁移后的模式
      const modeAfter = await configManager.getEncryptionMode();
      expect(modeAfter).toBe('passphrase');

      // 验证数据完整性
      const profileAfter = await configManager.getProfile('test-profile', passphrase);
      expect(profileAfter).not.toBeNull();
      expect(profileAfter?.apiKey).toBe(testProfile.apiKey);
      expect(profileAfter?.domain).toBe(testProfile.domain);
      expect(profileAfter?.baseUrl).toBe(testProfile.baseUrl);
    });

    test('should handle multiple profiles during migration', async () => {
      // 创建多个 profiles
      const profiles: DecryptedProfile[] = [
        {
          domain: 'profile-1',
          apiKey: 'sk-ant-key-1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          domain: 'profile-2',
          apiKey: 'sk-ant-key-2',
          baseUrl: 'https://api.test.com',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          domain: 'profile-3',
          apiKey: 'sk-ant-key-3',
          proxy: 'http://proxy.test.com:8080',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      for (const profile of profiles) {
        await configManager.saveProfile(profile);
      }

      // 迁移到 passphrase 模式
      const passphrase = 'migration-test-password';
      await configManager.switchEncryptionMode('passphrase', passphrase);

      // 验证所有 profiles 数据完整
      for (const originalProfile of profiles) {
        const migratedProfile = await configManager.getProfile(
          originalProfile.domain,
          passphrase
        );

        expect(migratedProfile).not.toBeNull();
        expect(migratedProfile?.apiKey).toBe(originalProfile.apiKey);
        expect(migratedProfile?.baseUrl).toBe(originalProfile.baseUrl);
        expect(migratedProfile?.proxy).toBe(originalProfile.proxy);
      }
    });

    test('should fail migration with incorrect passphrase', async () => {
      const testProfile: DecryptedProfile = {
        domain: 'test',
        apiKey: 'sk-ant-test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await configManager.saveProfile(testProfile);

      // 迁移到 passphrase 模式
      const correctPassphrase = 'correct-password';
      await configManager.switchEncryptionMode('passphrase', correctPassphrase);

      // 用错误密码尝试读取应该失败
      await expect(
        configManager.getProfile('test', 'wrong-password')
      ).rejects.toThrow();
    });
  });

  describe('Passphrase to Legacy Migration', () => {
    test('should migrate from passphrase back to legacy', async () => {
      // 首先创建 passphrase 模式的配置
      const config = await configManager.getConfig();
      config.encryptionMode = 'passphrase';
      const storage = (configManager as any).storage;
      await storage.write(config);

      const passphrase = 'initial-passphrase';
      const testProfile: DecryptedProfile = {
        domain: 'test-profile',
        apiKey: 'sk-ant-test-key',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await configManager.saveProfile(testProfile, passphrase);

      // 迁移回 legacy 模式
      await configManager.switchEncryptionMode('legacy', passphrase);

      // 验证迁移后的模式
      const mode = await configManager.getEncryptionMode();
      expect(mode).toBe('legacy');

      // 验证数据完整性（不需要密码）
      const profile = await configManager.getProfile('test-profile');
      expect(profile).not.toBeNull();
      expect(profile?.apiKey).toBe(testProfile.apiKey);
    });
  });

  describe('Backward Compatibility', () => {
    test('should automatically detect legacy config without encryptionMode field', async () => {
      // 创建旧版配置（没有 encryptionMode 字段）
      const legacyEncryption = new Encryption();
      const salt = legacyEncryption.generateSalt();

      const legacyConfig: ConfigStore = {
        version: '1.0.0',
        currentProfile: 'test',
        profiles: [
          {
            domain: 'test',
            apiKey: legacyEncryption.encrypt('sk-ant-test', salt),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        encryptionSalt: salt,
        // 注意：没有 encryptionMode 字段
      };

      const storage = (configManager as any).storage;
      await storage.write(legacyConfig);

      // ConfigManager 应该自动检测为 legacy 模式
      const mode = await configManager.getEncryptionMode();
      expect(mode).toBe('legacy');

      // 应该能正常读取
      const profile = await configManager.getProfile('test');
      expect(profile).not.toBeNull();
      expect(profile?.apiKey).toBe('sk-ant-test');
    });

    test('should maintain existing config version during migration', async () => {
      const testProfile: DecryptedProfile = {
        domain: 'test',
        apiKey: 'sk-ant-test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await configManager.saveProfile(testProfile);

      const configBefore = await configManager.getConfig();
      const versionBefore = configBefore.version;

      // 迁移
      await configManager.switchEncryptionMode('passphrase', 'test-password');

      const configAfter = await configManager.getConfig();

      // 版本号应该保持不变
      expect(configAfter.version).toBe(versionBefore);
    });
  });

  describe('Migration Edge Cases', () => {
    test('should handle empty profiles during migration', async () => {
      // 没有任何 profile 的配置
      await configManager.initialize();

      // 迁移应该成功（即使没有数据要迁移）
      await configManager.switchEncryptionMode('passphrase', 'test-password');

      const mode = await configManager.getEncryptionMode();
      expect(mode).toBe('passphrase');
    });

    test('should not allow migration without passphrase for passphrase mode', async () => {
      const testProfile: DecryptedProfile = {
        domain: 'test',
        apiKey: 'sk-ant-test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await configManager.saveProfile(testProfile);

      // 尝试迁移到 passphrase 模式但不提供密码应该失败
      // switchEncryptionMode 会尝试用新模式保存 profiles，此时需要密码
      await expect(
        configManager.switchEncryptionMode('passphrase', undefined)
      ).rejects.toThrow('Passphrase required');
    });

    test('should handle special characters in API keys during migration', async () => {
      const specialChars = 'sk-ant-!@#$%^&*()_+-=[]{}|;:,.<>?~`';

      const testProfile: DecryptedProfile = {
        domain: 'special-chars',
        apiKey: specialChars,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await configManager.saveProfile(testProfile);

      // 迁移
      const passphrase = 'test-password';
      await configManager.switchEncryptionMode('passphrase', passphrase);

      // 验证特殊字符被正确保留
      const profile = await configManager.getProfile('special-chars', passphrase);
      expect(profile?.apiKey).toBe(specialChars);
    });
  });

  describe('Session Passphrase Management', () => {
    test('should store passphrase in session for convenience', async () => {
      const config = await configManager.getConfig();
      config.encryptionMode = 'passphrase';
      const storage = (configManager as any).storage;
      await storage.write(config);

      const passphrase = 'session-test-password';

      // 设置会话密码
      configManager.setSessionPassphrase(passphrase);

      const testProfile: DecryptedProfile = {
        domain: 'test',
        apiKey: 'sk-ant-test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 保存时不需要显式传递密码
      await configManager.saveProfile(testProfile);

      // 读取时也不需要显式传递密码
      const profile = await configManager.getProfile('test');
      expect(profile).not.toBeNull();
      expect(profile?.apiKey).toBe(testProfile.apiKey);
    });

    test('should clear session passphrase', async () => {
      const passphrase = 'test-password';
      configManager.setSessionPassphrase(passphrase);

      // 清除会话密码
      configManager.clearSessionPassphrase();

      const config = await configManager.getConfig();
      config.encryptionMode = 'passphrase';
      const storage = (configManager as any).storage;
      await storage.write(config);

      // 清除后应该需要显式传递密码
      const testProfile: DecryptedProfile = {
        domain: 'test',
        apiKey: 'sk-ant-test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 不提供密码应该失败
      await expect(configManager.saveProfile(testProfile)).rejects.toThrow();
    });
  });
});
