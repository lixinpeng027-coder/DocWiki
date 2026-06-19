import http from 'node:http';
import { readFile, writeFile, mkdir, readdir, stat, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(rootDir, 'data');
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
        throw new Error('路径超出 data 目录');
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
    const visible = entries.filter(entry => !entry.name.startsWith('.'));
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
    if (request.method === 'GET' && url.pathname === '/api/tree') {
        await mkdir(dataDir, { recursive: true });
        return sendJson(response, 200, { root: 'data', children: await scanDirectory(dataDir) });
    }

    if (request.method === 'GET' && url.pathname === '/api/file') {
        const relativePath = url.searchParams.get('path') || '';
        if (!relativePath.toLowerCase().endsWith('.md')) return sendJson(response, 400, { error: '只能读取 Markdown 文件' });
        const absolutePath = resolveDataPath(relativePath);
        const [content, info] = await Promise.all([readFile(absolutePath, 'utf8'), stat(absolutePath)]);
        return sendJson(response, 200, { path: relativePath, content, modifiedAt: info.mtime.toISOString() });
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
        await writeFile(absolutePath, String(body.content ?? ''), 'utf8');
        const saved = await stat(absolutePath);
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
        return sendJson(response, 201, { path: relativePath, modifiedAt: created.mtime.toISOString() });
    }

    if (request.method === 'POST' && url.pathname === '/api/folder') {
        const body = await readBody(request);
        await mkdir(resolveDataPath(body.path), { recursive: false });
        return sendJson(response, 201, { path: body.path });
    }

    if (request.method === 'PATCH' && url.pathname === '/api/entry') {
        const body = await readBody(request);
        await rename(resolveDataPath(body.path), resolveDataPath(body.newPath));
        return sendJson(response, 200, { path: body.newPath });
    }

    if (request.method === 'DELETE' && url.pathname === '/api/entry') {
        const relativePath = url.searchParams.get('path') || '';
        if (!relativePath) return sendJson(response, 400, { error: '缺少路径' });
        await rm(resolveDataPath(relativePath), { recursive: true, force: false });
        return sendJson(response, 200, { path: relativePath });
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

const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    try {
        if (url.pathname.startsWith('/api/')) await handleApi(request, response, url);
        else await handleStatic(response, url);
    } catch (error) {
        const code = error?.code;
        const status = code === 'ENOENT' ? 404 : code === 'EEXIST' ? 409 : 500;
        sendJson(response, status, { error: status === 500 ? '本地服务处理失败' : error.message });
        if (status === 500) console.error(error);
    }
});

server.listen(port, '127.0.0.1', () => {
    console.log(`个人研发知识库已启动：http://127.0.0.1:${port}`);
});
