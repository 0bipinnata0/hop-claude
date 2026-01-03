import { spawn } from 'child_process';
import which from 'which';
import type { DecryptedProfile, EnvironmentVariables } from '../types/index.js';

/**
 * 获取 Claude CLI 可执行文件路径
 * 跨平台检测，支持 Windows 的 .cmd 和 .exe 扩展名
 */
function getClaudeBinary(): string {
  // Unix 系统直接返回 'claude'
  if (process.platform !== 'win32') {
    return 'claude';
  }

  // Windows 系统：尝试多个变体
  const variants = ['claude.cmd', 'claude.exe', 'claude'];

  for (const variant of variants) {
    try {
      const resolved = which.sync(variant, { nothrow: true });
      if (resolved) {
        return variant;
      }
    } catch {
      // 继续尝试下一个
    }
  }

  // 如果都找不到，返回默认值（会在后续报错）
  return 'claude';
}

/**
 * 启动 Claude CLI 并应用配置
 * @param profile 配置 profile
 * @param args 透传给 claude 的参数
 */
export async function launchClaude(
  profile: DecryptedProfile,
  args: string[] = []
): Promise<void> {
  // 构建环境变量
  const env: EnvironmentVariables = {
    ...process.env,
    ANTHROPIC_AUTH_TOKEN: profile.apiKey,
  };

  if (profile.baseUrl) {
    env.ANTHROPIC_BASE_URL = profile.baseUrl;
  }

  if (profile.proxy) {
    env.HTTP_PROXY = profile.proxy;
    env.HTTPS_PROXY = profile.proxy;
  }

  if (profile.disableNonessentialTraffic) {
    env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1';
  }

  // 启动 claude CLI
  // 注意：不使用 shell: true 以防止命令注入攻击
  const command = getClaudeBinary();
  const claude = spawn(command, args, {
    env: env as NodeJS.ProcessEnv,
    stdio: 'inherit', // 继承父进程的 stdio
  });

  // 处理退出
  claude.on('exit', (code) => {
    process.exit(code || 0);
  });

  // 处理错误
  claude.on('error', (error) => {
    console.error('启动 Claude 失败：', error.message);
    console.error('\n请确保 Claude CLI 已安装并在 PATH 中可用。');
    console.error('安装地址：https://github.com/anthropics/claude-code');
    process.exit(1);
  });
}
