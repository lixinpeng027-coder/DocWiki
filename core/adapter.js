// 统一模型适配层
// 提供统一的接口调用不同供应商的 API
import { getApiKey } from './keys.js';
import { getProvider } from './providers.js';
import { getModel, getAllModels } from './models.js';

// 供应商适配器基类
class BaseAdapter {
    constructor(provider) {
        this.provider = provider;
    }
    
    // 获取 API 密钥
    async getApiKey() {
        const keyInfo = getApiKey(this.provider.id);
        if (!keyInfo || keyInfo.error) {
            throw new Error(`供应商 ${this.provider.name} 的 API 密钥未配置或无效`);
        }
        return keyInfo.key;
    }
    
    // 发送请求（子类实现）
    async chat(request) {
        throw new Error('子类必须实现 chat 方法');
    }
    
    // 流式请求（子类实现）
    async *stream(request) {
        throw new Error('子类必须实现 stream 方法');
    }
}

// OpenAI 兼容适配器（适用于 OpenAI、DeepSeek、Moonshot、通义千问等）
class OpenAICompatibleAdapter extends BaseAdapter {
    async chat(request) {
        const apiKey = await this.getApiKey();
        const baseUrl = this.provider.api_base_url || 'https://api.openai.com/v1';
        
        // 构建请求体
        const body = {
            model: request.model,
            messages: request.messages,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens ?? 4096,
            stream: false
        };
        
        // 工具调用支持
        if (request.tools) {
            body.tools = request.tools;
            body.tool_choice = request.toolChoice ?? 'auto';
        }
        
        // 发送请求
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API 请求失败: ${response.status} - ${error}`);
        }
        
        const data = await response.json();
        
        // 统一返回格式
        return {
            id: data.id,
            model: data.model,
            content: data.choices[0]?.message?.content || '',
            toolCalls: data.choices[0]?.message?.tool_calls,
            usage: {
                inputTokens: data.usage?.prompt_tokens,
                outputTokens: data.usage?.completion_tokens,
                totalTokens: data.usage?.total_tokens
            },
            finishReason: data.choices[0]?.finish_reason
        };
    }
    
    async *stream(request) {
        const apiKey = await this.getApiKey();
        const baseUrl = this.provider.api_base_url || 'https://api.openai.com/v1';
        
        // 构建请求体
        const body = {
            model: request.model,
            messages: request.messages,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens ?? 4096,
            stream: true
        };
        
        // 发送请求
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API 请求失败: ${response.status} - ${error}`);
        }
        
        // 解析 SSE 流
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        return;
                    }
                    
                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices[0]?.delta;
                        
                        if (delta?.content) {
                            yield {
                                type: 'text',
                                content: delta.content
                            };
                        }
                        
                        if (delta?.tool_calls) {
                            yield {
                                type: 'tool_call',
                                toolCalls: delta.tool_calls
                            };
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }
            }
        }
    }
}

// Anthropic 适配器
class AnthropicAdapter extends BaseAdapter {
    async chat(request) {
        const apiKey = await this.getApiKey();
        const baseUrl = this.provider.api_base_url || 'https://api.anthropic.com/v1';
        
        // 分离 system 和其他消息
        const systemMessages = request.messages.filter(m => m.role === 'system');
        const otherMessages = request.messages.filter(m => m.role !== 'system');
        
        // 构建请求体
        const body = {
            model: request.model,
            messages: otherMessages.map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content
            })),
            system: systemMessages.map(m => m.content).join('\n') || undefined,
            max_tokens: request.maxTokens ?? 4096,
            temperature: request.temperature ?? 0.7
        };
        
        // 发送请求
        const response = await fetch(`${baseUrl}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API 请求失败: ${response.status} - ${error}`);
        }
        
        const data = await response.json();
        
        // 统一返回格式
        const textBlock = data.content.find(b => b.type === 'text');
        const toolUseBlocks = data.content.filter(b => b.type === 'tool_use');
        
        return {
            id: data.id,
            model: data.model,
            content: textBlock?.text || '',
            toolCalls: toolUseBlocks.length > 0 ? toolUseBlocks : undefined,
            usage: {
                inputTokens: data.usage?.input_tokens,
                outputTokens: data.usage?.output_tokens
            },
            finishReason: data.stop_reason
        };
    }
    
    async *stream(request) {
        const apiKey = await this.getApiKey();
        const baseUrl = this.provider.api_base_url || 'https://api.anthropic.com/v1';
        
        // 分离 system 和其他消息
        const systemMessages = request.messages.filter(m => m.role === 'system');
        const otherMessages = request.messages.filter(m => m.role !== 'system');
        
        // 构建请求体
        const body = {
            model: request.model,
            messages: otherMessages.map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content
            })),
            system: systemMessages.map(m => m.content).join('\n') || undefined,
            max_tokens: request.maxTokens ?? 4096,
            temperature: request.temperature ?? 0.7,
            stream: true
        };
        
        // 发送请求
        const response = await fetch(`${baseUrl}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API 请求失败: ${response.status} - ${error}`);
        }
        
        // 解析 SSE 流
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    
                    try {
                        const parsed = JSON.parse(data);
                        
                        if (parsed.type === 'content_block_delta') {
                            if (parsed.delta?.type === 'text_delta') {
                                yield {
                                    type: 'text',
                                    content: parsed.delta.text
                                };
                            }
                        }
                        
                        if (parsed.type === 'content_block_start') {
                            if (parsed.content_block?.type === 'tool_use') {
                                yield {
                                    type: 'tool_call_start',
                                    toolCall: parsed.content_block
                                };
                            }
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }
            }
        }
    }
}

// Google Gemini 适配器
class GeminiAdapter extends BaseAdapter {
    async chat(request) {
        const apiKey = await this.getApiKey();
        const baseUrl = this.provider.api_base_url || 'https://generativelanguage.googleapis.com/v1beta';
        
        // 转换消息格式
        const parts = request.messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));
        
        // 构建请求体
        const body = {
            contents: parts,
            generationConfig: {
                temperature: request.temperature ?? 0.7,
                maxOutputTokens: request.maxTokens ?? 4096
            }
        };
        
        // 发送请求
        const response = await fetch(`${baseUrl}/models/${request.model}:generateContent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API 请求失败: ${response.status} - ${error}`);
        }
        
        const data = await response.json();
        
        // 统一返回格式
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        return {
            id: data.id,
            model: request.model,
            content,
            usage: {
                inputTokens: data.usageMetadata?.promptTokenCount,
                outputTokens: data.usageMetadata?.candidatesTokenCount,
                totalTokens: data.usageMetadata?.totalTokenCount
            },
            finishReason: data.candidates?.[0]?.finishReason
        };
    }
    
    async *stream(request) {
        const apiKey = await this.getApiKey();
        const baseUrl = this.provider.api_base_url || 'https://generativelanguage.googleapis.com/v1beta';
        
        // 转换消息格式
        const parts = request.messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));
        
        // 构建请求体
        const body = {
            contents: parts,
            generationConfig: {
                temperature: request.temperature ?? 0.7,
                maxOutputTokens: request.maxTokens ?? 4096
            },
            stream: true
        };
        
        // 发送请求
        const response = await fetch(`${baseUrl}/models/${request.model}:streamGenerateContent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API 请求失败: ${response.status} - ${error}`);
        }
        
        // 解析 SSE 流
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    
                    try {
                        const parsed = JSON.parse(data);
                        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                        
                        if (text) {
                            yield {
                                type: 'text',
                                content: text
                            };
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }
            }
        }
    }
}

// 适配器工厂
const adapters = {
    openai: OpenAICompatibleAdapter,
    deepseek: OpenAICompatibleAdapter,
    moonshot: OpenAICompatibleAdapter,
    qwen: OpenAICompatibleAdapter,
    zhipu: OpenAICompatibleAdapter,
    baidu: OpenAICompatibleAdapter,  // 百度千帆 V2 接口兼容 OpenAI
    volc: OpenAICompatibleAdapter,   // 字节火山方舟兼容 OpenAI
    tencent: OpenAICompatibleAdapter, // 腾讯混元 V2 接口兼容 OpenAI
    xiaomi: OpenAICompatibleAdapter,
    custom: OpenAICompatibleAdapter,
    anthropic: AnthropicAdapter,
    google: GeminiAdapter
};

// 获取适配器实例
export function getAdapter(providerId) {
    const provider = getProvider(providerId);
    if (!provider) {
        throw new Error(`供应商 ${providerId} 不存在`);
    }
    
    const AdapterClass = adapters[provider.provider_type];
    if (!AdapterClass) {
        throw new Error(`不支持的供应商类型: ${provider.provider_type}`);
    }
    
    return new AdapterClass(provider);
}

// 统一调用接口
export async function chatWithModel(modelId, request) {
    const model = getModel(modelId);
    if (!model) {
        throw new Error(`模型 ${modelId} 不存在`);
    }
    
    const adapter = getAdapter(model.provider_id);
    
    // 使用模型的实际 ID
    request.model = model.model_id;
    
    return await adapter.chat(request);
}

// 统一流式调用接口
export async function* streamWithModel(modelId, request) {
    const model = getModel(modelId);
    if (!model) {
        throw new Error(`模型 ${modelId} 不存在`);
    }
    
    const adapter = getAdapter(model.provider_id);
    
    // 使用模型的实际 ID
    request.model = model.model_id;
    
    yield* adapter.stream(request);
}

// 供应商默认 API 地址
const DEFAULT_BASE_URLS = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    google: 'https://generativelanguage.googleapis.com/v1beta',
    deepseek: 'https://api.deepseek.com/v1',
    qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    zhipu: 'https://open.bigmodel.cn/api/paas/v4',
    moonshot: 'https://api.moonshot.cn/v1',
    baidu: 'https://qianfan.baidubce.com/v2',
    volc: 'https://ark.cn-beijing.volces.com/api/v3',
    tencent: 'https://hunyuan.cloud.tencent.com/v2',
    xiaomi: 'https://api.xiaomimimo.com/v1',
    custom: 'https://api.openai.com/v1'
};

function getDefaultBaseUrl(providerType) {
    return DEFAULT_BASE_URLS[providerType] || 'https://api.openai.com/v1';
}

// 获取供应商可用模型列表
export async function listProviderModels(providerId, tempApiKey = null) {
    const provider = getProvider(providerId);
    if (!provider) {
        throw new Error(`供应商 ${providerId} 不存在`);
    }
    
    const baseUrl = provider.api_base_url || getDefaultBaseUrl(provider.provider_type);
    
    // 从数据库获取预置模型（API 调用失败时的回退方案）
    function getLocalModels() {
        const dbModels = getAllModels(providerId);
        return dbModels.map(m => ({ id: m.model_id, name: m.name }));
    }
    
    // 获取 API Key（可能为空）
    function getApiKeyOrNull() {
        if (tempApiKey) return tempApiKey;
        const keyInfo = getApiKey(provider.id);
        return (keyInfo && !keyInfo.error) ? keyInfo.key : null;
    }
    
    try {
        // 数据库预置模型供应商（这些没有真实的模型列表 API，直接返回预置）
        if (['baidu', 'tencent'].includes(provider.provider_type)) {
            return getLocalModels();
        }
        
        // 其他供应商需要 API Key 才能获取真实模型
        const apiKey = getApiKeyOrNull();
        if (!apiKey) {
            // 没有 Key 时返回空，引导用户先配置 Key 再获取
            return [];
        }
        
        switch (provider.provider_type) {
            case 'google': {
                const response = await fetch(`${baseUrl}/models`, {
                    method: 'GET',
                    headers: { 'x-goog-api-key': apiKey }
                });
                if (!response.ok) return tempApiKey ? getLocalModels() : [];
                const data = await response.json();
                return data.models?.map(m => ({
                    id: m.name.replace('models/', ''),
                    name: m.displayName || m.name,
                })) || [];
            }
            
            case 'zhipu': {
                const response = await fetch(`${baseUrl}/models`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                if (!response.ok) return tempApiKey ? getLocalModels() : [];
                const data = await response.json();
                return data.data?.map(m => ({ id: m.id, name: m.name || m.id })) || [];
            }
            
            default: {
                // OpenAI 兼容接口（openai, deepseek, moonshot, qwen, volc, custom）
                const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/models`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                if (!response.ok) return tempApiKey ? getLocalModels() : [];
                const data = await response.json();
                return data.data?.map(m => ({ id: m.id, name: m.id })) || [];
            }
        }
    } catch (err) {
        console.warn(`获取模型列表失败，使用预置模型: ${err.message}`);
        // 只有用户主动点击"获取最新模型"时才回退到预置模型
        if (tempApiKey) return getLocalModels();
        return [];
    }
}

export default {
    getAdapter,
    chatWithModel,
    streamWithModel,
    listProviderModels,
    adapters
};