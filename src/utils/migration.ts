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
    displayMessage('\n=== 加密模式迁移 ===\n');

    // 获取当前加密模式
    const currentMode = await this.configManager.getEncryptionMode();

    displayMessage(`当前加密模式：${currentMode}`);

    // 检查 keychain 是否可用
    const keychainAvailable = await KeychainManager.isAvailable();

    // 选择新的加密模式
    const choices: Array<{ title: string; value: EncryptionMode; description: string }> = [];

    if (keychainAvailable) {
      choices.push({
        title: 'Keychain（推荐）',
        value: 'keychain',
        description: '将密钥存储在系统 keychain - 最安全，无需记住密码',
      });
    } else {
      displayWarning('注意：本系统不支持 OS Keychain。');
    }

    choices.push({
      title: '密码加密',
      value: 'passphrase',
      description: '使用内置密码自动加密 - 可跨机器移植，无需手动输入密码',
    });

    const { newMode } = await prompts({
      type: 'select',
      name: 'newMode',
      message: '选择新的加密模式：',
      choices,
    });

    if (!newMode) {
      displayWarning('已取消迁移');
      return;
    }

    if (newMode === currentMode) {
      displayMessage('已在使用此模式，无需迁移。');
      return;
    }

    // 确认迁移
    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: `确认从 ${currentMode} 迁移到 ${newMode} 模式？`,
      initial: false,
    });

    if (!confirm) {
      displayWarning('已取消迁移');
      return;
    }

    try {
      displayMessage('\n正在备份当前配置...');

      // 创建备份
      const backupPath = `${this.configManager.getConfigPath()}.backup-${Date.now()}`;
      const configData = await this.configManager.exportConfig();
      const fs = await import('fs/promises');
      await fs.writeFile(backupPath, configData, 'utf8');
      displaySuccess(`备份已创建：${backupPath}`);

      displayMessage('\n正在迁移加密模式...');

      // 执行迁移
      await this.configManager.switchEncryptionMode(newMode);

      displaySuccess(`\n迁移完成！`);
      displayMessage(`\n加密模式已更改：${currentMode} → ${newMode}`);

      if (newMode === 'keychain') {
        displayMessage('\n您的 API 密钥现在存储在系统 keychain 中。');
        displayMessage('配置文件仅包含非敏感数据。');
      } else if (newMode === 'passphrase') {
        displayMessage('\n您的 API 密钥现在使用内置密码加密。');
        displayMessage('配置完全可移植，可跨机器导入/导出。');
      }

      displayMessage(`\n备份文件：${backupPath}`);
      displayMessage('验证迁移成功后可以删除备份文件。\n');
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      displayError(`迁移失败：${err.message}`);

      if (process.env.DEBUG) {
        console.error('\n堆栈跟踪：');
        console.error(err.stack);
      }

      displayWarning('\n您的配置已备份。');
      displayWarning('如有需要请从备份恢复。');
      process.exit(1);
    }
  }

  /**
   * 显示当前加密模式信息
   */
  async showEncryptionInfo(): Promise<void> {
    const mode = await this.configManager.getEncryptionMode();
    const keychainAvailable = await KeychainManager.isAvailable();

    displayMessage('\n=== 加密模式信息 ===\n');
    displayMessage(`当前模式：${mode}`);

    switch (mode) {
      case 'keychain':
        displayMessage('\nKeychain 模式：');
        displayMessage('  - 密钥存储在系统 keychain（最安全）');
        displayMessage('  - 日常使用无需输入密码');
        displayMessage('  - 密钥永不写入磁盘');
        displayWarning('\n  注意：无法跨机器导出/导入密钥。');
        break;

      case 'passphrase':
        displayMessage('\n密码加密模式：');
        displayMessage('  - 使用内置密码自动加密密钥');
        displayMessage('  - 完全可跨机器移植');
        displayMessage('  - 无需手动输入密码');
        break;
    }

    displayMessage(`\n系统 Keychain 可用：${keychainAvailable ? '是' : '否'}`);

    displayMessage('\n要迁移到不同模式，请运行：');
    displayMessage('  hop-claude --migrate-encryption\n');
  }
}
