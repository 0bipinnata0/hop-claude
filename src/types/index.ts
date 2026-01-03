/**
 * 加密模式
 * - keychain: OS 密钥链存储（推荐，最安全）
 * - passphrase: 密码加密（可移植）
 */
export type EncryptionMode = 'keychain' | 'passphrase';

export interface ProfileConfig {
  name: string;  // 配置名称/别名，用于区分不同配置
  apiKey: string;  // 加密后的 API Key（passphrase 模式）或占位符（keychain 模式）
  baseUrl?: string;  // API 地址（可选），留空则使用 Claude 官方服务
  proxy?: string;
  disableNonessentialTraffic?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ConfigStore {
  version: string;
  currentProfile: string;
  profiles: ProfileConfig[];
  encryptionSalt?: string;  // passphrase 模式使用
  encryptionMode?: EncryptionMode;  // 加密模式，默认 'keychain' 或 'passphrase'
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
