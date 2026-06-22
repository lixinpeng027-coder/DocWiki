const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const {
    compareVersions,
    validateManifest,
    fetchManifest,
    createUpdateBackup,
    restorePendingBackup
} = require('../electron/update-manager.cjs');

let passed = 0;
function check(condition, message) {
    assert.ok(condition, message);
    passed += 1;
    console.log('  ✅ ' + message);
}

console.log('\n=== DocWiki 远程更新与数据恢复测试 ===\n');
check(compareVersions('1.3.0', '1.2.9') > 0, '识别远程新版本');
check(compareVersions('v1.2.0', '1.2.0') === 0, '兼容 v 前缀');
check(compareVersions('1.1.9', '1.2.0') < 0, '不会把旧版本识别为更新');

const manifest = validateManifest({ version: '1.3.0', url: './DocWiki-Setup-1.3.0.exe', sha256: 'a'.repeat(64), notes: 'test' }, 'https://updates.example.com/latest.json');
check(manifest.url === 'https://updates.example.com/DocWiki-Setup-1.3.0.exe', '支持相对安装包地址');
check(manifest.sha256.length === 64, '校验 SHA-256 格式');
assert.throws(() => validateManifest({ version: 'bad', url: 'https://example.com/a.exe' }, 'https://example.com/latest.json'));
passed += 1;
console.log('  ✅ 拒绝无效版本清单');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'docwiki-update-test-'));
const installRoot = path.join(root, 'DocWiki');
const marker = path.join(root, 'state', 'recovery.json');
fs.mkdirSync(path.join(installRoot, 'data', '项目'), { recursive: true });
fs.mkdirSync(path.join(installRoot, '.docwiki', 'state'), { recursive: true });
fs.writeFileSync(path.join(installRoot, 'data', '项目', '用户数据.md'), '不可丢失', 'utf8');
fs.writeFileSync(path.join(installRoot, '.docwiki', 'state', 'agent.db'), 'secret-state', 'utf8');
createUpdateBackup(installRoot, marker);
fs.rmSync(path.join(installRoot, 'data'), { recursive: true, force: true });
fs.rmSync(path.join(installRoot, '.docwiki'), { recursive: true, force: true });
check(restorePendingBackup(installRoot, marker), '检测并恢复更新备份');
check(fs.readFileSync(path.join(installRoot, 'data', '项目', '用户数据.md'), 'utf8') === '不可丢失', '恢复原始知识库数据');
check(fs.readFileSync(path.join(installRoot, '.docwiki', 'state', 'agent.db'), 'utf8') === 'secret-state', '恢复模型配置数据库');
check(!fs.existsSync(marker), '恢复成功后清理恢复标记');
fs.rmSync(root, { recursive: true, force: true });

const server = http.createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ version: '1.3.0', url: '/DocWiki-Setup-1.3.0.exe', sha256: 'b'.repeat(64) }));
});
server.listen(0, '127.0.0.1', async () => {
    try {
        const address = server.address();
        const remote = await fetchManifest(`http://127.0.0.1:${address.port}/latest.json`);
        check(remote.version === '1.3.0' && remote.url.endsWith('/DocWiki-Setup-1.3.0.exe'), '通过远程 HTTP 更新源读取新版本');
        console.log(`\n=== 测试结果: ${passed} 通过, 0 失败 ===\n`);
    } finally {
        server.close();
    }
});
