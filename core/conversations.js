// 对话核心业务逻辑
import { queryAll, queryOne, execute } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

// 获取所有对话
export function getAllConversations() {
    return queryAll(`
        SELECT c.*, 
               (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count,
               (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
        FROM conversations c
        WHERE c.status = 'active'
        ORDER BY c.updated_at DESC
    `);
}

// 获取单个对话
export function getConversation(id) {
    return queryOne('SELECT * FROM conversations WHERE id = ?', [id]);
}

// 创建对话
export function createConversation(data = {}) {
    const id = data.id || uuidv4();
    execute(`
        INSERT INTO conversations (id, title, scene, status)
        VALUES (?, ?, ?, 'active')
    `, [id, data.title || '新对话', data.scene || 'default']);
    return getConversation(id);
}

// 更新对话
export function updateConversation(id, data) {
    const fields = [];
    const values = [];
    
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.scene !== undefined) { fields.push('scene = ?'); values.push(data.scene); }
    if (data.summary !== undefined) { fields.push('summary = ?'); values.push(data.summary); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    
    if (fields.length === 0) return getConversation(id);
    
    fields.push("updated_at = datetime('now')");
    values.push(id);
    
    execute(`UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`, values);
    return getConversation(id);
}

// 删除对话（归档）
export function archiveConversation(id) {
    return updateConversation(id, { status: 'archived' });
}

// 获取对话消息
export function getMessages(conversationId) {
    return queryAll(`
        SELECT * FROM messages 
        WHERE conversation_id = ?
        ORDER BY created_at ASC
    `, [conversationId]);
}

// 添加消息
export function addMessage(data) {
    const id = data.id || uuidv4();
    execute(`
        INSERT INTO messages (id, conversation_id, role, content, model_id, context_snapshot, token_count)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
        id, 
        data.conversation_id, 
        data.role, 
        data.content, 
        data.model_id || null,
        data.context_snapshot ? JSON.stringify(data.context_snapshot) : null,
        data.token_count || null
    ]);
    
    // 更新对话的 updated_at
    execute("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?", [data.conversation_id]);
    
    return queryOne('SELECT * FROM messages WHERE id = ?', [id]);
}

// 删除消息
export function deleteMessage(id) {
    const message = queryOne('SELECT conversation_id FROM messages WHERE id = ?', [id]);
    execute('DELETE FROM messages WHERE id = ?', [id]);
    
    if (message) {
        execute("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?", [message.conversation_id]);
    }
    
    return { success: true };
}

// 搜索对话
export function searchConversations(keyword) {
    return queryAll(`
        SELECT c.*, 
               (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
        FROM conversations c
        WHERE c.status = 'active' AND (
            c.title LIKE ? OR 
            c.id IN (SELECT conversation_id FROM messages WHERE content LIKE ?)
        )
        ORDER BY c.updated_at DESC
    `, [`%${keyword}%`, `%${keyword}%`]);
}

// 获取对话统计
export function getConversationStats() {
    const total = queryOne('SELECT COUNT(*) as count FROM conversations WHERE status = ?', ['active']);
    const totalMessages = queryOne('SELECT COUNT(*) as count FROM messages');
    return {
        totalConversations: total?.count || 0,
        totalMessages: totalMessages?.count || 0
    };
}

export default {
    getAllConversations,
    getConversation,
    createConversation,
    updateConversation,
    archiveConversation,
    getMessages,
    addMessage,
    deleteMessage,
    searchConversations,
    getConversationStats
};