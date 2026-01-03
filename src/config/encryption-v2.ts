import crypto from 'crypto';

/**
 * PassphraseEncryption：基于用户密码的加密
 * 用于可移植的配置导出/导入
 * 不依赖机器信息，可以在不同机器间迁移
 */
export class PassphraseEncryption {
  private algorithm = 'aes-256-gcm';
  private iterations = 100000;  // PBKDF2 迭代次数

  /**
   * 从用户密码派生加密密钥
   * @param passphrase 用户提供的密码
   * @param salt 盐值
   * @returns 派生的密钥
   */
  private deriveKey(passphrase: string, salt: string): Buffer {
    return crypto.pbkdf2Sync(passphrase, salt, this.iterations, 32, 'sha512');
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
   * @param passphrase 用户密码
   * @param salt 盐值
   * @returns 加密后的密文，格式：iv:authTag:encrypted
   */
  encrypt(plaintext: string, passphrase: string, salt: string): string {
    const key = this.deriveKey(passphrase, salt);
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
   * @param passphrase 用户密码
   * @param salt 盐值
   * @returns 解密后的明文
   */
  decrypt(ciphertext: string, passphrase: string, salt: string): string {
    const key = this.deriveKey(passphrase, salt);
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
   * 验证密码是否正确
   * @param ciphertext 密文
   * @param passphrase 用户密码
   * @param salt 盐值
   * @returns 密码是否正确
   */
  verifyPassphrase(ciphertext: string, passphrase: string, salt: string): boolean {
    try {
      this.decrypt(ciphertext, passphrase, salt);
      return true;
    } catch {
      return false;
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
