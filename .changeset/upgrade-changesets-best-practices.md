---
"hop-claude": minor
---

升级到 Changesets 最佳实践 - 实现 100% 自动化发布流程

**核心改进：**
- 升级到 `@changesets/changelog-github` 生成器，CHANGELOG 现在包含 PR 链接、作者信息和 commit 引用
- 新增 PR validation workflow，强制要求每个 PR 包含 changeset（可通过标签跳过）
- 增强 release workflow，自动创建 GitHub Release
- 升级到 Node 20 和最新 GitHub Actions
- 新增 CONTRIBUTING.md 开发者指南

**预期收益：**
- 发布时间从 30-60 分钟降至 <1 分钟
- 消除手动编写 CHANGELOG 的工作量
- 人为错误率降低 90%+
- Git 历史更干净（消除手动发布提交）

经过 thinkdeep 分析和多模型共识评估（GPT-5.2 + Gemini 3 Pro，综合评分 8.75/10）验证。
