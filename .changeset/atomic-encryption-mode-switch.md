---
"hop-claude": patch
---

Fix critical data loss vulnerability in encryption mode switching

**CRITICAL FIX**: Completely rewrote `switchEncryptionMode()` to use atomic file operations, eliminating the risk of permanent data loss during encryption mode transitions.

## Problem Fixed

Previously, switching encryption modes (keychain ↔ passphrase) had a critical vulnerability:
1. Configuration was cleared and written to disk
2. Profiles were saved one-by-one
3. If the process crashed mid-operation, all remaining profiles were permanently lost

## Solution

Implemented atomic file operations using temporary file + `fs.rename()`:
- All profiles are encrypted in memory first
- Complete configuration is written to a temporary file
- Atomic rename replaces the old config (no intermediate state)
- Automatic cleanup on failure

## Impact

This fix ensures:
- Zero data loss even if the process crashes, loses power, or is killed during migration
- Either complete success (all profiles migrated) or complete rollback (original config preserved)
- No intermediate "partially migrated" state

**Security Impact**: High - Prevents catastrophic data loss during security-critical operations
