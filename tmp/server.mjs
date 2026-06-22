import http from 'node:http';
import { readFile, writeFile, mkdir, readdir, stat, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 初始化数据库（异步）
import { initDatabase, saveDatabase } from './db/index.js';
import * as documentIndex from './core/documents.js';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(process.env.DOCWIKI_DATA_DIR || path.join(rootDir, 'data'));
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
};

function sendJson(response, status, payload) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(payload));
}

function resolveDataPath(relativePath = '') {
    const normalized = String(relativePath).replaceAll('\\', '/').replace(/^\/+/, '');
    const resolved = path.resolve(dataDir, normalized);
    const relative = path.relative(dataDir, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        const err = new Error('禁止访问 data 目录以外的路径');
        err.code = 'EACCES';
        err.statusCode = 403;
        throw err;
    }
    return resolved;
}

async function readBody(request) {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
        size += chunk.length;
        if (size > 12 * 1024 * 1024) throw new Error('请求内容过大');
        chunks.push(chunk);
    }
    return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

async function scanDirectory(absoluteDir, relativeDir = '') {
    const entries = await readdir(absoluteDir, { withFileTypes: true });
    const visible = entries.filter(entry => !entry.name.startsWith('.') && entry.name !== '.history');
    visible.sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name, 'zh-CN', { numeric: true });
    });

    return Promise.all(visible.map(async entry => {
        const relativePath = path.posix.join(relativeDir.replaceAll('\\', '/'), entry.name);
        const absolutePath = path.join(absoluteDir, entry.name);
        const info = await stat(absolutePath);
        if (entry.isDirectory()) {
            return {
                type: 'directory',
                name: entry.name,
                path: relativePath,
                modifiedAt: info.mtime.toISOString(),
                children: await scanDirectory(absolutePath, relativePath)
            };
        }
        return {
            type: 'file',
            name: entry.name,
            path: relativePath,
            modifiedAt: info.mtime.toISOString(),
            size: info.size
        };
    }));
}

async function handleApi(request, response, url) {
    if (request.method === 'GET' && url.pathname === '/api/health') {
        return sendJson(response, 200, { status: 'ok', service: 'docwiki', version: '1.0.0' });
    }
    if (request.method === 'GET' && url.pathname === '/api/tree') {
        await mkdir(dataDir, { recursive: true });
        return sendJson(response, 200, { root: 'data', children: await scanDirectory(dataDir) });
    }

    if (request.method === 'GET' && url.pathname === '/api/file') {
        const relativePath = url.searchParams.get('path') || '';
        if (!relativePath.toLowerCase().endsWith('.md')) return sendJson(response, 400, { error: '只能读取 Markdown 文件' });
        const absolutePath = resolveDataPath(relativePath);
        try {
            const [content, info] = await Promise.all([readFile(absolutePath, 'utf8'), stat(absolutePath)]);
            return sendJson(response, 200, { path: relativePath, content, modifiedAt: info.mtime.toISOString() });
        } catch (err) {
            if (err.code === 'ENOENT') {
                return sendJson(response, 404, { error: `文件未找到: ${relativePath}`, suggestion: '请确认路径是否正确，或通过知识库浏览查找该文件' });
            }
            throw err;
        }
    }

    if (request.method === 'GET' && url.pathname === '/api/asset') {
        const relativePath = url.searchParams.get('path') || '';
        const extension = path.extname(relativePath).toLowerCase();
        if (!['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(extension)) {
            return sendJson(response, 400, { error: '不支持的图片格式' });
        }
        const content = await readFile(resolveDataPath(relativePath));
        response.writeHead(200, { 'Content-Type': mimeTypes[extension], 'Cache-Control': 'no-cache' });
        response.end(content);
        return;
    }

    if (request.method === 'POST' && url.pathname === '/api/asset') {
        const body = await readBody(request);
        const relativePath = String(body.path || '').replaceAll('\\', '/');
        const extension = path.extname(relativePath).toLowerCase();
        if (!['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(extension)) {
            return sendJson(response, 400, { error: '仅支持 PNG、JPEG、GIF 和 WebP 图片' });
        }
        if (!relativePath.split('/').includes('assets')) {
            return sendJson(response, 400, { error: '图片必须保存在 assets 目录' });
        }
        const match = String(body.data || '').match(/^data:image\/(?:png|jpeg|gif|webp);base64,(.+)$/);
        if (!match) return sendJson(response, 400, { error: '图片数据无效' });
        const content = Buffer.from(match[1], 'base64');
        if (content.length > 6 * 1024 * 1024) return sendJson(response, 413, { error: '图片不能超过 6MB' });
        const absolutePath = resolveDataPath(relativePath);
        await mkdir(path.dirname(absolutePath), { recursive: true });
        await writeFile(absolutePath, content, { flag: 'wx' });
        return sendJson(response, 201, { path: relativePath });
    }

    if (request.method === 'PUT' && url.pathname === '/api/file') {
        const body = await readBody(request);
        if (!String(body.path || '').toLowerCase().endsWith('.md')) return sendJson(response, 400, { error: '只能保存 Markdown 文件' });
        const absolutePath = resolveDataPath(body.path);
        const current = await stat(absolutePath);
        if (body.expectedModifiedAt && current.mtime.toISOString() !== body.expectedModifiedAt) {
            return sendJson(response, 409, { error: '文件已被其他程序修改，请重新加载后再保存', modifiedAt: current.mtime.toISOString() });
        }
        // 保存历史版本（在覆盖前）
        const historyDir = path.join(path.dirname(absolutePath), '.history');
        const baseName = path.basename(absolutePath, '.md');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const historyFile = path.join(historyDir, baseName + '.' + timestamp + '.md');
        try {
            const currentContent = await readFile(absolutePath, 'utf8');
            // 只在内容真正改变时创建历史版本
            if (currentContent !== String(body.content ?? '')) {
                await mkdir(historyDir, { recursive: true });
                await writeFile(historyFile, currentContent, 'utf8');
            }
        } catch {
            // 读取失败不阻止保存（例如新文件首次保存）
        }
        await writeFile(absolutePath, String(body.content ?? ''), 'utf8');
        const saved = await stat(absolutePath);
        documentIndex.indexDocument(absolutePath, String(body.path).replaceAll('\\', '/'));
        return sendJson(response, 200, { path: body.path, modifiedAt: saved.mtime.toISOString() });
    }

    if (request.method === 'POST' && url.pathname === '/api/file') {
        const body = await readBody(request);
        const relativePath = String(body.path || '');
        if (!relativePath.toLowerCase().endsWith('.md')) return sendJson(response, 400, { error: '文件名必须以 .md 结尾' });
        const absolutePath = resolveDataPath(relativePath);
        await mkdir(path.dirname(absolutePath), { recursive: true });
        await writeFile(absolutePath, String(body.content ?? ''), { encoding: 'utf8', flag: 'wx' });
        const created = await stat(absolutePath);
        documentIndex.indexDocument(absolutePath, relativePath.replaceAll('\\', '/'));
        return sendJson(response, 201, { path: relativePath, modifiedAt: created.mtime.toISOString() });
    }

    if (request.method === 'POST' && url.pathname === '/api/folder') {
        const body = await readBody(request);
        await mkdir(resolveDataPath(body.path), { recursive: false });
        return sendJson(response, 201, { path: body.path });
    }

    if (request.method === 'PATCH' && url.pathname === '/api/entry') {
        const body = await readBody(request);
        const sourcePath = resolveDataPath(body.path);
        const targetPath = resolveDataPath(body.newPath);
        if (sourcePath !== targetPath) {
            try {
                await stat(targetPath);
                return sendJson(response, 409, { error: '目标名称已存在' });
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
            }
        }
        await rename(sourcePath, targetPath);
        documentIndex.rebuildIndex();
        return sendJson(response, 200, { path: body.newPath });
    }

    if (request.method === 'DELETE' && url.pathname === '/api/entry') {
        const relativePath = url.searchParams.get('path') || '';
        if (!relativePath) return sendJson(response, 400, { error: '缺少路径' });
        await rm(resolveDataPath(relativePath), { recursive: true, force: false });
        documentIndex.rebuildIndex();
        return sendJson(response, 200, { path: relativePath });
    }

    // ========== 搜索 API ==========
    if (request.method === 'GET' && url.pathname === '/api/search') {
        const query = (url.searchParams.get('q') || '').trim();
        if (!query) return sendJson(response, 200, { results: [] });
        
        const results = [];
        const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
        
        async function searchDir(absoluteDir, relativeDir = '') {
            let entries;
            try { entries = await readdir(absoluteDir, { withFileTypes: true }); }
            catch { return; }
            
            for (const entry of entries) {
                if (entry.name.startsWith('.') || entry.name === '.history') continue;
                const relPath = relativeDir ? relativeDir + '/' + entry.name : entry.name;
                const absPath = path.join(absoluteDir, entry.name);
                
                if (entry.isDirectory()) {
                    await searchDir(absPath, relPath);
                } else if (entry.name.toLowerCase().endsWith('.md')) {
                    // 检查文件名匹配
                    const nameMatch = keywords.some(kw => entry.name.toLowerCase().includes(kw));
                    let contentMatch = false;
                    let snippet = '';
                    
                    if (!nameMatch) {
                        // 搜索内容
                        try {
                            const content = await readFile(absPath, 'utf8');
                            const lowerContent = content.toLowerCase();
                            for (const kw of keywords) {
                                const idx = lowerContent.indexOf(kw);
                                if (idx !== -1) {
                                    contentMatch = true;
                                    const start = Math.max(0, idx - 30);
                                    const end = Math.min(content.length, idx + kw.length + 50);
                                    snippet = (start > 0 ? '...' : '') + content.slice(start, end).replace(/\n/g, ' ').trim() + (end < content.length ? '...' : '');
                                    break;
                                }
                            }
                        } catch { /* skip unreadable files */ }
                    }
                    
                    if (nameMatch || contentMatch) {
                        results.push({
                            path: relPath,
                            name: entry.name.replace(/\.md$/i, ''),
                            type: nameMatch ? 'filename' : 'content',
                            snippet: snippet || undefined
                        });
                    }
                    
                    // 限制结果数量
                    if (results.length >= 30) return;
                }
            }
        }
        
        await searchDir(dataDir);
        return sendJson(response, 200, { results: results.slice(0, 20) });
    }

    // ========== 历史版本 API 路由 ==========
    // GET /api/history?path=... — 列出某文件的历史版本
    if (request.method === 'GET' && url.pathname === '/api/history') {
        const relativePath = url.searchParams.get('path') || '';
        if (!relativePath.toLowerCase().endsWith('.md')) return sendJson(response, 400, { error: '只能查询 Markdown 文件的历史' });
        const absolutePath = resolveDataPath(relativePath);
        const historyDir = path.join(path.dirname(absolutePath), '.history');
        const baseName = path.basename(absolutePath, '.md');
        try {
            const files = await readdir(historyDir);
            const historyFiles = files.filter(f => f.startsWith(baseName + '.') && f.endsWith('.md'));
            const versions = (await Promise.all(historyFiles.map(async f => {
                const info = await stat(path.join(historyDir, f));
                return {
                    name: f,
                    path: relativePath.replace(/\.md$/, '') + '/.history/' + f,
                    timestamp: info.mtime.toISOString().replace('T', ' ').slice(0, 19),
                    modifiedAt: info.mtime.toISOString()
                };
            }))).sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
            return sendJson(response, 200, { versions });
        } catch {
            return sendJson(response, 200, { versions: [] });
        }
    }

    // GET /api/history/content?path=...&version=... — 获取历史版本内容
    if (request.method === 'GET' && url.pathname === '/api/history/content') {
        const relativePath = url.searchParams.get('path') || '';
        const versionFile = url.searchParams.get('version') || '';
        if (!relativePath || !versionFile) return sendJson(response, 400, { error: '缺少参数' });
        const absolutePath = resolveDataPath(relativePath);
        const expectedHistoryPrefix = path.basename(absolutePath, '.md') + '.';
        if (path.basename(versionFile) !== versionFile || !versionFile.startsWith(expectedHistoryPrefix) || !versionFile.endsWith('.md')) {
            return sendJson(response, 400, { error: '无效的历史版本' });
        }
        const historyDir = path.join(path.dirname(absolutePath), '.history');
        const historyFilePath = path.join(historyDir, versionFile);
        try {
            const content = await readFile(historyFilePath, 'utf8');
            return sendJson(response, 200, { content });
        } catch {
            return sendJson(response, 404, { error: '历史版本不存在' });
        }
    }

    // POST /api/history/restore — 恢复历史版本（将历史版本内容写回原文件）
    if (request.method === 'POST' && url.pathname === '/api/history/restore') {
        const body = await readBody(request);
        const relativePath = String(body.path || '');
        const versionFile = String(body.version || '');
        if (!relativePath || !versionFile) return sendJson(response, 400, { error: '缺少参数' });
        const absolutePath = resolveDataPath(relativePath);
        const expectedHistoryPrefix = path.basename(absolutePath, '.md') + '.';
        if (path.basename(versionFile) !== versionFile || !versionFile.startsWith(expectedHistoryPrefix) || !versionFile.endsWith('.md')) {
            return sendJson(response, 400, { error: '无效的历史版本' });
        }
        const historyDir = path.join(path.dirname(absolutePath), '.history');
        const historyFilePath = path.join(historyDir, versionFile);
        try {
            const historyContent = await readFile(historyFilePath, 'utf8');
            // 先保存当前版本到历史
            try {
                const currentContent = await readFile(absolutePath, 'utf8');
                const baseName = path.basename(absolutePath, '.md');
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const preRestoreFile = path.join(historyDir, baseName + '.pre-restore-' + timestamp + '.md');
                await writeFile(preRestoreFile, currentContent, 'utf8');
            } catch { /* 当前文件可能不存在 */ }
            await writeFile(absolutePath, historyContent, 'utf8');
            const saved = await stat(absolutePath);
            documentIndex.indexDocument(absolutePath, relativePath.replaceAll('\\', '/'));
            return sendJson(response, 200, { path: relativePath, modifiedAt: saved.mtime.toISOString() });
        } catch (error) {
            return sendJson(response, 404, { error: '恢复失败：' + error.message });
        }
    }

    // ========== 任务 API 路由 ==========
    const taskJsonPath = path.join(dataDir, '任务', '任务清单.json');
    const taskMdPath = path.join(dataDir, '任务', '任务清单.md');

    // GET /api/tasks — 获取任务数据
    if (request.method === 'GET' && url.pathname === '/api/tasks') {
        try {
            const raw = await readFile(taskJsonPath, 'utf-8');
            return sendJson(response, 200, JSON.parse(raw));
        } catch {
            return sendJson(response, 200, { tasks: [], completedTasks: [] });
        }
    }

    // POST /api/tasks — 保存任务数据
    if (request.method === 'POST' && url.pathname === '/api/tasks') {
        const body = await readBody(request);
        const data = { tasks: body.tasks || [], completedTasks: body.completedTasks || [] };
        // 保存 JSON
        await mkdir(path.dirname(taskJsonPath), { recursive: true });
        await writeFile(taskJsonPath, JSON.stringify(data, null, 2), 'utf-8');
        // 生成 Markdown
        let md = '# 任务清单\n\n本文件记录所有研发任务的状态和详情。\n';
        const active = data.tasks.filter(t => t.status === '进行中');
        const pending = data.tasks.filter(t => t.status === '待开始');
        const completed = [...data.completedTasks, ...data.tasks.filter(t => t.status === '已完成')];
        if (active.length) {
            md += '\n## 进行中\n\n';
            active.forEach((t, i) => { md += `### ${i+1}. ${t.name}\n- **优先级**: ${t.priority}\n- **状态**: ${t.status}\n- **截止日期**: ${t.deadline || ''}\n- **所属项目**: ${t.category} > ${t.project}${t.sub ? ' > ' + t.sub : ''}\n- **描述**: ${t.description || ''}\n\n`; });
        }
        if (pending.length) {
            md += '\n## 待开始\n\n';
            pending.forEach((t, i) => { md += `### ${active.length+i+1}. ${t.name}\n- **优先级**: ${t.priority}\n- **状态**: ${t.status}\n- **截止日期**: ${t.deadline || ''}\n- **所属项目**: ${t.category} > ${t.project}${t.sub ? ' > ' + t.sub : ''}\n- **描述**: ${t.description || ''}\n\n`; });
        }
        if (completed.length) {
            md += '\n## 已完成\n\n';
            completed.forEach((t, i) => { md += `### ${active.length+pending.length+i+1}. ${t.name}\n- **优先级**: ${t.priority}\n- **状态**: ${t.status || '已完成'}\n- **完成时间**: ${t.completedAt || t.deadline || ''}\n- **所属项目**: ${t.category} > ${t.project}${t.sub ? ' > ' + t.sub : ''}\n- **描述**: ${t.description || ''}\n\n`; });
        }
        await writeFile(taskMdPath, md, 'utf-8');
        // 重建索引
        documentIndex.indexDocument(taskMdPath, '任务/任务清单.md');
        return sendJson(response, 200, { success: true });
    }

    // ========== Agent API 路由 ==========
    if (url.pathname.startsWith('/api/agent/')) {
        // 延迟导入避免循环依赖
        const { default: agentRouter, convRouter, docRouter } = await import('./server/routes/agent.js');
        const agentPath = url.pathname.slice('/api/agent'.length) || '/';
        const body = ['POST', 'PUT', 'PATCH'].includes(request.method) ? await readBody(request) : null;
        
        // 对话路由
        if (agentPath.startsWith('/conversations')) {
            const result = convRouter.handle(request.method, agentPath, body);
            if (result) {
                const resolved = result.then ? await result : result;
                return sendJson(response, resolved.status, resolved.data);
            }
        }
        // 文档路由
        else if (agentPath.startsWith('/documents')) {
            const result = docRouter.handle(request.method, agentPath, body, url.searchParams);
            if (result) {
                const resolved = result.then ? await result : result;
                return sendJson(response, resolved.status, resolved.data);
            }
        }
        // 其他 Agent 路由（供应商、模型、密钥等）
        else {
            const result = agentRouter.handle(request.method, agentPath, body);
            if (result) {
                const resolved = result.then ? await result : result;
                return sendJson(response, resolved.status, resolved.data);
            }
        }
        return sendJson(response, 404, { error: 'Agent 接口不存在' });
    }

    sendJson(response, 404, { error: '接口不存在' });
}

async function handleStatic(response, url) {
    const requestPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const absolutePath = path.resolve(rootDir, requestPath.replace(/^\/+/, ''));
    const relative = path.relative(rootDir, absolutePath);
    if (relative.startsWith('..') || path.isAbsolute(relative) || relative.startsWith(`data${path.sep}`)) {
        return sendJson(response, 403, { error: '禁止访问' });
    }
    const content = await readFile(absolutePath);
    response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(absolutePath).toLowerCase()] || 'application/octet-stream' });
    response.end(content);
}

// 启动服务器
async function startServer() {
    // 初始化数据库
    await initDatabase();
    const indexed = documentIndex.rebuildIndex();
    console.log(`[Index] 已索引 data 目录中的 ${indexed.success} 个 Markdown 文件`);
    
    // 导入 Agent 路由（数据库初始化后）
    const { default: agentRouter } = await import('./server/routes/agent.js');
    
    const server = http.createServer(async (request, response) => {
        const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
        try {
            if (url.pathname.startsWith('/api/')) await handleApi(request, response, url);
            else await handleStatic(response, url);
        } catch (error) {
            const code = error?.code;
            const status = error?.statusCode || (code === 'ENOENT' ? 404 : code === 'EEXIST' ? 409 : 500);
            sendJson(response, status, { error: status === 500 && !error.statusCode ? '本地服务处理失败' : error.message });
            if (status === 500 && !error.statusCode) console.error(error);
        }
    });

    server.listen(port, '127.0.0.1', () => {
        console.log(`个人研发知识库已启动：http://127.0.0.1:${port}`);
    });

    // 优雅关闭
    process.on('SIGINT', () => {
        console.log('\n正在关闭服务器...');
        saveDatabase();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\n正在关闭服务器...');
        saveDatabase();
        process.exit(0);
    });
}

startServer().catch(err => {
    console.error('服务器启动失败:', err);
    process.exit(1);
});
