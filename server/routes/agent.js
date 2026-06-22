// API 路由：供应商和模型配置
import { Router } from '../router.js';
import * as providers from '../../core/providers.js';
import * as models from '../../core/models.js';
import * as keys from '../../core/keys.js';
import * as adapter from '../../core/adapter.js';
import * as conversations from '../../core/conversations.js';
import * as documents from '../../core/documents.js';
import { runAgent } from '../../core/agent.js';

const router = new Router();

// ========== 供应商路由 ==========

// GET /api/agent/providers - 获取所有供应商（含密钥状态）
router.get('/providers', (params, body) => {
    const allProviders = providers.getAllProviders();
    // 为每个供应商附加密钥状态
    const enriched = allProviders.map(p => {
        const keyInfo = keys.getApiKeyInfo(p.id);
        return {
            ...p,
            hasKey: !!keyInfo,
            keyHint: keyInfo?.key_hint || null
        };
    });
    return { providers: enriched };
});

// GET /api/agent/providers/:id - 获取单个供应商
router.get('/providers/:id', (params, body) => {
    const provider = providers.getProvider(params.id);
    if (!provider) {
        throw { status: 404, code: 'PROVIDER_NOT_FOUND' };
    }
    return provider;
});

// POST /api/agent/providers - 创建供应商
router.post('/providers', (params, body) => {
    if (!body.name || !body.provider_type) {
        throw { status: 400, code: 'MISSING_REQUIRED_FIELDS', message: '缺少 name 或 provider_type' };
    }
    const provider = providers.createProvider(body);
    return { provider, success: true };
});

// PATCH /api/agent/providers/:id - 更新供应商
router.patch('/providers/:id', (params, body) => {
    const provider = providers.updateProvider(params.id, body);
    if (!provider) {
        throw { status: 404, code: 'PROVIDER_NOT_FOUND' };
    }
    return { provider, success: true };
});

// DELETE /api/agent/providers/:id - 删除供应商
router.delete('/providers/:id', (params, body) => {
    providers.deleteProvider(params.id);
    return { success: true };
});

// POST /api/agent/providers/:id/test - 测试供应商连接
router.post('/providers/:id/test', async (params, body) => {
    const availableModels = await adapter.listProviderModels(params.id);
    if (availableModels.length === 0) {
        return { success: false, error: '连接失败：未能从供应商获取模型列表，请检查 API Key 和 API 地址。' };
    }
    return { success: true, message: `连接成功，已获取 ${availableModels.length} 个模型。`, model_count: availableModels.length };
});

// GET /api/agent/providers/:id/models - 获取供应商可用模型列表
router.get('/providers/:id/models', async (params, body) => {
    const models = await adapter.listProviderModels(params.id);
    return { models };
});

// POST /api/agent/providers/:id/models - 使用临时 API Key 获取供应商可用模型列表
router.post('/providers/:id/models', async (params, body) => {
    const { api_key } = body;
    if (!api_key) {
        return { error: 'API Key 不能为空' };
    }
    
    try {
        const models = await adapter.listProviderModels(params.id, api_key);
        return { models };
    } catch (err) {
        console.error('获取模型列表失败:', err.message);
        return { error: err.message };
    }
});

// ========== 模型路由 ==========

// GET /api/agent/models - 获取所有模型
router.get('/models', (params, body) => {
    const providerId = params.provider_id;
    return { models: models.getAllModels(providerId) };
});

// GET /api/agent/models/:id - 获取单个模型
router.get('/models/:id', (params, body) => {
    const model = models.getModel(params.id);
    if (!model) {
        throw { status: 404, code: 'MODEL_NOT_FOUND' };
    }
    return model;
});

// POST /api/agent/models - 创建模型
router.post('/models', (params, body) => {
    if (!body.provider_id || !body.model_id || !body.name) {
        throw { status: 400, code: 'MISSING_REQUIRED_FIELDS', message: '缺少 provider_id, model_id 或 name' };
    }
    const model = models.createModel(body);
    return { model, success: true };
});

// PATCH /api/agent/models/:id - 更新模型
router.patch('/models/:id', (params, body) => {
    const model = models.updateModel(params.id, body);
    if (!model) {
        throw { status: 404, code: 'MODEL_NOT_FOUND' };
    }
    return { model, success: true };
});

// DELETE /api/agent/models/:id - 删除模型
router.delete('/models/:id', (params, body) => {
    models.deleteModel(params.id);
    return { success: true };
});

// POST /api/agent/models/:id/test-capability - 测试模型能力
router.post('/models/:id/test-capability', async (params, body) => {
    // TODO: 实现能力测试
    return { success: true, message: '能力测试功能待实现' };
});

// ========== 场景分配路由 ==========

// GET /api/agent/assignments - 获取所有场景分配
router.get('/assignments', (params, body) => {
    return { assignments: models.getAllSceneAssignments() };
});

// GET /api/agent/assignments/:scene - 获取单个场景分配
router.get('/assignments/:scene', (params, body) => {
    const assignment = models.getSceneAssignment(params.scene);
    if (!assignment) {
        throw { status: 404, code: 'ASSIGNMENT_NOT_FOUND' };
    }
    return assignment;
});

// PUT /api/agent/assignments/:scene - 更新场景分配
router.put('/assignments/:scene', (params, body) => {
    const assignment = models.updateSceneAssignment(params.scene, body);
    return { assignment, success: true };
});

// ========== 密钥路由 ==========

// GET /api/agent/keys/:providerId - 获取密钥信息（仅提示，不解密）
router.get('/keys/:providerId', (params, body) => {
    const info = keys.getApiKeyInfo(params.providerId);
    if (!info) {
        throw { status: 404, code: 'KEY_NOT_FOUND' };
    }
    return { providerId: params.providerId, ...info };
});

// POST /api/agent/keys/:providerId - 存储密钥
router.post('/keys/:providerId', (params, body) => {
    if (!body.api_key) {
        throw { status: 400, code: 'MISSING_API_KEY', message: '缺少 api_key 参数' };
    }
    const result = keys.storeApiKey(params.providerId, body.api_key);
    return { providerId: params.providerId, ...result };
});

// DELETE /api/agent/keys/:providerId - 删除密钥
router.delete('/keys/:providerId', (params, body) => {
    keys.deleteApiKey(params.providerId);
    return { providerId: params.providerId, success: true };
});

// POST /api/agent/keys/:providerId/test - 测试密钥是否有效
router.post('/keys/:providerId/test', async (params, body) => {
    const keyInfo = keys.getApiKey(params.providerId);
    if (!keyInfo || keyInfo.error) {
        throw { status: 404, code: 'KEY_NOT_FOUND', message: keyInfo?.error || '密钥不存在' };
    }
    
    // 获取供应商信息
    const provider = providers.getProvider(params.providerId);
    if (!provider) {
        throw { status: 404, code: 'PROVIDER_NOT_FOUND' };
    }
    
    const availableModels = await adapter.listProviderModels(params.providerId);
    if (availableModels.length === 0) {
        return {
            providerId: params.providerId,
            provider: provider.name,
            success: false,
            message: '连接失败：未能从供应商获取模型列表，请检查 API Key 和 API 地址。'
        };
    }
    return {
        providerId: params.providerId,
        provider: provider.name,
        success: true,
        message: `连接成功，已获取 ${availableModels.length} 个模型。`,
        model_count: availableModels.length
    };
});

// ========== 模型调用路由 ==========

// GET /api/agent/routing/:scene - 查看场景将优先使用的模型
router.get('/routing/:scene', (params) => {
    const candidates = models.getSceneModelCandidates(params.scene || 'default');
    const model = candidates[0];
    return {
        scene: params.scene || 'default',
        model: model ? {
            id: model.id,
            model_id: model.model_id,
            name: model.name,
            provider_name: model.provider_name
        } : null,
        candidate_count: candidates.length
    };
});

// POST /api/agent/agent-chat - Agent 自主检索对话
router.post('/agent-chat', async (params, body) => {
    if (!body.messages || !Array.isArray(body.messages)) {
        throw { status: 400, code: 'MISSING_MESSAGES', message: '缺少 messages 参数' };
    }

    const scene = body.scene || 'default';
    try {
        const result = await runAgent(body.messages, { scene });
        return result;
    } catch (err) {
        // 结构化中文错误，包含 scene 信息
        return {
            success: false,
            error: err.message,
            code: err.code || 'AGENT_ERROR',
            scene: err.scene || scene,
            statusCode: err.statusCode || 500,
            suggestion: err.code === 'NO_MODEL_FOR_SCENE'
                ? '请到 设置 → 场景分配 中为该场景指定模型，并确保对应供应商已保存有效的 API 密钥。'
                : '请检查模型配置和网络连接后重试。'
        };
    }
});

// POST /api/agent/chat - 调用模型对话
router.post('/chat', async (params, body) => {
    if (!body.messages || !Array.isArray(body.messages)) {
        throw { status: 400, code: 'MISSING_MESSAGES', message: '缺少 messages 参数' };
    }

    const scene = body.scene || 'default';
    const candidates = models.getSceneModelCandidates(scene);
    if (candidates.length === 0) {
        throw {
            status: 400,
            code: 'NO_CONFIGURED_MODEL',
            message: '没有可用模型，请先在设置中启用模型并配置对应供应商的 API 密钥'
        };
    }

    const errors = [];
    for (const model of candidates) {
        try {
            const result = await adapter.chatWithModel(model.id, {
                messages: body.messages,
                temperature: body.temperature,
                maxTokens: body.max_tokens,
                tools: body.tools,
                toolChoice: body.tool_choice
            });
            return {
                success: true,
                ...result,
                used_model: {
                    id: model.id,
                    model_id: model.model_id,
                    name: model.name,
                    provider_name: model.provider_name
                }
            };
        } catch (err) {
            errors.push(`${model.name}: ${err.message}`);
        }
    }

    throw {
        status: 502,
        code: 'ALL_MODELS_FAILED',
        message: `已尝试 ${candidates.length} 个已配置模型，均调用失败`,
        details: errors
    };
});

// POST /api/agent/stream - 流式调用模型对话（返回 SSE）
// 注意：这个路由需要在 server.mjs 中特殊处理，这里只是声明
router.post('/stream', async (params, body) => {
    // 流式响应需要特殊处理，这里返回提示
    return { 
        message: '流式调用需要使用 /api/agent/stream-sse 接口',
        hint: '请在 server.mjs 中实现 SSE 响应'
    };
});

export default router;

// ========== 对话路由 ==========

// 对话路由组
const convRouter = new Router();

// GET /api/agent/conversations - 获取所有对话
convRouter.get('/conversations', (params, body) => {
    const keyword = params.keyword;
    if (keyword) {
        return { conversations: conversations.searchConversations(keyword) };
    }
    return { conversations: conversations.getAllConversations() };
});

// GET /api/agent/conversations/stats - 获取对话统计
convRouter.get('/conversations/stats', (params, body) => {
    return conversations.getConversationStats();
});

// GET /api/agent/conversations/:id - 获取单个对话
convRouter.get('/conversations/:id', (params, body) => {
    const conv = conversations.getConversation(params.id);
    if (!conv || conv.status !== 'active') {
        throw { status: 404, code: 'CONVERSATION_NOT_FOUND' };
    }
    return conv;
});

// POST /api/agent/conversations - 创建对话
convRouter.post('/conversations', (params, body) => {
    const conv = conversations.createConversation(body);
    return { conversation: conv, success: true };
});

// PATCH /api/agent/conversations/:id - 更新对话
convRouter.patch('/conversations/:id', (params, body) => {
    const conv = conversations.updateConversation(params.id, body);
    if (!conv) {
        throw { status: 404, code: 'CONVERSATION_NOT_FOUND' };
    }
    return { conversation: conv, success: true };
});

// DELETE /api/agent/conversations/:id - 删除对话
convRouter.delete('/conversations/:id', (params, body) => {
    conversations.archiveConversation(params.id);
    return { success: true };
});

// GET /api/agent/conversations/:id/messages - 获取对话消息
convRouter.get('/conversations/:id/messages', (params, body) => {
    return { messages: conversations.getMessages(params.id) };
});

// POST /api/agent/conversations/:id/messages - 添加消息
convRouter.post('/conversations/:id/messages', (params, body) => {
    if (!body.role || !body.content) {
        throw { status: 400, code: 'MISSING_REQUIRED_FIELDS', message: '缺少 role 或 content' };
    }
    const message = conversations.addMessage({
        ...body,
        conversation_id: params.id
    });
    return { message, success: true };
});

// DELETE /api/agent/conversations/:id/messages/:messageId - 删除消息
convRouter.delete('/conversations/:id/messages/:messageId', (params, body) => {
    conversations.deleteMessage(params.messageId);
    return { success: true };
});

export { convRouter };

// ========== 文档索引路由 ==========

const docRouter = new Router();

// GET /api/agent/documents - 搜索文档（q=关键词）
docRouter.get('/documents', (params, body, query) => {
    const q = query?.q || params.q || '';
    const limit = parseInt(query?.limit || params.limit || 20);
    const offset = parseInt(query?.offset || params.offset || 0);
    
    if (!q) {
        throw { status: 400, code: 'MISSING_QUERY', message: '缺少搜索关键词' };
    }
    return { documents: documents.searchDocuments(q, { limit, offset }) };
});

// POST /api/agent/documents - 搜索文档（POST 请求，搜索词在 body 中）
docRouter.post('/documents', (params, body) => {
    const q = body?.q || '';
    const limit = parseInt(body?.limit || 20);
    const offset = parseInt(body?.offset || 0);
    
    if (!q) {
        throw { status: 400, code: 'MISSING_QUERY', message: '缺少搜索关键词' };
    }
    return { documents: documents.searchDocuments(q, { limit, offset }) };
});

// GET /api/agent/documents/tree - 获取文档目录树
docRouter.get('/documents/tree', (params, body) => {
    return { tree: documents.getDocumentTree() };
});

// GET /api/agent/documents/stats - 获取索引统计
docRouter.get('/documents/stats', (params, body) => {
    return documents.getIndexStats();
});

// GET /api/agent/documents/:path - 获取单个文档
docRouter.get('/documents/:path', (params, body) => {
    const path = params.path;
    const doc = documents.getDocument(decodeURIComponent(path));
    if (!doc) {
        throw { status: 404, code: 'DOCUMENT_NOT_FOUND' };
    }
    return { document: doc };
});

// POST /api/agent/documents/index - 索引文档/目录
docRouter.post('/documents/index', (params, body) => {
    const result = documents.rebuildIndex();
    return { success: true, ...result };
});

// DELETE /api/agent/documents/:path - 删除文档索引
docRouter.delete('/documents/:path', (params, body) => {
    const path = params.path;
    documents.removeDocumentIndex(decodeURIComponent(path));
    return { success: true };
});

// 注册文档路由
export { docRouter };
