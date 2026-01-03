import * as keytar from 'keytar';

/**
 * KeychainManager：使用 OS 密钥链存储 API Keys
 * - macOS: Keychain
 * - Windows: Credential Manager
 * - Linux: libsecret
 *
 * 优点：
 * - 最安全：密钥不写入磁盘，由 OS 管理
 * - 自动加密：OS 级别的加密保护
 * - 统一管理：与系统密钥链集成
 *
 * 缺点：
 * - 不可移植：无法跨机器导出
 */
export class KeychainManager {
  private static readonly SERVICE_NAME = 'hop-claude';

  /**
   * 检查 keychain 是否可用
   * @returns keychain 是否可用
   */
  static async isAvailable(): Promise<boolean> {
    try {
      // 尝试写入测试值
      await keytar.setPassword(KeychainManager.SERVICE_NAME, '__test__', 'test');
      await keytar.deletePassword(KeychainManager.SERVICE_NAME, '__test__');
      return true;
    } catch (error: unknown) {
      console.warn('Keychain not available:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * 存储 API Key 到密钥链
   * @param profileName profile 名称
   * @param apiKey API Key 明文
   */
  async setAPIKey(profileName: string, apiKey: string): Promise<void> {
    try {
      await keytar.setPassword(KeychainManager.SERVICE_NAME, profileName, apiKey);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new Error(`Failed to store API key in keychain: ${err.message}`);
    }
  }

  /**
   * 从密钥链读取 API Key
   * @param profileName profile 名称
   * @returns API Key 明文，如果不存在则返回 null
   */
  async getAPIKey(profileName: string): Promise<string | null> {
    try {
      return await keytar.getPassword(KeychainManager.SERVICE_NAME, profileName);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new Error(`Failed to retrieve API key from keychain: ${err.message}`);
    }
  }

  /**
   * 从密钥链删除 API Key
   * @param profileName profile 名称
   * @returns 是否成功删除
   */
  async deleteAPIKey(profileName: string): Promise<boolean> {
    try {
      return await keytar.deletePassword(KeychainManager.SERVICE_NAME, profileName);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new Error(`Failed to delete API key from keychain: ${err.message}`);
    }
  }

  /**
   * 列出密钥链中所有的 profile
   * @returns profile 名称列表
   */
  async listProfiles(): Promise<string[]> {
    try {
      const credentials = await keytar.findCredentials(KeychainManager.SERVICE_NAME);
      return credentials.map(cred => cred.account);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new Error(`Failed to list profiles from keychain: ${err.message}`);
    }
  }

  /**
   * 清除所有存储的 API Keys
   */
  async clearAll(): Promise<void> {
    const profiles = await this.listProfiles();
    for (const profile of profiles) {
      await this.deleteAPIKey(profile);
    }
  }

  /**
   * 部分隐藏 API Key（用于显示）
   * @param apiKey API Key
   * @returns 部分隐藏的 API Key，如：sk-ant-***xyz
   */
  maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 8) return '***';

    const prefix = apiKey.slice(0, 6);
    const suffix = apiKey.slice(-3);
    return `${prefix}***${suffix}`;
  }
}
