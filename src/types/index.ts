/**
 * 加密模式
 * - legacy: 旧版机器绑定加密（已弃用，但保持向后兼容）
 * - keychain: OS 密钥链存储（推荐，最安全）
 * - passphrase: 密码加密（可移植）
 */
export type EncryptionMode = 'legacy' | 'keychain' | 'passphrase';

export interface ProfileConfig {
  domain: string;
  apiKey: string;  // 加密后的 API Key（legacy/passphrase 模式）或占位符（keychain 模式）
  baseUrl?: string;
  proxy?: string;
  disableNonessentialTraffic?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ConfigStore {
  version: string;
  currentProfile: string;
  profiles: ProfileConfig[];
  encryptionSalt?: string;  // legacy/passphrase 模式使用
  encryptionMode?: EncryptionMode;  // 加密模式，默认 'legacy' 保持向后兼容
}

export interface DecryptedProfile extends Omit<ProfileConfig, 'apiKey'> {
  apiKey: string;  // 解密后的 API Key
}

export interface EnvironmentVariables {
  ANTHROPIC_AUTH_TOKEN?: string;
  ANTHROPIC_BASE_URL?: string;
  HTTP_PROXY?: string;
  HTTPS_PROXY?: string;
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}
