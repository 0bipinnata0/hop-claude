# Changelog

## 2.0.1

### Patch Changes

- bea5ade: 修复密码加密模式启动时缺少密码输入提示

  **修正**：

  - 修复使用密码加密模式时启动 hop-claude 没有提示输入密码的问题
  - 添加自动密码获取逻辑，先尝试空密码，失败后提示输入
  - 修复配置管理和列表显示时的密码输入问题

  **改进**：

  - 所有需要访问加密配置的地方都会自动提示密码
  - 更友好的密码输入体验
  - 支持空密码快速启动

  **修复场景**：

  - `hop-claude` 启动时
  - `hop-claude -l` 列出配置时
  - `hop-claude -m` 进入配置管理时

## 2.0.0

### Major Changes

- c835b69: 移除 Legacy 加密模式支持

  **破坏性变更**：

  - 完全移除 legacy 加密模式（机器绑定加密）
  - 移除 legacy 向后兼容代码
  - 删除 encryption.ts 文件

  **新默认行为**：

  - 新安装自动选择最佳加密模式：
    - 支持 Keychain 的系统默认使用 Keychain 模式
    - 不支持 Keychain 的系统默认使用密码加密模式
  - 更简洁的代码库和更好的安全性

  **迁移说明**：
  如果你已有配置，系统会自动检测并提示迁移到新的加密模式。
  建议使用 Keychain 模式（macOS/Linux）或密码加密模式（Windows/其他）。

  **改进**：

  - 简化了加密模式选择逻辑
  - 移除了不安全的机器绑定加密
  - 提升了整体安全性
  - 减少了代码复杂度

## 1.1.0

### Minor Changes

- 5b6991c: 解决参数透传冲突，支持 Claude CLI 的 -c 参数

  **破坏性变更**：

  - `-c, --config` 已更改为 `-m, --manage`（进入配置管理模式）

  **新功能**：

  - 现在 `-c` 参数可以正确透传给 Claude CLI（用于继续上次对话）
  - 支持 `--` 分隔符来明确区分 hop-claude 参数和 Claude 参数

  **使用示例**：

  ```bash
  # 进入配置管理（原 -c 改为 -m）
  hop-claude -m

  # 继续上次对话（-c 透传给 Claude）
  hop-claude -c

  # 使用 -- 分隔符（推荐，更明确）
  hop-claude -- -c
  hop-claude -s myprofile -- -c --verbose

  # 切换配置后继续对话
  hop-claude -s myprofile -c
  ```

  **迁移指南**：
  如果你之前使用 `hop-claude -c` 进入配置管理，现在需要改为 `hop-claude -m`

### Patch Changes

- 81e95cf: 改进密码加密模式的用户体验

  **修正**：

  - 修复从密码模式迁移时缺少密码输入提示的问题
  - 支持空密码作为默认值，失败后再提示输入
  - 改进密码验证逻辑，避免不必要的交互

  **改进**：

  - 简化"Passphrase"表述为"密码加密"，更易理解
  - 优化密码输入提示，支持直接回车使用空密码
  - 空密码时不再要求确认密码
  - 更清晰的迁移后提示信息

  **用户体验**：

  - 迁移时先尝试空密码自动解密，失败才提示输入
  - 创建新密码时可以直接回车使用空密码（简化使用）
  - 使用空密码时自动跳过密码确认步骤

## 1.0.2

### Patch Changes

- ddefe5c: 修复导入/导出操作后不再启动 Claude Code

  **修正**：

  - 导入配置后直接退出，不再启动 Claude Code
  - 导出配置后直接退出，不再启动 Claude Code
  - 其他配置操作（选择、创建、编辑、删除）完成后继续正常启动

  **改进**：

  - 更符合用户预期的操作流程
  - 避免不必要的 Claude Code 启动

- ddefe5c: 改进 `-s` 交互体验并完善中文化

  **新功能**：

  - `hop-claude -s` 现在会显示交互式配置选择列表
  - 不再需要记住配置名称，可以从列表中选择
  - 仍支持 `hop-claude -s <配置名>` 快速切换

  **改进**：

  - 完善命令行界面中文化（选项描述、错误消息、成功提示）
  - 更友好的用户体验，避免输入错误

  **示例**：

  ```bash
  # 显示列表选择（新功能）
  hop-claude -s

  # 快速切换（仍然支持）
  hop-claude -s production
  ```

## 1.0.1

### Patch Changes

- 1860e33: 修正环境变量并完全中文化界面

  **修正**：

  - 环境变量从 `ANTHROPIC_API_KEY` 改为 `ANTHROPIC_AUTH_TOKEN`（与 Claude Code 官方一致）

  **改进**：

  - 完全中文化所有用户界面文本
  - 交互提示、错误消息、迁移工具全部使用中文
  - 明确标注 API Key 对应的环境变量名称

  **面向受众**：主要为中国用户优化体验

## 1.0.0

### Major Changes

- # v0.1.0 - Major Security Update and Multi-Mode Encryption

  This is a major security and feature update with critical fixes and new encryption capabilities.

  ## 🔒 Critical Security Fixes

  - **CRITICAL**: Fixed command injection vulnerability (CVE-pending)

    - Removed `shell: true` from subprocess spawning
    - Implemented safe binary detection for cross-platform support
    - All user inputs now properly sanitized

  - **Improved Windows Binary Detection**

    - Support for claude.cmd, claude.exe, and claude binaries
    - Uses `which` package for reliable PATH resolution
    - Graceful fallback if binary not found

  - **Enhanced Error Handling**
    - Migrated from `error: any` to `error: unknown` for type safety
    - Improved error messages and debugging support
    - Better handling of edge cases

  ## 🆕 New Encryption Modes

  ### Keychain Mode (Recommended) ⭐

  - Integration with OS-managed keychains:
    - macOS: Keychain Access
    - Windows: Credential Manager
    - Linux: libsecret
  - Hardware-backed encryption when available
  - No password required for daily use
  - Maximum security for single-machine usage

  ### Passphrase Mode

  - AES-256-GCM encryption with user-provided password
  - PBKDF2 key derivation (100,000 iterations)
  - Fully portable across machines
  - Session passphrase caching for convenience

  ### Legacy Mode (Deprecated)

  - Backwards compatible with v0.0.x
  - Machine-bound encryption (hostname + username)
  - Users should migrate to Keychain or Passphrase mode

  ## 🔄 Migration Features

  - `--migrate-encryption`: Interactive migration tool

    - Automatic backup before migration
    - Guided selection of new encryption mode
    - Data integrity verification
    - Rollback support if migration fails

  - `--encryption-info`: View current encryption mode
    - Display security level
    - Show recommendations
    - List limitations

  ## 🛡️ Reliability Improvements

  - **File Locking**: Prevents corruption from concurrent access

    - Uses `proper-lockfile` with retry logic
    - Safe for multiple terminal sessions
    - Automatic lock cleanup

  - **Cross-Platform File Permissions**
    - Unix: 0700 directory, 0600 file permissions
    - Windows: ACL restrictions to current user
    - Enhanced error handling and user guidance

  ## ✅ Testing

  - 31 comprehensive tests covering:
    - Security (command injection, encryption algorithms)
    - Concurrency (file locking, race conditions)
    - Migration (all mode combinations)
    - Edge cases (special characters, empty configs, wrong passwords)
  - 99 assertions ensuring code quality

  ## 📖 Documentation

  - Complete SECURITY.md with:

    - Security model explanation
    - Threat model analysis
    - Best practices for each mode
    - Migration guide
    - Known issues and changelog

  - Updated README with:
    - New features documentation
    - Migration instructions
    - Troubleshooting guide
    - Testing information

  ## ⚠️ Breaking Changes

  None - fully backwards compatible with v0.0.x configs. Legacy mode is deprecated but still functional.

  ## 📦 Migration Path

  For v0.0.x users:

  ```bash
  # Backup your current config
  hop-claude -e backup-before-migration.json

  # Run migration
  hop-claude --migrate-encryption

  # Verify new mode
  hop-claude --encryption-info
  ```

  ## 🔗 Dependencies

  New dependencies added:

  - `keytar`: ^7.9.0 (OS keychain integration)
  - `proper-lockfile`: ^4.1.2 (file locking)
  - `which`: ^6.0.0 (binary detection)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-03

### 🔒 Security

#### Fixed

- **CRITICAL**: Command injection vulnerability via `shell: true` in subprocess spawning
  - Removed shell interpretation of user inputs
  - Implemented safe binary detection using `which` package
  - Added comprehensive security tests to prevent regression

#### Added

- **Keychain Mode**: OS-managed keychain integration for maximum security
  - macOS: Keychain Access
  - Windows: Credential Manager
  - Linux: libsecret support
- **Passphrase Mode**: Portable password-based encryption
  - AES-256-GCM encryption
  - PBKDF2 key derivation with 100,000 iterations
  - Session passphrase caching
- File locking to prevent concurrent write corruption
  - Uses `proper-lockfile` with retry logic
  - Safe for multiple terminal sessions
- Enhanced type safety: migrated from `error: any` to `error: unknown`

### ✨ Features

#### Added

- `--migrate-encryption`: Interactive encryption mode migration tool
  - Automatic backup before migration
  - Support for all mode combinations (Legacy ↔ Keychain ↔ Passphrase)
  - Data integrity verification
- `--encryption-info`: View current encryption mode and recommendations
- Improved Windows binary detection
  - Supports claude.cmd, claude.exe, and claude
  - Graceful fallback if binary not found
- Enhanced Windows ACL error handling with user guidance

### 🧪 Testing

#### Added

- Comprehensive test suite with 31 tests:
  - `test/security.test.ts`: Command injection, encryption, keychain, file permissions
  - `test/concurrent.test.ts`: File locking, race conditions, performance
  - `test/migration.test.ts`: All encryption mode combinations
- 99 assertions covering security, reliability, and edge cases

### 📚 Documentation

#### Added

- `SECURITY.md`: Complete security policy
  - Detailed encryption mode explanations
  - Threat model analysis
  - Security best practices
  - Migration guide
  - Security changelog
- Updated `README.md`:
  - New encryption modes documentation
  - Migration instructions
  - Enhanced troubleshooting guide
  - Testing information
  - Version history

### 📦 Dependencies

#### Added

- `keytar@^7.9.0`: OS keychain integration
- `proper-lockfile@^4.1.2`: File locking support
- `which@^6.0.0`: Cross-platform binary detection
- `@types/proper-lockfile@^4.1.4`: TypeScript definitions
- `@types/which@^3.0.4`: TypeScript definitions

### ⚠️ Deprecated

- **Legacy encryption mode**: Still functional for backwards compatibility but deprecated
  - Users should migrate to Keychain (recommended) or Passphrase mode
  - Run `hop-claude --migrate-encryption` to upgrade

### 🔄 Changed

- Configuration file structure now includes optional `encryptionMode` field
- Improved error messages and debugging output
- Enhanced cross-platform file permissions handling

### 💔 Breaking Changes

None - fully backwards compatible with v0.0.x configurations.

## [0.0.1] - Initial Release

### Added

- Basic configuration management for Claude Code CLI
- API key encryption with machine-bound keys (Legacy mode)
- Multi-profile support
- Interactive CLI interface
- Configuration import/export
- API key validation
- Automatic Claude CLI launching
- Cross-platform support (macOS, Linux, Windows)

---

## Migration Guide

### From v0.0.x to v0.1.0

1. **Backup your current configuration**:

   ```bash
   hop-claude -e backup-before-migration.json
   ```

2. **Run the migration tool**:

   ```bash
   hop-claude --migrate-encryption
   ```

3. **Select your preferred encryption mode**:

   - **Keychain** (recommended for single-machine usage): Maximum security, no password needed
   - **Passphrase** (for multi-machine usage): Portable, requires password

4. **Verify the migration**:
   ```bash
   hop-claude --encryption-info
   ```

### Emergency Recovery

If migration fails:

```bash
# Restore from backup
hop-claude -i backup-before-migration.json

# Or manually restore
# macOS/Linux:
cp ~/.hop-claude-config/config.json.backup-TIMESTAMP ~/.hop-claude-config/config.json

# Windows:
copy %APPDATA%\hop-claude-config\config.json.backup-TIMESTAMP %APPDATA%\hop-claude-config\config.json
```

## Security Advisories

### CVE-pending (Fixed in v0.1.0)

**Command Injection Vulnerability in v0.0.x**

- **Severity**: CRITICAL
- **Affected Versions**: v0.0.x and earlier
- **Fixed Version**: v0.1.0+
- **Description**: The use of `shell: true` in subprocess spawning allowed command injection through malicious profile names or configuration values.
- **Impact**: Local attackers could execute arbitrary commands by crafting malicious inputs.
- **Mitigation**: Upgrade to v0.1.0 or later immediately.

### Weak Encryption in Legacy Mode

- **Severity**: HIGH
- **Affected Versions**: All versions with Legacy mode enabled
- **Mitigation**: Migrate to Keychain or Passphrase mode using `hop-claude --migrate-encryption`
- **Description**: Legacy mode uses machine-bound encryption (hostname + username) which provides obfuscation rather than true security.
- **Impact**: Local attackers with filesystem access can decrypt API keys.

---

## Support

For security issues, please review [SECURITY.md](./SECURITY.md) for reporting procedures.

For general issues and feature requests, visit [GitHub Issues](https://github.com/0bipinnata0/hop-claude/issues).
