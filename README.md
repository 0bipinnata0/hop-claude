# hop-claude

Claude Code 配置管理工具 - 轻松管理多个 Claude Code 中转站配置

## ⚠️ 重要更新 v2.0.0

**重大更新**（2025-01-03）：

🔒 **移除 Legacy 加密模式**：
- 完全移除不安全的 Legacy 加密模式
- 现在只支持 Keychain 和密码加密两种模式
- 新安装自动选择最佳加密模式

⚠️ **破坏性变更**：
- `-c/--config` 参数更改为 `-m/--manage`
- `-c` 现在可以透传给 Claude CLI（用于继续上次对话）
- 支持 `--` 分隔符来明确区分参数

✨ **新功能和改进**：
- 支持空密码快速启动（密码加密模式）
- 自动密码提示，更友好的交互体验
- 导入/导出操作后不再自动启动 Claude
- `-s` 不提供配置名时显示交互式选择列表
- **智能交互模式**：有透传参数时自动静默启动，无参数时显示配置界面

📖 **建议操作**：
```bash
# 查看当前加密模式
hop-claude --encryption-info

# 首次使用会自动引导配置
hop-claude

# 快速启动（静默模式）
hop-claude -c
```

详情查看 [SECURITY.md](./SECURITY.md)

---

## 特性

- 🔐 **双模式加密存储** - Keychain（OS 管理）和密码加密（可移植）两种模式
- 🔒 **OS Keychain 集成** - macOS Keychain、Windows Credential Manager、Linux libsecret 硬件级安全
- 🔄 **多配置管理** - 支持多个配置 profile，按 domain 区分
- 🎯 **交互式界面** - 友好的命令行交互体验
- ⚡ **快速切换** - 一键切换不同的配置环境
- 🌍 **跨平台支持** - macOS、Linux、Windows 全平台支持
- 📦 **配置备份/恢复** - 轻松导出和导入配置
- ✅ **API Key 验证** - 可选的 API Key 有效性验证
- 🚀 **自动启动 Claude** - 应用配置后自动启动 Claude CLI
- 🛡️ **安全防护** - 防命令注入、并发写保护、权限控制
- 🔄 **参数透传** - 支持 `-c` 和 `--` 分隔符透传参数给 Claude
- 🧠 **智能交互模式** - 自动检测透传参数，静默或交互式启动

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
npx hop-claude --manage

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
2. 输入 API Key（对应环境变量 ANTHROPIC_AUTH_TOKEN）
3. 输入 Base URL（可选，用于中转站，对应 ANTHROPIC_BASE_URL）
4. 输入 Proxy（可选）
5. 选择是否禁用非必要流量

**密码加密模式用户**：
- 创建配置时可以直接回车使用空密码（快速启动）
- 也可以设置密码保护（推荐 ≥8 字符）
- 启动时自动尝试空密码，失败才提示输入

### 使用现有配置启动 Claude

配置完成后，再次运行 `hop-claude` 将直接启动 Claude：

```bash
hop-claude
```

### 透传参数给 Claude

**智能检测模式**：hop-claude 会自动检测是否有透传参数：
- 有透传参数 → 静默启动：直接使用当前配置启动 Claude，无交互
- 无透传参数 → 交互模式：显示配置管理界面

#### 方式 1：直接透传（推荐）

```bash
# -c 现在可以直接透传给 Claude（继续上次对话）
hop-claude -c                      # 静默启动，不显示配置界面

# 透传其他参数
hop-claude -r "Explain this code"  # 静默启动，传入 -r 参数
```

#### 方式 2：使用 -- 分隔符（更明确）

```bash
# 使用 -- 明确分隔 hop-claude 参数和 Claude 参数
hop-claude -- -c

# 切换配置后透传参数
hop-claude -s production -- -c --verbose
```

#### 交互模式

如果不提供任何透传参数，会显示配置管理界面：

```bash
hop-claude          # 显示当前配置，询问是否修改
hop-claude -m       # 进入配置管理模式
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
hop-claude -m                 # 进入配置管理界面（原 -c）
hop-claude --manage           # 同上（长选项）
hop-claude -l                 # 列出所有配置
hop-claude --list             # 同上（长选项）
hop-claude -s <profile>       # 快速切换到指定配置
hop-claude -s                 # 不提供名称时显示交互式选择列表
```

### 配置导入/导出

```bash
hop-claude -e backup.json     # 导出配置到文件
hop-claude -i backup.json     # 从文件导入配置
```

**注意**：导入/导出操作完成后会直接退出，不再启动 Claude。

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
  - 无需记住密码
  - **限制**：不可跨机器迁移

- **密码加密模式**：使用密码加密，支持跨机器迁移
  - AES-256-GCM 加密
  - PBKDF2 密钥派生（100,000 次迭代）
  - 支持空密码快速启动
  - 完全可移植跨机器

## 配置项说明

每个配置 profile 包含以下信息：

| 配置项 | 说明 | 对应环境变量 | 必填 |
|--------|------|-------------|------|
| Domain | 配置名称/标识 | - | ✅ |
| API Key | Anthropic API 密钥 | ANTHROPIC_AUTH_TOKEN | ✅ |
| Base URL | 自定义 API 地址（中转站） | ANTHROPIC_BASE_URL | ❌ |
| Proxy | HTTP/HTTPS 代理 | HTTP_PROXY / HTTPS_PROXY | ❌ |
| Disable Nonessential Traffic | 是否禁用非必要流量 | CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC | ❌ |

## 使用场景

### 场景 1：管理多个中转站

```bash
# 创建生产环境配置
hop-claude -m
> Create new configuration
> Domain: production
> API Key: sk-ant-***
> Base URL: https://api.example.com

# 创建开发环境配置
hop-claude -m
> Create new configuration
> Domain: development
> API Key: sk-ant-***
> Base URL: https://dev-api.example.com

# 快速切换
hop-claude -s production    # 切换到生产环境
hop-claude -s development   # 切换到开发环境

# 不记得配置名？显示选择列表
hop-claude -s
```

### 场景 2：备份和恢复配置

```bash
# 导出配置（用于备份或迁移）
hop-claude -e my-backup.json

# 在另一台机器上恢复配置
hop-claude -i my-backup.json
```

### 场景 3：继续上次对话（静默模式）

```bash
# 方式 1：直接透传 -c（推荐）
hop-claude -c                # 静默启动，直接继续对话，无交互

# 方式 2：使用 -- 分隔符（更明确）
hop-claude -- -c

# 切换配置后继续对话
hop-claude -s production -c  # 切换后静默启动
hop-claude -s production -- -c

# 传入其他参数
hop-claude -r "解释这段代码"  # 静默启动，传入 -r 参数
```

## 安全说明

hop-claude 提供多层安全保护，确保您的 API Key 安全。详细安全策略请查看 [SECURITY.md](./SECURITY.md)。

### 加密模式

hop-claude 支持两种加密模式：

#### 1. Keychain 模式（推荐）⭐

**安全级别：HIGH**

- API Key 存储在 OS 管理的 keychain
- 密钥永不写入磁盘明文
- 使用硬件支持的加密（可用时）
- 无需记住密码
- **限制**：不可跨机器迁移

#### 2. 密码加密模式

**安全级别：MEDIUM to HIGH**（取决于密码强度）

- 使用 AES-256-GCM 加密
- PBKDF2 密钥派生（100,000 次迭代）
- 完全可移植跨机器
- 支持空密码快速启动
- **限制**：需要记住密码，密码强度很重要

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
- 安全的子进程调用（无 shell 解释）
- 所有参数正确转义

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

**密码加密模式用户**：
1. ✅ 如需安全，使用强密码（≥8 字符，混合大小写、符号）
2. ✅ 如需便利，可使用空密码（直接回车）
3. ✅ 考虑使用密码管理器
4. ✅ 不要将加密配置提交到公开仓库

**所有用户**：
1. ✅ 运行 `hop-claude --encryption-info` 验证当前模式
2. ✅ 定期轮换 API Key（建议每 90 天）

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

**忘记密码**：
- 无法恢复，需要重新配置 API Key
- 如有备份文件，可以尝试导入

**Keychain 不可用**：
```bash
# 检查 keychain 状态
hop-claude --encryption-info

# 如不可用，迁移到密码加密模式
hop-claude --migrate-encryption
```

**空密码解密失败**：
```bash
# 启动时会自动提示输入密码
hop-claude

# 如果一直提示输入密码，说明你设置了非空密码
# 需要输入正确密码
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
- ✅ 加密迁移测试（Keychain ↔ Passphrase）
- ✅ 边缘情况测试（特殊字符、空配置、错误密码）

### 项目结构

```
hop-claude/
├── src/
│   ├── cli.ts                   # CLI 命令定义
│   ├── index.ts                 # 主入口
│   ├── config/
│   │   ├── config-manager.ts    # 配置管理核心（双模式加密支持）
│   │   ├── encryption-v2.ts     # 密码加密/解密（AES-256-GCM）
│   │   ├── keychain.ts          # OS Keychain 集成
│   │   ├── storage.ts           # 文件存储（含文件锁）
│   │   └── validator.ts         # API Key 验证
│   ├── ui/
│   │   ├── prompts.ts           # 交互式界面（含自动密码提示）
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

详细的版本历史请参阅 [CHANGELOG.md](./CHANGELOG.md)。

### v3.2.1（2025-01-03）

**Bug 修复**：
- ✅ 修复 Commander.js 参数解析错误（"error: too many arguments"）
  - 添加 `.arguments('[args...]')` 支持参数透传
  - 所有透传命令（`-c`, `-r` 等）现在正常工作

### v3.2.0（2025-01-03）

**新功能**：
- ✅ **智能交互模式检测**：有透传参数时自动静默启动，无参数时显示配置界面
  - `hop-claude -c` 直接启动，无需手动选择配置
  - `hop-claude -r "test"` 直接透传参数给 Claude
  - 保持向后兼容：`hop-claude` 仍显示交互界面

### v3.1.0（2025-01-03）

**改进**：
- ✅ 优化配置流程：连接方式优先，同屏展开体验
- ✅ 配置名称自动生成默认值（"官方"或"自定义中转"）

### v3.0.0（2025-01-03）

**破坏性变更**：
- ✅ 字段重命名：`domain` → `name`（配置名称）
- ✅ 文案优化：移除"域名"概念，改为"配置名称"

### v2.0.0（2025-01-03）

**破坏性变更**：
- ✅ 移除 Legacy 加密模式（不安全的机器绑定加密）
- ✅ `-c/--config` 更改为 `-m/--manage`（避免与 Claude CLI 的 `-c` 冲突）

**新功能**：
- ✅ `-c` 现在可以透传给 Claude CLI（继续上次对话）
- ✅ 支持 `--` 分隔符明确区分参数
- ✅ `-s` 不提供配置名时显示交互式选择列表
- ✅ 自动密码提示（密码加密模式）
- ✅ 支持空密码快速启动
- ✅ 导入/导出后不再自动启动 Claude

**改进**：
- ✅ 更友好的密码输入体验（先尝试空密码）
- ✅ 简化加密模式选择（只有两种模式）
- ✅ 更清晰的用户界面和错误提示
- ✅ 优化参数透传逻辑，更符合用户直觉

### v0.1.0（2025-01-03）

**安全更新**：
- ✅ 修复命令注入漏洞（CRITICAL）
- ✅ 新增文件锁防止并发写入
- ✅ 改进 Windows 二进制检测

**新功能**：
- ✅ Keychain 加密模式
- ✅ Passphrase 加密模式
- ✅ 加密模式迁移工具

### v0.0.x

- 初始版本
- 基本配置管理功能

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
