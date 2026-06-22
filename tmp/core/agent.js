// Agent 核心模块：带 Tool Calling 的自主检索对话 + 自主学习
import * as adapter from './adapter.js';
import * as documents from './documents.js';
import * as models from './models.js';
import { recordQuery, findRelevantPaths, getAllPreferences, getPreference, setPreference, deletePreference, getPreferencesSummary } from './learning.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
// 统一使用运行时 dataDir：优先 DOCWIKI_DATA_DIR（桌面端通过 Electron 设置），其次 WEBWIKI_DATA_DIR，最后回退源码 data
const dataDir = path.resolve(process.env.DOCWIKI_DATA_DIR || process.env.WEBWIKI_DATA_DIR || path.join(rootDir, 'data'));

// Agent 可用工具定义
const TOOLS = [
    {
        type: 'function',
        function: {
            name: 'get_historical_paths',
            description: '查询历史经验，获取与当前问题相关的推荐文档路径。系统会记住之前成功回答过的类似问题及其关联的文档。应优先使用此工具来快速定位相关文件。',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: '当前用户的问题，用于匹配历史经验'
                    }
                },
                required: ['query']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'search_documents',
            description: '搜索知识库中的文档。返回匹配的文档标题、路径和相关片段。用于查找与用户问题相关的文件。',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: '搜索关键词，如"项目进度"、"API设计"等'
                    },
                    limit: {
                        type: 'integer',
                        description: '返回结果数量，默认5',
                        default: 5
                    }
                },
                required: ['query']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'read_document',
            description: '读取指定文档的完整内容。需要提供文档的相对路径（从搜索结果或历史经验中获取）。用于深入了解文档详情。',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: '文档相对路径，如"任务/任务说明.md"'
                    }
                },
                required: ['path']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'list_directory',
            description: '列出指定目录下的文件和子目录。用于浏览知识库的目录结构。',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: '目录路径，如"任务"、"项目"，为空则列出根目录'
                    }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'read_task_data',
            description: '读取用户的任务数据。返回所有待办任务和已完成任务的详细信息，包括任务名称、优先级、状态、截止日期、当前阶段等。当用户询问今日任务、本周任务、进行中的任务、或任何与任务相关的问题时，必须优先使用此工具。',
            parameters: {
                type: 'object',
                properties: {
                    filter: {
                        type: 'string',
                        description: '可选过滤条件：today(今日任务), week(本周任务), in_progress(进行中), all(全部), 默认为 all'
                    }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'navigate_to_page',
            description: '在前端界面中切换到指定页面。⚠️ 重要：调用此工具前，你必须在回答末尾明确告知用户"我将要跳转到 XX 页面"并等待用户确认。用户同意后系统会自动跳转。不要擅自跳转。',
            parameters: {
                type: 'object',
                properties: {
                    page: {
                        type: 'string',
                        description: '页面类型：task(任务)、project(项目)、report(报告)、sop(SOP)、software(软件)、writing(写作)、literature(文献)。注意：不要使用"doc"或"文档页"作为 page 值，前端不支持此类型。如果想让用户查看具体文档，请使用 file 参数配合正确的 page 类型。'
                    },
                    file: {
                        type: 'string',
                        description: '可选，具体文件相对路径如"项目/示例项目/项目概述.md"。路径相对于 data/ 目录，不要包含 data/ 前缀。使用 search_documents 或 list_directory 返回的原始路径，不要自己拼接。'
                    }
                },
                required: ['page']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'save_user_preference',
            description: '保存用户的个人偏好设置。当用户明确表达偏好（如回答风格、关注领域、语言习惯等）时调用此工具。也用于用户要求修改/删除偏好时。',
            parameters: {
                type: 'object',
                properties: {
                    key: {
                        type: 'string',
                        description: '偏好名称，如 "回答风格"、"关注领域"、"语言"、"称呼" 等'
                    },
                    value: {
                        type: 'string',
                        description: '偏好值，如 "简洁分点"、"酶工程、发酵工艺"、"中文"、"老师" 等'
                    },
                    action: {
                        type: 'string',
                        description: '操作类型：save(保存/更新) 或 delete(删除)，默认 save'
                    }
                },
                required: ['key', 'value']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_user_preferences',
            description: '获取用户当前保存的所有偏好设置。在回答前调用此工具可以了解用户的习惯和偏好，从而个性化回答。',
            parameters: {
                type: 'object',
                properties: {}
            }
        }
    }
];

// System prompt
const AGENT_SYSTEM_PROMPT = `你是一个知识库助手Agent。你可以通过工具自主检索知识库中的文件来回答用户问题。

核心原则：你必须读取文件的实际内容来回答问题，绝不能只看目录结构就下结论。

工作流程：
1. 收到问题后，先用 get_user_preferences 获取用户偏好，用于个性化回答
2. 然后使用 get_historical_paths 查询历史经验
3. 如果有历史经验，优先使用 read_document 读取推荐路径的文件
4. 否则使用 search_documents 搜索，然后 read_document 读取相关文件
5. 也可以用 list_directory 浏览目录，但列出后必须用 read_document 逐个读取文件内容
6. 综合读取到的内容回答用户问题
7. 如果用户询问任务相关（今日任务、本周任务、进行中任务等），先使用 read_task_data 工具获取任务数据再回答
8. 绝不凭空编造，只基于实际 read_document 读取的内容回答

用户偏好管理（重要）：
- 当用户说"我喜欢..."、"以后..."、"记住我..."、"偏好..."、"风格..."等表达个人偏好的话时，调用 save_user_preference 保存
- 常见偏好类别：回答风格、关注领域、称呼、语言、格式要求等
- 当用户要求删除/修改偏好时，调用 save_user_preference（action=delete 或更新 value）
- 每次回答前先读取偏好，根据偏好调整回答方式

回答格式要求（非常重要）：
- 回答要简洁紧凑，直接分点论述
- 不要用大标题（# ## ###），不要用分隔线（---），不要用 emoji 装饰
- 用 **加粗** 标记关键信息，用无序列表或编号列表组织内容
- 段落之间不要空行，保持紧凑
- 示例格式：先一句话总结，然后用编号列表逐条展开

页面跳转规则（回答 + 跳转可以同时存在）：
核心原则：你始终需要先回答用户的问题，然后根据情况决定是否同时跳转到对应页面。
跳转前必须征得用户同意：
- 在回答末尾明确告知用户"我将要跳转到 XX 页面"
- 调用 navigate_to_page 工具，系统会显示确认对话框
- 用户点击"是"后才会执行跳转
- 不要在用户明确拒绝后仍然调用 navigate_to_page
跳转时机（回答的同时调用 navigate_to_page）：
- 问题与某个模块直接相关时（如问任务→跳转task，问项目→跳转project）
- 用户浏览了文件列表，跳转到对应页面方便进一步操作
- 问题涉及具体文档内容，跳转到文件所在页面方便阅读原文
不跳转的场景（仅对话回答）：
- 纯总结性/统计性问题（如"完成了多少"、"有几个"）
- 与知识库内容无关的闲聊
page 参数：必须是精确的模块名 task/project/report/sop/software/writing/literature（不含 doc/文档页）
file 参数：当问题涉及具体文件时传递，路径相对于 data/ 目录，如"项目/示例项目/项目概述.md"

文件路径规则（重要）：
- 所有文件路径均相对于知识库根目录（data/），不要包含 data/ 前缀
- 例如：文件位于 data/项目/示例项目/项目概述.md，路径应为 "项目/示例项目/项目概述.md"
- search_documents 返回的 path 字段就是正确的相对路径，直接使用即可
- 不要自己拼接路径——使用搜索或目录列表返回的原始路径

错误处理规则：
- list_directory 只能看到文件名，看不到内容！必须 read_document 获取内容
- 至少读取3-5个文件后再回答
- 搜索结果不理想时尝试不同关键词
- 给出的文件路径必须是知识库中的真实路径
- 如果 read_document 返回错误"文件不存在"，尝试用 search_documents 搜索正确路径，不要反复重试相同的路径`;

// 执行工具调用
async function executeTool(toolName, args) {
    switch (toolName) {
        case 'get_historical_paths': {
            const paths = findRelevantPaths(args.query || '', 5);
            if (paths.length === 0) {
                return { paths: [], message: '暂无相关历史经验，请通过搜索文档来回答' };
            }
            return {
                paths,
                message: `基于历史经验，以下文档可能与问题相关（按相关度排序）`
            };
        }

        case 'search_documents': {
            const results = documents.searchDocuments(args.query, { limit: args.limit || 5 });
            return {
                results: results.map(doc => ({
                    title: doc.title,
                    path: doc.path,
                    snippets: doc.snippets || [],
                    word_count: doc.word_count
                }))
            };
        }

        case 'read_document': {
            const docPath = args.path;
            if (!docPath) return { error: '缺少 path 参数' };

            const absolutePath = path.join(dataDir, docPath);
            try {
                const content = await readFile(absolutePath, 'utf8');
                const maxLength = 8000;
                const truncated = content.length > maxLength
                    ? content.slice(0, maxLength) + '\n\n... [内容已截断，共 ' + content.length + ' 字]'
                    : content;
                return {
                    path: docPath,
                    content: truncated,
                    total_length: content.length
                };
            } catch (err) {
                if (err.code === 'ENOENT') {
                    return {
                        error: `文件不存在: ${docPath}`,
                        suggestion: '请使用 search_documents 搜索关键词找到正确的文件路径，或使用 list_directory 浏览目录结构'
                    };
                }
                return { error: `读取失败: ${err.message}` };
            }
        }

        case 'list_directory': {
            const dirPath = args.path ? path.join(dataDir, args.path) : dataDir;
            try {
                const tree = documents.getDocumentTree(dirPath, args.path || '');
                return { tree };
            } catch (err) {
                if (err.code === 'ENOENT') {
                    return {
                        error: `目录不存在: ${args.path}`,
                        suggestion: '请使用 search_documents 搜索关键词找到正确的目录路径，或先使用 list_directory 查看根目录结构'
                    };
                }
                return { error: `目录读取失败: ${err.message}` };
            }
        }

        case 'read_task_data': {
            // ★ 读取任务数据：从 Markdown 文件加载
            const filter = args.filter || 'all';
            const todoDir = path.join(dataDir, '任务', '待办');
            const doneDir = path.join(dataDir, '任务', '已完成');
            try {
                const { readdir, readFile } = await import('node:fs/promises');
                const { default: matter } = await import('gray-matter');

                async function scanDir(dir) {
                    try {
                        const entries = await readdir(dir, { withFileTypes: true });
                        const tasks = [];
                        for (const entry of entries) {
                            if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
                            try {
                                const raw = await readFile(path.join(dir, entry.name), 'utf-8');
                                const parsed = matter(raw);
                                tasks.push({ ...parsed.data, detail: parsed.content.trim() || '' });
                            } catch (e) { /* skip */ }
                        }
                        return tasks;
                    } catch (e) { return []; }
                }

                const [activeTasks, completedTasks] = await Promise.all([scanDir(todoDir), scanDir(doneDir)]);

                // 过滤
                let filtered = activeTasks;
                if (filter === 'today') {
                    const today = new Date();
                    filtered = activeTasks.filter(t => {
                        const d = t.plannedDate || t.deadline;
                        if (!d) return false;
                        const td = new Date(d);
                        return td.toDateString() === today.toDateString();
                    });
                } else if (filter === 'week') {
                    const now = new Date();
                    const weekEnd = new Date(now);
                    weekEnd.setDate(now.getDate() + (7 - (now.getDay() || 7)));
                    filtered = activeTasks.filter(t => {
                        const d = t.plannedDate || t.deadline;
                        if (!d) return false;
                        const td = new Date(d);
                        return td >= now && td <= weekEnd;
                    });
                } else if (filter === 'in_progress') {
                    filtered = activeTasks.filter(t => t.status === '进行中');
                }

                return {
                    tasks: filtered,
                    completedTasks: filter === 'all' ? completedTasks : [],
                    total: activeTasks.length,
                    completed: completedTasks.length,
                    filter
                };
            } catch (err) {
                // Fallback: 尝试旧 JSON
                try {
                    const taskJsonPath = path.join(dataDir, '任务', '任务清单.json');
                    const raw = await import('node:fs/promises').then(fs => fs.readFile(taskJsonPath, 'utf-8'));
                    const data = JSON.parse(raw);
                    return { tasks: data.tasks || [], completedTasks: data.completedTasks || [], source: 'legacy-json' };
                } catch (e) {
                    return { error: `读取任务数据失败: ${err.message}`, tasks: [], completedTasks: [] };
                }
            }
        }

        case 'navigate_to_page': {
            // 返回导航指令，由前端执行跳转
            return { success: true, page: args.page || 'task', file: args.file || null };
        }

        case 'save_user_preference': {
            if (args.action === 'delete') {
                deletePreference(args.key);
                return { success: true, message: `已删除偏好: ${args.key}` };
            }
            setPreference(args.key, args.value, 'global');
            return { success: true, key: args.key, value: args.value };
        }

        case 'get_user_preferences': {
            const summary = getPreferencesSummary();
            return { preferences: getAllPreferences(), summary };
        }

        default:
            return { error: `未知工具: ${toolName}` };
    }
}

// 从工具调用记录中提取读取过的文档路径和标题
function extractDocsFromTools(toolsUsed) {
    const docPaths = [];
    const docTitles = [];
    const seen = new Set();

    for (const tool of toolsUsed) {
        if (tool.name === 'read_document' && tool.args?.path) {
            const p = tool.args.path;
            if (!seen.has(p)) {
                seen.add(p);
                docPaths.push(p);
                // 尝试从结果摘要中提取标题
                docTitles.push(p.replace(/\.md$/, '').split('/').pop());
            }
        }
        if (tool.name === 'search_documents' && tool.result_summary) {
            try {
                const summary = JSON.parse(tool.result_summary);
                if (summary.results) {
                    for (const r of summary.results) {
                        if (r.path && !seen.has(r.path)) {
                            seen.add(r.path);
                            docPaths.push(r.path);
                            docTitles.push(r.title || r.path);
                        }
                    }
                }
            } catch {
                // 忽略解析错误
            }
        }
    }

    return { docPaths, docTitles };
}

// Agent 主循环
export async function runAgent(messages, options = {}) {
    const scene = options.scene || 'default';
    const maxIterations = options.maxIterations || 10;
    const toolsUsed = [];

    // 获取可用模型（严格场景分配）
    const candidates = models.getSceneModelCandidates(scene);
    if (candidates.length === 0) {
        const sceneLabels = { default: '通用', knowledge_qa: '知识问答', fast: '快速响应', vision: '视觉理解' };
        const sceneLabel = sceneLabels[scene] || scene;
        const err = new Error(`场景「${sceneLabel}」(${scene}) 未配置可用模型。请到 设置 → 场景分配 中为该场景指定主模型，并确保对应供应商已保存 API 密钥。`);
        err.code = 'NO_MODEL_FOR_SCENE';
        err.statusCode = 400;
        err.scene = scene;
        throw err;
    }

    // 获取用户的最新问题（用于学习记录）
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    const userQuestion = lastUserMessage?.content || '';

    // 构建初始消息（包含 system prompt）
    const agentMessages = [
        { role: 'system', content: AGENT_SYSTEM_PROMPT },
        ...messages
    ];

    let finalContent = '';
    let usedModel = null;

    // Agent 循环
    for (let iteration = 0; iteration < maxIterations; iteration++) {
        let lastError = null;
        for (const model of candidates) {
            let result;
            try {
                result = await adapter.chatWithModel(model.id, {
                    messages: agentMessages,
                    tools: TOOLS,
                    toolChoice: 'auto',
                    temperature: 0.3,
                    maxTokens: 4096
                });
            } catch (err) {
                console.error(`[Agent] 模型 ${model.name} 调用失败:`, err.message);
                lastError = err;
                continue;
            }

            const toolCalls = result.toolCalls;
            const assistantContent = result.content || '';

            if (toolCalls && toolCalls.length > 0) {
                agentMessages.push({
                    role: 'assistant',
                    content: assistantContent || null,
                    tool_calls: toolCalls
                });

                for (const toolCall of toolCalls) {
                    const funcName = toolCall.function.name;
                    let args;
                    try {
                        args = typeof toolCall.function.arguments === 'string'
                            ? JSON.parse(toolCall.function.arguments)
                            : toolCall.function.arguments;
                    } catch {
                        args = {};
                    }

                    const toolResult = await executeTool(funcName, args);

                    toolsUsed.push({
                        name: funcName,
                        args,
                        result_summary: typeof toolResult === 'string'
                            ? toolResult.slice(0, 200)
                            : JSON.stringify(toolResult).slice(0, 200)
                    });

                    agentMessages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: typeof toolResult === 'string'
                            ? toolResult
                            : JSON.stringify(toolResult, null, 2)
                    });
                }

                continue;
            }

            // 没有工具调用，返回最终回答
            finalContent = assistantContent || '';
            usedModel = { id: model.id, model_id: model.model_id, name: model.name, provider_name: model.provider_name };
            break;
        }

        if (finalContent) break;
        if (lastError) continue;
    }

    if (!finalContent) {
        // 所有候选模型均失败或轮次耗尽
        if (candidates.length > 0) {
            const sceneLabels = { default: '通用', knowledge_qa: '知识问答', fast: '快速响应', vision: '视觉理解' };
            const sceneLabel = sceneLabels[scene] || scene;
            const err = new Error(`场景「${sceneLabel}」(${scene}) 的 ${candidates.length} 个已配置模型均调用失败。请检查 API 密钥是否有效、模型是否可用，或更换其他模型后重试。`);
            err.code = 'ALL_MODELS_FAILED';
            err.statusCode = 502;
            err.scene = scene;
            throw err;
        }
        finalContent = '抱歉，检索轮次已达上限，请尝试更具体的问题。';
    }

    // === 自主学习：记录本次问答关联 ===
    if (userQuestion && toolsUsed.length > 0) {
        try {
            const { docPaths, docTitles } = extractDocsFromTools(toolsUsed);
            if (docPaths.length > 0) {
                recordQuery(userQuestion, docPaths, docTitles);
                console.log(`[Agent] 学习记录: "${userQuestion.slice(0, 30)}..." → ${docPaths.length} 个文档`);
            }
        } catch (err) {
            console.error('[Agent] 学习记录失败:', err.message);
        }
    }

    // 收集导航指令
    const navInstructions = [];
    for (const tool of toolsUsed) {
        if (tool.name === 'navigate_to_page') {
            try {
                const r = typeof tool.result_summary === 'string' ? JSON.parse(tool.result_summary) : {};
                navInstructions.push({ page: r.page || 'task', file: r.file || null });
            } catch {
                navInstructions.push({ page: 'task' });
            }
        }
    }

    return {
        success: true,
        content: finalContent,
        toolsUsed,
        used_model: usedModel,
        navigate: navInstructions.length > 0 ? navInstructions[navInstructions.length - 1] : null
    };
}

export default { runAgent };
