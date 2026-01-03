import prompts from 'prompts';
import { ConfigManager } from '../config/config-manager.js';
import { KeychainManager } from '../config/keychain.js';
import { displaySuccess, displayError, displayMessage, displayWarning } from '../ui/display.js';
import type { EncryptionMode } from '../types/index.js';

/**
 * 加密模式迁移工具
 * 帮助用户从 legacy 模式迁移到 keychain 或 passphrase 模式
 */
export class EncryptionMigration {
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  /**
   * 执行加密模式迁移
   */
  async migrate(): Promise<void> {
    displayMessage('\n=== Encryption Mode Migration ===\n');

    // 获取当前加密模式
    const currentMode = await this.configManager.getEncryptionMode();

    displayMessage(`Current encryption mode: ${currentMode}`);

    if (currentMode === 'legacy') {
      displayWarning('\nLegacy mode uses machine-bound encryption.');
      displayWarning('Your exported config cannot be restored on different machines.');
      displayMessage('\nRecommended: Migrate to a more secure and portable mode.\n');
    }

    // 检查 keychain 是否可用
    const keychainAvailable = await KeychainManager.isAvailable();

    // 选择新的加密模式
    const choices: Array<{ title: string; value: EncryptionMode; description: string }> = [];

    if (keychainAvailable) {
      choices.push({
        title: 'Keychain (Recommended)',
        value: 'keychain',
        description: 'Store keys in OS keychain - most secure, no passwords needed',
      });
    } else {
      displayWarning('Note: OS Keychain not available on this system.');
    }

    choices.push({
      title: 'Passphrase',
      value: 'passphrase',
      description: 'Encrypt with password - portable across machines, password required',
    });

    if (currentMode !== 'legacy') {
      choices.push({
        title: 'Legacy (Not recommended)',
        value: 'legacy',
        description: 'Machine-bound encryption - cannot be restored on different machines',
      });
    }

    const { newMode } = await prompts({
      type: 'select',
      name: 'newMode',
      message: 'Choose new encryption mode:',
      choices,
    });

    if (!newMode) {
      displayWarning('Migration cancelled');
      return;
    }

    if (newMode === currentMode) {
      displayMessage('Already using this mode. No migration needed.');
      return;
    }

    // 如果选择 passphrase 模式，需要输入密码
    let passphrase: string | undefined;
    if (newMode === 'passphrase') {
      const { pwd1 } = await prompts({
        type: 'password',
        name: 'pwd1',
        message: 'Enter new passphrase for encryption:',
        validate: (value: string) =>
          value.length >= 8 ? true : 'Passphrase must be at least 8 characters',
      });

      if (!pwd1) {
        displayWarning('Migration cancelled');
        return;
      }

      const { pwd2 } = await prompts({
        type: 'password',
        name: 'pwd2',
        message: 'Confirm passphrase:',
      });

      if (pwd1 !== pwd2) {
        displayError('Passphrases do not match');
        return;
      }

      passphrase = pwd1;
    }

    // 确认迁移
    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: `Migrate from ${currentMode} to ${newMode} mode?`,
      initial: false,
    });

    if (!confirm) {
      displayWarning('Migration cancelled');
      return;
    }

    try {
      displayMessage('\nBacking up current configuration...');

      // 创建备份
      const backupPath = `${this.configManager.getConfigPath()}.backup-${Date.now()}`;
      const configData = await this.configManager.exportConfig();
      const fs = await import('fs/promises');
      await fs.writeFile(backupPath, configData, 'utf8');
      displaySuccess(`Backup created: ${backupPath}`);

      displayMessage('\nMigrating encryption mode...');

      // 执行迁移
      await this.configManager.switchEncryptionMode(newMode, passphrase);

      displaySuccess(`\nMigration completed!`);
      displayMessage(`\nEncryption mode changed: ${currentMode} → ${newMode}`);

      if (newMode === 'keychain') {
        displayMessage('\nYour API keys are now stored in the system keychain.');
        displayMessage('The config file only contains non-sensitive data.');
      } else if (newMode === 'passphrase') {
        displayWarning('\nImportant: Remember your passphrase!');
        displayWarning('You will need it every time you use hop-claude.');
        if (passphrase) {
          this.configManager.setSessionPassphrase(passphrase);
        }
      }

      displayMessage(`\nBackup file: ${backupPath}`);
      displayMessage('You can delete it after verifying the migration works correctly.\n');
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      displayError(`Migration failed: ${err.message}`);

      if (process.env.DEBUG) {
        console.error('\nStack trace:');
        console.error(err.stack);
      }

      displayWarning('\nYour configuration has been backed up.');
      displayWarning('Please restore from backup if needed.');
      process.exit(1);
    }
  }

  /**
   * 显示当前加密模式信息
   */
  async showEncryptionInfo(): Promise<void> {
    const mode = await this.configManager.getEncryptionMode();
    const keychainAvailable = await KeychainManager.isAvailable();

    displayMessage('\n=== Encryption Mode Information ===\n');
    displayMessage(`Current mode: ${mode}`);

    switch (mode) {
      case 'legacy':
        displayMessage('\nLegacy mode:');
        displayMessage('  - Uses machine-bound encryption (hostname + username)');
        displayMessage('  - Keys are encrypted but tied to this machine');
        displayMessage('  - Cannot restore exported configs on different machines');
        displayWarning('\n  Warning: This mode is deprecated and less secure.');
        displayMessage('  Consider migrating to keychain or passphrase mode.');
        break;

      case 'keychain':
        displayMessage('\nKeychain mode:');
        displayMessage('  - Keys stored in OS keychain (most secure)');
        displayMessage('  - No passwords needed for daily use');
        displayMessage('  - Keys never written to disk');
        displayWarning('\n  Note: Cannot export/import keys across machines.');
        break;

      case 'passphrase':
        displayMessage('\nPassphrase mode:');
        displayMessage('  - Keys encrypted with your password');
        displayMessage('  - Fully portable across machines');
        displayMessage('  - Password required for each operation');
        break;
    }

    displayMessage(`\nOS Keychain available: ${keychainAvailable ? 'Yes' : 'No'}`);

    displayMessage('\nTo migrate to a different mode, run:');
    displayMessage('  hop-claude --migrate-encryption\n');
  }
}
