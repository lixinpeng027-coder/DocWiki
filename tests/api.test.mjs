// DocWiki 1.2.0 后端 API 自动化测试
// 用法: node tests/api.test.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const PORT = 14173;
const BASE = `http://127.0.0.1:${PORT}`;

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

async function runTests() {
    console.log('\n=== DocWiki 1.2.0 API 测试 ===\n');

    // 1. 健康检查
    console.log('1. Health Check');
    const health = await fetchJSON('/api/health');
    assert(health.status === 200 && health.data.status === 'ok', 'GET /api/health → 200 ok');
    assert(health.data.version === '1.2.1', '版本号 = 1.2.1');

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

    console.log('\n4. 任务 API');
    const tasks = await fetchJSON('/api/tasks');
    assert(tasks.status === 200, 'GET /api/tasks → 200');
    assert(Array.isArray(tasks.data.tasks), 'tasks 是数组');
    assert(Array.isArray(tasks.data.completedTasks), 'completedTasks 是数组');
    // 保存并验证
    const testTask = { name: '测试任务-自动化', priority: '高', level: '项目', project: '测试项目', status: '待开始', deadline: '2026/12/31', detail: '自动化测试创建', sub: '', currentStage: '需求分析', nextStage: '开发实现', plannedDate: '2026-07-01' };
    const saveResult = await fetchJSON('/api/tasks', {
        method: 'POST',
        body: { tasks: [testTask], completedTasks: [] }
    });
    assert(saveResult.status === 200 && saveResult.data.success, 'POST /api/tasks → 保存成功');
    // 验证持久化
    const reloaded = await fetchJSON('/api/tasks');
    assert(reloaded.data.tasks.length >= 1, '保存后重新加载数据存在');
    const saved = reloaded.data.tasks.find(t => t.name === '测试任务-自动化');
    assert(saved && saved.priority === '高', '优先级正确保存为"高"');
    assert(saved && saved.status === '待开始', '状态正确保存');
    assert(saved && saved.currentStage === '需求分析', 'currentStage 正确保存');
    assert(saved && saved.nextStage === '开发实现', 'nextStage 正确保存');
    assert(saved && saved.plannedDate === '2026-07-01', 'plannedDate 正确保存');
    assert(saved && !('progressPercentage' in saved), '无 progressPercentage 字段');
    // 清理
    await fetchJSON('/api/tasks', {
        method: 'POST',
        body: { tasks: [], completedTasks: [] }
    });

    console.log('\n5. 文件 CRUD');
    const testPath = '测试/自动化测试文件.md';
    // 创建
    const created = await fetchJSON('/api/file', {
        method: 'POST',
        body: { path: testPath, content: '# 自动化测试\n\n测试内容' }
    });
    assert(created.status === 201, 'POST /api/file → 201 创建文件');
    assert(created.data.path === testPath, '路径正确');

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
                DOCWIKI_DATA_DIR: path.join(rootDir, 'data'),
                DOCWIKI_STATE_DIR: path.join(rootDir, '.webwiki-test'),
            },
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let started = false;
        const timeout = setTimeout(() => {
            if (!started) reject(new Error('Server start timeout'));
        }, 10000);

        serverProcess.stdout.on('data', chunk => {
            const msg = chunk.toString();
            if (msg.includes('已启动')) {
                started = true;
                clearTimeout(timeout);
                setTimeout(resolve, 500); // 等一会确保就绪
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

async function main() {
    try {
        await startServer();
        await runTests();
    } catch (err) {
        console.error('测试失败:', err.message);
        failed++;
        console.log(`\n=== 测试结果: ${passed} 通过, ${failed} 失败 ===\n`);
    } finally {
        stopServer();
        if (failed > 0) process.exit(1);
    }
}

main();
