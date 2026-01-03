# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in hop-claude, please report it responsibly:

- **Email:** Create an issue on GitHub with the tag `security` (or email the maintainer privately for sensitive issues)
- **Response Time:** We aim to respond within 48 hours and provide a fix within 7 days for critical vulnerabilities

**Please do not** publicly disclose the vulnerability until a fix has been released.

---

## Security Model

hop-claude manages sensitive API keys for Claude Code CLI. Understanding our security model helps you use the tool safely.

### Encryption Modes

hop-claude supports three encryption modes with different security trade-offs:

#### 1. Keychain Mode (Recommended) ⭐

**Security Level:** HIGH

- API keys stored in OS-managed keychain:
  - macOS: Keychain Access
  - Windows: Credential Manager
  - Linux: libsecret
- Keys never written to disk in plain text
- Encrypted by OS using hardware-backed secrets (when available)
- No password required for daily use

**Limitations:**
- Not portable across machines
- Requires functional OS keychain

**Best for:** Single-machine usage, maximum security

#### 2. Passphrase Mode

**Security Level:** MEDIUM to HIGH (depends on passphrase strength)

- API keys encrypted with AES-256-GCM using user-provided passphrase
- PBKDF2 key derivation with 100,000 iterations
- Fully portable across machines
- Password required for each operation

**Limitations:**
- Security depends on passphrase strength (minimum 8 characters enforced)
- Password must be remembered or stored securely
- Vulnerable to brute-force if weak password used

**Best for:** Multi-machine usage, team sharing (with secure password management)

#### 3. Legacy Mode (Deprecated)

**Security Level:** LOW

- Machine-bound encryption using hostname + username as key material
- Provides obfuscation, not true security
- Backwards compatible with v0.0.x

**Limitations:**
- Not portable across machines
- Weak against local attackers with filesystem access
- Keys can be decrypted if attacker knows hostname and username

**Status:** Deprecated. Migrate to Keychain or Passphrase mode.

---

## What We Protect Against

hop-claude is designed to protect against:

✅ **Accidental Exposure**
- Prevents API keys from appearing in git commits
- Keys not visible in process listings
- Redacted in terminal output (masked as `sk-ant-***xyz`)

✅ **Casual Filesystem Access**
- Config directory permissions: `0700` (Unix) or restricted ACL (Windows)
- Config file permissions: `0600` (Unix)
- Encrypted storage prevents casual browsing

✅ **Command Injection Attacks**
- No shell interpretation of user input (fixed in v0.1.0)
- Safe subprocess spawning without `shell: true`

✅ **Concurrent Write Corruption**
- File locking prevents data corruption from simultaneous access
- Safe for multiple terminal sessions

---

## What We Do NOT Protect Against

hop-claude is a local development tool with inherent limitations:

❌ **Root/Admin Access Attacks**
- Local root users can access any file, including encrypted configs
- OS keychain can be accessed by users with physical machine access

❌ **Memory Inspection**
- API keys exist in plain text in memory during use
- Process memory can be dumped by privileged users

❌ **Physical Access**
- Unattended, unlocked machines are vulnerable
- Screen capture or keyloggers can steal passwords

❌ **Malware**
- If your machine is compromised, all local data is at risk
- Use antivirus and keep your system updated

❌ **Network Interception**
- hop-claude only manages local storage
- API requests from Claude Code CLI are subject to network security

---

## Security Best Practices

### For Keychain Mode Users

1. ✅ Enable full disk encryption (FileVault, BitLocker, LUKS)
2. ✅ Use strong machine login password
3. ✅ Lock your screen when away (auto-lock recommended)
4. ✅ Keep OS up to date for keychain security patches

### For Passphrase Mode Users

1. ✅ Use strong, unique passphrase (≥12 characters, mixed case, symbols)
2. ✅ Consider using a password manager
3. ✅ Never commit encrypted config to public repositories
4. ✅ Rotate API keys if passphrase is compromised

### For All Users

1. ✅ Run `hop-claude --encryption-info` to verify your current mode
2. ✅ Migrate from Legacy mode: `hop-claude --migrate-encryption`
3. ✅ Review file permissions: Config directory should be owner-only
4. ✅ Monitor API usage on Anthropic dashboard for suspicious activity
5. ✅ Rotate API keys periodically (every 90 days recommended)

---

## Known Security Issues

### v0.0.x (Legacy)

- **CRITICAL:** Command injection vulnerability via `shell: true` ➜ Fixed in v0.1.0
- **HIGH:** Machine-bound encryption is weak ➜ Migrate to Keychain/Passphrase mode

### v0.1.0+

- No known critical vulnerabilities
- Legacy mode still available for compatibility but deprecated

---

## Threat Model

### Attacker Profiles

| Attacker Type | Can They Access Keys? | Mitigation |
|---------------|----------------------|------------|
| Remote attacker (no local access) | ❌ No | N/A - keys only stored locally |
| Casual user on shared machine | ❌ No | File permissions + encryption |
| Determined user with physical access | ⚠️ Maybe | Use keychain mode + strong login password |
| Malware on your machine | ✅ Yes | Antivirus, system updates, vigilance |
| Root/Admin with physical access | ✅ Yes | No defense - rotate keys if compromised |

### Attack Scenarios

**Scenario 1: Laptop Theft**
- **Keychain Mode:** Safe if disk encrypted and powered off
- **Passphrase Mode:** Safe if strong passphrase used
- **Legacy Mode:** Vulnerable if attacker can boot system

**Scenario 2: Shared Development Server**
- **Keychain Mode:** Safe from other users (OS isolation)
- **Passphrase Mode:** Safe from other users (file permissions)
- **Legacy Mode:** Vulnerable to other users

**Scenario 3: Git Commit Accident**
- **All Modes:** Keys are encrypted, not plain text
- **Keychain Mode:** Config file only has placeholders
- **Passphrase/Legacy:** Encrypted keys in config, but remove from git immediately

---

## Migration Guide

### From v0.0.x to v0.1.0+

```bash
# 1. Backup your config
hop-claude -e backup-before-migration.json

# 2. Run migration
hop-claude --migrate-encryption

# 3. Choose Keychain (most secure) or Passphrase (portable)

# 4. Verify migration
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

---

## Security Changelog

### v0.1.0 (2025-01-03)
- ✅ Fixed command injection vulnerability (CRITICAL)
- ✅ Added Keychain and Passphrase encryption modes
- ✅ Implemented file locking for concurrent access
- ✅ Improved Windows binary detection
- ✅ Enhanced error handling with type safety
- ✅ Deprecated Legacy mode

### v0.0.x
- ⚠️ Legacy encryption only (machine-bound)
- ⚠️ Command injection vulnerability present
- ⚠️ No concurrent write protection

---

## Security Audits

- **Internal:** Code reviewed by gemini-3-pro-preview and openai/o3 models (2025-01-03)
- **Community:** Awaiting external security audit
- **Automated:** 31 security and functionality tests pass

---

## Compliance & Certifications

hop-claude is a development tool intended for:
- Local development environments
- Individual developer use
- Small team collaboration

It is **NOT** certified for:
- HIPAA, PCI-DSS, SOC 2, or other compliance frameworks
- Production secrets management
- Enterprise deployment without additional security controls

For enterprise use, consider:
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- 1Password Secrets Automation

---

## Contact

For security concerns:
- GitHub Issues: https://github.com/0bipinnata0/hop-claude/issues
- Email: [your-email@example.com]

Last updated: 2025-01-03
