# Changelog

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
