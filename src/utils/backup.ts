import fs from 'fs/promises';
import path from 'path';
import { ConfigManager } from '../config/config-manager.js';

/**
 * 导出配置到文件
 * @param configManager 配置管理器
 * @param outputPath 输出文件路径
 */
export async function backupConfig(
  configManager: ConfigManager,
  outputPath: string
): Promise<void> {
  const configData = await configManager.exportConfig();

  // 确保输出目录存在
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });

  // 写入配置文件
  await fs.writeFile(outputPath, configData, 'utf8');
}

/**
 * 从文件导入配置
 * @param configManager 配置管理器
 * @param inputPath 输入文件路径
 */
export async function restoreConfig(
  configManager: ConfigManager,
  inputPath: string
): Promise<void> {
  // 读取配置文件
  const configData = await fs.readFile(inputPath, 'utf8');

  // 导入配置
  await configManager.importConfig(configData);
}
