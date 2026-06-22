// 数据库初始化模块 (使用 sql.js - SQLite WebAssembly 版本)
import initSqlJs from 'sql.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const runtimeStateDir = process.env.DOCWIKI_STATE_DIR || process.env.WEBWIKI_STATE_DIR;
const dbDir = runtimeStateDir
    ? path.resolve(runtimeStateDir)
    : path.join(rootDir, '.webwiki');
const dbPath = path.join(dbDir, 'agent.db');

// 确保目录存在
mkdirSync(dbDir, { recursive: true });

// 数据库实例
let db = null;
let SQL = null;

// 初始化数据库（异步）
export async function initDatabase() {
    if (db) return db;
    
    // 初始化 SQL.js
    SQL = await initSqlJs();
    
    // 尝试加载已有数据库
    if (existsSync(dbPath)) {
        try {
            const buffer = readFileSync(dbPath);
            db = new SQL.Database(buffer);
            console.log(`[DB] 已加载现有数据库: ${dbPath}`);
        } catch (err) {
            console.error('[DB] 加载数据库失败，将创建新数据库:', err.message);
            db = new SQL.Database();
        }
    } else {
        db = new SQL.Database();
        console.log('[DB] 创建新数据库');
    }
    
    // 执行 schema
    const schema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    db.run(schema);
    
    // 保存数据库
    saveDatabase();
    
    console.log(`[DB] 数据库已初始化: ${dbPath}`);
    return db;
}

// 获取已初始化的数据库实例
export function getDatabase() {
    if (!db) {
        throw new Error('数据库未初始化，请先调用 await initDatabase()');
    }
    return db;
}

// 保存数据库到文件
export function saveDatabase() {
    if (!db) return;
    try {
        const data = db.export();
        const buffer = Buffer.from(data);
        writeFileSync(dbPath, buffer);
    } catch (err) {
        console.error('[DB] 保存数据库失败:', err.message);
    }
}

// 关闭数据库
export function closeDatabase() {
    if (db) {
        saveDatabase();
        db.close();
        db = null;
        console.log('[DB] 数据库已关闭');
    }
}

// 辅助函数：执行查询并返回所有结果
export function queryAll(sql, params = []) {
    const stmt = getDatabase().prepare(sql);
    if (params.length > 0) stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

// 辅助函数：执行查询并返回单条结果
export function queryOne(sql, params = []) {
    const results = queryAll(sql, params);
    return results.length > 0 ? results[0] : null;
}

// 辅助函数：执行更新操作
export function execute(sql, params = []) {
    getDatabase().run(sql, params);
    saveDatabase();
    return { changes: getDatabase().getRowsModified() };
}

export default { 
    initDatabase, 
    getDatabase, 
    closeDatabase,
    saveDatabase,
    queryAll,
    queryOne,
    execute
};
