# DocWiki 1.2.1 发布测试报告

- 测试日期：2026-06-22
- 发布类型：Bug 修复版本
- 安装包：`F:\trae_workspace\DocWiki-Setup-1.2.1.exe`
- 安装包大小：82,499,331 字节
- SHA-256：`B64278EC717B1BA794C489C5109C4C247E9FDA2925872FF742CF7A736B12A2D4`

## 自动化测试

- 远程更新与数据恢复：11 项通过
- 后端 API：53 项通过
- 前端逻辑：52 项通过
- 模型路由隔离：31 项通过
- Playwright E2E：67 项通过
- 合计：214 项通过，0 项失败

## 安装版冒烟测试

- NSIS 静默安装返回码：0
- 安装目录文件完整
- 安装版 `package.json` 版本：1.2.1
- 安装版启动成功
- `GET /api/health` 返回 `status=ok`、`version=1.2.1`
- 测试进程、测试安装目录及临时数据库均已清理

## 更新发布

- 默认更新源：`https://github.com/lixinpeng027-coder/DocWiki/releases/latest/download/latest.json`
- 更新清单包含版本号、安装包地址、SHA-256 和发布说明
- 更新安装前会备份知识库与模型配置，新版首次启动后恢复

## 结论

DocWiki 1.2.1 满足发布条件，可发布到公开 GitHub Release。
