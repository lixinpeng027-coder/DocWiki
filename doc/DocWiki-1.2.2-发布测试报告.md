# DocWiki 1.2.2 发布测试报告

## 版本信息

| 项目 | 内容 |
|------|------|
| **版本号** | 1.2.2 |
| **上一版本** | 1.2.1 |
| **发布日期** | 2026-06-22 |
| **基准提交** | bdd52dc (release: DocWiki 1.2.1 bug fixes) |

## 变更清单

### 第一批：P0 数据安全

#### 1a. 修复「保存并退出」流程
- **electron/main.js** L345-347: 在 `sendToWindow('before-close')` 前后增加带时间戳的 console.log 日志
- **js/app.js** L2651: `electronCloseConfirmed = true` 处增加带时间戳的日志
- 核心逻辑：文档保存失败 → cancelClose()；非关键同步失败 → 仍调用 confirmClose()

#### 1b. 自动保存默认间隔改为 10 秒
- **js/app.js** L2566, L2593: 默认间隔从 `'30'` 改为 `'10'`（秒）
- **js/app.js**: 移除自动保存对 `docPage active` 的限制
- **index.html** L590: 设置页默认值 `value="30"` → `value="10"`

#### 1c. 统一页面切换保护
- **js/app.js**: 所有 `switchTab()` 外部调用改为 `handleTabSwitch()`，共 6 处：
  - L792: `navigateToDoc` 搜索结果点击
  - L1871: `renderProjectTree` 概览链接点击
  - L2021: 项目视图概览链接点击
  - L2508: DnD 移动后跳转
  - L2691: 首页初始化
  - L3232: DnD 跨栏目移动
- `handleTabSwitch` 内有脏数据检查，保存失败阻止切换

### 第二批：P1 功能修复

#### 2a. AI 读取任务数据 - System Prompt
- **core/agent.js** L176: AGENT_SYSTEM_PROMPT 新增第 7 步
- 内容："如果用户询问任务相关（今日任务、本周任务、进行中任务等），先使用 read_task_data 工具获取任务数据再回答"

#### 2b. 助手形象 SVG 替换 PNG
- **index.html** L889: `<img>` 替换为内联 SVG（viewBox 0 0 140 180）
- 包含：双马尾、头部、眼睛（blink 动画）、嘴巴、腮红、裙子（logo 纹理）、手臂（wave 动画）、腿部、鞋子
- **css/style.css**: 动画原点坐标适配新 SVG

#### 2c. 编辑器点击区域
- **css/style.css** L2341: `.rich-editor` 新增 `min-height: 300px`
- 颜色面板已使用色块按钮 `.color-chip`，无需修改

### 第三批：P2 样式统一

#### 3a. 深色主题补全
- **css/style.css**: 暗色主题新增：
  - CSS 变量 `--card-bg: #1e293b`
  - `.logo` 文字颜色
  - `.doc-sidebar-header` / `.doc-sidebar-title` / `.doc-sidebar-search input`
  - `.settings-section` / `.feature-card` 及其子元素
  - 通用设置新增元素的暗色覆盖（subsection title、divider、hint、toggle、description）

#### 3b-3c. 日期控件 / Toast
- 已验证已有完整暗色主题覆盖和 `max-width` 限制，无需修改

### 第四批：版本与发布

#### 4a. 版本号更新
- `package.json` → `"1.2.2"`
- `tests/api.test.mjs` → 断言同步为 `'1.2.2'`

#### 4b. 通用设置重设计（用户视角）
- **index.html**: 通用设置重新组织为三个分区：
  - 📝 编辑偏好（自动保存间隔 + 默认打开模式）
  - 🔄 软件更新（当前版本 + 检查更新 + 自动检查开关 + 高级设置折叠）
  - ℹ️ 关于（服务地址 + 数据目录 + 使用说明）
- **js/settings.js**: 新增 `initGeneralSettings()` 函数：
  - 动态从 `/api/health` 获取版本号
  - 恢复更新源 URL 和自动检查开关
  - Electron 环境自动静默检查更新
- **js/app.js**: 新增 5 个更新相关函数：
  - `checkForDocWikiUpdate()` - 检查更新并展示结果
  - `installDocWikiUpdate()` - 下载并安装更新
  - `saveUpdateManifestUrl()` - 保存更新源地址
  - `toggleAdvancedUpdateSettings()` - 展开/折叠高级设置
  - `toggleAutoUpdateCheck()` - 切换自动检查开关
- **css/style.css**: 新增样式：
  - `.settings-subsection-title` / `.settings-divider` / `.setting-hint` / `.setting-version` / `.setting-description`
  - `.toggle-switch` / `.toggle-slider` 开关组件
  - 以上全部暗色主题覆盖

## 自动更新架构

| 层 | 文件 | 功能 |
|----|------|------|
| 后端 | `electron/update-manager.cjs` | 版本比较、manifest 获取、下载、SHA256 校验 |
| 后端 | `electron/main.js` L464-508 | IPC handler: `check-update` / `install-update` |
| 后端 | `electron/main.js` L511-515 | 启动时自动恢复更新备份（`data/` + `.docwiki/state/`） |
| 桥接 | `electron/preload.js` L13-14 | `checkUpdate()` / `installUpdate()` 暴露给渲染进程 |
| 前端 | `index.html` 通用设置 | 版本显示 + 检查更新按钮 + 自动检查开关 |
| 前端 | `js/app.js` | `checkForDocWikiUpdate` / `installDocWikiUpdate` |
| 前端 | `js/settings.js` | `initGeneralSettings` 初始化 + 自动检查触发 |

## 测试结果

**共计: 76 项 | 通过: 76 | 失败: 0**

| 测试模块 | 测试项数 | 结果 |
|----------|---------|------|
| 1. Health Check | 2 | ✅ 全部通过 |
| 2. 文件树 API | 3 | ✅ 全部通过 |
| 3. 搜索 API | 3 | ✅ 全部通过 |
| 4a. 迁移旧任务 JSON | 8 | ✅ 全部通过 |
| 4b. 任务 CRUD | 8 | ✅ 全部通过 |
| 4c. 更新任务 | 5 | ✅ 全部通过 |
| 4d. 完成与恢复 | 5 | ✅ 全部通过 |
| 4e. 删除任务 | 3 | ✅ 全部通过 |
| 4f. 全量 sync | 4 | ✅ 全部通过 |
| 4g. 错误处理 | 1 | ✅ 全部通过 |
| 5. 文件 CRUD | 11 | ✅ 全部通过 |
| 5b. 文件复制 | 10 | ✅ 全部通过 |
| 6. Agent 路由 | 6 | ✅ 全部通过 |
| 7. 数据路径安全 | 4 | ✅ 全部通过 |

## 修改文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `package.json` | 修改 | 版本号 1.2.2 |
| `tests/api.test.mjs` | 修改 | 版本断言同步 |
| `electron/main.js` | 修改 | before-close 日志 |
| `js/app.js` | 修改 | switchTab 统一 + 自动保存 10s + 更新函数 + 日志 |
| `js/settings.js` | 修改 | initGeneralSettings 初始化 |
| `core/agent.js` | 修改 | System prompt 增加 read_task_data 步骤 |
| `index.html` | 修改 | SVG 助手 + 通用设置重设计 |
| `css/style.css` | 修改 | 编辑器 min-height + SVG 动画 + 暗色主题 + 设置新样式 |
| `doc/DocWiki-1.2.2-发布测试报告.md` | 更新 | 本报告 |

## 结论

DocWiki 1.2.2 版本所有变更已完成，76 项 API 测试全部通过。自动更新功能前后端完整接入，**可发布**。
