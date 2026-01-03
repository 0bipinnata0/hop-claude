---
"hop-claude": minor
---

解决参数透传冲突，支持 Claude CLI 的 -c 参数

**破坏性变更**：
- `-c, --config` 已更改为 `-m, --manage`（进入配置管理模式）

**新功能**：
- 现在 `-c` 参数可以正确透传给 Claude CLI（用于继续上次对话）
- 支持 `--` 分隔符来明确区分 hop-claude 参数和 Claude 参数

**使用示例**：
```bash
# 进入配置管理（原 -c 改为 -m）
hop-claude -m

# 继续上次对话（-c 透传给 Claude）
hop-claude -c

# 使用 -- 分隔符（推荐，更明确）
hop-claude -- -c
hop-claude -s myprofile -- -c --verbose

# 切换配置后继续对话
hop-claude -s myprofile -c
```

**迁移指南**：
如果你之前使用 `hop-claude -c` 进入配置管理，现在需要改为 `hop-claude -m`
