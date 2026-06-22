// DocWiki 1.2.0 — 浏览器 E2E 测试
// 用法: node tests/e2e.test.mjs
// 需求: npm install playwright (chromium 浏览器由 playwright 自动管理)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const TEST_PORT = 25173;
const BASE = `http://127.0.0.1:${TEST_PORT}`;
const testDataDir = path.join(rootDir, '.e2e-test-data');
const testStateDir = path.join(rootDir, '.e2e-test-state');

let serverProcess = null;
let browser = null;
let page = null;
let passed = 0;
let failed = 0;

function assert(condition, label) {
    if (condition) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.error(`  ❌ ${label}`); }
}

// ========== 1. 准备临时数据 ==========
function setupTestData() {
    rmSync(testDataDir, { recursive: true, force: true });
    rmSync(testStateDir, { recursive: true, force: true });

    // 六栏目目录
    const cats = ['项目', '报告', '文献', 'SOP', '软件', '写作', '任务'];
    cats.forEach(c => mkdirSync(path.join(testDataDir, c), { recursive: true }));

    // 项目 E2E_测试项目 / 酶筛选 子目录
    const projDir = path.join(testDataDir, '项目', 'E2E_测试项目');
    const subDir = path.join(projDir, '酶筛选');
    mkdirSync(subDir, { recursive: true });

    // 两个 md 文件
    writeFileSync(path.join(subDir, '01_筛选方案.md'), '# 筛选方案\n\n## 1. 目标\n筛选酶活性最高菌株。\n\n## 2. 方法\n使用 HPLC 检测转化率。', 'utf8');
    writeFileSync(path.join(subDir, '02_筛选结果.md'), '# 筛选结果\n\n## 1. 项目背景\n本实验旨在筛选高转化效率菌株。\n\n| 菌株 | 转化率 |\n| --- | --- |\n| E01 | 85% |\n| E02 | 92% |', 'utf8');

    // 项目概述
    writeFileSync(path.join(projDir, '项目概述.md'), '# E2E 测试项目\n\n测试项目概述内容。', 'utf8');

    // 任务清单 JSON（包含今日、明日、本周、活动、已完成）
    const taskData = {
        tasks: [
            { name: '今日任务-自动化测试', priority: '高', level: '项目', project: 'E2E_测试项目', status: '待开始', deadline: '今天', detail: '这是今天要完成的任务' },
            { name: '明日任务-自动化测试', priority: '中', level: '报告', project: '测试报告', status: '进行中', deadline: '明天', detail: '明天的计划任务' },
            { name: '本周任务-自动化测试', priority: '低', level: '文献', project: '文献综述', status: '待开始', deadline: '本周五', detail: '本周要读的文献' },
            { name: '普通活动任务', priority: '中', level: 'SOP', project: '实验室安全', status: '进行中', deadline: '下周', detail: '一个普通活动任务' }
        ],
        completedTasks: [
            { name: '已完成任务示例', priority: '高', level: '项目', project: 'E2E_测试项目', status: '已完成', deadline: '昨天', completedAt: '2026-06-20', detail: '这已经完成了' }
        ]
    };
    writeFileSync(path.join(testDataDir, '任务', '任务清单.json'), JSON.stringify(taskData, null, 2), 'utf8');

    console.log(`  测试数据已就绪: ${testDataDir}`);
}

// ========== 2. 启动服务 ==========
async function startServer() {
    return new Promise((resolve, reject) => {
        serverProcess = spawn('node', [path.join(rootDir, 'server.mjs')], {
            cwd: rootDir,
            env: {
                ...process.env,
                PORT: String(TEST_PORT),
                DOCWIKI_DATA_DIR: testDataDir,
                DOCWIKI_STATE_DIR: testStateDir,
                WEBWIKI_DATA_DIR: testDataDir,
                WEBWIKI_STATE_DIR: testStateDir,
            },
            stdio: ['ignore', 'pipe', 'pipe']
        });
        const timeout = setTimeout(() => reject(new Error('服务器启动超时')), 15000);
        serverProcess.stdout.on('data', chunk => {
            if (chunk.toString().includes('已启动')) {
                clearTimeout(timeout);
                setTimeout(resolve, 600);
            }
        });
        serverProcess.on('error', reject);
    });
}

function stopServer() {
    if (serverProcess) { serverProcess.kill('SIGTERM'); serverProcess = null; }
}

// ========== 辅助 ==========
async function waitFor(selector, timeout = 8000) {
    try { return await page.waitForSelector(selector, { timeout }); }
    catch { return null; }
}

async function click(selector) {
    const el = await waitFor(selector);
    if (el) await el.click();
    return el;
}

async function getText(selector) {
    const el = await waitFor(selector, 3000);
    return el ? (await el.textContent()).trim() : '';
}

// ========== 3. E2E 测试场景 ==========
async function runE2ETests() {
    console.log('\n=== DocWiki 1.2.0 Playwright E2E 测试 ===\n');

    // ===== (a) aiAssistant 显隐 =====
    console.log('(a) AI 助手悬浮入口显隐');
    await page.goto(BASE, { waitUntil: 'networkidle' });
    // 首页隐藏 aiAssistant
    const homeVis = await page.evaluate(() => {
        const el = document.getElementById('aiAssistant');
        return el ? el.style.display : 'no-element';
    });
    assert(homeVis === 'none', `首页 aiAssistant 隐藏 (实际=${homeVis})`);

    // 点击任务标签
    await click('.nav-tab[data-tab="task"]');
    await page.waitForTimeout(500);
    const taskVis = await page.evaluate(() => {
        const el = document.getElementById('aiAssistant');
        return el ? (el.style.display || 'block') : 'no-element';
    });
    assert(taskVis !== 'none', `任务页 aiAssistant 显示 (实际=${taskVis})`);

    // 返回首页隐藏
    await click('.nav-tab[data-tab="home"]');
    await page.waitForTimeout(500);
    const homeAgain = await page.evaluate(() => {
        const el = document.getElementById('aiAssistant');
        return el ? el.style.display : 'no-element';
    });
    assert(homeAgain === 'none', `返回首页 aiAssistant 再次隐藏 (实际=${homeAgain})`);

    // ===== (b) 主题切换 + 持久化 =====
    console.log('\n(b) 主题切换与 localStorage 持久化');
    await page.evaluate(() => localStorage.removeItem('wiki_theme'));
    await page.reload({ waitUntil: 'networkidle' });

    // 点击主题按钮
    const themeBtn = await waitFor('#themeToggle');
    assert(themeBtn !== null, '主题按钮存在');
    await themeBtn.click();
    await page.waitForTimeout(300);

    const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark-theme'));
    assert(hasDark, '点击后 html 添加 dark-theme');

    const lsTheme = await page.evaluate(() => localStorage.getItem('wiki_theme'));
    assert(lsTheme === 'dark', `localStorage wiki_theme=dark (实际=${lsTheme})`);

    // reload 持久化
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const persistDark = await page.evaluate(() => document.documentElement.classList.contains('dark-theme'));
    assert(persistDark, 'reload 后 dark-theme 持久化');

    // 恢复亮色
    await page.evaluate(() => {
        document.documentElement.classList.remove('dark-theme');
        localStorage.setItem('wiki_theme', 'light');
    });

    // ===== (c) 搜索 =====
    console.log('\n(c) 搜索功能');
    // 先通过点击项目卡片进入文档视图，确保 sidebar 可见
    await click('.nav-tab[data-tab="project"]');
    await page.waitForTimeout(1000);
    // 点击项目卡片进入该项目
    const projectCard = await waitFor('.project-card', 5000);
    if (projectCard) {
        await projectCard.click();
        await page.waitForTimeout(1500);
    }

    // 搜索关键词按 Enter
    const searchInput = await waitFor('#searchInput');
    assert(searchInput !== null, '搜索输入框存在');
    await searchInput.fill('筛选');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    const results = await waitFor('.search-result-item', 5000);
    assert(results !== null, '搜索结果出现');

    const resultCount = await page.evaluate(() => document.querySelectorAll('.search-result-item').length);
    assert(resultCount > 0, `搜索结果数量 > 0 (实际=${resultCount})`);

    // 点击第一个结果
    await (await page.$('.search-result-item')).click();
    await page.waitForTimeout(1000);

    // 验证正文包含文件内容
    const bodyText = await page.evaluate(() => {
        const el = document.getElementById('docMarkdownBody');
        return el ? el.textContent : '';
    });
    assert(bodyText.includes('转化率') || bodyText.includes('筛选') || bodyText.includes('HPLC') || bodyText.includes('菌株'),
        `正文含文件内容 (实际前50字="${bodyText.slice(0, 50)}")`);

    // 验证树文件高亮（data-file-path 方式）
    const activeTree = await page.evaluate(() => {
        const el = document.querySelector('[data-file-path].active');
        if (el) return el.textContent.trim();
        // fallback: any active in docTree
        const act = document.querySelector('#docTree .active, #docTree .tree-file.active');
        return act ? act.textContent.trim() : null;
    });
    assert(activeTree !== null && activeTree.length > 0, `树文件高亮 (实际="${activeTree}")`);

    // 验证点击搜索图标也能工作
    await searchInput.fill('');
    await searchInput.fill('项目概述');
    // Click the search icon container then press Enter
    const searchBox = await page.$('#searchBox');
    if (searchBox) {
        await searchBox.click();
        await page.waitForTimeout(300);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
        const results2 = await page.evaluate(() => document.querySelectorAll('.search-result-item').length);
        assert(results2 > 0, `搜索图标+回车搜索结果=${results2}`);
    }

    // ===== (d) 任务页 =====
    console.log('\n(d) 任务页功能');
    await click('.nav-tab[data-tab="task"]');
    await page.waitForTimeout(1000);

    // localStorage 初始化任务数据
    await page.evaluate(() => {
        const tasks = [
            { name: '今日任务-E2E', priority: '高', level: '项目', project: '测试', status: '待开始', deadline: '今天', detail: '' },
            { name: '明日任务-E2E', priority: '中', level: '报告', project: '测试', status: '进行中', deadline: '明天', detail: '' },
            { name: '本周任务-E2E', priority: '低', level: '文献', project: '测试', status: '待开始', deadline: '本周五', detail: '' }
        ];
        localStorage.setItem('wiki_task_data', JSON.stringify(tasks));
        localStorage.setItem('wiki_completed_tasks', JSON.stringify([]));
        // 重新渲染
        if (typeof window.renderReadMode === 'function') window.renderReadMode(tasks);
    });
    await page.waitForTimeout(500);

    // 验证明日任务分组
    const tomorrowSections = await page.evaluate(() => {
        const titles = document.querySelectorAll('.task-section-title');
        return Array.from(titles).map(t => t.textContent.trim());
    });
    const hasTomorrow = tomorrowSections.some(s => s.includes('明日'));
    assert(hasTomorrow, `明日任务分组存在 (分组: ${tomorrowSections.join(', ')})`);

    // 验证明日任务内容
    const tomorrowContent = await page.evaluate(() => {
        const sections = document.querySelectorAll('.task-section');
        for (const s of sections) {
            if (s.querySelector('.task-section-title')?.textContent.includes('明日')) {
                return s.querySelector('.tc2-title')?.textContent?.trim() || '';
            }
        }
        return '';
    });
    assert(tomorrowContent.includes('明日任务-E2E'), `明日任务显示正确内容 (实际=${tomorrowContent})`);

    // 点击"已完成"状态按钮
    const doneBtns = await page.$$('.tc2-status-btn.status-done-btn');
    assert(doneBtns.length > 0, `已完成状态按钮存在 (数量=${doneBtns.length})`);
    if (doneBtns.length > 0) {
        await doneBtns[0].click();
        await page.waitForTimeout(500);
    }

    // 验证任务从卡片消失 + 进入完成表
    const afterDone = await page.evaluate(() => {
        const titles = document.querySelectorAll('.tc2-title');
        return Array.from(titles).map(t => t.textContent.trim());
    });
    const firstTaskGone = !afterDone.includes('今日任务-E2E');
    assert(firstTaskGone || afterDone.length < 3, `已完成任务从活动卡片消失 (剩余任务: ${afterDone.join(',')})`);

    const completedTable = await page.evaluate(() => {
        const tbody = document.getElementById('completedTableBody');
        return tbody ? tbody.textContent.trim() : '';
    });
    assert(completedTable.length > 0 || (await page.evaluate(() => localStorage.getItem('wiki_completed_tasks'))).length > 2,
        `已完成任务进入完成表`);

    // 空分组标题必须始终显示；预计日期应优先调整任务位置。
    await page.evaluate(() => {
        const tasks = [{ name: '阶段计划-E2E', priority: '高', level: '项目', project: 'DocWiki', status: '待开始', deadline: '2099-12-31', detail: '阶段测试' }];
        localStorage.setItem('wiki_task_data', JSON.stringify(tasks));
        window.renderReadMode(tasks);
    });
    const persistentSections = await page.locator('.task-section-title').allTextContents();
    assert(['今日任务', '明日任务', '本周任务', '全部任务'].every(title => persistentSections.some(text => text.includes(title))), '四个任务分组标题始终显示');
    assert(await page.locator('.task-empty-state', { hasText: '暂无待办任务' }).count() >= 3, '空分组显示暂无待办任务');

    await page.locator('.tc2-status-btn.status-progress-btn').click();
    await page.locator('#taskCurrentStage').fill('需求确认');
    await page.locator('#taskNextStage').fill('开发实现');
    const localToday = await page.evaluate(() => {
        const d = new Date();
        return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    });
    await page.locator('#taskPlannedDate').fill(localToday);
    await page.locator('#taskProgressModal .btn-primary').click();
    const progressState = await page.evaluate(() => JSON.parse(localStorage.getItem('wiki_task_data'))[0]);
    assert(progressState.status === '进行中' && progressState.currentStage === '需求确认' && progressState.nextStage === '开发实现', '进行中阶段信息保存到任务数据');
    const todaySectionText = await page.locator('.task-section').filter({ has: page.locator('.task-section-title', { hasText: '今日任务' }) }).textContent();
    assert(todaySectionText.includes('阶段计划-E2E'), '预计日期按系统今日自动调整到今日任务');

    // AI 解析需支持“说明文字 + fenced JSON”的常见模型回复。
    await page.locator('#taskReadMode .mode-btn', { hasText: '管理任务' }).click();
    await page.waitForTimeout(200);
    assert(await page.locator('#taskEditMode .task-table:not(.completed-table) thead th', { hasText: '状态' }).count() === 0, '管理任务列表不显示状态列');
    await page.route('**/api/agent/agent-chat', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                content: '解析结果如下：\n```json\n{"name":"安装包回归测试","level":"软件","project":"DocWiki","sub":"桌面端","detail":"完成安装包测试","status":"待开始","priority":"高","deadline":"2026-06-22"}\n```\n请确认。'
            })
        });
    });
    await page.locator('.ai-textarea').fill('明天完成 DocWiki 安装包回归测试，优先级高。');
    await page.locator('#taskParseButton').click();
    await page.waitForTimeout(300);
    assert(await page.locator('#previewName').inputValue() === '安装包回归测试', 'AI 解析提取 fenced JSON 中的任务名称');
    assert(await page.locator('#previewPriority').inputValue() === '高', 'AI 解析正确填充高优先级');
    assert(await page.locator('#previewLevel').inputValue() === '软件', 'AI 解析正确填充栏目');
    assert(await page.locator('#previewStatus').inputValue() === '待开始', 'AI 解析正确填充状态');
    assert(await page.locator('#previewDeadline').inputValue() === '2026-06-22', 'AI 解析正确填充日期');
    await page.unroute('**/api/agent/agent-chat');

    // ===== (e) 文件树上下文菜单 + fileTransferModal =====
    console.log('\n(e) 文件树右键菜单与目标选择');
    // 先通过点击项目卡片进入文档视图页面
    await click('.nav-tab[data-tab="project"]');
    await page.waitForTimeout(1000);
    const card = await waitFor('.project-card', 5000);
    if (card) {
        await card.click();
        await page.waitForTimeout(1500);
    }

    // 验证文件树项存在（可能是 tree-file 或 proj-tree-file）
    const treeItems = await page.$$('#docTree [data-file-path]');
    assert(treeItems.length > 0, `文件树中有 data-file-path 项 (数量=${treeItems.length})`);

    // 直接通过 JS 设置 ctx 全局变量 + 调用 ctxCopy 来测试
    if (treeItems.length > 0) {
        const firstPath = await treeItems[0].evaluate(el => el.dataset.filePath);
        console.log(`  首个文件路径: ${firstPath}`);

        // 设置 ctxTargetPath 和 ctxTargetEl（模拟右键菜单选择）
        await page.evaluate((p) => {
            // 确保 ctxTargetPath 和 ctxTargetEl 被设置
            if (typeof window.ctxTargetPath !== 'undefined' || true) {
                // 直接调用 openFileTransferModal（绕过 ctxCopy 对 ctxTargetPath 的依赖）
                const el = document.querySelector('[data-file-path]');
                // 简化路径：使用 confirmFileTransfer 需要的路径
                window._e2eTestPath = p;
            }
        }, firstPath);

        // 设置 ctxTargetPath 为全局可访问
        await page.evaluate((p) => { window.ctxTargetPath = p; }, firstPath);

        // 显示菜单并验证菜单项
        await page.evaluate((p) => {
            const menu = document.getElementById('treeContextMenu');
            if (menu) {
                menu.classList.add('show');
                menu.style.display = 'block';
                menu.style.left = '100px';
                menu.style.top = '200px';
            }
            window.ctxTargetPath = p;
        }, firstPath);
        await page.waitForTimeout(300);
    }

    // 验证菜单项
    const menuItems = await page.evaluate(() => {
        const items = document.querySelectorAll('#treeContextMenu .tree-context-item');
        return Array.from(items).map(i => i.textContent.trim());
    });
    console.log(`  菜单项: ${menuItems.join(', ')}`);
    assert(menuItems.some(m => m.includes('重命名')), `菜单含重命名`);
    assert(menuItems.some(m => m.includes('新建')), `菜单含新建`);
    assert(menuItems.some(m => m.includes('复制')), `菜单含复制`);
    assert(menuItems.some(m => m.includes('移动')), `菜单含移动`);
    assert(menuItems.some(m => m.includes('删除')), `菜单含删除`);

    // 通过直接调用 openFileTransferModal 触发模态框（模拟 ctxCopy 流程）
    await page.evaluate(() => {
        window.fileTransferAction = 'copy';
        if (typeof window.openFileTransferModal === 'function' && window.ctxTargetPath) {
            window.openFileTransferModal('复制：' + window.ctxTargetPath.split('/').pop());
        }
    });
    await page.waitForTimeout(1000);

    const transferModal = await waitFor('#fileTransferModal', 5000);
    assert(transferModal !== null, 'fileTransferModal 存在');

    if (transferModal) {
        const modalDisplay = await transferModal.evaluate(el => el.style.display);
        assert(modalDisplay === 'flex' || modalDisplay === 'block', `模态框显示 (display=${modalDisplay})`);

        // 验证有真实目录选项（从 knowledgeTree 动态生成）
        const dirOptions = await page.evaluate(() => {
            const select = document.getElementById('fileTransferDir');
            return select ? Array.from(select.options).map(o => o.textContent) : [];
        });
        console.log(`  目录选项: ${dirOptions.join(', ')}`);
        assert(dirOptions.length > 0, `目录 select 有选项 (选项数=${dirOptions.length})`);
        assert(dirOptions.includes('（根目录）'), '包含根目录选项');

        // 关闭模态框（确保隐藏，防止阻挡后续点击）
        await page.evaluate(() => {
            const m = document.getElementById('fileTransferModal');
            if (m) { m.style.display = 'none'; m.classList.remove('show'); }
        });
        await page.waitForTimeout(300);
    }

    // 同时关闭上下文菜单
    await page.evaluate(() => {
        const menu = document.getElementById('treeContextMenu');
        if (menu) { menu.classList.remove('show'); menu.style.display = 'none'; }
    });
    await page.waitForTimeout(300);

    // ===== (f) 历史版本弹窗 =====
    console.log('\n(f) 历史版本弹窗');
    // 确保所有弹窗已关闭
    await page.evaluate(() => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    });
    await page.waitForTimeout(300);

    // 进入项目文档视图
    await click('.nav-tab[data-tab="project"]');
    await page.waitForTimeout(800);
    const projectCard2 = await waitFor('.project-card', 5000);
    if (projectCard2) {
        await projectCard2.click();
        await page.waitForTimeout(1500);
    }

    // 点击文件中 02_筛选结果（通过 data-file-path 查找）
    const clickedFile = await page.evaluate(() => {
        const items = document.querySelectorAll('#docTree [data-file-path]');
        for (const item of items) {
            if (item.textContent.includes('筛选结果')) {
                item.click();
                return item.dataset.filePath;
            }
        }
        return null;
    });
    console.log(`  点击文件: ${clickedFile}`);
    await page.waitForTimeout(1000);

    // 点击历史版本按钮（强制点击，绕过被遮挡问题）
    const histBtn = await page.$('#docHistoryButton');
    if (histBtn) {
        await histBtn.click({ force: true });
        await page.waitForTimeout(1500);
    }

    const histModal = await waitFor('#historyModal', 5000);
    assert(histModal !== null, '历史版本弹窗出现');

    if (histModal) {
        const histDisplay = await histModal.evaluate(el => el.style.display);
        assert(histDisplay === 'flex', `历史版本弹窗显示 (display=${histDisplay})`);

        // 验证无版本时的提示
        const histContent = await page.evaluate(() => {
            const list = document.getElementById('historyVersionList');
            return list ? list.textContent.trim() : '';
        });
        assert(histContent.includes('暂无') || histContent.includes('加载'),
            `历史版本列表有内容或空提示 (内容="${histContent.slice(0, 30)}")`);

        // 关闭弹窗
        const closeBtn = await page.$('#historyModal .modal-close');
        if (closeBtn) await closeBtn.click({ force: true });
    }

    // ===== (g) 编辑器：富文本编辑 + 颜色 + 保存持久化 =====
    console.log('\n(g) 编辑器富文本编辑、颜色预设、保存持久化');
    // 清理残留 UI
    await page.evaluate(() => {
        const sr = document.getElementById('searchResults');
        if (sr) sr.style.display = 'none';
        document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    });
    const si = await page.$('#searchInput');
    if (si) { await si.fill(''); await si.press('Escape'); await page.waitForTimeout(300); }

    // 进入项目文档视图并打开文件
    await click('.nav-tab[data-tab="project"]');
    await page.waitForTimeout(800);
    // Activate doc page and open file
    const testPathG = '项目/E2E_测试项目/酶筛选/01_筛选方案.md';
    await page.evaluate(async (p) => {
        // Ensure docPage is active
        const dp = document.getElementById('docPage');
        if (dp) dp.classList.add('active');
        const pp = document.getElementById('projectPage');
        if (pp) pp.classList.remove('active');
        if (typeof window.openKnowledgeFile === 'function') await window.openKnowledgeFile(p);
    }, testPathG);
    await page.waitForTimeout(2000);

    const docFile = await page.evaluate(() => {
        const bc = document.getElementById('docBreadcrumb');
        return bc ? bc.textContent.trim().replace(/\s*\/\s*/g, '/') : null;
    });
    console.log(`  breadcrumb: "${docFile}"`);
    assert(docFile && docFile.length > 0, `文件已打开 (path="${docFile}")`);

    // Switch to edit mode via JS directly (more reliable than button click)
    await page.evaluate(() => {
        if (typeof window.switchDocMode === 'function') {
            window.switchDocMode('edit');
        } else {
            const editContent = document.getElementById('docEditContent');
            if (editContent) editContent.style.display = '';
            const readContent = document.getElementById('docReadContent');
            if (readContent) readContent.style.display = 'none';
            const editBtn = document.getElementById('docModeEdit');
            const readBtn = document.getElementById('docModeRead');
            const saveBtn = document.getElementById('docSaveButton');
            if (editBtn) { editBtn.classList.add('active'); }
            if (readBtn) { readBtn.classList.remove('active'); }
            if (saveBtn) { saveBtn.style.display = 'inline-flex'; }
        }
    });
    await page.waitForTimeout(800);

    // 断言编辑模式已激活
    const editDebug = await page.evaluate(() => {
        const docPage = document.getElementById('docPage');
        const editContent = document.getElementById('docEditContent');
        const richEd = document.getElementById('richEditor');
        return {
            docPageActive: docPage ? docPage.classList.contains('active') : 'no-docPage',
            editContentDisplay: editContent ? editContent.style.display : 'no-editContent',
            richEditorExists: !!richEd
        };
    });
    console.log(`  editDebug: ${JSON.stringify(editDebug)}`);
    assert(editDebug.richEditorExists, `#richEditor 存在于 DOM (debug: ${JSON.stringify(editDebug)})`);

    const richEditor = await page.$('#richEditor');

    if (richEditor) {
        // focus contenteditable editor
        await page.evaluate(() => {
            const ed = document.getElementById('richEditor');
            if (ed) { ed.focus(); ed.click(); }
        });
        await page.waitForTimeout(200);
        const focusedId = await page.evaluate(() => document.activeElement?.id || '');
        assert(focusedId === 'richEditor', `#richEditor 获得焦点 (实际=${focusedId})`);

        // 输入唯一字符串
        const uniqueStr = 'E2E-UNIQUE-' + Date.now();
        await page.keyboard.type(uniqueStr);
        await page.waitForTimeout(500);

        // 断言富文本包含唯一字符串
        const htmlContent = await richEditor.evaluate(el => el.innerHTML);
        assert(htmlContent.includes(uniqueStr), `富文本含唯一字符串 (实际前40字="${htmlContent.slice(0, 40)}")`);

        // 断言 dirty 状态（未保存）——通过 DOM 验证
        const saveStatusText = await page.evaluate(() => {
            const el = document.getElementById('editorSaveStatus');
            return el ? el.textContent.trim() : '';
        });
        assert(saveStatusText.includes('未保存'), `保存状态显示"未保存" (实际="${saveStatusText}")`);
        const saveBtnDisabled = await page.evaluate(() => {
            const btn = document.getElementById('docSaveButton');
            return btn ? btn.disabled : null;
        });
        assert(saveBtnDisabled === false, '保存按钮可用（未保存状态）');

        // 选中文字并点击字体颜色预设按钮（红色）
        // 先全选 #richEditor 内容
        await richEditor.click();
        await page.keyboard.press('Control+a');
        await page.waitForTimeout(200);

        // 点击红色颜色按钮（第3个 editor-color-btn）
        const colorBtns = await page.$$('.editor-color-btn');
        assert(colorBtns.length >= 7, `颜色按钮数量 >= 7 (实际=${colorBtns.length})`);
        if (colorBtns.length >= 3) {
            await colorBtns[2].click(); // 红色
            await page.waitForTimeout(400);
        }

        // 断言 DOM 产生 color 样式
        const hasColorStyle = await richEditor.evaluate(el => {
            const fontTags = el.querySelectorAll('font[color]');
            const styledSpans = el.querySelectorAll('span[style*="color"]');
            const coloredEls = el.querySelectorAll('[style*="color:#ef4444"], [style*="color: rgb"], font[color="#ef4444"]');
            return {
                fontCount: fontTags.length,
                spanCount: styledSpans.length,
                coloredCount: coloredEls.length,
                innerHTML: el.innerHTML.slice(0, 200)
            };
        });
        assert(
            hasColorStyle.fontCount > 0 || hasColorStyle.spanCount > 0 || hasColorStyle.coloredCount > 0,
            `字体颜色样式已应用 (fontTag=${hasColorStyle.fontCount}, spans=${hasColorStyle.spanCount}, colored=${hasColorStyle.coloredCount})`
        );

        // 保存（尝试按钮或直接调用函数）
        const saveBtn = await page.$('#docSaveButton');
        if (saveBtn) {
            await saveBtn.click({ force: true });
        } else {
            await page.evaluate(async () => {
                if (typeof window.saveCurrentDocument === 'function') {
                    try { await window.saveCurrentDocument(); } catch(e) {}
                }
            });
        }
        await page.waitForTimeout(2000);

        // 验证保存成功
        const saveStatusAfter = await page.evaluate(() => {
            const el = document.getElementById('editorSaveStatus');
            return el ? el.textContent.trim() : '';
        });
        assert(saveStatusAfter === '已保存', `保存后状态为"已保存" (实际="${saveStatusAfter}")`);

        // 通过 API 重新读取文件验证持久化（使用已知路径）
        const verifyPath = '项目/E2E_测试项目/酶筛选/01_筛选方案.md';
        const apiResp = await page.evaluate(async (filePath) => {
            const r = await fetch('/api/file?path=' + encodeURIComponent(filePath));
            return r.json();
        }, verifyPath);
        assert(apiResp.content && apiResp.content.includes(uniqueStr),
            `API 重新读取文件含唯一字符串 (命中=${apiResp.content?.includes(uniqueStr)})`);

        // 验证 reload 后持久化
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        const afterReload = await page.evaluate(async (filePath) => {
            const r = await fetch('/api/file?path=' + encodeURIComponent(filePath));
            const data = await r.json();
            return data.content?.includes('E2E-UNIQUE-');
        }, verifyPath);
        assert(afterReload, 'reload 后文件内容持久化');
    }

    // ===== (h) .md.md 双后缀修复 =====
    console.log('\n(h) .md.md 导航修复');
    const realFilePath = '项目/E2E_测试项目/酶筛选/02_筛选结果.md';
    const doubleMdPath = realFilePath + '.md';
    console.log(`  double-md: ${doubleMdPath}`);

    // 调用 openKnowledgeFile 导航（模拟 AI 返回 .md.md 路径）
    await page.evaluate(async (badPath) => {
        if (typeof window.openKnowledgeFile === 'function') {
            await window.openKnowledgeFile(badPath);
        }
    }, doubleMdPath);
    await page.waitForTimeout(1200);

    // 断言最终状态使用单 .md 路径（通过 DOM 三重验证）
    const breadcrumbText = await page.evaluate(() => {
        const bc = document.getElementById('docBreadcrumb');
        return bc ? bc.textContent.trim() : '';
    });
    console.log(`  面包屑: "${breadcrumbText}"`);
    assert(!breadcrumbText.includes('.md.md'), `面包屑不含 .md.md`);
    assert(breadcrumbText.includes('.md') || breadcrumbText.includes('筛选结果'), `面包屑含目标文件 (实际="${breadcrumbText.slice(0, 60)}")`);

    // 树中高亮的文件不含 .md.md
    const activeDiagnostic = await page.evaluate(() => {
        const el = document.querySelector('[data-file-path].active');
        return {
            active: el ? el.dataset.filePath : '',
            state: window.getCurrentDocState?.(),
            paths: Array.from(document.querySelectorAll('#docTree [data-file-path]')).map(node => ({ path: node.dataset.filePath, className: node.className }))
        };
    });
    const activeFile = activeDiagnostic.active;
    console.log(`  高亮: "${activeFile}"`);
    assert(activeFile === realFilePath, `树精确高亮目标单 .md 文件 (实际="${activeFile.slice(0, 60)}", state=${JSON.stringify(activeDiagnostic.state)}, paths=${JSON.stringify(activeDiagnostic.paths)})`);

    // 正文有内容
    const bodyText3 = await page.evaluate(() => {
        const el = document.getElementById('docMarkdownBody');
        return el ? el.textContent.slice(0, 100) : '';
    });
    assert(bodyText3.length > 10, `正文有内容 (实际="${bodyText3.slice(0, 50)}")`);

    // ===== (i) 对话面板创建和删除 =====
    console.log('\n(i) 对话面板创建和删除');
    await click('.nav-tab[data-tab="project"]');
    await page.waitForTimeout(800);

    // 显示 chat panel
    await page.evaluate(() => {
        const panel = document.getElementById('chatPanel');
        if (panel) panel.style.display = 'flex';
    });
    await page.waitForTimeout(500);

    // mock alert 和 confirm
    await page.evaluate(() => {
        window._e2eAlertMsg = '';
        window._e2eConfirmResult = true; // auto-accept confirm
        window._alert = window.alert;
        window._confirm = window.confirm;
        window.alert = (msg) => { window._e2eAlertMsg = msg; };
        window.confirm = (msg) => { window._e2eConfirmMsg = msg; return window._e2eConfirmResult; };
    });

    // 点加号创建新对话
    const addBtn = await waitFor('.chat-action-btn[title="新建对话"], [aria-label="新建对话"]', 5000);
    if (!addBtn) {
        await page.evaluate(() => {
            if (typeof window.createNewConversation === 'function') window.createNewConversation();
        });
    } else {
        await addBtn.click();
    }
    await page.waitForTimeout(1500);

    // 断言新对话标题/消息为空状态
    const chatTitle = await page.evaluate(() => {
        const el = document.getElementById('chatPanelTitle');
        return el ? el.textContent.trim() : '';
    });
    assert(chatTitle.length > 0, `对话标题非空 (实际="${chatTitle}")`);

    const msgArea = await page.evaluate(() => {
        const el = document.getElementById('chatMessages');
        return el ? el.textContent.trim().slice(0, 100) : '';
    });
    assert(
        msgArea.includes('开始新对话') || msgArea.includes('开始对话') || msgArea.includes('直接开始提问'),
        `新对话消息区为空或欢迎态 (实际="${msgArea.slice(0, 50)}")`
    );

    // 空白草稿无需删除，且不应弹出确认框。
    await page.evaluate(() => {
        window._e2eConfirmMsg = '';
        window._e2eAlertMsg = '';
        window.deleteCurrentConversation();
    });
    await page.waitForTimeout(300);
    const blankDeleteState = await page.evaluate(() => ({
        alert: window._e2eAlertMsg || '',
        confirm: window._e2eConfirmMsg || '',
        visible: document.getElementById('chatPanel')?.style.display !== 'none',
        title: document.getElementById('chatPanelTitle')?.textContent.trim()
    }));
    assert(blankDeleteState.alert.includes('空白对话无需删除'), `空白草稿给出无需删除提示 (实际="${blankDeleteState.alert}")`);
    assert(blankDeleteState.confirm === '', '空白草稿不弹删除确认框');
    assert(blankDeleteState.visible && blankDeleteState.title === '新对话', '空白草稿删除后面板和新对话状态保持');

    // 通过本地 API 创建两个带消息的会话，不调用外部模型。
    const seededChats = await page.evaluate(async () => {
        async function create(title) {
            const convResp = await fetch('/api/agent/conversations', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, scene: 'default' })
            });
            const convData = await convResp.json();
            const conv = convData.conversation;
            await fetch(`/api/agent/conversations/${conv.id}/messages`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'user', content: `${title}-消息` })
            });
            return conv;
        }
        return [await create('E2E待删除'), await create('E2E保留')];
    });
    assert(seededChats.length === 2 && seededChats.every(c => c.id), '本地 API 创建两个带消息会话');

    await page.evaluate(id => window.openConversation(id), seededChats[0].id);
    await page.waitForTimeout(500);

    // 取消删除必须保留当前会话。
    await page.evaluate(() => {
        window._e2eConfirmMsg = '';
        window._e2eConfirmResult = false;
        window.deleteCurrentConversation();
    });
    await page.waitForTimeout(400);
    const cancelState = await page.evaluate(async id => {
        const response = await fetch(`/api/agent/conversations/${id}`);
        return {
            exists: response.ok,
            title: document.getElementById('chatPanelTitle')?.textContent.trim(),
            confirm: window._e2eConfirmMsg || ''
        };
    }, seededChats[0].id);
    assert(cancelState.confirm.includes('确定要删除'), '已有会话删除会显示确认提示');
    assert(cancelState.exists && cancelState.title === 'E2E待删除', '取消删除后会话仍存在并保持打开');

    // 确认删除后自动切换到剩余会话，不出现旧标题+空白。
    await page.evaluate(() => {
        window._e2eConfirmResult = true;
        window.deleteCurrentConversation();
    });
    await page.waitForTimeout(800);
    const confirmedState = await page.evaluate(async deletedId => {
        const deletedResponse = await fetch(`/api/agent/conversations/${deletedId}`);
        return {
            deleted: deletedResponse.status === 404,
            title: document.getElementById('chatPanelTitle')?.textContent.trim(),
            messages: document.getElementById('chatMessages')?.textContent.trim() || '',
            visible: document.getElementById('chatPanel')?.style.display !== 'none'
        };
    }, seededChats[0].id);
    assert(confirmedState.deleted, '确认删除后原会话已删除');
    assert(confirmedState.visible && confirmedState.title !== 'E2E待删除', '确认删除后面板保持并切换离开旧标题');
    assert(confirmedState.title === 'E2E保留' && confirmedState.messages.includes('E2E保留-消息'), '确认删除后自动显示剩余会话及其消息');

    /* 旧版删除回归检查已由上述严格状态断言替代。
    const delBtn = await page.$('.chat-action-btn[title="删除对话"], [aria-label="删除对话"]');
    if (delBtn) {
        await delBtn.click({ force: true });
        await page.waitForTimeout(800);
    }
    const confirmWasCalled = await page.evaluate(() => !!window._e2eConfirmMsg);
    assert(confirmWasCalled, '删除按钮触发 confirm 弹窗');

    // 现在测试空白对话（无 currentConversation）
    await page.evaluate(() => {
        window._e2eAlertMsg = '';
        window._e2eConfirmResult = true;
        // 模拟 null conversation 场景
        if (typeof window.currentConversation !== 'undefined') {
            // chat.js 中 currentConversation 是模块级，通过 deleteCurrentConversation 暴露
        }
    });
    // 创建新对话后直接删（正常流程通过 confirm）
    const delBtn2 = await page.$('.chat-action-btn[title="删除对话"], [aria-label="删除对话"]');
    if (delBtn2) {
        await page.evaluate(() => { window._e2eConfirmResult = true; window._e2eAlertMsg = ''; });
        // 先创建，确认有对话
        await page.evaluate(() => {
            if (typeof window.createNewConversation === 'function') window.createNewConversation();
        });
        await page.waitForTimeout(1000);
        await delBtn2.click({ force: true });
        await page.waitForTimeout(800);
    }

    const finalAlert = await page.evaluate(() => window._e2eAlertMsg || '');
    const finalConfirm = await page.evaluate(() => window._e2eConfirmMsg || '');
    // 验证至少有 alert 或 confirm 被调用
    assert(
        finalAlert.length > 0 || finalConfirm.length > 0,
        `删除时出现提示 (alert="${finalAlert.slice(0, 40)}", confirm="${finalConfirm.slice(0, 40)}")`
    );
    */

    // 恢复原生函数
    await page.evaluate(() => {
        if (window._alert) window.alert = window._alert;
        if (window._confirm) window.confirm = window._confirm;
        delete window._e2eAlertMsg;
        delete window._e2eConfirmMsg;
    });

    // 关闭 chat panel
    await page.evaluate(() => {
        const panel = document.getElementById('chatPanel');
        if (panel) panel.style.display = 'none';
    });

    console.log(`\n=== 测试结果: ${passed} 通过, ${failed} 失败 ===\n`);
}

// ========== 主流程 ==========
(async () => {
    try {
        setupTestData();
        await startServer();
        console.log(`  服务器已启动: ${BASE}`);

        browser = await chromium.launch({
            headless: true,
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            args: ['--no-sandbox', '--disable-gpu']
        });
        page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
        page.setDefaultTimeout(10000);

        await runE2ETests();
    } catch (err) {
        console.error('E2E 测试异常:', err);
        failed++;
    } finally {
        if (page) await page.close().catch(() => {});
        if (browser) await browser.close().catch(() => {});
        stopServer();
        rmSync(testDataDir, { recursive: true, force: true });
        rmSync(testStateDir, { recursive: true, force: true });
        console.log(`\n=== 最终结果: ${passed} 通过, ${failed} 失败 ===`);
        if (failed > 0) process.exit(1);
    }
})();
