# Issue: 建议集成 Agent 深度绑定 + 多模型 + 全新 UI + claw-code 架构模式

## 问题背景

当前审计系统的 AI Agent 与审计软件之间是**松耦合**的：

1. **Agent 工具太少** — 只有 3 个只读工具（获取上下文、搜索知识库、获取表格摘要），无法操作审计系统的实际功能（上传、编辑表格、运行分析、导出报告、协同等）
2. **没有权限系统** — 没有工具分级、没有黑名单、没有操作确认机制
3. **只有单模型模式** — 不能自动选择最佳模型，也不能多Agent协作
4. **对话不持久化** — 刷新浏览器就丢失历史，切换会话后 Agent "失忆"
5. **模型配置死板** — 只支持 OpenAI 兼容协议，不支持阿里百炼 DashScope 原生协议
6. **没有 Hook 系统** — 无法在工具调用前后插入自定义逻辑
7. **没有文件上传** — Agent 聊天中不能直接上传 CSV/Excel/图片
8. **UI 设计保守** — 只有一种配色方案

## 参考方案

参考 [claw-code](https://github.com/ultraworkers/claw-code)（Claude Code 的开源复刻，180K+ stars）的架构：

- **Agent Harness** — Agent 深度绑定目标软件，30+ 工具覆盖全部功能
- **PermissionPolicy** — 5 级权限模式 + 黑名单(deny_names/deny_prefixes) + 工具分级
- **ToolPool** — 按权限/模式/MCP 过滤的可组装工具池
- **Hook System** — PreToolUse/PostToolUse/UserPromptSubmit/SessionStart/SessionEnd 等事件
- **TranscriptStore** — 操作流程记录与可视化

## 建议的改进方向

### 1. Agent 工具系统扩展（3 → 31 工具）
覆盖：数据上传、表格编辑(CRUD)、审计分析、三阶段审计、报告导出、历史管理、协同编辑、站内通讯、页面导航

### 2. 多模型支持
- 阿里百炼 OpenAI 兼容协议 + DashScope 原生协议双支持
- Auto 模式：自动识别任务类型路由最佳模型
- 本地模型端点自动发现（Ollama/LM Studio/vLLM）

### 3. 多Agent协作
Commander 拆解任务 → 多个专业Agent并行执行 → 结果汇总

### 4. 多会话持久化
SQLite 存储，新建/切换/删除，80 条历史上下文

### 5. Hook 系统
8 种事件类型：PreToolUse、PostToolUse、UserPromptSubmit、Stop、SessionStart、SessionEnd、PreCompact、Notification

### 6. 文件上传
拖拽 CSV/Excel/图片到 Agent 对话 → 自动解析并执行审计

### 7. 飞书 Bot 集成
接收飞书消息 → 路由到 AI Agent → 返回回复 + 卡片消息

### 8. UI 重新设计
多彩杂志风格，全局 2px 边框 + 硬阴影，所有页面统一风格

## PR

已提交 PR（包含完整实现），请查看仓库对比。
