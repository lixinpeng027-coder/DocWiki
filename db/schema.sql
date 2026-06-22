-- DocWiki Agent 数据库结构
-- 版本: 1.0.0

-- =====================================================
-- 表 1: provider_configs (供应商配置)
-- =====================================================
CREATE TABLE IF NOT EXISTS provider_configs (
    id TEXT PRIMARY KEY,                    -- UUID
    name TEXT NOT NULL,                     -- 供应商显示名称，如 "OpenAI"
    provider_type TEXT NOT NULL,           -- 供应商类型，如 "openai", "anthropic", "deepseek"
    api_base_url TEXT,                      -- API 地址（可选，用于自定义或兼容接口）
    is_custom_api INTEGER DEFAULT 0,       -- 是否为自定义 OpenAI 兼容接口
    enabled INTEGER DEFAULT 1,              -- 是否启用
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- 表 2: model_profiles (模型配置)
-- =====================================================
CREATE TABLE IF NOT EXISTS model_profiles (
    id TEXT PRIMARY KEY,                    -- UUID
    provider_id TEXT NOT NULL,              -- 关联 provider_configs.id
    model_id TEXT NOT NULL,                 -- 模型 ID，如 "gpt-4o", "claude-3-5-sonnet"
    name TEXT NOT NULL,                      -- 模型显示名称
    enabled INTEGER DEFAULT 1,               -- 是否启用
    capabilities TEXT DEFAULT '{}',          -- JSON: {text, vision, reasoning, toolCalling, streaming, embedding}
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (provider_id) REFERENCES provider_configs(id) ON DELETE CASCADE
);

-- =====================================================
-- 表 3: scene_assignments (场景模型分配)
-- =====================================================
CREATE TABLE IF NOT EXISTS scene_assignments (
    id TEXT PRIMARY KEY,                    -- UUID
    scene TEXT NOT NULL UNIQUE,             -- 场景名称，如 "knowledge_qa", "task_planning"
    primary_model_id TEXT,                   -- 主模型 ID
    backup_model_id_1 TEXT,                 -- 备用模型 1
    backup_model_id_2 TEXT,                 -- 备用模型 2
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (primary_model_id) REFERENCES model_profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (backup_model_id_1) REFERENCES model_profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (backup_model_id_2) REFERENCES model_profiles(id) ON DELETE SET NULL
);

-- =====================================================
-- 表 4: api_keys (API 密钥存储 - 加密)
-- =====================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,                    -- UUID
    provider_id TEXT NOT NULL UNIQUE,       -- 关联 provider_configs.id
    key_data TEXT NOT NULL,                 -- 加密后的密钥
    key_hint TEXT,                           -- 密钥提示（如后四位）
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (provider_id) REFERENCES provider_configs(id) ON DELETE CASCADE
);

-- =====================================================
-- 表 5: conversations (对话)
-- =====================================================
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,                    -- UUID
    title TEXT,                              -- 对话标题
    scene TEXT,                              -- 场景
    summary TEXT,                            -- 对话摘要
    status TEXT DEFAULT 'active',           -- active, archived
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- 表 6: messages (消息)
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,                    -- UUID
    conversation_id TEXT NOT NULL,          -- 关联 conversations.id
    role TEXT NOT NULL,                     -- user, assistant, system
    content TEXT,                            -- 消息内容
    model_id TEXT,                           -- 实际使用的模型
    context_snapshot TEXT,                   -- 发送时的上下文快照
    token_count INTEGER,                     -- Token 消耗
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- =====================================================
-- 表 7: preferences (个人偏好)
-- =====================================================
CREATE TABLE IF NOT EXISTS preferences (
    id TEXT PRIMARY KEY,                    -- UUID
    key TEXT NOT NULL UNIQUE,               -- 偏好键
    value TEXT NOT NULL,                    -- 偏好值
    scope TEXT DEFAULT 'global',            -- global, conversation
    confirmed INTEGER DEFAULT 0,             -- 是否已确认
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- 表 8: feedback_cases (反馈案例)
-- =====================================================
CREATE TABLE IF NOT EXISTS feedback_cases (
    id TEXT PRIMARY KEY,                    -- UUID
    conversation_id TEXT,                    -- 关联 conversations.id
    original_output TEXT,                    -- 原始输出
    corrected_output TEXT,                   -- 纠正后输出
    adopted INTEGER DEFAULT 0,               -- 是否被采纳
    created_at TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- 表 9: agent_actions (待确认操作)
-- =====================================================
CREATE TABLE IF NOT EXISTS agent_actions (
    id TEXT PRIMARY KEY,                    -- UUID
    conversation_id TEXT,                    -- 关联 conversations.id
    action_type TEXT NOT NULL,              -- 操作类型
    params TEXT NOT NULL,                   -- JSON 参数
    expected_modified_at TEXT,               -- 期望的文件修改时间
    status TEXT DEFAULT 'pending',          -- pending, confirmed, cancelled, executed
    created_at TEXT DEFAULT (datetime('now')),
    executed_at TEXT,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);

-- =====================================================
-- 表 10: usage_records (用量记录)
-- =====================================================
CREATE TABLE IF NOT EXISTS usage_records (
    id TEXT PRIMARY KEY,                    -- UUID
    conversation_id TEXT,                    -- 关联 conversations.id
    provider_id TEXT NOT NULL,              -- 供应商 ID
    model_id TEXT NOT NULL,                 -- 模型 ID
    scene TEXT,                              -- 场景
    input_tokens INTEGER,
    output_tokens INTEGER,
    latency_ms INTEGER,
    error_code TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);

-- =====================================================
-- 索引
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_model_profiles_provider ON model_profiles(provider_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_provider ON usage_records(provider_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_conversation ON usage_records(conversation_id);

-- =====================================================
-- 预设数据：供应商模板
-- =====================================================
INSERT OR IGNORE INTO provider_configs (id, name, provider_type, api_base_url, is_custom_api) VALUES
    ('prov_openai', 'OpenAI', 'openai', 'https://api.openai.com/v1', 0),
    ('prov_anthropic', 'Anthropic', 'anthropic', 'https://api.anthropic.com/v1', 0),
    ('prov_google', 'Google Gemini', 'google', 'https://generativelanguage.googleapis.com/v1beta', 0),
    ('prov_deepseek', 'DeepSeek', 'deepseek', 'https://api.deepseek.com/v1', 0),
    ('prov_qwen', '阿里云通义千问', 'qwen', 'https://dashscope.aliyuncs.com/compatible-mode/v1', 0),
    ('prov_zhipu', '智谱 GLM', 'zhipu', 'https://open.bigmodel.cn/api/paas/v4', 0),
    ('prov_moonshot', 'Moonshot / Kimi', 'moonshot', 'https://api.moonshot.cn/v1', 0),
    ('prov_baidu', '百度千帆', 'baidu', 'https://qianfan.baidubce.com/v2/chat', 0),
    ('prov_volc', '字节火山方舟', 'volc', 'https://ark.cn-beijing.volces.com/api/v3', 0),
    ('prov_tencent', '腾讯混元', 'tencent', 'https://hunyuan.cloud.tencent.com/v2', 0),
    ('prov_xiaomi', '小米 MiMo', 'xiaomi', 'https://api.xiaomimimo.com/v1', 0);  -- 注意：此地址为示例地址，请以小米官方最新文档为准

-- =====================================================
-- 预设数据：默认场景分配
-- =====================================================
INSERT OR IGNORE INTO scene_assignments (id, scene, primary_model_id, backup_model_id_1, backup_model_id_2) VALUES
    ('scene_default', 'default', NULL, NULL, NULL),
    ('scene_knowledge_qa', 'knowledge_qa', NULL, NULL, NULL),
    ('scene_fast', 'fast', NULL, NULL, NULL),
    ('scene_vision', 'vision', NULL, NULL, NULL);

-- =====================================================
-- 预设数据：常用模型模板（用户需配置密钥后启用）
-- =====================================================
INSERT OR IGNORE INTO model_profiles (id, provider_id, model_id, name, capabilities) VALUES
    -- OpenAI
    ('model_gpt4o', 'prov_openai', 'gpt-4o', 'GPT-4o', '{"text":true,"vision":true,"reasoning":false,"toolCalling":true,"streaming":true,"embedding":false}'),
    ('model_gpt4o_mini', 'prov_openai', 'gpt-4o-mini', 'GPT-4o Mini', '{"text":true,"vision":true,"reasoning":false,"toolCalling":true,"streaming":true,"embedding":false}'),
    ('model_gpt4_turbo', 'prov_openai', 'gpt-4-turbo', 'GPT-4 Turbo', '{"text":true,"vision":false,"reasoning":true,"toolCalling":true,"streaming":true,"embedding":false}'),
    ('model_o1', 'prov_openai', 'o1', 'O1', '{"text":true,"vision":false,"reasoning":true,"toolCalling":false,"streaming":false,"embedding":false}'),
    ('model_o3_mini', 'prov_openai', 'o3-mini', 'O3 Mini', '{"text":true,"vision":false,"reasoning":true,"toolCalling":false,"streaming":false,"embedding":false}'),
    -- Anthropic
    ('model_claude_35_sonnet', 'prov_anthropic', 'claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet', '{"text":true,"vision":true,"reasoning":false,"toolCalling":true,"streaming":true,"embedding":false}'),
    ('model_claude_35_haiku', 'prov_anthropic', 'claude-3-5-haiku-20241022', 'Claude 3.5 Haiku', '{"text":true,"vision":false,"reasoning":false,"toolCalling":true,"streaming":true,"embedding":false}'),
    ('model_claude_3_opus', 'prov_anthropic', 'claude-3-opus-20240229', 'Claude 3 Opus', '{"text":true,"vision":true,"reasoning":true,"toolCalling":true,"streaming":true,"embedding":false}'),
    -- DeepSeek
    ('model_deepseek_v4_flash', 'prov_deepseek', 'deepseek-v4-flash', 'DeepSeek V4 Flash', '{"text":true,"vision":false,"reasoning":true,"toolCalling":true,"streaming":true,"embedding":false}'),
    ('model_deepseek_v4_pro', 'prov_deepseek', 'deepseek-v4-pro', 'DeepSeek V4 Pro', '{"text":true,"vision":true,"reasoning":true,"toolCalling":true,"streaming":true,"embedding":false}'),
    -- 通义千问
    ('model_qwen_max', 'prov_qwen', 'qwen-max', '通义千问 Max', '{"text":true,"vision":false,"reasoning":false,"toolCalling":true,"streaming":true,"embedding":false}'),
    ('model_qwen_plus', 'prov_qwen', 'qwen-plus', '通义千问 Plus', '{"text":true,"vision":false,"reasoning":false,"toolCalling":true,"streaming":true,"embedding":false}'),
    ('model_qwen_vl', 'prov_qwen', 'qwen-vl-max', '通义千问 VL', '{"text":true,"vision":true,"reasoning":false,"toolCalling":false,"streaming":true,"embedding":false}'),
    ('model_qwen2_7b', 'prov_qwen', 'qwen2-7b-instruct', '通义千问 2 7B', '{"text":true,"vision":false,"reasoning":false,"toolCalling":true,"streaming":true,"embedding":false}'),
    ('model_qwen2_57b', 'prov_qwen', 'qwen2-57b-a14b-instruct', '通义千问 2 57B', '{"text":true,"vision":false,"reasoning":true,"toolCalling":true,"streaming":true,"embedding":false}'),
    -- 智谱 GLM
    ('model_glm_4', 'prov_zhipu', 'glm-4', 'GLM-4', '{"text":true,"vision":false,"reasoning":false,"toolCalling":true,"streaming":true,"embedding":false}'),
    ('model_glm_4_flash', 'prov_zhipu', 'glm-4-flash', 'GLM-4 Flash', '{"text":true,"vision":false,"reasoning":false,"toolCalling":true,"streaming":true,"embedding":false}'),
    ('model_glm_4v', 'prov_zhipu', 'glm-4v', 'GLM-4V', '{"text":true,"vision":true,"reasoning":false,"toolCalling":false,"streaming":true,"embedding":false}'),
    ('model_glm_5', 'prov_zhipu', 'glm-5', 'GLM-5', '{"text":true,"vision":true,"reasoning":true,"toolCalling":true,"streaming":true,"embedding":false}'),
    -- Moonshot
    ('model_moonshot_v1_8k', 'prov_moonshot', 'moonshot-v1-8k', 'Moonshot V1 8K', '{"text":true,"vision":false,"reasoning":false,"toolCalling":false,"streaming":true,"embedding":false}'),
    ('model_moonshot_v1_32k', 'prov_moonshot', 'moonshot-v1-32k', 'Moonshot V1 32K', '{"text":true,"vision":false,"reasoning":false,"toolCalling":false,"streaming":true,"embedding":false}'),
    ('model_moonshot_v2_8k', 'prov_moonshot', 'moonshot-v2-8k', 'Moonshot V2 8K', '{"text":true,"vision":false,"reasoning":true,"toolCalling":true,"streaming":true,"embedding":false}'),
    ('model_moonshot_v2_64k', 'prov_moonshot', 'moonshot-v2-64k', 'Moonshot V2 64K', '{"text":true,"vision":false,"reasoning":true,"toolCalling":true,"streaming":true,"embedding":false}'),
    -- 百度千帆
    ('model_baidu_ernie_4', 'prov_baidu', 'ernie-4.0', '文心一言 4.0', '{"text":true,"vision":false,"reasoning":false,"toolCalling":true,"streaming":true,"embedding":false}'),
    ('model_baidu_ernie_35', 'prov_baidu', 'ernie-3.5', '文心一言 3.5', '{"text":true,"vision":false,"reasoning":false,"toolCalling":true,"streaming":true,"embedding":false}'),
    ('model_baidu_ernie_vl', 'prov_baidu', 'ernie-vilg-v2', '文心一言 VL', '{"text":true,"vision":true,"reasoning":false,"toolCalling":false,"streaming":true,"embedding":false}'),
    -- 字节火山方舟
    ('model_volc_llama3', 'prov_volc', 'llama3-8b-chat', 'Llama 3 8B', '{"text":true,"vision":false,"reasoning":false,"toolCalling":true,"streaming":true,"embedding":false}'),
    ('model_volc_llama3_70b', 'prov_volc', 'llama3-70b-chat', 'Llama 3 70B', '{"text":true,"vision":false,"reasoning":true,"toolCalling":true,"streaming":true,"embedding":false}'),
    ('model_volc_qwen2', 'prov_volc', 'qwen2-7b-chat', 'Qwen2 7B', '{"text":true,"vision":false,"reasoning":false,"toolCalling":true,"streaming":true,"embedding":false}'),
    -- 腾讯混元
    ('model_tencent_hunyuan', 'prov_tencent', 'hunyuan-pro', '混元大模型', '{"text":true,"vision":false,"reasoning":false,"toolCalling":true,"streaming":true,"embedding":false}'),
    ('model_tencent_hunyuan_lite', 'prov_tencent', 'hunyuan-lite', '混元轻量版', '{"text":true,"vision":false,"reasoning":false,"toolCalling":true,"streaming":true,"embedding":false}'),
    ('model_tencent_hunyuan_vl', 'prov_tencent', 'hunyuan-vl', '混元多模态', '{"text":true,"vision":true,"reasoning":false,"toolCalling":false,"streaming":true,"embedding":false}'),
    -- 小米 MiMo
    ('model_xiaomi_mimo', 'prov_xiaomi', 'mimo-lite', 'MiMo Lite', '{"text":true,"vision":false,"reasoning":false,"toolCalling":true,"streaming":true,"embedding":false}'),
    ('model_xiaomi_mimo_pro', 'prov_xiaomi', 'mimo-pro', 'MiMo Pro', '{"text":true,"vision":true,"reasoning":true,"toolCalling":true,"streaming":true,"embedding":false}'),
    -- Google Gemini
    ('model_gemini_15_pro', 'prov_google', 'gemini-1.5-pro', 'Gemini 1.5 Pro', '{"text":true,"vision":true,"reasoning":true,"toolCalling":true,"streaming":true,"embedding":false}'),
    ('model_gemini_15_flash', 'prov_google', 'gemini-1.5-flash', 'Gemini 1.5 Flash', '{"text":true,"vision":true,"reasoning":false,"toolCalling":true,"streaming":true,"embedding":false}'),
    ('model_gemini_10_pro', 'prov_google', 'gemini-1.0-pro', 'Gemini 1.0 Pro', '{"text":true,"vision":false,"reasoning":false,"toolCalling":true,"streaming":true,"embedding":false}');

-- =====================================================
-- 表 10: document_index (文档索引)
-- =====================================================
CREATE TABLE IF NOT EXISTS document_index (
    id TEXT PRIMARY KEY,                    -- UUID
    path TEXT NOT NULL UNIQUE,              -- 文档相对路径
    title TEXT NOT NULL,                     -- 文档标题
    headings TEXT DEFAULT '[]',               -- JSON: 标题结构
    sections TEXT DEFAULT '[]',              -- JSON: 文档段落
    keywords TEXT DEFAULT '[]',              -- JSON: 关键词列表
    plain_text TEXT,                         -- 纯文本内容
    word_count INTEGER DEFAULT 0,            -- 字数统计
    indexed_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_doc_path ON document_index(path);
CREATE INDEX IF NOT EXISTS idx_doc_title ON document_index(title);
CREATE INDEX IF NOT EXISTS idx_doc_indexed ON document_index(indexed_at);

-- =====================================================
-- 表 11: query_history (问答学习记录)
-- =====================================================
CREATE TABLE IF NOT EXISTS query_history (
    id TEXT PRIMARY KEY,
    query TEXT NOT NULL,                         -- 用户问题（去标点、小写化）
    question_keywords TEXT DEFAULT '[]',          -- JSON: 提取的关键词
    doc_paths TEXT DEFAULT '[]',                  -- JSON: 使用过的有效文档路径
    doc_titles TEXT DEFAULT '[]',                 -- JSON: 对应的文档标题
    success INTEGER DEFAULT 1,                   -- 是否成功回答
    query_count INTEGER DEFAULT 1,               -- 累计命中次数
    last_used_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qh_query ON query_history(query);
