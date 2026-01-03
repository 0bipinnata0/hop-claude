import { Command } from 'commander';
import { ConfigManager } from './config/config-manager.js';
import { InteractiveUI } from './ui/prompts.js';
import { launchClaude } from './utils/claude-launcher.js';
import { displayError, displaySuccess } from './ui/display.js';
import { backupConfig, restoreConfig } from './utils/backup.js';
import { EncryptionMigration } from './utils/migration.js';
import pkg from '../package.json' with { type: 'json' };

/**
 * 创建 CLI 程序
 */
export async function createCLI() {
  const program = new Command();
  const configManager = new ConfigManager();
  const ui = new InteractiveUI(configManager);

  program
    .name('hop-claude')
    .version(pkg.version)
    .description('Claude Code 配置管理和启动工具')
    .option('-c, --config', '进入配置管理模式')
    .option('-l, --list', '列出所有配置')
    .option('-s, --switch [profile]', '切换到指定配置（不提供名称则显示选择列表）')
    .option('-e, --export <file>', '导出配置到文件')
    .option('-i, --import <file>', '从文件导入配置')
    .option('--migrate-encryption', '迁移到不同的加密模式')
    .option('--encryption-info', '显示当前加密模式信息')
    .allowUnknownOption(true) // 允许未知选项（用于透传给 claude）
    .action(async (options) => {
      try {
        // 加密模式迁移
        if (options.migrateEncryption) {
          const migration = new EncryptionMigration(configManager);
          await migration.migrate();
          return;
        }

        // 显示加密模式信息
        if (options.encryptionInfo) {
          const migration = new EncryptionMigration(configManager);
          await migration.showEncryptionInfo();
          return;
        }
        // 列出配置
        if (options.list) {
          await ui.listConfigurations();
          return;
        }

        // 快速切换 profile
        if (options.switch !== undefined) {
          // 如果提供了配置名称，直接切换
          if (typeof options.switch === 'string' && options.switch.trim()) {
            const profile = await configManager.getProfile(options.switch);
            if (!profile) {
              displayError(`未找到配置 "${options.switch}"`);
              process.exit(1);
            }
            await configManager.setCurrentProfile(options.switch);
            displaySuccess(`已切换到：${options.switch}`);

            // 如果有透传参数，继续启动 claude
            const claudeArgs = getClaudeArgs(process.argv);
            if (claudeArgs.length > 0) {
              await launchClaude(profile, claudeArgs);
            }
            return;
          }

          // 如果没有提供配置名称，显示交互式选择列表
          const profiles = await configManager.listProfiles();
          if (profiles.length === 0) {
            displayError('没有可用的配置');
            process.exit(1);
          }

          await ui.selectProfile(profiles);

          // 如果有透传参数，继续启动 claude
          const claudeArgs = getClaudeArgs(process.argv);
          if (claudeArgs.length > 0) {
            const currentProfile = await configManager.getCurrentProfile();
            if (currentProfile) {
              await launchClaude(currentProfile, claudeArgs);
            }
          }
          return;
        }

        // 导出配置
        if (options.export) {
          await backupConfig(configManager, options.export);
          displaySuccess(`配置已导出到：${options.export}`);
          return;
        }

        // 导入配置
        if (options.import) {
          await restoreConfig(configManager, options.import);
          displaySuccess('配置导入成功');
          return;
        }

        // 强制进入配置模式
        if (options.config) {
          const shouldContinue = await ui.manageConfiguration();
          if (!shouldContinue) {
            return; // 导入/导出等操作后直接退出
          }
          // 如果是其他操作（选择、创建、编辑），继续启动 Claude
        }

        // 正常流程：显示当前配置 + 询问是否修改
        const shouldContinue = await ui.showCurrentAndAsk();

        if (!shouldContinue) {
          // 用户选择退出
          return;
        }

        // 获取当前配置并启动 claude
        const currentProfile = await configManager.getCurrentProfile();

        if (!currentProfile) {
          displayError('未选择配置');
          process.exit(1);
        }

        // 获取透传参数
        const claudeArgs = getClaudeArgs(process.argv);

        // 启动 claude
        await launchClaude(currentProfile, claudeArgs);

      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        displayError(err.message);

        // 在 DEBUG 模式下显示完整的堆栈跟踪
        if (process.env.DEBUG) {
          console.error('\n堆栈跟踪：');
          console.error(err.stack);
        }

        process.exit(1);
      }
    });

  return program;
}

/**
 * 获取需要透传给 claude 的参数
 * 过滤掉 cproxy 自己的参数
 */
function getClaudeArgs(argv: string[]): string[] {
  const cproxyFlags = [
    '-c', '--config',
    '-l', '--list',
    '-s', '--switch',
    '-e', '--export',
    '-i', '--import',
    '-v', '--version',
    '-h', '--help',
    '--migrate-encryption',
    '--encryption-info'
  ];
  const result: string[] = [];
  let skip = false;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (skip) {
      skip = false;
      continue;
    }

    // 跳过 cproxy 的选项
    if (cproxyFlags.includes(arg)) {
      // 如果是需要值的选项，跳过下一个参数
      if (['-s', '--switch', '-e', '--export', '-i', '--import'].includes(arg)) {
        skip = true;
      }
      continue;
    }

    // 其他所有参数都透传
    result.push(arg);
  }

  return result;
}
