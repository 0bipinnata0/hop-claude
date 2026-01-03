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
   * @returns 是否应该继续启动 Claude
   */
  async showCurrentAndAsk(): Promise<boolean> {
    const current = await this.configManager.getCurrentProfile();

    displayTitle('🔧 Claude Code 配置管理工具');

    if (current) {
      console.log(chalk.cyan('当前配置：'));
      displayInfo('域名/配置名', chalk.green(current.domain));
      displayInfo('Base URL', current.baseUrl);
      displayInfo('代理', current.proxy, '(无)');
      displayInfo('禁用非必要流量', current.disableNonessentialTraffic ? '是' : '否');
      console.log();
    } else {
      displayWarning('尚未配置。\n');
    }

    const { action } = await prompts({
      type: 'select',
      name: 'action',
      message: '请选择操作：',
      choices: [
        { title: '使用当前配置继续', value: 'continue', disabled: !current },
        { title: '修改配置', value: 'modify' },
        { title: '退出', value: 'exit' },
      ],
      initial: current ? 0 : 1,
    });

    if (action === 'exit' || action === undefined) {
      return false;
    }

    if (action === 'modify') {
      return await this.manageConfiguration();
    }

    return true;
  }

  /**
   * 配置管理主界面
   * @returns 是否应该继续启动 Claude（导入/导出操作返回 false）
   */
  async manageConfiguration(): Promise<boolean> {
    const profiles = await this.configManager.listProfiles();

    const { action } = await prompts({
      type: 'select',
      name: 'action',
      message: '配置管理',
      choices: [
        { title: '选择已有配置', value: 'select', disabled: profiles.length === 0 },
        { title: '创建新配置', value: 'create' },
        { title: '编辑已有配置', value: 'edit', disabled: profiles.length === 0 },
        { title: '删除配置', value: 'delete', disabled: profiles.length === 0 },
        { title: '导出配置', value: 'export' },
        { title: '导入配置', value: 'import' },
        { title: '返回', value: 'back' },
      ],
    });

    switch (action) {
      case 'select':
        await this.selectProfile(profiles);
        return true;
      case 'create':
        await this.createProfile();
        return true;
      case 'edit':
        await this.editProfile(profiles);
        return true;
      case 'delete':
        await this.deleteProfile(profiles);
        return true;
      case 'export':
        await this.exportConfiguration();
        return false; // 导出后不启动 Claude
      case 'import':
        await this.importConfiguration();
        return false; // 导入后不启动 Claude
      default:
        return false; // 返回或取消时不启动 Claude
    }
  }

  /**
   * 选择 profile
   */
  async selectProfile(profiles: Array<ProfileConfig & { maskedApiKey: string }>): Promise<void> {
    const { domain } = await prompts({
      type: 'select',
      name: 'domain',
      message: '选择配置：',
      choices: profiles.map(p => ({
        title: `${p.domain} (${p.maskedApiKey})`,
        value: p.domain,
      })),
    });

    if (domain) {
      await this.configManager.setCurrentProfile(domain);
      displaySuccess(`已切换到：${domain}`);
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
        message: '域名/配置名：',
        validate: value => value.trim() ? true : '域名不能为空',
      },
      {
        type: 'password',
        name: 'apiKey',
        message: 'API Key (ANTHROPIC_AUTH_TOKEN)：',
        validate: value => value.trim() ? true : 'API Key 不能为空',
      },
      {
        type: 'text',
        name: 'baseUrl',
        message: 'Base URL (可选，用于中转站)：',
      },
      {
        type: 'text',
        name: 'proxy',
        message: '代理 (可选)：',
      },
      {
        type: 'confirm',
        name: 'disableNonessentialTraffic',
        message: '禁用非必要流量？',
        initial: false,
      },
      {
        type: 'confirm',
        name: 'validate',
        message: '验证 API Key 有效性？',
        initial: false,
      },
    ]);

    if (!answers.domain || !answers.apiKey) {
      displayWarning('已取消');
      return;
    }

    // 验证 API Key（如果用户选择）
    if (answers.validate) {
      console.log(chalk.gray('正在验证 API Key...'));
      const result = await validateApiKey(answers.apiKey, answers.baseUrl);
      if (!result.valid) {
        displayError(`API Key 验证失败：${result.error}`);
        const { continueAnyway } = await prompts({
          type: 'confirm',
          name: 'continueAnyway',
          message: '仍然继续？',
          initial: false,
        });
        if (!continueAnyway) {
          displayWarning('已取消');
          return;
        }
      } else {
        displaySuccess('API Key 有效');
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

    displaySuccess(`配置 "${profile.domain}" 已创建并激活`);
  }

  /**
   * 编辑 profile
   */
  async editProfile(profiles: Array<ProfileConfig & { maskedApiKey: string }>): Promise<void> {
    const { domain } = await prompts({
      type: 'select',
      name: 'domain',
      message: '选择要编辑的配置：',
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
        message: 'API Key (留空保持不变)：',
      },
      {
        type: 'text',
        name: 'baseUrl',
        message: 'Base URL：',
        initial: existing.baseUrl,
      },
      {
        type: 'text',
        name: 'proxy',
        message: '代理：',
        initial: existing.proxy,
      },
      {
        type: 'confirm',
        name: 'disableNonessentialTraffic',
        message: '禁用非必要流量？',
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
    displaySuccess(`配置 "${domain}" 已更新`);
  }

  /**
   * 删除 profile
   */
  async deleteProfile(profiles: Array<ProfileConfig & { maskedApiKey: string }>): Promise<void> {
    const { domain } = await prompts({
      type: 'select',
      name: 'domain',
      message: '选择要删除的配置：',
      choices: profiles.map(p => ({
        title: `${p.domain} (${p.maskedApiKey})`,
        value: p.domain,
      })),
    });

    if (!domain) return;

    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: `确定要删除 "${domain}" 吗？`,
      initial: false,
    });

    if (confirm) {
      await this.configManager.deleteProfile(domain);
      displaySuccess(`配置 "${domain}" 已删除`);
    }
  }

  /**
   * 列出所有配置
   */
  async listConfigurations(): Promise<void> {
    const profiles = await this.configManager.listProfiles();
    const config = await this.configManager.getConfig();

    displayTitle('📋 所有配置：');

    if (profiles.length === 0) {
      console.log(chalk.gray('  未找到任何配置\n'));
      return;
    }

    profiles.forEach(p => {
      const isCurrent = p.domain === config.currentProfile;
      const marker = isCurrent ? chalk.green('●') : chalk.gray('○');

      console.log(`${marker} ${chalk.bold(p.domain)}`);
      displayInfo('API Key', p.maskedApiKey);
      displayInfo('Base URL', p.baseUrl);
      displayInfo('代理', p.proxy, '(无)');
      displayInfo('禁用非必要流量', p.disableNonessentialTraffic ? '是' : '否');
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
      message: '导出到文件：',
      initial: './hop-claude-backup.json',
    });

    if (!outputPath) return;

    try {
      await backupConfig(this.configManager, outputPath);
      displaySuccess(`配置已导出到：${outputPath}`);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      displayError(`导出失败：${err.message}`);
    }
  }

  /**
   * 导入配置
   */
  async importConfiguration(): Promise<void> {
    const { inputPath } = await prompts({
      type: 'text',
      name: 'inputPath',
      message: '从文件导入：',
    });

    if (!inputPath) return;

    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: '这将替换所有现有配置。是否继续？',
      initial: false,
    });

    if (!confirm) {
      displayWarning('已取消');
      return;
    }

    try {
      await restoreConfig(this.configManager, inputPath);
      displaySuccess('配置导入成功');
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      displayError(`导入失败：${err.message}`);
    }
  }
}
