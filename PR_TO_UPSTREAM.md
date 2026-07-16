# PR: Agent-Audit 深度融合 v3.0 — 向 mm-1/mm 上游仓库合并

## 概述

本 PR 将当前仓库的 v4.0 重大升级合并到上游仓库 [mm-1/mm](https://gitee.com/mm-1/mm)。

已融合 [Yhm444/mm](https://gitee.com/Yhm444/mm) 的企业财务核算模块。

核心思路：参考 [claw-code](https://github.com/ultraworkers/claw-code)（Claude Code 开源复刻）的 Agent Harness 架构理念，将 AI Agent **深度绑定**审计系统，让 Agent 能够通过自然语言对话直接操作审计软件的所有功能。

**24 个文件变更，+4,824 行，-418 行。10 个新文件。**

---

## 主要改进

### 1. Agent 工具系统：3 → 31 个内置工具

| 分类 | 工具数 | 示例 |
|------|--------|------|
| 📤 数据上传 | 2 | `upload_files`（CSV/Excel解析+自动审计）、`import_table_data` |
| 📊 表格操作 | 8 | `list_tables`、`switch_table`、`update_cell`、`add_row`、`delete_table` |
| 🔍 审计分析 | 3 | `run_audit_analysis`、`get_rule_detail`、`get_dashboard` |
| 📋 三阶段审计 | 4 | `run_risk_assessment`、`run_control_testing`、`run_substantive_procedures`、`run_all_audit_phases` |
| 📜 历史&协同 | 5 | `list_history`、`load_history`、`create_collab_session`、`list_conversations` |
| 👤 系统 | 5 | `navigate_to`、`search_users`、`get_my_profile`、`get_unread_counts` |
| 原有保留 | 3 | `get_audit_context`、`search_knowledge`、`get_table_summary` |

### 2. 三种运行模式 + 多Agent指挥官

| 模式 | 图标 | 说明 |
|------|------|------|
| 单模型 | 👤 | 选择一个模型直接对话 |
| Auto | 🔮 | 智能识别任务类型 → 自动路由最佳模型（quick→Turbo, analysis→Plus, complex→Max, vision→VL） |
| 多Agent | 👥 | Commander 拆解任务 → 多个专业Agent并行执行 → 汇总合成 |

### 3. claw-code 架构深度集成

| claw-code 组件 | 本项目集成 |
|---|---|
| `hooks.rs` (PreToolUse/PostToolUse) | `modules/ai/hooks.py` — 8 种事件类型的 Hook 系统 |
| `ToolPermissionContext.blocks()` | `modules/ai/permission.py` — 全局黑名单 denylist |
| `ToolPool/assemble_tool_pool()` | `modules/ai/registry.py` — 按权限/模式/MCP 过滤的工具池 |
| `TranscriptStore` / `TurnResult` | Agent 工作台操作流程图 — 可展开查看每步参数和结果 |

### 4. 多模型系统 — 支持阿里百炼/DashScope

- **12 个模型配置** — 覆盖百炼(兼容模式+DashScope原生)、DeepSeek、OpenAI、Ollama
- **双边协议支持** — OpenAI 兼容协议 + DashScope 原生 `text-generation/generation` API
- **Auto 模式** — 自动任务分类路由
- **`.env` 自动加载** — 启动时读取 API Key

### 5. 多会话管理 + 文件上传

- SQLite `agent_conversations` 表持久化，80 条消息历史
- 新建/切换/删除会话，切换后自动恢复完整上下文
- 拖拽上传 CSV/Excel/图片 → 自动 OCR 或解析审计

### 6. 全新 UI v3

- 多彩杂志风格：琥珀橙主色 + 蓝/绿/紫/玫瑰红辅助
- 全局 2px 边框 + 硬阴影卡片系统
- 自适应输入框 + 附件预览
- 所有页面同步风格

---

### v4.1 — 融合 Yhm444/mm Bot编排/推理策略/页面注册/缓存

- **Bot编排引擎**: Coze风格多Agent链式编排(`bot_engine.py` + `extensions/bots/`)
- **推理优化**: Bandit RL策略 + 导航快速旁路 + SHA-256响应缓存
- **页面注册表**: 26页面结构化映射, Agent导航工具用
- **新Agent**: 审计分析Agent + 财务核算Agent (专业角色)
- **协作增强**: 单元格编辑协同 + AI回复评分

### v4.0 — 融合 Yhm444/mm 企业财务核算模块

- **新增模块**: `finance.py` (科目/凭证/总账,U8风格) + `enterprise_db.py` (应收/应付/发票/银行对账/审批/任务/文档版本)
- **8个新页面**: 财务总览、凭证管理、发票、应收/应付、银行对账、审批中心、任务管理
- **27个新API**: 凭证CRUD/过账/审批、伙伴/发票/银行账户/交易导入/对账、审批流程、任务评论
- **数据库**: fin_accounts(13个预设科目)、fin_periods、fin_vouchers、fin_voucher_lines

### v3.2 — 全站6色鲜艳体系
- 工作流步骤(蓝/绿/紫/琥珀)、上传tabs(蓝/绿)、仪表盘stat卡片6色左条
- 图表header5色底线、侧边栏导航图标每项独立颜色、历史来源3色标签
- 风险badge (rose/amber/green)、决策卡片双色顶条、modal黑底+琥珀线
- 全站 form focus 琥珀描边阴影

### v3.1 — UI 完全统一

- **重写 style.css** (939→450行)：移除所有旧 v2 样式冲突，统一 2px 粗边框 + 硬阴影 + 琥珀橙主色 + 0 圆角
- 所有页面同步：登录、首页、仪表盘、分析、报告、历史、消息、个人中心、编辑、预览、搜索、Agent、模型管理、飞书、开发工作室
- AI 悬浮球：蓝紫渐变 → 纯黑 + 琥珀边框
- 修复所有 `var(--border)`/`var(--surface)` 等已删除的旧 CSS 变量引用

---

## 文件清单

### 新文件 (12)
- `modules/ai/commander.py` — 多Agent 指挥官引擎
- `modules/ai/hooks.py` — Hook 事件系统
- `modules/ai/permission.py` — 权限策略引擎
- `modules/feishu_bot.py` — 飞书 Bot 集成
- `templates/models.html` — 模型管理页面
- `templates/feishu_setup.html` — 飞书配置页面
- `config/feishu.yaml` — 飞书配置模板
- `extensions/workflows/risk_scan.yaml` — 风险扫描工作流
- `extensions/workflows/data_quality_check.yaml` — 数据质量检查工作流
- `extensions/workflows/weekly_audit_report.yaml` — 周报生成工作流

### 修改文件 (14)
`app.py`, `config/models.yaml`, `modules/ai/agent_engine.py`, `modules/ai/builtin_tools.py`, `modules/ai/dev_studio.py`, `modules/ai/model_router.py`, `modules/ai/registry.py`, `modules/ai/workflow_engine.py`, `modules/database.py`, `static/css/style.css`, `static/js/agent.js`, `templates/agent.html`, `templates/agent_develop.html`, `templates/base.html`

---

## 测试

- [x] 31 个工具注册正常
- [x] Auto 模式任务分类正确（quick/analysis/complex/vision）
- [x] 百炼 Qwen-Plus OpenAI 兼容协议连通 ✅
- [x] 百炼 DashScope 原生协议连通 ✅
- [x] 多Agent Commander 任务拆解 + 并行执行
- [x] 多会话 CRUD + SQLite 持久化
- [x] Hook 系统注册/触发/阻止
- [x] 黑名单 denylist 阻止删除操作
- [x] 文件上传 CSV/Excel/图片
- [x] 125 个路由全部正常
