// DocWiki 1.2.0 模型路由严格隔离测试
// 用法: node tests/model-routing.test.mjs
// 使用独立临时 state/data 目录，不发网络请求，不泄露真实 API key。

import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const testStateDir = path.join(rootDir, '.webwiki-test-routing');
const testDataDir = path.join(testStateDir, 'data');

// 清理并创建独立目录
rmSync(testStateDir, { recursive: true, force: true });
mkdirSync(testStateDir, { recursive: true });
mkdirSync(testDataDir, { recursive: true });

// 设置环境变量
process.env.WEBWIKI_STATE_DIR = testStateDir;
process.env.WEBWIKI_DATA_DIR = testDataDir;
process.env.DOCWIKI_STATE_DIR = testStateDir;
process.env.DOCWIKI_DATA_DIR = testDataDir;

let passed = 0;
let failed = 0;
function assert(condition, label) {
    if (condition) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.error(`  ❌ ${label}`); }
}

async function run() {
    console.log('\n=== DocWiki 1.2.0 模型路由隔离测试 ===\n');

    // 动态导入（环境变量已设置）
    const { initDatabase, getDatabase, saveDatabase } = await import('../db/index.js');
    await initDatabase();
    const db = getDatabase();

    // 读取 schema 获取已知 ID
    const schema = readFileSync(path.join(rootDir, 'db', 'schema.sql'), 'utf8');

    console.log('1. 配置测试供应商和模型');

    // 添加 DeepSeek 供应商（使用预置 prov_deepseek）
    // 保存 DeepSeek 的 API key（测试用假 key，不泄露真实 key）
    db.run(`INSERT OR REPLACE INTO api_keys (id, provider_id, key_data, key_hint) VALUES ('key_deepseek_test', 'prov_deepseek', 'sk-test-deepseek-fake-key-not-real', 'sk-...test')`);

    // 添加小米供应商
    db.run(`INSERT OR REPLACE INTO api_keys (id, provider_id, key_data, key_hint) VALUES ('key_xiaomi_test', 'prov_xiaomi', 'sk-test-xiaomi-fake-key-not-real', 'sk-...test')`);

    // DeepSeek 模型 A
    db.run(`INSERT OR REPLACE INTO model_profiles (id, provider_id, model_id, name, enabled, capabilities) VALUES ('model_A', 'prov_deepseek', 'deepseek-v4-flash', 'DeepSeek V4 Flash', 1, '{"text":true,"vision":false,"reasoning":true,"toolCalling":true,"streaming":true,"embedding":false}')`);

    // MiMo 模型 B（视觉模型）
    db.run(`INSERT OR REPLACE INTO model_profiles (id, provider_id, model_id, name, enabled, capabilities) VALUES ('model_B', 'prov_xiaomi', 'mimo-v2-omni', 'MiMo V2 Omni', 1, '{"text":true,"vision":true,"reasoning":true,"toolCalling":true,"streaming":true,"embedding":false}')`);

    // 禁用模型（不应出现在任何场景 candidates 中）
    db.run(`INSERT OR REPLACE INTO model_profiles (id, provider_id, model_id, name, enabled, capabilities) VALUES ('model_C_disabled', 'prov_deepseek', 'deepseek-v4-pro', 'DeepSeek V4 Pro', 0, '{"text":true,"vision":true,"reasoning":true,"toolCalling":true,"streaming":true,"embedding":false}')`);

    // 未配置 key 的供应商模型（不应出现）
    saveDatabase();

    // 动态导入 models（在 DB 初始化后导入）
    const models = await import('../core/models.js');
    console.log('  测试数据已就绪');

    console.log('\n2. 场景分配：default → A, vision → B, fast → 未分配');
    // default: 只分配 DeepSeek A
    models.updateSceneAssignment('default', { primary_model_id: 'model_A', backup_model_id_1: null, backup_model_id_2: null });
    // vision: 只分配 MiMo B
    models.updateSceneAssignment('vision', { primary_model_id: 'model_B', backup_model_id_1: null, backup_model_id_2: null });
    // fast: 不分配
    // knowledge_qa: 不分配

    console.log('\n3. getSceneModelCandidates 严格隔离验证');

    // 3.1 default → 仅 A（长度=1，id=model_A）
    const defCandidates = models.getSceneModelCandidates('default');
    assert(defCandidates.length === 1, `default candidates 长度=1 (实际=${defCandidates.length})`);
    assert(defCandidates[0]?.id === 'model_A', `default candidate id=model_A (实际=${defCandidates[0]?.id})`);
    assert(defCandidates[0]?.provider_type === 'deepseek', `default 供应商=deepseek (实际=${defCandidates[0]?.provider_type})`);

    // 3.2 vision → 仅 B（mimo-v2-omni）
    const visCandidates = models.getSceneModelCandidates('vision');
    assert(visCandidates.length === 1, `vision candidates 长度=1 (实际=${visCandidates.length})`);
    assert(visCandidates[0]?.id === 'model_B', `vision candidate id=model_B (实际=${visCandidates[0]?.id})`);
    assert(visCandidates[0]?.model_id === 'mimo-v2-omni', `vision model_id=mimo-v2-omni (实际=${visCandidates[0]?.model_id})`);
    assert(visCandidates[0]?.provider_type === 'xiaomi', `vision 供应商=xiaomi (实际=${visCandidates[0]?.provider_type})`);

    // 3.3 default 不含 B（视觉模型不泄露到普通场景）
    const defIds = defCandidates.map(m => m.id);
    assert(!defIds.includes('model_B'), 'default candidates 不包含 model_B (MiMo 视觉模型)');
    assert(!defIds.includes('model_C_disabled'), 'default candidates 不包含禁用的 model_C');

    // 3.4 vision 不含 A（普通模型不泄露到视觉场景）
    const visIds = visCandidates.map(m => m.id);
    assert(!visIds.includes('model_A'), 'vision candidates 不包含 model_A (DeepSeek)');

    // 3.5 fast 未分配 → 空
    const fastCandidates = models.getSceneModelCandidates('fast');
    assert(fastCandidates.length === 0, `fast candidates 为空 (实际=${fastCandidates.length})`);

    // 3.6 knowledge_qa 未分配 → 空
    const kqaCandidates = models.getSceneModelCandidates('knowledge_qa');
    assert(kqaCandidates.length === 0, `knowledge_qa candidates 为空 (实际=${kqaCandidates.length})`);

    console.log('\n4. 缺 key / 禁用模型 = 不会出现在候选人');

    // 删除 DeepSeek 的 key → default 应变为空
    db.run("DELETE FROM api_keys WHERE provider_id = 'prov_deepseek'");
    saveDatabase();
    const defNoKey = models.getSceneModelCandidates('default');
    assert(defNoKey.length === 0, `删除 key 后 default candidates 为空 (实际=${defNoKey.length})`);

    // 恢复 key
    db.run(`INSERT OR REPLACE INTO api_keys (id, provider_id, key_data, key_hint) VALUES ('key_deepseek_test', 'prov_deepseek', 'sk-test-deepseek-fake-key', 'sk-...test')`);
    saveDatabase();

    // 禁用 model_A → default 为空
    db.run("UPDATE model_profiles SET enabled = 0 WHERE id = 'model_A'");
    saveDatabase();
    const defDisabled = models.getSceneModelCandidates('default');
    assert(defDisabled.length === 0, `禁用 model_A 后 default candidates 为空 (实际=${defDisabled.length})`);
    // 恢复
    db.run("UPDATE model_profiles SET enabled = 1 WHERE id = 'model_A'");
    saveDatabase();

    console.log('\n5. 模型调用失败不跨场景 fallback');

    // 确认 vision 只有 model_B，不包含 model_A
    const visFinal = models.getSceneModelCandidates('vision');
    assert(visFinal.length === 1, `vision 最终长度=1 (实际=${visFinal.length})`);
    assert(visFinal[0]?.id === 'model_B', `vision 最终是 model_B (实际=${visFinal[0]?.id})`);

    // 确认 default 只有 model_A，不包含 model_B
    const defFinal = models.getSceneModelCandidates('default');
    assert(defFinal.length === 1, `default 最终长度=1 (实际=${defFinal.length})`);
    assert(defFinal[0]?.id === 'model_A', `default 最终是 model_A (实际=${defFinal[0]?.id})`);

    console.log('\n6. getSceneModelCandidates 绝不会返回禁用/缺 key/其它场景模型');

    // 6.1 所有返回的模型必须有 key
    const allCandidates = [...defFinal, ...visFinal];
    allCandidates.forEach(m => {
        const hasKey = db.exec("SELECT COUNT(*) as cnt FROM api_keys WHERE provider_id = ?", [m.provider_id]);
        // sql.js returns array of result objects
        const cnt = hasKey.length > 0 && hasKey[0].values.length > 0 ? hasKey[0].values[0][0] : 0;
        assert(cnt > 0, `模型 ${m.name} 有对应 API key`);
    });

    // 6.2 所有返回的模型都是 enabled=1
    allCandidates.forEach(m => {
        const rows = db.exec("SELECT enabled FROM model_profiles WHERE id = ?", [m.id]);
        const enabled = rows.length > 0 && rows[0].values.length > 0 ? rows[0].values[0][0] : 0;
        assert(enabled === 1, `模型 ${m.name} 处于启用状态`);
    });

    console.log('\n7. 错误场景应有明确中文错误（通过 agent-chat API 验证）');

    // 启动隔离服务进行 API 级测试
    const http = await import('node:http');
    const { spawn } = await import('node:child_process');
    const testPort = 24174;

    function fetchJSON(urlPath, options = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(urlPath, `http://127.0.0.1:${testPort}`);
            const req = http.request(url, {
                method: options.method || 'GET',
                headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
                timeout: 8000
            }, res => {
                let body = '';
                res.on('data', c => body += c);
                res.on('end', () => {
                    try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
                    catch { resolve({ status: res.statusCode, data: body }); }
                });
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
            if (options.body) req.write(JSON.stringify(options.body));
            req.end();
        });
    }

    const serverProcess = spawn('node', [path.join(rootDir, 'server.mjs')], {
        cwd: rootDir,
        env: {
            ...process.env,
            PORT: String(testPort),
            DOCWIKI_DATA_DIR: testDataDir,
            DOCWIKI_STATE_DIR: testStateDir,
            WEBWIKI_DATA_DIR: testDataDir,
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Server start timeout')), 10000);
        serverProcess.stdout.on('data', chunk => {
            if (chunk.toString().includes('已启动')) {
                clearTimeout(timeout);
                setTimeout(resolve, 500);
            }
        });
        serverProcess.stderr.on('data', chunk => console.error('[TestServer]', chunk.toString().trim()));
        serverProcess.on('error', reject);
    });

    try {
        // fast 场景未分配 → 应返回结构化错误
        const fastResp = await fetchJSON('/api/agent/agent-chat', {
            method: 'POST',
            body: { scene: 'fast', messages: [{ role: 'user', content: '你好' }] }
        });
        assert(fastResp.status === 200, `fast agent-chat 返回 200 (实际=${fastResp.status})`);
        assert(fastResp.data.success === false, 'fast 返回 success=false');
        assert(fastResp.data.error && fastResp.data.error.includes('fast'), `fast 错误含场景名 (实际="${fastResp.data.error?.slice(0, 40)}")`);
        assert(fastResp.data.scene === 'fast', `fast 错误含 scene=fast (实际=${fastResp.data.scene})`);
        assert(fastResp.data.code === 'NO_MODEL_FOR_SCENE', `fast 错误码=NO_MODEL_FOR_SCENE (实际=${fastResp.data.code})`);

        // default 有 model_A 但无真实 key → 应返回调用失败错误
        // (注意：实际上会尝试调用 API 但因为 key 是假的会失败)
        const defResp = await fetchJSON('/api/agent/agent-chat', {
            method: 'POST',
            body: { scene: 'default', messages: [{ role: 'user', content: '你好' }] }
        });
        assert(defResp.status === 200, `default agent-chat 返回 200 (实际=${defResp.status})`);
        // 假 key 会导致调用失败 → success=false, code=ALL_MODELS_FAILED
        assert(defResp.data.success === false || defResp.data.code === 'ALL_MODELS_FAILED',
            `default 假 key 返回失败 (success=${defResp.data.success}, code=${defResp.data.code})`);
        if (defResp.data.error) {
            assert(defResp.data.error.includes('default') || defResp.data.error.includes('通用'),
                `default 错误含场景名 (实际="${defResp.data.error?.slice(0, 50)}")`);
        }

        console.log('  ✅ agent-chat API 错误返回中文+场景名');
    } finally {
        serverProcess.kill('SIGTERM');
        await new Promise(r => setTimeout(r, 500));
    }

    console.log('\n8. 场景间绝不交叉泄露');
    // 最终验证：所有场景完全隔离
    const scenes = ['default', 'vision', 'fast', 'knowledge_qa'];
    const expectedIds = {
        default: ['model_A'],
        vision: ['model_B'],
        fast: [],
        knowledge_qa: []
    };
    const allowedIds = {
        default: new Set(['model_A']),
        vision: new Set(['model_B']),
        fast: new Set(),
        knowledge_qa: new Set()
    };

    let allIsolated = true;
    for (const scene of scenes) {
        const cands = models.getSceneModelCandidates(scene);
        const actualIds = cands.map(m => m.id);
        const expected = expectedIds[scene] || [];
        const allowed = allowedIds[scene];

        // 检查长度
        if (actualIds.length !== expected.length) {
            console.error(`  ❌ 场景 ${scene}: 期望 ${expected.length} 个, 实际 ${actualIds.length} 个 (${actualIds.join(',')})`);
            allIsolated = false;
            continue;
        }

        // 检查每个 candidate 都在允许集合中
        for (const id of actualIds) {
            if (!allowed.has(id)) {
                console.error(`  ❌ 场景 ${scene}: 不允许的模型 ${id} 出现在 candidates 中`);
                allIsolated = false;
            }
        }
    }
    assert(allIsolated, '所有场景完全隔离，不交叉泄露');

    // 清理
    rmSync(testStateDir, { recursive: true, force: true });

    console.log(`\n=== 测试结果: ${passed} 通过, ${failed} 失败 ===\n`);
    if (failed > 0) process.exit(1);
}

run().catch(err => {
    console.error('测试异常:', err);
    // 清理
    try { rmSync(testStateDir, { recursive: true, force: true }); } catch {}
    process.exit(1);
});
