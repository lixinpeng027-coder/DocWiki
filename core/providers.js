// 供应商核心业务逻辑
import { queryAll, queryOne, execute } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { hasApiKey } from './keys.js';

// 预置供应商类型
export const PROVIDER_TYPES = {
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
    GOOGLE: 'google',
    DEEPSEEK: 'deepseek',
    QWEN: 'qwen',
    ZHIPU: 'zhipu',
    MOONSHOT: 'moonshot',
    BAIDU: 'baidu',
    VOLC: 'volc',
    TENCENT: 'tencent',
    XIAOMI: 'xiaomi',
    CUSTOM: 'custom'  // 自定义 OpenAI 兼容接口
};

// 获取所有供应商
export function getAllProviders() {
    return queryAll(`
        SELECT id, name, provider_type, api_base_url, is_custom_api, enabled, created_at, updated_at
        FROM provider_configs
        ORDER BY name
    `);
}

// 获取单个供应商
export function getProvider(id) {
    return queryOne('SELECT * FROM provider_configs WHERE id = ?', [id]);
}

// 创建供应商
export function createProvider(data) {
    const id = data.id || uuidv4();
    execute(`
        INSERT INTO provider_configs (id, name, provider_type, api_base_url, is_custom_api)
        VALUES (?, ?, ?, ?, ?)
    `, [id, data.name, data.provider_type, data.api_base_url || null, data.is_custom_api ? 1 : 0]);
    return getProvider(id);
}

// 更新供应商
export function updateProvider(id, data) {
    const fields = [];
    const values = [];
    
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.provider_type !== undefined) { fields.push('provider_type = ?'); values.push(data.provider_type); }
    if (data.api_base_url !== undefined) { fields.push('api_base_url = ?'); values.push(data.api_base_url); }
    if (data.is_custom_api !== undefined) { fields.push('is_custom_api = ?'); values.push(data.is_custom_api ? 1 : 0); }
    if (data.enabled !== undefined) { fields.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
    
    if (fields.length === 0) return getProvider(id);
    
    fields.push("updated_at = datetime('now')");
    values.push(id);
    
    execute(`UPDATE provider_configs SET ${fields.join(', ')} WHERE id = ?`, values);
    return getProvider(id);
}

// 删除供应商（同时删除关联的模型和密钥）
export function deleteProvider(id) {
    execute('DELETE FROM provider_configs WHERE id = ?', [id]);
    return { success: true };
}

// 测试供应商连接（配置完整性验证）
export function testProviderConnection(providerId) {
    const provider = getProvider(providerId);
    if (!provider) return { success: false, error: '供应商不存在' };
    if (!hasApiKey(providerId)) return { success: false, error: '未配置 API 密钥，请在设置中保存密钥后再测试' };
    // 连接测试通过 adapter 层实际调用 API 验证，此处验证配置完整性
    return { success: true, message: '配置完整，可以进行 API 调用测试' };
}

export default {
    PROVIDER_TYPES,
    getAllProviders,
    getProvider,
    createProvider,
    updateProvider,
    deleteProvider,
    testProviderConnection
};
