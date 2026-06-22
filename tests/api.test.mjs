// DocWiki 1.2.2 后端 API 自动化测试（Markdown 任务存储）
// 用法: node tests/api.test.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const PORT = 14173;
const BASE = `http://127.0.0.1:${PORT}`;
const TEST_DATA_DIR = path.join(rootDir, '.api-test-data-temp');
const TEST_STATE_DIR = path.join(rootDir, '.api-test-state-temp');

let serverProcess = null;
let passed = 0;
let failed = 0;

function assert(condition, label) {
    if (condition) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.error(`  ❌ ${label}`); }
}

function fetchJSON(urlPath, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlPath, BASE);
        const req = http.request(url, {
            method: options.method || 'GET',
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            timeout: 5000
        }, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
                catch { resolve({ status: res.statusCode, data: body }); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        if (options.body) req.write(JSON.stringify(options.body));
        req.end();
    });
}

function setupTestData() {
    rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    rmSync(TEST_STATE_DIR, { recursive: true, force: true });
    const cats = ['项目', '报告', '文献', 'SOP', '软件', '写作', '任务'];
    cats.forEach(c => mkdirSync(path.join(TEST_DATA_DIR, c), { recursive: true }));
    // 创建任务子目录
    mkdirSync(path.join(TEST_DATA_DIR, '任务', '待办'), { recursive: true });
    mkdirSync(path.join(TEST_DATA_DIR, '任务', '已完成'), { recursive: true });
    // 创建旧格式任务 JSON（用于迁移测试）
    const legacyTasks = {
        tasks: [
            { name: '旧任务-待办', priority: '高', level: '项目', project: '测试', status: '待开始', deadline: '2026-12-31', detail: '旧格式待办任务', id: 'old-task-001' },
            { name: '旧任务-进行中', priority: '中', level: '报告', project: '测试', status: '进行中', deadline: '2026-06-30', detail: '旧格式进行中任务', currentStage: '开发', nextStage: '测试', id: 'old-task-002' }
        ],
        completedTasks: [
            { name: '旧任务-已完成', priority: '低', level: 'SOP', project: '测试', status: '已完成', deadline: '2026-01-01', completedAt: '2026-01-01', detail: '旧格式已完成任务', id: 'old-task-003' }
        ]
    };
    writeFileSync(path.join(TEST_DATA_DIR, '任务', '任务清单.json'), JSON.stringify(legacyTasks, null, 2), 'utf8');
    console.log(`  测试数据目录: ${TEST_DATA_DIR}`);
}

async function runTests() {
    console.log('\n=== DocWiki 1.2.2 API 测试（Markdown 任务存储） ===\n');

    // 1. 健康检查
    console.log('1. Health Check');
    const health = await fetchJSON('/api/health');
    assert(health.status === 200 && health.data.status === 'ok', 'GET /api/health → 200 ok');
    assert(health.data.version === '1.2.2', '版本号 = 1.2.2');

    console.log('\n2. 文件树 API');
    const tree = await fetchJSON('/api/tree');
    assert(tree.status === 200 && tree.data.root === 'data', 'GET /api/tree → 200 with root=data');
    assert(Array.isArray(tree.data.children), 'children 是数组');
    const topDirs = (tree.data.children || []).map(c => c.name);
    const expected = ['报告','SOP','任务','文献','写作','软件','项目'];
    const missing = expected.filter(d => !topDirs.includes(d));
    assert(missing.length === 0, `所有栏目目录存在 (缺少: ${missing.join(',') || '无'})`);

    console.log('\n3. 搜索 API');
    const search = await fetchJSON('/api/search?q=知识库');
    assert(search.status === 200, 'GET /api/search → 200');
    assert(Array.isArray(search.data.results), 'results 是数组');
    // 空查询
    const emptySearch = await fetchJSON('/api/search?q=');
    assert(emptySearch.status === 200 && emptySearch.data.results.length === 0, '空搜索返回空数组');

    console.log('\n4. 任务 API（Markdown 存储）');

    // 4a. 迁移旧 JSON → Markdown
    console.log('  4a. 迁移旧任务 JSON');
    const migrateResult = await fetchJSON('/api/tasks', {
        method: 'POST',
        body: { action: 'migrate' }
    });
    assert(migrateResult.status === 200, 'POST /api/tasks migrate → 200');
    assert(migrateResult.data.success === true, '迁移返回 success');
    assert(migrateResult.data.migrated >= 3, `迁移任务数 >= 3 (实际=${migrateResult.data.migrated})`);

    // 迁移后数据应从 Markdown 目录读取
    const afterMigrate = await fetchJSON('/api/tasks');
    assert(afterMigrate.status === 200, '迁移后 GET /api/tasks → 200');
    assert(afterMigrate.data.tasks.length >= 2, `迁移后待办任务 >= 2 (实际=${afterMigrate.data.tasks.length})`);
    assert(afterMigrate.data.completedTasks.length >= 1, `迁移后已完成任务 >= 1 (实际=${afterMigrate.data.completedTasks.length})`);

    // 迁移幂等：再次迁移不重复
    const migrateAgain = await fetchJSON('/api/tasks', {
        method: 'POST',
        body: { action: 'migrate' }
    });
    assert(migrateAgain.status === 200, '二次迁移 → 200（幂等）');
    assert(migrateAgain.data.migrated === 0, `二次迁移不重复 (实际 migrated=${migrateAgain.data.migrated})`);

    // 4b. CRUD：创建任务
    console.log('  4b. 任务 CRUD');
    const createResult = await fetchJSON('/api/tasks', {
        method: 'POST',
        body: {
            action: 'create',
            task: { name: 'CRUD测试任务', priority: '高', level: '项目', project: '测试项目', status: '待开始', deadline: '2026/12/31', detail: 'CRUD 测试详情', sub: '', currentStage: '需求分析', nextStage: '开发实现', plannedDate: '2026-07-01' }
        }
    });
    assert(createResult.status === 201, 'POST create → 201');
    assert(createResult.data.task && createResult.data.task.name === 'CRUD测试任务', '创建任务名称正确');
    assert(createResult.data.task.id, '创建任务有 ID');

    const createdId = createResult.data.task.id;

    // 空名称拒绝
    const emptyName = await fetchJSON('/api/tasks', {
        method: 'POST',
        body: { action: 'create', task: { name: '' } }
    });
    assert(emptyName.status === 400, '空名称创建 → 400');

    // 同名任务拒绝
    const dupName = await fetchJSON('/api/tasks', {
        method: 'POST',
        body: { action: 'create', task: { name: 'CRUD测试任务', priority: '中' } }
    });
    assert(dupName.status === 409, '同名任务创建 → 409');

    // 读取验证
    const getAfterCreate = await fetchJSON('/api/tasks');
    const created = getAfterCreate.data.tasks.find(t => t.name === 'CRUD测试任务');
    assert(created && created.priority === '高', '创建后 GET 读取优先级正确');
    assert(created && created.currentStage === '需求分析', '创建后 currentStage 正确');
    assert(created && !('progressPercentage' in created), '无 progressPercentage 字段');

    // 4c. 更新任务
    console.log('  4c. 更新任务');
    const updateResult = await fetchJSON('/api/tasks', {
        method: 'POST',
        body: {
            action: 'update',
            oldStatus: '待开始',
            task: { id: createdId, name: 'CRUD测试任务-已更新', priority: '中', level: '报告', project: '测试项目2', status: '待开始', detail: '更新后的详情', currentStage: '编码中', nextStage: '代码审查', plannedDate: '2026-07-15' }
        }
    });
    assert(updateResult.status === 200, 'POST update → 200');
    assert(updateResult.data.task.name === 'CRUD测试任务-已更新', '更新后名称正确');
    assert(updateResult.data.task.priority === '中', '更新后优先级正确');

    // 更新不存在的任务
    const updateMissing = await fetchJSON('/api/tasks', {
        method: 'POST',
        body: { action: 'update', task: { id: 'nonexistent-999', name: '不存在', status: '待开始' } }
    });
    assert(updateMissing.status === 404, '更新不存在的任务 → 404');

    // 4d. 完成 + 恢复
    console.log('  4d. 完成与恢复');
    const completeResult = await fetchJSON('/api/tasks', {
        method: 'POST',
        body: { action: 'complete', id: createdId }
    });
    assert(completeResult.status === 200, 'POST complete → 200');
    assert(completeResult.data.task.status === '已完成', '完成后状态为已完成');

    // 验证任务从待办移到已完成
    const afterComplete = await fetchJSON('/api/tasks');
    const stillInTodo = afterComplete.data.tasks.find(t => t.name === 'CRUD测试任务-已更新');
    assert(!stillInTodo, '完成后不在待办列表');
    const inDone = afterComplete.data.completedTasks.find(t => t.name === 'CRUD测试任务-已更新');
    assert(inDone && inDone.status === '已完成', '完成后在已完成列表');

    // 恢复
    const restoreResult = await fetchJSON('/api/tasks', {
        method: 'POST',
        body: { action: 'restore', id: createdId }
    });
    assert(restoreResult.status === 200, 'POST restore → 200');
    assert(restoreResult.data.task.status === '待开始', '恢复后状态为待开始');

    // 4e. 删除
    console.log('  4e. 删除任务');
    const deleteResult = await fetchJSON('/api/tasks', {
        method: 'POST',
        body: { action: 'delete', id: createdId }
    });
    assert(deleteResult.status === 200, 'POST delete → 200');

    const afterDelete = await fetchJSON('/api/tasks');
    const deleted = afterDelete.data.tasks.find(t => t.id === createdId);
    assert(!deleted, '删除后任务不存在');

    // 删除不存在的任务
    const deleteMissing = await fetchJSON('/api/tasks', {
        method: 'POST',
        body: { action: 'delete', id: 'nonexistent-999' }
    });
    assert(deleteMissing.status === 404, '删除不存在的任务 → 404');

    // 4f. 全量同步
    console.log('  4f. 全量 sync');
    const syncTasks = [
        { name: 'sync任务1', priority: '高', level: '项目', status: '待开始', detail: 'sync1' },
        { name: 'sync任务2', priority: '中', level: '报告', status: '进行中', detail: 'sync2' }
    ];
    const syncCompleted = [
        { name: 'sync已完成', priority: '低', level: 'SOP', status: '已完成', detail: 'sync3' }
    ];
    const syncResult = await fetchJSON('/api/tasks', {
        method: 'POST',
        body: { action: 'sync', tasks: syncTasks, completedTasks: syncCompleted }
    });
    assert(syncResult.status === 200 && syncResult.data.success, 'sync → 200 success');
    assert(syncResult.data.count === 3, `sync 写入 3 条 (实际=${syncResult.data.count})`);

    // 验证 sync 覆盖
    const afterSync = await fetchJSON('/api/tasks');
    assert(afterSync.data.tasks.length === 2, `sync 后待办 = 2 (实际=${afterSync.data.tasks.length})`);
    assert(afterSync.data.completedTasks.length === 1, `sync 后已完成 = 1 (实际=${afterSync.data.completedTasks.length})`);

    // 4g. 非法 action
    console.log('  4g. 错误处理');
    const badAction = await fetchJSON('/api/tasks', {
        method: 'POST',
        body: { action: 'invalid_action' }
    });
    assert(badAction.status === 400, '未知 action → 400');

    console.log('\n5. 文件 CRUD');
    const testPath = '测试/自动化测试文件.md';
    // 创建
    const fileCreated = await fetchJSON('/api/file', {
        method: 'POST',
        body: { path: testPath, content: '# 自动化测试\n\n测试内容' }
    });
    assert(fileCreated.status === 201, 'POST /api/file → 201 创建文件');
    assert(fileCreated.data.path === testPath, '路径正确');

    // 读取
    const read = await fetchJSON(`/api/file?path=${encodeURIComponent(testPath)}`);
    assert(read.status === 200 && read.data.content.includes('自动化测试'), 'GET /api/file → 读取成功');

    // 更新
    const updated = await fetchJSON('/api/file', {
        method: 'PUT',
        body: { path: testPath, content: '# 已更新\n\n新内容', expectedModifiedAt: read.data.modifiedAt }
    });
    assert(updated.status === 200, 'PUT /api/file → 200 更新成功');

    // 冲突检测
    const conflict = await fetchJSON('/api/file', {
        method: 'PUT',
        body: { path: testPath, content: '# 冲突', expectedModifiedAt: '2020-01-01T00:00:00.000Z' }
    });
    assert(conflict.status === 409, 'PUT /api/file → 409 冲突检测生效');

    // 移动（PATCH /api/entry）— 拖拽 DnD 核心 API
    // 先创建目标目录
    await fetchJSON('/api/folder', { method: 'POST', body: { path: '测试/移动目标' } });
    const movePath = '测试/移动目标/自动化测试文件.md';
    const moved = await fetchJSON('/api/entry', {
        method: 'PATCH',
        body: { path: testPath, newPath: movePath }
    });
    assert(moved.status === 200, 'PATCH /api/entry → 200 移动成功');
    assert(moved.data.path === movePath, '移动后路径正确');
    // 验证原路径不存在
    const oldCheck = await fetchJSON(`/api/file?path=${encodeURIComponent(testPath)}`);
    assert(oldCheck.status === 404, '移动后原路径 404');
    // 验证新路径可读
    const newCheck = await fetchJSON(`/api/file?path=${encodeURIComponent(movePath)}`);
    assert(newCheck.status === 200, '移动后新路径可访问 (200)');
    assert(newCheck.data.path === movePath, '移动后 GET 返回正确路径');
    assert(typeof newCheck.data.content === 'string' && newCheck.data.content.length > 0, '移动后文件内容非空');

    // 禁止移动到自身子目录
    const selfMove = await fetchJSON('/api/entry', {
        method: 'PATCH',
        body: { path: movePath, newPath: movePath + '/子目录/文件.md' }
    });
    // 这个操作应该失败（目标路径在"文件"下面，不合法；或者如果后端检查不严，至少路径前缀检测会阻止）
    // 至少确保不会静默成功——因为后端要求目标路径的父目录存在
    assert(selfMove.status !== 200, `自身子目录移动被阻止 (status=${selfMove.status})`);

    // ========== 复制 API 测试 ==========
    console.log('\n5b. 文件复制 (POST /api/entry/copy)');

    // 先重建原文件用于复制测试
    await fetchJSON('/api/file', {
        method: 'POST',
        body: { path: testPath, content: '# 用于复制测试\n\n复制内容测试' }
    });

    // 5b.1 复制文件
    const copyPath = '测试/复制目标/复制后文件.md';
    await fetchJSON('/api/folder', { method: 'POST', body: { path: '测试/复制目标' } });
    const copied = await fetchJSON('/api/entry/copy', {
        method: 'POST',
        body: { path: testPath, newPath: copyPath }
    });
    assert(copied.status === 201, 'POST /api/entry/copy → 201 复制成功');
    assert(copied.data.path === copyPath, '复制后路径正确');
    // 原文件仍存在
    const origStill = await fetchJSON(`/api/file?path=${encodeURIComponent(testPath)}`);
    assert(origStill.status === 200, '复制后原文件仍存在');
    // 新文件可读
    const copyRead = await fetchJSON(`/api/file?path=${encodeURIComponent(copyPath)}`);
    assert(copyRead.status === 200, '复制文件可读');

    // 5b.2 目录递归复制
    await fetchJSON('/api/folder', { method: 'POST', body: { path: '测试/源目录' } });
    await fetchJSON('/api/folder', { method: 'POST', body: { path: '测试/源目录/子目录' } });
    await fetchJSON('/api/file', {
        method: 'POST',
        body: { path: '测试/源目录/文件1.md', content: '# 文件1\n内容1' }
    });
    await fetchJSON('/api/file', {
        method: 'POST',
        body: { path: '测试/源目录/子目录/文件2.md', content: '# 文件2\n内容2' }
    });
    const dirCopy = await fetchJSON('/api/entry/copy', {
        method: 'POST',
        body: { path: '测试/源目录', newPath: '测试/源目录_副本' }
    });
    assert(dirCopy.status === 201, 'POST /api/entry/copy 目录 → 201 递归复制成功');
    // 验证递归复制：子文件1和子目录/文件2都存在
    const dc1 = await fetchJSON('/api/file?path=' + encodeURIComponent('测试/源目录_副本/文件1.md'));
    assert(dc1.status === 200, '递归复制后文件1可读');
    const dc2 = await fetchJSON('/api/file?path=' + encodeURIComponent('测试/源目录_副本/子目录/文件2.md'));
    assert(dc2.status === 200, '递归复制后嵌套文件2可读');

    // 5b.3 409 冲突：目标已存在
    const conflictCopy = await fetchJSON('/api/entry/copy', {
        method: 'POST',
        body: { path: testPath, newPath: copyPath } // copyPath 已存在
    });
    assert(conflictCopy.status === 409, 'POST /api/entry/copy → 409 目标已存在');

    // 5b.4 400 禁止复制到自身
    const selfCopy = await fetchJSON('/api/entry/copy', {
        method: 'POST',
        body: { path: testPath, newPath: testPath }
    });
    assert(selfCopy.status === 400, 'POST /api/entry/copy → 400 禁止复制到自身');

    // 5b.5 400 禁止复制到自身子目录
    const subCopy = await fetchJSON('/api/entry/copy', {
        method: 'POST',
        body: { path: '测试/源目录_副本', newPath: '测试/源目录_副本/子目录/自身副本' }
    });
    assert(subCopy.status === 400, 'POST /api/entry/copy → 400 禁止复制到自身子目录');

    // 5b.6 路径遍历防护
    const traversalCopy = await fetchJSON('/api/entry/copy', {
        method: 'POST',
        body: { path: testPath, newPath: '..%2F..%2Fevil.md' }
    });
    assert(traversalCopy.status === 403, 'POST /api/entry/copy → 403 路径遍历被拦截');

    // 删除（清理测试目录）
    await fetchJSON('/api/entry?path=测试', { method: 'DELETE' }).catch(() => {});

    console.log('\n6. Agent 路由');
    // 供应商列表
    const providers = await fetchJSON('/api/agent/providers');
    assert(providers.status === 200, 'GET /api/agent/providers → 200');
    assert(Array.isArray(providers.data.providers), 'providers 是数组');
    assert(providers.data.providers.length >= 11, '预置供应商 >= 11');

    // 模型列表
    const models = await fetchJSON('/api/agent/models');
    assert(models.status === 200, 'GET /api/agent/models → 200');
    assert(Array.isArray(models.data.models), 'models 是数组');

    // 场景分配
    const assignments = await fetchJSON('/api/agent/assignments');
    assert(assignments.status === 200, 'GET /api/agent/assignments → 200');

    // 路由查看
    const routing = await fetchJSON('/api/agent/routing/default');
    assert(routing.status === 200, 'GET /api/agent/routing/default → 200');

    console.log('\n7. 数据路径安全');
    // 路径遍历防护 — 被拦截（可能是 400 因为非 .md 后缀先被检查，或 403）
    const traversal = await fetchJSON('/api/file?path=..%2F..%2Fpackage.json');
    assert(traversal.status === 403 || traversal.status === 400, `路径遍历攻击被拦截 (${traversal.status})`);

    const traversal2 = await fetchJSON('/api/file?path=..%2Fpackage.json');
    assert(traversal2.status === 403 || traversal2.status === 400, `相对路径遍历被拦截 (${traversal2.status})`);

    // 非法文件类型
    const badFile = await fetchJSON('/api/file?path=test.txt');
    assert(badFile.status === 400, '非 Markdown 文件被拒绝');

    // 带 .md 后缀但路径仍包含遍历
    const traversalMd = await fetchJSON('/api/file?path=..%2F..%2Ftest.md');
    assert(traversalMd.status === 403, `目录遍历防护(.md): ${traversalMd.status}`);

    // 结果
    console.log(`\n=== 测试结果: ${passed} 通过, ${failed} 失败 ===\n`);
}

async function startServer() {
    return new Promise((resolve, reject) => {
        serverProcess = spawn('node', [path.join(rootDir, 'server.mjs')], {
            cwd: rootDir,
            env: {
                ...process.env,
                PORT: String(PORT),
                DOCWIKI_DATA_DIR: TEST_DATA_DIR,
                DOCWIKI_STATE_DIR: TEST_STATE_DIR,
                WEBWIKI_DATA_DIR: TEST_DATA_DIR,
                WEBWIKI_STATE_DIR: TEST_STATE_DIR,
            },
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let started = false;
        const timeout = setTimeout(() => {
            if (!started) reject(new Error('Server start timeout'));
        }, 15000);

        serverProcess.stdout.on('data', chunk => {
            const msg = chunk.toString();
            if (msg.includes('已启动')) {
                started = true;
                clearTimeout(timeout);
                setTimeout(resolve, 800);
            }
        });
        serverProcess.stderr.on('data', chunk => console.error('[Server]', chunk.toString().trim()));
        serverProcess.on('error', reject);
    });
}

function stopServer() {
    if (serverProcess) {
        serverProcess.kill('SIGTERM');
        serverProcess = null;
    }
}

function cleanup() {
    rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    rmSync(TEST_STATE_DIR, { recursive: true, force: true });
}

async function main() {
    try {
        setupTestData();
        await startServer();
        await runTests();
    } catch (err) {
        console.error('测试失败:', err.message);
        failed++;
        console.log(`\n=== 测试结果: ${passed} 通过, ${failed} 失败 ===\n`);
    } finally {
        stopServer();
        // 短暂等待确保进程退出
        await new Promise(r => setTimeout(r, 500));
        cleanup();
        if (failed > 0) process.exit(1);
    }
}

main();
