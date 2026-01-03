---
"hop-claude": minor
---

智能交互模式检测：改进参数透传体验

**新功能**：

1. **智能模式检测**：
   - 有透传参数（如 -c, -r）→ 静默模式：直接使用当前配置启动 Claude
   - 无透传参数 → 交互模式：显示配置管理界面

2. **改进的用户体验**：
   - `npx hop-claude -c` 现在直接启动，无需手动选择配置
   - `npx hop-claude -r "test"` 直接透传参数给 Claude
   - 保持向后兼容：`npx hop-claude` 仍显示交互界面

3. **优化的错误提示**：
   - 无配置时的友好错误信息
   - 清晰的使用引导

**使用示例**：

```bash
# 静默模式（新）
npx hop-claude -c                    # 直接启动
npx hop-claude -r "解释代码"          # 直接透传参数

# 交互模式（不变）
npx hop-claude                       # 显示配置界面
npx hop-claude -m                    # 进入管理模式

# 组合使用
npx hop-claude -s prod -c           # 切换配置并启动
```

**向后兼容**：
- 所有现有命令行为保持不变
- 新增的智能检测不会破坏现有工作流
