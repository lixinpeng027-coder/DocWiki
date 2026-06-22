#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.resolve(process.env.WEBWIKI_DATA_DIR || path.join(rootDir, 'data'));
process.env.WEBWIKI_DATA_DIR = dataDir;
process.env.WEBWIKI_STATE_DIR ||= path.join(rootDir, '.webwiki');

// stdout is reserved for the MCP JSONL transport.
console.log = (...args) => console.error(...args);

const { initDatabase, saveDatabase } = await import('../db/index.js');
const documents = await import('../core/documents.js');
await initDatabase();
await mkdir(dataDir, { recursive: true });
const indexed = documents.rebuildIndex();
console.error(`[MCP] indexed ${indexed.success} Markdown documents from ${dataDir}`);

const toolDefinitions = [
    {
        name: 'search_documents',
        description: 'Search Markdown document titles, paths, and indexed content in the DocWiki knowledge base.',
        inputSchema: {
            type: 'object', required: ['query'], additionalProperties: false,
            properties: { query: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 } }
        }
    },
    {
        name: 'get_document_tree',
        description: 'Return the directory and Markdown file tree for the DocWiki knowledge base.',
        inputSchema: { type: 'object', additionalProperties: false, properties: {} }
    },
    {
        name: 'read_document',
        description: 'Read one Markdown document by its path relative to the knowledge base root.',
        inputSchema: {
            type: 'object', required: ['path'], additionalProperties: false,
            properties: { path: { type: 'string', description: 'Example: 项目/新橙皮苷/项目概述.md' } }
        }
    },
    {
        name: 'save_document',
        description: 'Create or replace one Markdown document. Existing content is preserved in .history before replacement.',
        inputSchema: {
            type: 'object', required: ['path', 'content'], additionalProperties: false,
            properties: {
                path: { type: 'string' }, content: { type: 'string' },
                expectedModifiedAt: { type: 'string', description: 'Optional ISO timestamp for conflict detection.' }
            }
        }
    }
];
const supportedProtocolVersions = ['2025-03-26', '2024-11-05'];
const writeLocks = new Map();

function resolveDocumentPath(relativePath) {
    const normalized = String(relativePath || '').replaceAll('\\', '/').replace(/^\/+/, '');
    if (!normalized.toLowerCase().endsWith('.md')) throw new Error('Only Markdown (.md) documents are supported');
    const absolutePath = path.resolve(dataDir, normalized);
    const relative = path.relative(dataDir, absolutePath);
    if (!normalized || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Document path escapes the knowledge base');
    return { normalized, absolutePath };
}

async function assertRealContained(absolutePath) {
    const [realRoot, realTarget] = await Promise.all([realpath(dataDir), realpath(absolutePath)]);
    const relative = path.relative(realRoot, realTarget);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Document resolves outside the knowledge base');
}

function flattenTree(nodes, output = []) {
    for (const node of nodes || []) {
        if (node.type === 'file') output.push(node);
        else flattenTree(node.children, output);
    }
    return output;
}

async function readDocument(relativePath) {
    const { normalized, absolutePath } = resolveDocumentPath(relativePath);
    await assertRealContained(absolutePath);
    const [content, info] = await Promise.all([readFile(absolutePath, 'utf8'), stat(absolutePath)]);
    return { path: normalized, content, modifiedAt: info.mtime.toISOString(), size: info.size };
}

async function saveDocumentUnlocked(args) {
    const { normalized, absolutePath } = resolveDocumentPath(args.path);
    const content = String(args.content ?? '');
    let previous = null;
    try {
        const info = await stat(absolutePath);
        await assertRealContained(absolutePath);
        if (args.expectedModifiedAt && info.mtime.toISOString() !== args.expectedModifiedAt) {
            const error = new Error('Document was modified since it was read');
            error.code = 'CONFLICT';
            throw error;
        }
        previous = await readFile(absolutePath, 'utf8');
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await assertRealContained(path.dirname(absolutePath));
    if (previous !== null && previous !== content) {
        const historyDir = path.join(path.dirname(absolutePath), '.history');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        await mkdir(historyDir, { recursive: true });
        await writeFile(path.join(historyDir, `${path.basename(absolutePath, '.md')}.${timestamp}.md`), previous, 'utf8');
    }
    await writeFile(absolutePath, content, 'utf8');
    const info = await stat(absolutePath);
    documents.indexDocument(absolutePath, normalized);
    return { path: normalized, modifiedAt: info.mtime.toISOString(), created: previous === null };
}

async function saveDocument(args) {
    if (!args || typeof args.path !== 'string' || typeof args.content !== 'string') {
        throw new Error('path and content are required strings');
    }
    const { normalized } = resolveDocumentPath(args.path);
    const previous = writeLocks.get(normalized) || Promise.resolve();
    const current = previous.catch(() => {}).then(() => saveDocumentUnlocked(args));
    writeLocks.set(normalized, current);
    try { return await current; }
    finally { if (writeLocks.get(normalized) === current) writeLocks.delete(normalized); }
}

function toolResult(value) {
    return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }], structuredContent: value };
}

async function callTool(name, args = {}) {
    if (name === 'search_documents') {
        if (!String(args.query || '').trim()) throw new Error('query is required');
        return toolResult({ results: documents.searchDocuments(args.query, { limit: Math.min(50, Math.max(1, Number(args.limit) || 20)) }) });
    }
    if (name === 'get_document_tree') return toolResult({ root: 'data', children: documents.getDocumentTree(dataDir) });
    if (name === 'read_document') return toolResult(await readDocument(args.path));
    if (name === 'save_document') return toolResult(await saveDocument(args));
    throw new Error(`Unknown tool: ${name}`);
}

async function listResources() {
    const files = flattenTree(documents.getDocumentTree(dataDir));
    return files.map(file => ({
        uri: `webwiki://document/${encodeURIComponent(file.path)}`,
        name: file.title || file.name,
        description: file.path,
        mimeType: 'text/markdown'
    }));
}

async function handleRequest(message) {
    const { id, method, params = {} } = message;
    if (method === 'initialize') {
        const protocolVersion = supportedProtocolVersions.includes(params.protocolVersion)
            ? params.protocolVersion
            : supportedProtocolVersions[0];
        return { jsonrpc: '2.0', id, result: {
            protocolVersion,
            capabilities: { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false } },
            serverInfo: { name: 'webwiki', version: '1.0.0' }
        } };
    }
    if (method === 'ping') return { jsonrpc: '2.0', id, result: {} };
    if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools: toolDefinitions } };
    if (method === 'tools/call') return { jsonrpc: '2.0', id, result: await callTool(params.name, params.arguments || {}) };
    if (method === 'resources/list') return { jsonrpc: '2.0', id, result: { resources: await listResources() } };
    if (method === 'resources/read') {
        const prefix = 'webwiki://document/';
        if (!String(params.uri || '').startsWith(prefix)) throw new Error('Unsupported resource URI');
        const document = await readDocument(decodeURIComponent(params.uri.slice(prefix.length)));
        return { jsonrpc: '2.0', id, result: { contents: [{ uri: params.uri, mimeType: 'text/markdown', text: document.content }] } };
    }
    if (method?.startsWith('notifications/')) return null;
    return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
}

function writeMessage(message) {
    process.stdout.write(`${JSON.stringify(message)}\n`);
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', async chunk => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) {
        if (!line.trim()) continue;
        let message;
        try {
            message = JSON.parse(line);
            const response = await handleRequest(message);
            if (response) writeMessage(response);
        } catch (error) {
            writeMessage({
                jsonrpc: '2.0', id: message?.id ?? null,
                error: { code: error instanceof SyntaxError ? -32700 : -32603, message: error.message }
            });
        }
    }
});
process.stdin.on('end', () => { saveDatabase(); });
process.on('SIGTERM', () => { saveDatabase(); process.exit(0); });
process.on('SIGINT', () => { saveDatabase(); process.exit(0); });
