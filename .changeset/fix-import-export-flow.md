---
"hop-claude": patch
---

修复导入/导出操作后不再启动 Claude Code

**修正**：
- 导入配置后直接退出，不再启动 Claude Code
- 导出配置后直接退出，不再启动 Claude Code
- 其他配置操作（选择、创建、编辑、删除）完成后继续正常启动

**改进**：
- 更符合用户预期的操作流程
- 避免不必要的 Claude Code 启动
