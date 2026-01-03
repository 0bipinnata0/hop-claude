# hop-claude

Claude Code 配置管理工具 - 轻松管理多个 Claude Code 中转站配置

## ⚠️ 重要更新 v0.1.0

**安全更新和新功能**（2025-01-03）：

🔒 **关键安全修复**：
- 修复命令注入漏洞（CRITICAL）
- 新增文件锁防止并发写入损坏
- 改进 Windows 二进制检测

🆕 **新增加密模式**：
- **Keychain 模式**（推荐）：使用 OS keychain 存储，最高安全性
- **Passphrase 模式**：支持跨机器迁移的密码加密
- **迁移工具**：从 v0.0.x Legacy 模式轻松迁移

📖 **建议操作**：
```bash
# 查看当前加密模式
hop-claude --encryption-info

# 如果使用 Legacy 模式，建议迁移
hop-claude --migrate-encryption
```

详情查看 [SECURITY.md](./SECURITY.md)

---

## 特性

- 🔐 **多模式加密存储** - 支持 Keychain（OS 管理）、Passphrase（可移植）、Legacy（兼容）三种加密模式
- 🔒 **OS Keychain 集成** - macOS Keychain、Windows Credential Manager、Linux libsecret 硬件级安全
- 🔄 **多配置管理** - 支持多个配置 profile，按 domain 区分
- 🎯 **交互式界面** - 友好的命令行交互体验
- ⚡ **快速切换** - 一键切换不同的配置环境
- 🌍 **跨平台支持** - macOS、Linux、Windows 全平台支持
- 📦 **配置备份/恢复** - 轻松导出和导入配置
- ✅ **API Key 验证** - 可选的 API Key 有效性验证
- 🚀 **自动启动 Claude** - 应用配置后自动启动 Claude CLI
- 🛡️ **安全防护** - 防命令注入、并发写保护、权限控制
- 🔄 **加密模式迁移** - 轻松在不同加密模式间迁移

## 安装

### 使用 npx（无需安装）

如果你不想全局安装，可以直接使用 npx 运行：

```bash
npx hop-claude
```

这种方式会临时下载并执行 hop-claude，无需永久安装。适合临时使用或测试。

所有命令都支持 npx 方式：

```bash
# 查看帮助
npx hop-claude --help

# 列出所有配置
npx hop-claude --list

# 配置管理
npx hop-claude --config

# 快速切换并启动
npx hop-claude -s production
```

**注意**：首次运行时 npx 会下载包，后续运行会使用缓存，速度更快。

### 使用 npm（全局安装）

```bash
npm install -g hop-claude
```

### 使用 bun（全局安装）

```bash
bun add -g hop-claude
```

### 从源码安装

```bash
git clone https://github.com/0bipinnata0/hop-claude.git
cd hop-claude
bun install
bun run build
bun link
```

## 快速开始

### 首次使用

运行 `hop-claude` 会进入交互式配置界面：

```bash
hop-claude
```

按照提示创建你的第一个配置：

1. 输入 Domain/Profile 名称（如：production, dev）
2. 输入 API Key
3. 输入 Base URL（可选，用于中转站）
4. 输入 Proxy（可选）
5. 选择是否禁用非必要流量

### 使用现有配置启动 Claude

配置完成后，再次运行 `hop-claude` 将直接启动 Claude：

```bash
hop-claude
```

### 透传参数给 Claude

所有 hop-claude 未识别的参数都会透传给 Claude CLI：

```bash
# 使用当前配置启动 Claude 并透传参数
hop-claude -r "Explain this code"

# 快速切换配置并启动
hop-claude -s production -r "Deploy to production"
```

## 命令参考

### 基本命令

```bash
hop-claude                    # 显示当前配置并启动 Claude
hop-claude --help             # 显示帮助信息
hop-claude --version          # 显示版本号
```

### 配置管理

```bash
hop-claude --config           # 进入配置管理界面
hop-claude --list             # 列出所有配置
hop-claude -s <profile>       # 快速切换到指定配置
```

### 配置导入/导出

```bash
hop-claude -e backup.json     # 导出配置到文件
hop-claude -i backup.json     # 从文件导入配置
```

### 加密模式管理

```bash
hop-claude --encryption-info     # 查看当前加密模式信息
hop-claude --migrate-encryption  # 迁移到不同的加密模式
```

**加密模式说明**：

- **Keychain 模式**（推荐）⭐：使用 OS 管理的 keychain 存储 API Key，最高安全性
  - macOS: Keychain Access
  - Windows: Credential Manager
  - Linux: libsecret

- **Passphrase 模式**：使用用户密码加密，支持跨机器迁移
  - AES-256-GCM 加密
  - PBKDF2 密钥派生（100,000 次迭代）
  - 需要记住密码

- **Legacy 模式**（已弃用）：基于机器信息的加密，向后兼容 v0.0.x
  - 不推荐新用户使用
  - 建议迁移到 Keychain 或 Passphrase 模式

## 配置项说明

每个配置 profile 包含以下信息：

| 配置项 | 说明 | 必填 |
|--------|------|------|
| Domain | 配置名称/标识 | ✅ |
| API Key | Anthropic API 密钥 | ✅ |
| Base URL | 自定义 API 地址（中转站） | ❌ |
| Proxy | HTTP/HTTPS 代理 | ❌ |
| Disable Nonessential Traffic | 是否禁用非必要流量 | ❌ |

## 使用场景

### 场景 1：管理多个中转站

```bash
# 创建生产环境配置
hop-claude --config
> Create new configuration
> Domain: production
> API Key: sk-ant-***
> Base URL: https://api.example.com

# 创建开发环境配置
hop-claude --config
> Create new configuration
> Domain: development
> API Key: sk-ant-***
> Base URL: https://dev-api.example.com

# 快速切换
hop-claude -s production    # 切换到生产环境
hop-claude -s development   # 切换到开发环境
```

### 场景 2：备份和恢复配置

```bash
# 导出配置（用于备份或迁移）
hop-claude -e my-backup.json

# 在另一台机器上恢复配置
hop-claude -i my-backup.json
```

### 场景 3：验证 API Key

创建配置时，可以选择验证 API Key 是否有效：

```bash
hop-claude --config
> Create new configuration
> ...
> Validate API Key? Yes
```

## 安全说明

hop-claude 提供多层安全保护，确保您的 API Key 安全。详细安全策略请查看 [SECURITY.md](./SECURITY.md)。

### 加密模式

hop-claude 支持三种加密模式，安全性从高到低：

#### 1. Keychain 模式（推荐）⭐

**安全级别：HIGH**

- API Key 存储在 OS 管理的 keychain
- 密钥永不写入磁盘明文
- 使用硬件支持的加密（可用时）
- 无需记住密码
- **限制**：不可跨机器迁移

#### 2. Passphrase 模式

**安全级别：MEDIUM to HIGH**（取决于密码强度）

- 使用 AES-256-GCM 加密
- PBKDF2 密钥派生（100,000 次迭代）
- 完全可移植跨机器
- **限制**：需要记住密码，密码强度很重要

#### 3. Legacy 模式（已弃用）

**安全级别：LOW**

- 基于机器信息（hostname + username）的加密
- 仅提供混淆，非真正安全
- 向后兼容 v0.0.x
- **限制**：已弃用，建议迁移

### 安全防护

✅ **防止意外泄露**
- API Key 不会出现在 git commits
- 终端显示时部分隐藏（如：`sk-ant-***xyz`）
- 进程列表中不可见

✅ **文件系统保护**
- 配置目录权限：0700（Unix）或限制 ACL（Windows）
- 配置文件权限：0600（Unix）
- 加密存储防止随意浏览

✅ **防命令注入**
- 已修复 v0.0.x 中的命令注入漏洞
- 安全的子进程调用（无 shell 解释）

✅ **并发写保护**
- 文件锁防止数据损坏
- 支持多终端会话同时运行

### 不防护的场景

❌ **Root/Admin 访问**：本地 root 用户可访问任何文件
❌ **内存检查**：API Key 使用时存在于内存
❌ **物理访问**：未锁定的机器易受攻击
❌ **恶意软件**：受感染的机器上所有数据都有风险

### 最佳实践

**Keychain 模式用户**：
1. ✅ 启用全盘加密（FileVault、BitLocker、LUKS）
2. ✅ 使用强机器登录密码
3. ✅ 离开时锁屏（建议自动锁定）

**Passphrase 模式用户**：
1. ✅ 使用强密码（≥12 字符，混合大小写、符号）
2. ✅ 考虑使用密码管理器
3. ✅ 不要将加密配置提交到公开仓库

**所有用户**：
1. ✅ 运行 `hop-claude --encryption-info` 验证当前模式
2. ✅ 从 Legacy 模式迁移：`hop-claude --migrate-encryption`
3. ✅ 定期轮换 API Key（建议每 90 天）

### 迁移指南

从 v0.0.x 迁移到 v0.1.0+：

```bash
# 1. 备份配置
hop-claude -e backup-before-migration.json

# 2. 运行迁移
hop-claude --migrate-encryption

# 3. 选择 Keychain（最安全）或 Passphrase（可移植）

# 4. 验证迁移
hop-claude --encryption-info
```

### 测试覆盖

- ✅ 31 个安全和功能测试
- ✅ 防命令注入测试
- ✅ 加密算法测试
- ✅ 并发访问测试
- ✅ 跨加密模式迁移测试

### 文件权限

- **配置目录**：
  - Unix: `~/.hop-claude-config/` (权限: 0700)
  - Windows: `%APPDATA%/hop-claude-config/`
- **配置文件**：`config.json` (权限: 0600，仅所有者可读写)

### 敏感信息保护

- API Key 在终端显示时部分隐藏（如：`sk-ant-***xyz`）
- 输入 API Key 时使用密码模式（不显示）
- 配置文件中的 API Key 已加密存储

## 配置文件位置

- **macOS/Linux**: `~/.hop-claude-config/config.json`
- **Windows**: `%APPDATA%/hop-claude-config/config.json`

## 故障排除

### Claude CLI 未找到

如果出现 "Failed to launch claude" 错误：

1. 确保已安装 Claude CLI：
   ```bash
   # 检查是否已安装
   claude --version
   ```

2. 如未安装，访问：https://github.com/anthropics/claude-code

3. Windows 用户：确保 Claude CLI 在 PATH 中（支持 claude.cmd、claude.exe）

### 配置文件损坏

如果配置文件损坏，可以手动删除并重新创建：

```bash
# macOS/Linux
rm -rf ~/.hop-claude-config

# Windows
rmdir /s %APPDATA%\hop-claude-config
```

### API Key 验证失败

如果验证失败但 API Key 确实有效：

1. 检查网络连接
2. 检查 Base URL 是否正确
3. 如使用代理，确保代理设置正确
4. 选择 "Continue anyway" 跳过验证

### 加密模式问题

**忘记 Passphrase 密码**：
- 无法恢复，需要重新配置 API Key
- 如有备份文件，可以尝试导入

**Keychain 不可用**：
```bash
# 检查 keychain 状态
hop-claude --encryption-info

# 如不可用，迁移到 Passphrase 模式
hop-claude --migrate-encryption
```

**从 v0.0.x 迁移**：
```bash
# 查看当前模式（如果是 Legacy 模式，建议迁移）
hop-claude --encryption-info

# 执行迁移（会自动备份）
hop-claude --migrate-encryption
```

**迁移失败恢复**：
```bash
# 手动恢复备份
# macOS/Linux:
cp ~/.hop-claude-config/config.json.backup-TIMESTAMP ~/.hop-claude-config/config.json

# Windows:
copy %APPDATA%\hop-claude-config\config.json.backup-TIMESTAMP %APPDATA%\hop-claude-config\config.json

# 或使用导入命令
hop-claude -i backup-before-migration.json
```

## 开发

### 环境要求

- Node.js 18+
- Bun 或 npm

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/0bipinnata0/hop-claude.git
cd hop-claude

# 安装依赖
bun install

# 开发模式运行
bun run dev

# 编译
bun run build

# 运行测试
bun test

# 本地链接（用于测试）
bun link
```

### 测试

项目包含全面的测试套件（31 个测试）：

```bash
# 运行所有测试
bun test

# 运行特定测试文件
bun test test/security.test.ts
bun test test/concurrent.test.ts
bun test test/migration.test.ts

# 查看测试覆盖
bun test --coverage
```

测试覆盖：
- ✅ 安全性测试（防命令注入、加密算法、文件权限）
- ✅ 并发访问测试（文件锁、竞争条件）
- ✅ 加密迁移测试（Legacy ↔ Keychain ↔ Passphrase）
- ✅ 边缘情况测试（特殊字符、空配置、错误密码）

### 项目结构

```
hop-claude/
├── src/
│   ├── cli.ts                   # CLI 命令定义
│   ├── index.ts                 # 主入口
│   ├── config/
│   │   ├── config-manager.ts    # 配置管理核心（多模式加密支持）
│   │   ├── encryption.ts        # Legacy 加密/解密
│   │   ├── encryption-v2.ts     # Passphrase 加密/解密
│   │   ├── keychain.ts          # OS Keychain 集成
│   │   ├── storage.ts           # 文件存储（含文件锁）
│   │   └── validator.ts         # API Key 验证
│   ├── ui/
│   │   ├── prompts.ts           # 交互式界面
│   │   └── display.ts           # 显示工具
│   ├── utils/
│   │   ├── claude-launcher.ts   # Claude 启动器（安全子进程调用）
│   │   ├── backup.ts            # 备份/恢复
│   │   ├── migration.ts         # 加密模式迁移工具
│   │   └── platform.ts          # 跨平台支持
│   └── types/
│       └── index.ts             # TypeScript 类型
├── test/
│   ├── security.test.ts         # 安全性测试
│   ├── concurrent.test.ts       # 并发访问测试
│   └── migration.test.ts        # 加密迁移测试
├── bin/
│   └── cli.js                   # CLI 可执行入口
└── dist/                        # 编译输出
```

## 版本历史

### v0.1.0（2025-01-03）

**安全更新**：
- ✅ 修复命令注入漏洞（CRITICAL）- 移除 shell:true，安全子进程调用
- ✅ 改进错误处理和类型安全（error: any → error: unknown）
- ✅ 新增文件锁防止并发写入数据损坏
- ✅ 改进 Windows 二进制检测（支持 claude.cmd、claude.exe）
- ✅ 增强 Windows ACL 错误处理

**新功能**：
- ✅ Keychain 加密模式（macOS Keychain、Windows Credential Manager、Linux libsecret）
- ✅ Passphrase 加密模式（AES-256-GCM + PBKDF2）
- ✅ 加密模式迁移工具（`--migrate-encryption`）
- ✅ 加密信息查看（`--encryption-info`）
- ✅ 会话密码缓存（Passphrase 模式便利功能）

**测试**：
- ✅ 31 个测试覆盖安全、并发、迁移场景
- ✅ 99 个断言确保代码质量

**文档**：
- ✅ 完整 SECURITY.md 文档
- ✅ 更新 README 包含所有新特性
- ✅ 迁移指南和最佳实践

### v0.0.x

- 初始版本
- 基本配置管理功能
- Legacy 加密模式（已弃用）

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 相关链接

- [Claude Code](https://github.com/anthropics/claude-code) - 官方 Claude CLI
- [Anthropic API](https://docs.anthropic.com/) - API 文档
- [SECURITY.md](./SECURITY.md) - 完整安全策略文档
- [Issues](https://github.com/0bipinnata0/hop-claude/issues) - 报告问题或建议

## 安全披露

如发现安全漏洞，请查看 [SECURITY.md](./SECURITY.md) 了解报告流程。
