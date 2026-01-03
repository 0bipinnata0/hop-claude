import { ConfigStorage } from './storage.js';
import { PassphraseEncryption } from './encryption-v2.js';
import { KeychainManager } from './keychain.js';
import type { ConfigStore, ProfileConfig, DecryptedProfile, EncryptionMode } from '../types/index.js';

/**
 * 内置默认密码（用于密码加密模式）
 * 用户无需记住，系统自动使用
 */
const DEFAULT_PASSPHRASE = 'hop-claude-default-encryption-key-2025';

/**
 * 配置管理核心类
 * 支持两种加密模式：
 * - keychain: OS 密钥链存储（推荐）
 * - passphrase: 密码加密（可移植）
 */
export class ConfigManager {
  private storage: ConfigStorage;
  private passphraseEncryption: PassphraseEncryption;
  private keychainManager: KeychainManager;

  constructor() {
    this.storage = new ConfigStorage();
    this.passphraseEncryption = new PassphraseEncryption();
    this.keychainManager = new KeychainManager();
  }

  /**
   * 获取当前加密模式
   */
  async getEncryptionMode(): Promise<EncryptionMode> {
    const config = await this.storage.read();
    if (config?.encryptionMode) {
      return config.encryptionMode;
    }
    // 默认：keychain 可用则用 keychain，否则用 passphrase
    const keychainAvailable = await KeychainManager.isAvailable();
    return keychainAvailable ? 'keychain' : 'passphrase';
  }

  /**
   * 初始化配置文件
   */
  async initialize(): Promise<ConfigStore> {
    const existing = await this.storage.read();
    if (existing) {
      // 确保有 encryptionMode 字段
      if (!existing.encryptionMode) {
        const keychainAvailable = await KeychainManager.isAvailable();
        existing.encryptionMode = keychainAvailable ? 'keychain' : 'passphrase';
      }
      return existing;
    }

    // 检测系统支持的加密模式
    const keychainAvailable = await KeychainManager.isAvailable();
    const encryptionMode: EncryptionMode = keychainAvailable ? 'keychain' : 'passphrase';

    const newConfig: ConfigStore = {
      version: '1.0.0',
      currentProfile: '',
      profiles: [],
      encryptionSalt: encryptionMode === 'passphrase' ? this.passphraseEncryption.generateSalt() : undefined,
      encryptionMode,
    };

    await this.storage.write(newConfig);
    return newConfig;
  }

  /**
   * 获取所有配置
   */
  async getConfig(): Promise<ConfigStore> {
    const config = await this.storage.read();
    if (!config) return await this.initialize();

    // 确保有 encryptionMode 字段
    if (!config.encryptionMode) {
      const keychainAvailable = await KeychainManager.isAvailable();
      config.encryptionMode = keychainAvailable ? 'keychain' : 'passphrase';
    }

    return config;
  }

  /**
   * 添加或更新 profile
   * @param profile 解密后的 profile
   */
  async saveProfile(profile: DecryptedProfile): Promise<void> {
    const config = await this.getConfig();
    const mode = config.encryptionMode!;

    if (!config.encryptionSalt && mode === 'passphrase') {
      config.encryptionSalt = this.passphraseEncryption.generateSalt();
    }

    let encryptedApiKey: string;

    // 根据加密模式处理 API Key
    if (mode === 'keychain') {
      // Keychain 模式：存储到 OS 密钥链
      await this.keychainManager.setAPIKey(profile.name, profile.apiKey);
      // config.json 中存储占位符
      encryptedApiKey = '__KEYCHAIN__';
    } else {
      // Passphrase 模式：使用内置默认密码加密
      if (!config.encryptionSalt) {
        config.encryptionSalt = this.passphraseEncryption.generateSalt();
      }
      encryptedApiKey = this.passphraseEncryption.encrypt(
        profile.apiKey,
        DEFAULT_PASSPHRASE,
        config.encryptionSalt
      );
    }

    const encryptedProfile: ProfileConfig = {
      ...profile,
      apiKey: encryptedApiKey,
      updatedAt: Date.now(),
    };

    const index = config.profiles.findIndex(p => p.name === profile.name);
    if (index >= 0) {
      config.profiles[index] = encryptedProfile;
    } else {
      encryptedProfile.createdAt = Date.now();
      config.profiles.push(encryptedProfile);
    }

    await this.storage.write(config);
  }

  /**
   * 获取解密后的 profile
   * @param name profile 名称
   */
  async getProfile(name: string): Promise<DecryptedProfile | null> {
    const config = await this.getConfig();
    const profile = config.profiles.find(p => p.name === name);

    if (!profile) return null;

    const mode = config.encryptionMode!;
    let decryptedApiKey: string;

    // 根据加密模式解密 API Key
    if (mode === 'keychain') {
      // Keychain 模式：从 OS 密钥链读取
      const keychainKey = await this.keychainManager.getAPIKey(name);
      if (!keychainKey) {
        throw new Error(`密钥链中未找到配置 ${name} 的 API key`);
      }
      decryptedApiKey = keychainKey;
    } else {
      // Passphrase 模式：使用内置默认密码解密
      if (!config.encryptionSalt) {
        throw new Error('未找到加密 salt');
      }
      decryptedApiKey = this.passphraseEncryption.decrypt(
        profile.apiKey,
        DEFAULT_PASSPHRASE,
        config.encryptionSalt
      );
    }

    return {
      ...profile,
      apiKey: decryptedApiKey,
    };
  }

  /**
   * 设置当前激活的 profile
   */
  async setCurrentProfile(name: string): Promise<void> {
    const config = await this.getConfig();
    config.currentProfile = name;
    await this.storage.write(config);
  }

  /**
   * 获取当前激活的 profile
   */
  async getCurrentProfile(): Promise<DecryptedProfile | null> {
    const config = await this.getConfig();
    if (!config.currentProfile) return null;
    return await this.getProfile(config.currentProfile);
  }

  /**
   * 列出所有 profiles（API Key 部分隐藏）
   */
  async listProfiles(): Promise<Array<ProfileConfig & { maskedApiKey: string }>> {
    const config = await this.getConfig();
    const mode = config.encryptionMode!;

    const results: Array<ProfileConfig & { maskedApiKey: string }> = [];

    for (const p of config.profiles) {
      try {
        let decryptedKey: string;

        if (mode === 'keychain') {
          const keychainKey = await this.keychainManager.getAPIKey(p.name);
          decryptedKey = keychainKey || '';
        } else {
          // Passphrase 模式：使用内置默认密码解密
          if (!config.encryptionSalt) {
            decryptedKey = '';
          } else {
            decryptedKey = this.passphraseEncryption.decrypt(
              p.apiKey,
              DEFAULT_PASSPHRASE,
              config.encryptionSalt
            );
          }
        }

        results.push({
          ...p,
          maskedApiKey: this.passphraseEncryption.maskApiKey(decryptedKey),
        });
      } catch (error: unknown) {
        // 如果解密失败，显示错误标记
        results.push({
          ...p,
          maskedApiKey: '[DECRYPT ERROR]',
        });
      }
    }

    return results;
  }

  /**
   * 删除 profile
   */
  async deleteProfile(name: string): Promise<void> {
    const config = await this.getConfig();
    const mode = config.encryptionMode!;

    // Keychain 模式下，同时从密钥链中删除
    if (mode === 'keychain') {
      await this.keychainManager.deleteAPIKey(name);
    }

    config.profiles = config.profiles.filter(p => p.name !== name);

    if (config.currentProfile === name) {
      config.currentProfile = config.profiles[0]?.name || '';
    }

    await this.storage.write(config);
  }

  /**
   * 导出配置（包含加密的数据）
   * 注意：keychain 模式无法导出实际密钥
   */
  async exportConfig(): Promise<string> {
    const config = await this.getConfig();

    // 如果是 keychain 模式，警告用户
    if (config.encryptionMode === 'keychain') {
      console.warn('Warning: Keychain mode cannot export actual API keys. Keys will need to be re-entered after import.');
    }

    return JSON.stringify(config, null, 2);
  }

  /**
   * 导入配置
   */
  async importConfig(data: string): Promise<void> {
    const config: ConfigStore = JSON.parse(data);

    // 验证配置格式
    if (!config.version || !Array.isArray(config.profiles)) {
      throw new Error('Invalid configuration format');
    }

    // 确保有加密模式
    if (!config.encryptionMode) {
      const keychainAvailable = await KeychainManager.isAvailable();
      config.encryptionMode = keychainAvailable ? 'keychain' : 'passphrase';
    }

    await this.storage.write(config);
  }

  /**
   * 切换加密模式（需要提供所有必要的凭据）
   * @param newMode 新的加密模式
   */
  async switchEncryptionMode(
    newMode: EncryptionMode
  ): Promise<void> {
    const config = await this.getConfig();
    const oldMode = config.encryptionMode!;

    if (oldMode === newMode) {
      return; // 无需切换
    }

    // 步骤 1: 读取所有 profiles 的明文 API Keys
    const decryptedProfiles: DecryptedProfile[] = [];

    for (const p of config.profiles) {
      const decrypted = await this.getProfile(p.name);
      if (decrypted) {
        decryptedProfiles.push(decrypted);
      }
    }

    // 步骤 2: 创建新配置（包含所有 profiles）
    const newConfig: ConfigStore = {
      ...config,
      encryptionMode: newMode,
      encryptionSalt: newMode === 'passphrase'
        ? (config.encryptionSalt || this.passphraseEncryption.generateSalt())
        : undefined,
      profiles: [],
    };

    // 步骤 3: 将所有 profiles 使用新加密模式加密
    for (const profile of decryptedProfiles) {
      let encryptedApiKey: string;

      if (newMode === 'keychain') {
        // Keychain 模式：存储到 OS 密钥链
        await this.keychainManager.setAPIKey(profile.name, profile.apiKey);
        encryptedApiKey = '__KEYCHAIN__';
      } else {
        // Passphrase 模式：使用内置默认密码加密
        if (!newConfig.encryptionSalt) {
          newConfig.encryptionSalt = this.passphraseEncryption.generateSalt();
        }
        encryptedApiKey = this.passphraseEncryption.encrypt(
          profile.apiKey,
          DEFAULT_PASSPHRASE,
          newConfig.encryptionSalt
        );
      }

      const encryptedProfile: ProfileConfig = {
        ...profile,
        apiKey: encryptedApiKey,
        updatedAt: Date.now(),
      };

      newConfig.profiles.push(encryptedProfile);
    }

    // 步骤 4: 使用原子性写入（临时文件 + rename）
    const fs = await import('fs/promises');
    const configPath = this.storage.getConfigPath();
    const tempPath = `${configPath}.tmp`;

    try {
      // 4.1: 写入临时文件
      await fs.writeFile(
        tempPath,
        JSON.stringify(newConfig, null, 2),
        'utf8'
      );

      // 4.2: 原子性替换（rename 是原子操作）
      await fs.rename(tempPath, configPath);

      // 步骤 5: 清理旧密钥链（在成功写入后）
      if (oldMode === 'keychain' && newMode !== 'keychain') {
        await this.keychainManager.clearAll();
      }
    } catch (error) {
      // 清理临时文件（如果存在）
      try {
        await fs.unlink(tempPath);
      } catch {
        // 忽略删除失败
      }
      throw error;
    }
  }

  /**
   * 获取配置文件路径
   */
  getConfigPath(): string {
    return this.storage.getConfigPath();
  }
}
