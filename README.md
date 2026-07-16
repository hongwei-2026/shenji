# 财务大数据审计系统 v4.1

基于 Flask 的**财务大数据智能审计平台**，深度集成 AI Agent、企业财务核算、多模型路由与协作通讯。

> 参考 [claw-code](https://github.com/ultraworkers/claw-code)（Claude Code 开源复刻）的 Agent Harness 架构，AI Agent 深度绑定审计系统，通过自然语言对话即可操作审计软件的全部功能。

## 功能特性

### 📊 审计核心
- **数据上传** — 支持 CSV / Excel 拖拽上传，自动识别金额、日期、分类、凭证等关键列
- **7 项审计规则** — 重复凭证、大额交易、日期异常、分类异常、高频交易、凭证断号、余额异常 + Benford 定律分析
- **Z-Score + IQR 异常检测** — 统计离群值自动标记
- **三阶段审计** — 风险评估 → 控制测试 → 实质性程序，可一键全量执行
- **报告导出** — HTML 在线报告 + Excel 导出，支持含三阶段审计结果

### 🤖 AI Agent 工作台
- **31 个内置工具** — Agent 可操作审计系统全部功能：上传、编辑表格、审计分析、报告导出、协同通讯、页面导航
- **三种运行模式** — 单模型 / Auto 智能路由 / 多Agent 指挥官协作
- **多会话持久化** — SQLite 存储，新建/切换/删除会话，80 条历史上下文
- **拖拽上传** — CSV/Excel/图片拖到 Agent 对话 → 自动 OCR 或解析审计
- **操作流程可视化** — 可展开步骤详情，查看每步参数、结果和耗时
- **权限系统** — 3 级模式（只读/询问/自动）+ 工具黑名单 + 始终允许记忆
- **Hook 系统** — PreToolUse/PostToolUse 等 8 种事件钩子
- **Bot 编排引擎** — Coze 风格多 Agent 链式编排（财务 → 审计 → 办公助手）
- **推理策略** — Bandit RL 策略引擎，导航命令快速旁路（15+ 正则模式匹配）

### 🔌 多模型支持
- **阿里百炼** — OpenAI 兼容协议 + DashScope 原生协议双支持
- **12 个模型配置** — Qwen-Plus/Max/Turbo/VL-Plus、DeepSeek、OpenAI、Ollama、LM Studio
- **自动发现** — 扫描本地 Ollama/LM Studio/vLLM 端点
- **API Key 可视化管理** — Web UI 配置与上传模型文件
- **Auto 模式** — 智能任务分类（快速/分析/复杂/视觉）→ 自动路由最佳模型

### 💰 企业财务核算 (用友 U8 风格)
- **凭证管理** — 借贷记账法、自动平衡校验、过账与审批流程
- **科目总账** — 13 个预设科目（资产/负债/权益/收入/费用）
- **应收/应付** — 客户/供应商伙伴管理、账龄追踪
- **发票管理** — 开票、收款登记
- **银行对账** — 导入银行流水、自动匹配勾兑
- **审批工作流** — 凭证审批、任务分配、评论协作
- **文档版本** — 凭证/发票修改历史追溯

### 👥 协作与通讯
- **实时消息** — 站内私信，无需好友即可发消息
- **视频通话** — WebRTC 点对点加密视频
- **好友系统** — 添加好友、文件共享（200MB）
- **协同编辑** — 多人实时编辑同一表格，邀请链接加入
- **通知中心** — 好友请求、新消息、协同邀请实时推送

### 🔗 飞书集成
- **飞书 Bot** — 消息接收 → AI Agent 路由 → 回复 + 卡片消息
- **Webhook** — 事件订阅与回调验证

### 🎨 UI 设计
- **多彩杂志风格** — 琥珀橙/蓝/绿/紫/玫瑰红 6 色体系
- **2px 粗边框 + 硬阴影** 全站统一卡片系统
- **24 个模板页面** — 所有页面风格一致
- **可折叠侧边栏** — 响应式布局，支持移动端

## 技术栈

| 类别 | 技术 |
|------|------|
| Web 框架 | Flask 3.x |
| 数据处理 | Pandas、NumPy、SciPy |
| AI/ML | HuggingFace Transformers、PyTorch |
| 数据库 | SQLite（审计历史 + 财务核算 + Agent 会话） |
| 前端 | HTML5、CSS3、JavaScript (原生) + Bootstrap 5 |
| 实时通讯 | WebRTC (点对点视频) |
| 文件支持 | openpyxl、xlrd、pytesseract (OCR) |
| 语音 | SpeechRecognition、pydub |
| 容器化 | Docker + docker-compose |

## 快速开始

### 环境要求

- Python 3.8+
- pip

### 安装

```bash
git clone https://github.com/hongwei-2026/shenji.git
cd shenji
pip install -r requirements.txt
```

### 配置模型

1. 复制 `.env.example` 为 `.env`，填入 API Key：
```bash
cp .env.example .env
# 编辑 .env, 填入:
# BAILIAN_API_KEY=sk-xxx    （阿里百炼）
# DEEPSEEK_API_KEY=sk-xxx   （DeepSeek, 可选）
# OPENAI_API_KEY=sk-xxx     （OpenAI, 可选）
```

2. 或在 Web UI 中配置：启动后访问 `/models` 页面。

### 运行

```bash
python app.py
```

浏览器访问 `http://127.0.0.1:5000`

### Docker 部署

```bash
docker compose up -d --build
```

## 使用流程

### 审计流程
1. **首页** — 上传 CSV/Excel 文件或拖拽到 Agent 对话
2. **编辑** — 可选进入电子表格编辑器修正数据
3. **仪表盘** — 查看 Benford 分析、风险分布、金额趋势
4. **分析** — 运行 7 项审计规则 + 三阶段审计
5. **报告** — 导出 HTML/Excel 审计报告

### AI Agent 流程
1. 访问 `/agent` 进入 Agent 工作台
2. 选择模型 + 运行模式 + 权限模式
3. 直接输入任务，如："帮我分析最近的财务数据中有哪些异常"
4. 点击 🔧 操作流程查看 AI 每步做了什么

### 财务核算流程
1. 访问 `/finance` 查看财务总览
2. 访问 `/finance/vouchers` 创建凭证
3. 访问 `/workflow/approvals` 处理审批
4. 访问 `/finance/reconciliation` 银行对账

## 项目结构

```
├── app.py                      # Flask 主应用入口 (156 routes)
├── modules/
│   ├── ai/                     # 🤖 AI Agent 子系统
│   │   ├── agent_engine.py     #   ReAct 循环引擎
│   │   ├── commander.py        #   多Agent 指挥官
│   │   ├── bot_engine.py       #   Bot 链式编排
│   │   ├── model_router.py     #   多协议路由 (OpenAI/DashScope)
│   │   ├── hooks.py            #   事件钩子系统
│   │   ├── permission.py       #   权限策略引擎
│   │   ├── inference_policy.py #   Bandit RL 推理策略
│   │   ├── page_registry.py    #   26 页注册表
│   │   ├── response_cache.py   #   LLM 响应缓存
│   │   ├── registry.py         #   扩展注册中心 + ToolPool
│   │   ├── builtin_tools.py    #   31 个内置工具
│   │   ├── dev_studio.py       #   扩展开发工作室
│   │   ├── workflow_engine.py  #   工作流引擎
│   │   └── mcp_client.py       #   MCP 客户端
│   ├── data_processor.py       # 数据上传与预处理
│   ├── audit_rules.py          # 7 项审计规则引擎
│   ├── audit_data_helpers.py   # 审计数据辅助函数
│   ├── anomaly_detector.py     # 异常检测 (Z-Score/IQR)
│   ├── risk_assessment.py      # 三阶段审计: 风险评估
│   ├── control_testing.py      # 三阶段审计: 控制测试
│   ├── substantive_procedures.py # 三阶段审计: 实质性程序
│   ├── report_generator.py     # HTML/Excel 报告生成
│   ├── database.py             # SQLite 持久化 (审计+财务+会话)
│   ├── finance.py              # 财务核算 (凭证/科目/总账)
│   ├── enterprise_db.py        # 企业扩展 (AR/AP/发票/审批)
│   ├── auth.py                 # 用户认证
│   ├── roles.py                # 角色与主题配置
│   ├── collab.py               # 协同编辑
│   ├── search_engine.py        # 全文检索 (FTS5)
│   ├── feishu_bot.py           # 飞书 Bot 集成
│   ├── call_signaling.py       # WebRTC 视频信令
│   └── local_llm.py            # 本地 Qwen 模型推理
├── templates/                  # 24 个 Jinja2 模板
├── static/                     # 静态资源 (CSS/JS/Vendor)
├── extensions/                 # Agent 扩展
│   ├── skills/                 #   Skill 扩展
│   ├── mcp/                    #   MCP 连接器
│   ├── agents/                 #   Agent 预设 (3个)
│   ├── bots/                   #   Bot 编排 (1个)
│   ├── miniprograms/           #   小程序
│   └── workflows/              #   工作流 (4个)
├── config/                     # 配置文件
│   ├── models.yaml             #   模型配置 (12个)
│   └── feishu.yaml             #   飞书配置
├── scripts/                    # 部署脚本
├── docker-compose.yml          # Docker 编排
├── requirements.txt            # Python 依赖
└── 示例财务数据.csv             # 示例数据
```

## 审计规则说明

| # | 规则 | 说明 |
|---|------|------|
| 1 | 重复凭证 | 检测凭证号重复的记录 |
| 2 | 大额交易 | 金额超过设定阈值的交易 |
| 3 | 异常日期 | 非工作日或未来日期的交易 |
| 4 | 分类异常 | 交易类别分布异常 |
| 5 | 高频交易 | 短时间内大量交易 |
| 6 | 凭证断号 | 凭证号不连续 |
| 7 | 余额异常 | 余额出现负值或突变 |
| 8 | Benford 定律 | 首位数分布分析 |

## 致谢

- [claw-code](https://github.com/ultraworkers/claw-code) — Agent Harness 架构参考
- [mm-1/mm](https://gitee.com/mm-1/mm) — 上游项目
- [Yhm444/mm](https://gitee.com/Yhm444/mm) — 财务核算模块

## License

MIT
