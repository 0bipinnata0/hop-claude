import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';

/**
 * 获取配置目录路径（跨平台）
 * - macOS/Linux: ~/.hop-claude-config/
 * - Windows: %APPDATA%/hop-claude-config/
 */
export function getConfigDir(): string {
  const platform = os.platform();

  if (platform === 'win32') {
    // Windows: 使用 APPDATA
    const appData = process.env.APPDATA;
    if (!appData) {
      throw new Error('APPDATA environment variable not found');
    }
    return path.join(appData, 'hop-claude-config');
  } else {
    // macOS/Linux: 使用 home 目录
    const home = os.homedir();
    return path.join(home, '.hop-claude-config');
  }
}

/**
 * 确保目录存在并设置正确的权限
 * - Unix: 0o700 (仅所有者可读写执行)
 * - Windows: 尽力而为（使用 icacls 限制权限）
 */
export async function ensureSecureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    // 目录不存在，创建它
    await fs.mkdir(dirPath, { recursive: true, mode: 0o700 });
  }

  // 在 Unix 系统上设置权限
  if (os.platform() !== 'win32') {
    await fs.chmod(dirPath, 0o700);
  } else {
    // Windows: 使用 icacls 限制权限到当前用户
    // 这是可选的，如果失败会警告用户但不会阻止操作
    try {
      const username = os.userInfo().username;
      const success = await new Promise<boolean>((resolve) => {
        const icacls = spawn('icacls', [
          dirPath,
          '/inheritance:r',
          `/grant:r`,
          `${username}:(OI)(CI)F`
        ], { shell: true });

        let stderr = '';

        icacls.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        icacls.on('exit', (code) => {
          resolve(code === 0);
        });

        icacls.on('error', () => {
          resolve(false);
        });
      });

      if (!success) {
        console.warn(`\nWarning: Failed to set secure permissions for ${dirPath}`);
        console.warn('The directory may be accessible to other users on this system.');
        console.warn('To manually secure it, run:');
        console.warn(`  icacls "${dirPath}" /inheritance:r /grant:r "${username}:(OI)(CI)F"\n`);
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.warn(`\nWarning: Could not set Windows ACL for ${dirPath}: ${err.message}`);
      console.warn('Your configuration files may not be properly secured.\n');
    }
  }
}

/**
 * 设置文件权限（仅所有者可读写）
 * - Unix: 0o600
 * - Windows: 尽力而为
 */
export async function setSecureFilePermissions(filePath: string): Promise<void> {
  if (os.platform() !== 'win32') {
    await fs.chmod(filePath, 0o600);
  }
  // Windows 文件权限继承自目录，已在 ensureSecureDirectory 中设置
}
