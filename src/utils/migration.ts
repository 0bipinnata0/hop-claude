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

    if (currentMode === 'legacy') {
      displayWarning('\nLegacy 模式使用机器绑定加密。');
      displayWarning('导出的配置无法在其他机器上恢复。');
      displayMessage('\n建议：迁移到更安全和可移植的模式。\n');
    }

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
      description: '使用密码加密 - 可跨机器移植，每次需要输入密码',
    });

    if (currentMode !== 'legacy') {
      choices.push({
        title: 'Legacy（不推荐）',
        value: 'legacy',
        description: '机器绑定加密 - 无法在其他机器上恢复',
      });
    }

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

    // 如果当前模式是密码模式，需要密码来解密
    let currentPassphrase: string | undefined;
    if (currentMode === 'passphrase') {
      // 先尝试空密码
      this.configManager.setSessionPassphrase('');

      // 验证空密码是否可以解密
      try {
        const config = await this.configManager.getConfig();
        if (config.profiles.length > 0) {
          // 尝试解密第一个配置来验证密码
          await this.configManager.getProfile(config.profiles[0].domain, '');
        }
        // 空密码可用
        currentPassphrase = '';
      } catch {
        // 空密码失败，提示输入
        this.configManager.clearSessionPassphrase();

        const { currentPwd } = await prompts({
          type: 'password',
          name: 'currentPwd',
          message: '输入当前密码以解密配置：',
          validate: (value: string) =>
            value.trim() !== '' ? true : '密码不能为空',
        });

        if (!currentPwd) {
          displayWarning('已取消迁移');
          return;
        }

        currentPassphrase = currentPwd as string;
        this.configManager.setSessionPassphrase(currentPassphrase);
      }
    }

    // 如果选择密码模式，需要输入新密码
    let newPassphrase: string | undefined;
    if (newMode === 'passphrase') {
      const { pwd1 } = await prompts({
        type: 'password',
        name: 'pwd1',
        message: '输入新密码用于加密（直接回车使用空密码）：',
        validate: (value: string) =>
          value.length === 0 || value.length >= 8 ? true : '密码至少需要 8 个字符',
      });

      if (pwd1 === undefined) {
        displayWarning('已取消迁移');
        return;
      }

      // 如果不是空密码，需要确认
      if (pwd1.length > 0) {
        const { pwd2 } = await prompts({
          type: 'password',
          name: 'pwd2',
          message: '确认新密码：',
        });

        if (pwd1 !== pwd2) {
          displayError('两次密码输入不一致');
          return;
        }
      }

      newPassphrase = pwd1;
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
      await this.configManager.switchEncryptionMode(newMode, newPassphrase);

      displaySuccess(`\n迁移完成！`);
      displayMessage(`\n加密模式已更改：${currentMode} → ${newMode}`);

      if (newMode === 'keychain') {
        displayMessage('\n您的 API 密钥现在存储在系统 keychain 中。');
        displayMessage('配置文件仅包含非敏感数据。');
      } else if (newMode === 'passphrase') {
        if (newPassphrase && newPassphrase.length > 0) {
          displayWarning('\n重要：请记住您的密码！');
          displayWarning('每次使用 hop-claude 时都需要输入密码。');
        } else {
          displayMessage('\n您使用了空密码加密。');
          displayMessage('每次启动将自动使用空密码解密。');
        }
        if (newPassphrase !== undefined) {
          this.configManager.setSessionPassphrase(newPassphrase);
        }
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
      case 'legacy':
        displayMessage('\nLegacy 模式：');
        displayMessage('  - 使用机器绑定加密（hostname + username）');
        displayMessage('  - 密钥已加密但绑定到本机');
        displayMessage('  - 导出的配置无法在其他机器上恢复');
        displayWarning('\n  警告：此模式已弃用且安全性较低。');
        displayMessage('  建议迁移到 keychain 或 passphrase 模式。');
        break;

      case 'keychain':
        displayMessage('\nKeychain 模式：');
        displayMessage('  - 密钥存储在系统 keychain（最安全）');
        displayMessage('  - 日常使用无需输入密码');
        displayMessage('  - 密钥永不写入磁盘');
        displayWarning('\n  注意：无法跨机器导出/导入密钥。');
        break;

      case 'passphrase':
        displayMessage('\n密码加密模式：');
        displayMessage('  - 使用密码加密密钥');
        displayMessage('  - 完全可跨机器移植');
        displayMessage('  - 每次操作需要输入密码');
        break;
    }

    displayMessage(`\n系统 Keychain 可用：${keychainAvailable ? '是' : '否'}`);

    displayMessage('\n要迁移到不同模式，请运行：');
    displayMessage('  hop-claude --migrate-encryption\n');
  }
}
