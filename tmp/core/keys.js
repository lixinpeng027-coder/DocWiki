// 密钥安全存储模块
// 使用 AES-256-GCM 加密算法
import crypto from 'node:crypto';
import { queryOne, execute } from '../db/index.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const keyDir = path.join(rootDir, '.webwiki');
const masterKeyPath = path.join(keyDir, 'master.key');

// 确保目录存在
mkdirSync(keyDir, { recursive: true });

// 主密钥（用于加密 API 密钥）
let masterKey = null;

// 初始化主密钥
function initMasterKey() {
    if (masterKey) return masterKey;
    
    if (existsSync(masterKeyPath)) {
        // 加载已有主密钥
        masterKey = readFileSync(masterKeyPath);
        console.log('[Key] 已加载主密钥');
    } else {
        // 生成新的主密钥（32 字节 = 256 位）
        masterKey = crypto.randomBytes(32);
        writeFileSync(masterKeyPath, masterKey);
        console.log('[Key] 已生成新主密钥');
    }
    
    return masterKey;
}

// 加密密钥
export function encryptApiKey(plainKey) {
    initMasterKey();
    
    // 生成随机 IV（12 字节，GCM 推荐）
    const iv = crypto.randomBytes(12);
    
    // 创建加密器
    const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
    
    // 加密
    const encrypted = Buffer.concat([
        cipher.update(plainKey, 'utf8'),
        cipher.final()
    ]);
    
    // 获取认证标签
    const authTag = cipher.getAuthTag();
    
    // 组合：IV + AuthTag + Encrypted（便于存储和传输）
    const combined = Buffer.concat([iv, authTag, encrypted]);
    
    return combined.toString('base64');
}

// 解密密钥
export function decryptApiKey(encryptedData) {
    initMasterKey();
    
    try {
        const combined = Buffer.from(encryptedData, 'base64');
        
        // 分离组件
        const iv = combined.subarray(0, 12);
        const authTag = combined.subarray(12, 28);
        const encrypted = combined.subarray(28);
        
        // 创建解密器
        const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
        decipher.setAuthTag(authTag);
        
        // 解密
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);
        
        return decrypted.toString('utf8');
    } catch (err) {
        console.error('[Key] 解密失败:', err.message);
        throw new Error('密钥解密失败，可能主密钥已变更');
    }
}

// 生成密钥提示（显示后 4 位）
export function generateKeyHint(plainKey) {
    if (!plainKey || plainKey.length < 8) return '****';
    return '...' + plainKey.slice(-4);
}

// 存储供应商密钥
export function storeApiKey(providerId, plainKey) {
    const encrypted = encryptApiKey(plainKey);
    const hint = generateKeyHint(plainKey);
    
    // 检查是否已存在
    const existing = queryOne('SELECT id FROM api_keys WHERE provider_id = ?', [providerId]);
    
    if (existing) {
        execute(`
            UPDATE api_keys 
            SET key_data = ?, key_hint = ?, updated_at = datetime('now')
            WHERE provider_id = ?
        `, [encrypted, hint, providerId]);
    } else {
        const id = crypto.randomUUID();
        execute(`
            INSERT INTO api_keys (id, provider_id, key_data, key_hint)
            VALUES (?, ?, ?, ?)
        `, [id, providerId, encrypted, hint]);
    }
    
    return { success: true, hint };
}

// 获取供应商密钥（解密后）
export function getApiKey(providerId) {
    const record = queryOne('SELECT key_data, key_hint FROM api_keys WHERE provider_id = ?', [providerId]);
    
    if (!record) return null;
    
    try {
        const decrypted = decryptApiKey(record.key_data);
        return { key: decrypted, hint: record.key_hint };
    } catch (err) {
        return { error: err.message, hint: record.key_hint };
    }
}

// 获取密钥信息（不解密，只返回提示）
export function getApiKeyInfo(providerId) {
    const record = queryOne('SELECT key_hint, created_at, updated_at FROM api_keys WHERE provider_id = ?', [providerId]);
    return record;
}

// 删除密钥
export function deleteApiKey(providerId) {
    execute('DELETE FROM api_keys WHERE provider_id = ?', [providerId]);
    return { success: true };
}

// 检查密钥是否存在
export function hasApiKey(providerId) {
    const record = queryOne('SELECT id FROM api_keys WHERE provider_id = ?', [providerId]);
    return !!record;
}

export default {
    encryptApiKey,
    decryptApiKey,
    generateKeyHint,
    storeApiKey,
    getApiKey,
    getApiKeyInfo,
    deleteApiKey,
    hasApiKey
};