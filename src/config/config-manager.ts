import { ConfigStorage } from './storage.js';
import { Encryption } from './encryption.js';
import { PassphraseEncryption } from './encryption-v2.js';
import { KeychainManager } from './keychain.js';
import type { ConfigStore, ProfileConfig, DecryptedProfile, EncryptionMode } from '../types/index.js';

/**
 * 配置管理核心类
 * 支持三种加密模式：
 * - legacy: 机器绑定加密（向后兼容）
 * - keychain: OS 密钥链存储（推荐）
 * - passphrase: 用户密码加密（可移植）
 */
export class ConfigManager {
  private storage: ConfigStorage;
  private legacyEncryption: Encryption;
  private passphraseEncryption: PassphraseEncryption;
  private keychainManager: KeychainManager;

  // 用于临时存储用户输入的 passphrase（仅在当前会话有效）
  private sessionPassphrase?: string;

  constructor() {
    this.storage = new ConfigStorage();
    this.legacyEncryption = new Encryption();
    this.passphraseEncryption = new PassphraseEncryption();
    this.keychainManager = new KeychainManager();
  }

  /**
   * 设置会话密码（用于 passphrase 模式）
   */
  setSessionPassphrase(passphrase: string): void {
    this.sessionPassphrase = passphrase;
  }

  /**
   * 清除会话密码
   */
  clearSessionPassphrase(): void {
    this.sessionPassphrase = undefined;
  }

  /**
   * 获取当前加密模式
   */
  async getEncryptionMode(): Promise<EncryptionMode> {
    const config = await this.storage.read();
    return config?.encryptionMode || 'legacy';  // 默认 legacy 保持向后兼容
  }

  /**
   * 初始化配置文件
   */
  async initialize(): Promise<ConfigStore> {
    const existing = await this.storage.read();
    if (existing) {
      // 确保有 encryptionMode 字段（向后兼容）
      if (!existing.encryptionMode) {
        existing.encryptionMode = 'legacy';
      }
      return existing;
    }

    const newConfig: ConfigStore = {
      version: '1.0.0',
      currentProfile: '',
      profiles: [],
      encryptionSalt: this.legacyEncryption.generateSalt(),
      encryptionMode: 'legacy',  // 默认使用 legacy 模式
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

    // 向后兼容：添加默认的 encryptionMode
    if (!config.encryptionMode) {
      config.encryptionMode = 'legacy';
    }

    return config;
  }

  /**
   * 添加或更新 profile
   * @param profile 解密后的 profile
   * @param passphrase 密码（仅 passphrase 模式需要）
   */
  async saveProfile(profile: DecryptedProfile, passphrase?: string): Promise<void> {
    const config = await this.getConfig();
    const mode = config.encryptionMode || 'legacy';

    if (!config.encryptionSalt && mode !== 'keychain') {
      config.encryptionSalt = this.legacyEncryption.generateSalt();
    }

    let encryptedApiKey: string;

    // 根据加密模式处理 API Key
    switch (mode) {
      case 'keychain':
        // Keychain 模式：存储到 OS 密钥链
        await this.keychainManager.setAPIKey(profile.domain, profile.apiKey);
        // config.json 中存储占位符
        encryptedApiKey = '__KEYCHAIN__';
        break;

      case 'passphrase':
        // Passphrase 模式：使用用户密码加密
        const pwd = passphrase || this.sessionPassphrase;
        if (!pwd) {
          throw new Error('Passphrase required for passphrase encryption mode');
        }
        if (!config.encryptionSalt) {
          config.encryptionSalt = this.passphraseEncryption.generateSalt();
        }
        encryptedApiKey = this.passphraseEncryption.encrypt(
          profile.apiKey,
          pwd,
          config.encryptionSalt
        );
        break;

      case 'legacy':
      default:
        // Legacy 模式：机器绑定加密
        if (!config.encryptionSalt) {
          config.encryptionSalt = this.legacyEncryption.generateSalt();
        }
        encryptedApiKey = this.legacyEncryption.encrypt(
          profile.apiKey,
          config.encryptionSalt
        );
        break;
    }

    const encryptedProfile: ProfileConfig = {
      ...profile,
      apiKey: encryptedApiKey,
      updatedAt: Date.now(),
    };

    const index = config.profiles.findIndex(p => p.domain === profile.domain);
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
   * @param domain profile 名称
   * @param passphrase 密码（仅 passphrase 模式需要）
   */
  async getProfile(domain: string, passphrase?: string): Promise<DecryptedProfile | null> {
    const config = await this.getConfig();
    const profile = config.profiles.find(p => p.domain === domain);

    if (!profile) return null;

    const mode = config.encryptionMode || 'legacy';
    let decryptedApiKey: string;

    // 根据加密模式解密 API Key
    switch (mode) {
      case 'keychain':
        // Keychain 模式：从 OS 密钥链读取
        const keychainKey = await this.keychainManager.getAPIKey(domain);
        if (!keychainKey) {
          throw new Error(`API key not found in keychain for profile: ${domain}`);
        }
        decryptedApiKey = keychainKey;
        break;

      case 'passphrase':
        // Passphrase 模式：使用用户密码解密
        const pwd = passphrase || this.sessionPassphrase;
        if (!pwd) {
          throw new Error('Passphrase required to decrypt API key');
        }
        if (!config.encryptionSalt) {
          throw new Error('Encryption salt not found');
        }
        decryptedApiKey = this.passphraseEncryption.decrypt(
          profile.apiKey,
          pwd,
          config.encryptionSalt
        );
        break;

      case 'legacy':
      default:
        // Legacy 模式：机器绑定解密
        if (!config.encryptionSalt) {
          throw new Error('Encryption salt not found');
        }
        decryptedApiKey = this.legacyEncryption.decrypt(
          profile.apiKey,
          config.encryptionSalt
        );
        break;
    }

    return {
      ...profile,
      apiKey: decryptedApiKey,
    };
  }

  /**
   * 设置当前激活的 profile
   */
  async setCurrentProfile(domain: string): Promise<void> {
    const config = await this.getConfig();
    config.currentProfile = domain;
    await this.storage.write(config);
  }

  /**
   * 获取当前激活的 profile
   * @param passphrase 密码（仅 passphrase 模式需要）
   */
  async getCurrentProfile(passphrase?: string): Promise<DecryptedProfile | null> {
    const config = await this.getConfig();
    if (!config.currentProfile) return null;
    return await this.getProfile(config.currentProfile, passphrase);
  }

  /**
   * 列出所有 profiles（API Key 部分隐藏）
   * @param passphrase 密码（仅 passphrase 模式需要）
   */
  async listProfiles(passphrase?: string): Promise<Array<ProfileConfig & { maskedApiKey: string }>> {
    const config = await this.getConfig();
    const mode = config.encryptionMode || 'legacy';

    const results: Array<ProfileConfig & { maskedApiKey: string }> = [];

    for (const p of config.profiles) {
      try {
        let decryptedKey: string;

        switch (mode) {
          case 'keychain':
            const keychainKey = await this.keychainManager.getAPIKey(p.domain);
            decryptedKey = keychainKey || '';
            break;

          case 'passphrase':
            const pwd = passphrase || this.sessionPassphrase;
            if (!pwd || !config.encryptionSalt) {
              decryptedKey = '';
              break;
            }
            decryptedKey = this.passphraseEncryption.decrypt(
              p.apiKey,
              pwd,
              config.encryptionSalt
            );
            break;

          case 'legacy':
          default:
            if (!config.encryptionSalt) {
              decryptedKey = '';
              break;
            }
            decryptedKey = this.legacyEncryption.decrypt(
              p.apiKey,
              config.encryptionSalt
            );
            break;
        }

        results.push({
          ...p,
          maskedApiKey: this.legacyEncryption.maskApiKey(decryptedKey),
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
  async deleteProfile(domain: string): Promise<void> {
    const config = await this.getConfig();
    const mode = config.encryptionMode || 'legacy';

    // Keychain 模式下，同时从密钥链中删除
    if (mode === 'keychain') {
      await this.keychainManager.deleteAPIKey(domain);
    }

    config.profiles = config.profiles.filter(p => p.domain !== domain);

    if (config.currentProfile === domain) {
      config.currentProfile = config.profiles[0]?.domain || '';
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

    // 向后兼容：如果没有 encryptionMode，设置为 legacy
    if (!config.encryptionMode) {
      config.encryptionMode = 'legacy';
    }

    await this.storage.write(config);
  }

  /**
   * 切换加密模式（需要提供所有必要的凭据）
   * @param newMode 新的加密模式
   * @param passphrase 密码（切换到 passphrase 模式时需要）
   */
  async switchEncryptionMode(
    newMode: EncryptionMode,
    passphrase?: string
  ): Promise<void> {
    const config = await this.getConfig();
    const oldMode = config.encryptionMode || 'legacy';

    if (oldMode === newMode) {
      return; // 无需切换
    }

    // 读取所有 profiles 的明文 API Keys
    const decryptedProfiles: DecryptedProfile[] = [];

    for (const p of config.profiles) {
      const decrypted = await this.getProfile(p.domain, passphrase);
      if (decrypted) {
        decryptedProfiles.push(decrypted);
      }
    }

    // 更新加密模式
    config.encryptionMode = newMode;

    // 如果切换到非 legacy/passphrase 模式，可能需要新的 salt
    if (newMode === 'passphrase' && !config.encryptionSalt) {
      config.encryptionSalt = this.passphraseEncryption.generateSalt();
    }

    // 清空旧的 profiles
    config.profiles = [];
    await this.storage.write(config);

    // 使用新模式重新保存所有 profiles
    for (const profile of decryptedProfiles) {
      await this.saveProfile(profile, passphrase);
    }

    // 如果从 keychain 切换出去，清理密钥链
    if (oldMode === 'keychain') {
      await this.keychainManager.clearAll();
    }
  }

  /**
   * 获取配置文件路径
   */
  getConfigPath(): string {
    return this.storage.getConfigPath();
  }
}
