import prompts from 'prompts';
import chalk from 'chalk';
import { ConfigManager } from '../config/config-manager.js';
import { validateApiKey } from '../config/validator.js';
import { backupConfig, restoreConfig } from '../utils/backup.js';
import type { DecryptedProfile, ProfileConfig } from '../types/index.js';
import { displayTitle, displaySuccess, displayError, displayWarning, displayInfo } from './display.js';

/**
 * 交互式 UI 类
 */
export class InteractiveUI {
  constructor(private configManager: ConfigManager) {}

  /**
   * 显示当前配置并询问是否修改
   */
  async showCurrentAndAsk(): Promise<boolean> {
    const current = await this.configManager.getCurrentProfile();

    displayTitle('🔧 Claude Code Configuration Manager');

    if (current) {
      console.log(chalk.cyan('Current Configuration:'));
      displayInfo('Domain', chalk.green(current.domain));
      displayInfo('Base URL', current.baseUrl);
      displayInfo('Proxy', current.proxy, '(none)');
      displayInfo('Disable Traffic', current.disableNonessentialTraffic ? 'Yes' : 'No');
      console.log();
    } else {
      displayWarning('No configuration set up yet.\n');
    }

    const { action } = await prompts({
      type: 'select',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { title: 'Continue with current configuration', value: 'continue', disabled: !current },
        { title: 'Modify configuration', value: 'modify' },
        { title: 'Exit', value: 'exit' },
      ],
      initial: current ? 0 : 1,
    });

    if (action === 'exit' || action === undefined) {
      return false;
    }

    if (action === 'modify') {
      await this.manageConfiguration();
    }

    return true;
  }

  /**
   * 配置管理主界面
   */
  async manageConfiguration(): Promise<void> {
    const profiles = await this.configManager.listProfiles();

    const { action } = await prompts({
      type: 'select',
      name: 'action',
      message: 'Configuration Management',
      choices: [
        { title: 'Select existing configuration', value: 'select', disabled: profiles.length === 0 },
        { title: 'Create new configuration', value: 'create' },
        { title: 'Edit existing configuration', value: 'edit', disabled: profiles.length === 0 },
        { title: 'Delete configuration', value: 'delete', disabled: profiles.length === 0 },
        { title: 'Export configuration', value: 'export' },
        { title: 'Import configuration', value: 'import' },
        { title: 'Back', value: 'back' },
      ],
    });

    switch (action) {
      case 'select':
        await this.selectProfile(profiles);
        break;
      case 'create':
        await this.createProfile();
        break;
      case 'edit':
        await this.editProfile(profiles);
        break;
      case 'delete':
        await this.deleteProfile(profiles);
        break;
      case 'export':
        await this.exportConfiguration();
        break;
      case 'import':
        await this.importConfiguration();
        break;
    }
  }

  /**
   * 选择 profile
   */
  async selectProfile(profiles: Array<ProfileConfig & { maskedApiKey: string }>): Promise<void> {
    const { domain } = await prompts({
      type: 'select',
      name: 'domain',
      message: 'Select a configuration:',
      choices: profiles.map(p => ({
        title: `${p.domain} (${p.maskedApiKey})`,
        value: p.domain,
      })),
    });

    if (domain) {
      await this.configManager.setCurrentProfile(domain);
      displaySuccess(`Switched to: ${domain}`);
    }
  }

  /**
   * 创建新 profile
   */
  async createProfile(): Promise<void> {
    const answers = await prompts([
      {
        type: 'text',
        name: 'domain',
        message: 'Domain/Profile name:',
        validate: value => value.trim() ? true : 'Domain cannot be empty',
      },
      {
        type: 'password',
        name: 'apiKey',
        message: 'API Key:',
        validate: value => value.trim() ? true : 'API Key cannot be empty',
      },
      {
        type: 'text',
        name: 'baseUrl',
        message: 'Base URL (optional):',
      },
      {
        type: 'text',
        name: 'proxy',
        message: 'Proxy (optional):',
      },
      {
        type: 'confirm',
        name: 'disableNonessentialTraffic',
        message: 'Disable nonessential traffic?',
        initial: false,
      },
      {
        type: 'confirm',
        name: 'validate',
        message: 'Validate API Key?',
        initial: false,
      },
    ]);

    if (!answers.domain || !answers.apiKey) {
      displayWarning('Cancelled');
      return;
    }

    // 验证 API Key（如果用户选择）
    if (answers.validate) {
      console.log(chalk.gray('Validating API Key...'));
      const result = await validateApiKey(answers.apiKey, answers.baseUrl);
      if (!result.valid) {
        displayError(`API Key validation failed: ${result.error}`);
        const { continueAnyway } = await prompts({
          type: 'confirm',
          name: 'continueAnyway',
          message: 'Continue anyway?',
          initial: false,
        });
        if (!continueAnyway) {
          displayWarning('Cancelled');
          return;
        }
      } else {
        displaySuccess('API Key is valid');
      }
    }

    const profile: DecryptedProfile = {
      domain: answers.domain,
      apiKey: answers.apiKey,
      baseUrl: answers.baseUrl || undefined,
      proxy: answers.proxy || undefined,
      disableNonessentialTraffic: answers.disableNonessentialTraffic,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.configManager.saveProfile(profile);
    await this.configManager.setCurrentProfile(profile.domain);

    displaySuccess(`Configuration "${profile.domain}" created and activated`);
  }

  /**
   * 编辑 profile
   */
  async editProfile(profiles: Array<ProfileConfig & { maskedApiKey: string }>): Promise<void> {
    const { domain } = await prompts({
      type: 'select',
      name: 'domain',
      message: 'Select configuration to edit:',
      choices: profiles.map(p => ({
        title: `${p.domain} (${p.maskedApiKey})`,
        value: p.domain,
      })),
    });

    if (!domain) return;

    const existing = await this.configManager.getProfile(domain);
    if (!existing) return;

    const answers = await prompts([
      {
        type: 'password',
        name: 'apiKey',
        message: 'API Key (leave empty to keep current):',
      },
      {
        type: 'text',
        name: 'baseUrl',
        message: 'Base URL:',
        initial: existing.baseUrl,
      },
      {
        type: 'text',
        name: 'proxy',
        message: 'Proxy:',
        initial: existing.proxy,
      },
      {
        type: 'confirm',
        name: 'disableNonessentialTraffic',
        message: 'Disable nonessential traffic?',
        initial: existing.disableNonessentialTraffic,
      },
    ]);

    const updated: DecryptedProfile = {
      ...existing,
      apiKey: answers.apiKey || existing.apiKey,
      baseUrl: answers.baseUrl || undefined,
      proxy: answers.proxy || undefined,
      disableNonessentialTraffic: answers.disableNonessentialTraffic,
    };

    await this.configManager.saveProfile(updated);
    displaySuccess(`Configuration "${domain}" updated`);
  }

  /**
   * 删除 profile
   */
  async deleteProfile(profiles: Array<ProfileConfig & { maskedApiKey: string }>): Promise<void> {
    const { domain } = await prompts({
      type: 'select',
      name: 'domain',
      message: 'Select configuration to delete:',
      choices: profiles.map(p => ({
        title: `${p.domain} (${p.maskedApiKey})`,
        value: p.domain,
      })),
    });

    if (!domain) return;

    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to delete "${domain}"?`,
      initial: false,
    });

    if (confirm) {
      await this.configManager.deleteProfile(domain);
      displaySuccess(`Configuration "${domain}" deleted`);
    }
  }

  /**
   * 列出所有配置
   */
  async listConfigurations(): Promise<void> {
    const profiles = await this.configManager.listProfiles();
    const config = await this.configManager.getConfig();

    displayTitle('📋 All Configurations:');

    if (profiles.length === 0) {
      console.log(chalk.gray('  No configurations found\n'));
      return;
    }

    profiles.forEach(p => {
      const isCurrent = p.domain === config.currentProfile;
      const marker = isCurrent ? chalk.green('●') : chalk.gray('○');

      console.log(`${marker} ${chalk.bold(p.domain)}`);
      displayInfo('API Key', p.maskedApiKey);
      displayInfo('Base URL', p.baseUrl);
      displayInfo('Proxy', p.proxy, '(none)');
      displayInfo('Disable Traffic', p.disableNonessentialTraffic ? 'Yes' : 'No');
      console.log();
    });
  }

  /**
   * 导出配置
   */
  async exportConfiguration(): Promise<void> {
    const { outputPath } = await prompts({
      type: 'text',
      name: 'outputPath',
      message: 'Export to file:',
      initial: './cproxy-config-backup.json',
    });

    if (!outputPath) return;

    try {
      await backupConfig(this.configManager, outputPath);
      displaySuccess(`Configuration exported to: ${outputPath}`);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      displayError(`Export failed: ${err.message}`);
    }
  }

  /**
   * 导入配置
   */
  async importConfiguration(): Promise<void> {
    const { inputPath } = await prompts({
      type: 'text',
      name: 'inputPath',
      message: 'Import from file:',
    });

    if (!inputPath) return;

    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: 'This will replace all existing configurations. Continue?',
      initial: false,
    });

    if (!confirm) {
      displayWarning('Cancelled');
      return;
    }

    try {
      await restoreConfig(this.configManager, inputPath);
      displaySuccess('Configuration imported successfully');
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      displayError(`Import failed: ${err.message}`);
    }
  }
}
