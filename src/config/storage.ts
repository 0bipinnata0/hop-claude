import fs from 'fs/promises';
import path from 'path';
import lockfile from 'proper-lockfile';
import type { ConfigStore } from '../types/index.js';
import { getConfigDir, ensureSecureDirectory, setSecureFilePermissions } from '../utils/platform.js';

/**
 * 配置文件存储类
 */
export class ConfigStorage {
  private configDir: string;
  private configFile: string;

  constructor() {
    this.configDir = getConfigDir();
    this.configFile = path.join(this.configDir, 'config.json');
  }

  /**
   * 确保配置目录存在并设置正确权限
   */
  async ensureConfigDir(): Promise<void> {
    await ensureSecureDirectory(this.configDir);
  }

  /**
   * 读取配置文件
   * @returns 配置对象，如果文件不存在则返回 null
   */
  async read(): Promise<ConfigStore | null> {
    try {
      const data = await fs.readFile(this.configFile, 'utf8');
      return JSON.parse(data);
    } catch (error: unknown) {
      // 检查是否为文件不存在错误
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * 写入配置文件
   * @param config 配置对象
   */
  async write(config: ConfigStore): Promise<void> {
    await this.ensureConfigDir();

    // 使用文件锁防止并发写入冲突
    let release: (() => Promise<void>) | undefined;

    try {
      // 如果文件不存在，先创建空文件以便加锁
      try {
        await fs.access(this.configFile);
      } catch {
        await fs.writeFile(this.configFile, '{}', 'utf8');
      }

      // 获取文件锁（最多重试 5 次，每次等待 200ms）
      release = await lockfile.lock(this.configFile, {
        retries: {
          retries: 5,
          minTimeout: 200,
          maxTimeout: 1000,
        },
      });

      // 写入配置
      await fs.writeFile(
        this.configFile,
        JSON.stringify(config, null, 2),
        'utf8'
      );

      // 设置文件权限（仅所有者可读写）
      await setSecureFilePermissions(this.configFile);
    } finally {
      // 释放锁
      if (release) {
        await release();
      }
    }
  }

  /**
   * 获取配置文件路径
   */
  getConfigPath(): string {
    return this.configFile;
  }

  /**
   * 获取配置目录路径
   */
  getConfigDir(): string {
    return this.configDir;
  }
}
