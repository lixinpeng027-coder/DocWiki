// 模型核心业务逻辑
import { queryAll, queryOne, execute } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

// 模型能力
export const MODEL_CAPABILITIES = {
    TEXT: 'text',
    VISION: 'vision',
    REASONING: 'reasoning',
    TOOL_CALLING: 'toolCalling',
    STREAMING: 'streaming',
    EMBEDDING: 'embedding'
};

// 默认能力（文本生成模型）
export const DEFAULT_CAPABILITIES = {
    text: true,
    vision: false,
    reasoning: false,
    toolCalling: false,
    streaming: true,
    embedding: false
};

// 获取所有模型
export function getAllModels(providerId = null) {
    if (providerId) {
        return queryAll(`
            SELECT m.*, p.name as provider_name, p.provider_type
            FROM model_profiles m
            JOIN provider_configs p ON m.provider_id = p.id
            WHERE m.provider_id = ?
            ORDER BY m.name
        `, [providerId]);
    }
    return queryAll(`
        SELECT m.*, p.name as provider_name, p.provider_type
        FROM model_profiles m
        JOIN provider_configs p ON m.provider_id = p.id
        ORDER BY p.name, m.name
    `);
}

// 获取单个模型
export function getModel(id) {
    return queryOne(`
        SELECT m.*, p.name as provider_name, p.provider_type, p.api_base_url
        FROM model_profiles m
        JOIN provider_configs p ON m.provider_id = p.id
        WHERE m.id = ?
    `, [id]);
}

// 创建模型（如果同 provider_id + model_id 已存在则更新）
export function createModel(data) {
    const existing = queryOne(
        'SELECT id FROM model_profiles WHERE provider_id = ? AND model_id = ?',
        [data.provider_id, data.model_id]
    );
    
    if (existing) {
        // 已存在，更新名称和能力
        const fields = ["updated_at = datetime('now')"];
        const values = [];
        if (data.name) { fields.push('name = ?'); values.push(data.name); }
        if (data.capabilities) { fields.push('capabilities = ?'); values.push(JSON.stringify(data.capabilities)); }
        values.push(existing.id);
        execute(`UPDATE model_profiles SET ${fields.join(', ')} WHERE id = ?`, values);
        return getModel(existing.id);
    }
    
    const id = data.id || uuidv4();
    const capabilities = JSON.stringify(data.capabilities || DEFAULT_CAPABILITIES);
    
    execute(`
        INSERT INTO model_profiles (id, provider_id, model_id, name, capabilities)
        VALUES (?, ?, ?, ?, ?)
    `, [id, data.provider_id, data.model_id, data.name, capabilities]);
    return getModel(id);
}

// 更新模型
export function updateModel(id, data) {
    const fields = [];
    const values = [];
    
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.model_id !== undefined) { fields.push('model_id = ?'); values.push(data.model_id); }
    if (data.capabilities !== undefined) { fields.push('capabilities = ?'); values.push(JSON.stringify(data.capabilities)); }
    if (data.enabled !== undefined) { fields.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
    
    if (fields.length === 0) return getModel(id);
    
    fields.push("updated_at = datetime('now')");
    values.push(id);
    
    execute(`UPDATE model_profiles SET ${fields.join(', ')} WHERE id = ?`, values);
    return getModel(id);
}

// 删除模型
export function deleteModel(id) {
    execute('DELETE FROM model_profiles WHERE id = ?', [id]);
    return { success: true };
}

// 获取场景分配
export function getSceneAssignment(scene) {
    const assignment = queryOne(`
        SELECT sa.*, 
               pm.model_id as primary_model_id,
               pm.name as primary_model_name,
               pm.provider_id as primary_provider_id
        FROM scene_assignments sa
        LEFT JOIN model_profiles pm ON sa.primary_model_id = pm.id
        WHERE sa.scene = ?
    `, [scene]);
    
    if (!assignment) return null;
    
    // 获取备用模型
    if (assignment.backup_model_id_1) {
        assignment.backup_model_1 = getModel(assignment.backup_model_id_1);
    }
    if (assignment.backup_model_id_2) {
        assignment.backup_model_2 = getModel(assignment.backup_model_id_2);
    }
    
    return assignment;
}

// 更新场景分配
export function updateSceneAssignment(scene, data) {
    const existing = getSceneAssignment(scene);
    
    if (!existing) {
        // 创建新记录
        const id = uuidv4();
        execute(`
            INSERT INTO scene_assignments (id, scene, primary_model_id, backup_model_id_1, backup_model_id_2)
            VALUES (?, ?, ?, ?, ?)
        `, [id, scene, data.primary_model_id || null, data.backup_model_id_1 || null, data.backup_model_id_2 || null]);
    } else {
        // 更新现有记录
        const fields = [];
        const values = [];
        
        if (data.primary_model_id !== undefined) { fields.push('primary_model_id = ?'); values.push(data.primary_model_id); }
        if (data.backup_model_id_1 !== undefined) { fields.push('backup_model_id_1 = ?'); values.push(data.backup_model_id_1); }
        if (data.backup_model_id_2 !== undefined) { fields.push('backup_model_id_2 = ?'); values.push(data.backup_model_id_2); }
        
        if (fields.length === 0) return getSceneAssignment(scene);
        
        fields.push("updated_at = datetime('now')");
        values.push(scene);
        
        execute(`UPDATE scene_assignments SET ${fields.join(', ')} WHERE scene = ?`, values);
    }
    
    return getSceneAssignment(scene);
}

// 获取所有场景分配
export function getAllSceneAssignments() {
    return queryAll('SELECT * FROM scene_assignments ORDER BY scene');
}

// 获取场景可用模型，顺序为主模型、备用模型、其他已启用模型。
// 只有已经配置供应商密钥的模型才会进入调用列表。
export function getSceneModelCandidates(scene = 'default') {
    const assignment = queryOne(`
        SELECT primary_model_id, backup_model_id_1, backup_model_id_2
        FROM scene_assignments
        WHERE scene = ?
    `, [scene]);
    const assignedIds = assignment
        ? [assignment.primary_model_id, assignment.backup_model_id_1, assignment.backup_model_id_2].filter(Boolean)
        : [];

    const available = queryAll(`
        SELECT m.*, p.name AS provider_name, p.provider_type, p.api_base_url
        FROM model_profiles m
        JOIN provider_configs p ON m.provider_id = p.id
        JOIN api_keys k ON k.provider_id = m.provider_id
        WHERE m.enabled = 1
        ORDER BY p.name, m.name
    `);
    const byId = new Map(available.map(model => [model.id, model]));
    const assigned = assignedIds.map(id => byId.get(id)).filter(Boolean);
    const assignedSet = new Set(assigned.map(model => model.id));

    const ordered = [...assigned, ...available.filter(model => !assignedSet.has(model.id))];
    const seenEndpoints = new Set();
    return ordered.filter(model => {
        const endpoint = `${model.provider_id}:${model.model_id}`;
        if (seenEndpoints.has(endpoint)) return false;
        seenEndpoints.add(endpoint);
        return true;
    });
}

export default {
    MODEL_CAPABILITIES,
    DEFAULT_CAPABILITIES,
    getAllModels,
    getModel,
    createModel,
    updateModel,
    deleteModel,
    getSceneAssignment,
    updateSceneAssignment,
    getAllSceneAssignments,
    getSceneModelCandidates
};
