import crypto from 'crypto';
import os from 'os';

/**
 * 加密类：使用 AES-256-GCM 对称加密
 * 密钥派生：基于机器标识（hostname + username）+ 随机盐
 */
export class Encryption {
  private algorithm = 'aes-256-gcm';

  /**
   * 生成加密密钥（基于机器信息 + salt）
   */
  private deriveKey(salt: string): Buffer {
    const machineId = `${os.hostname()}-${os.userInfo().username}`;
    return crypto.pbkdf2Sync(machineId, salt, 100000, 32, 'sha512');
  }

  /**
   * 生成随机 salt
   */
  generateSalt(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 加密明文
   * @param plaintext 要加密的明文
   * @param salt 盐值
   * @returns 加密后的密文，格式：iv:authTag:encrypted
   */
  encrypt(plaintext: string, salt: string): string {
    const key = this.deriveKey(salt);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv) as crypto.CipherGCM;

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // 格式: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * 解密密文
   * @param ciphertext 密文，格式：iv:authTag:encrypted
   * @param salt 盐值
   * @returns 解密后的明文
   */
  decrypt(ciphertext: string, salt: string): string {
    const key = this.deriveKey(salt);
    const parts = ciphertext.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, key, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
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
