const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const http = require('node:http');
const https = require('node:https');

function parseVersion(value) {
    const match = String(value || '').trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
    return match ? match.slice(1).map(Number) : null;
}

function compareVersions(left, right) {
    const a = parseVersion(left);
    const b = parseVersion(right);
    if (!a || !b) throw new Error('版本号必须使用 x.y.z 格式');
    for (let i = 0; i < 3; i += 1) {
        if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
    }
    return 0;
}

function validateManifest(manifest, manifestUrl) {
    if (!manifest || typeof manifest !== 'object') throw new Error('更新清单格式无效');
    if (!parseVersion(manifest.version)) throw new Error('更新清单缺少有效版本号');
    if (!manifest.url) throw new Error('更新清单缺少安装包地址');
    const resolvedUrl = new URL(manifest.url, manifestUrl).toString();
    if (!/^https?:\/\//i.test(resolvedUrl)) throw new Error('安装包地址必须使用 HTTP 或 HTTPS');
    const sha256 = String(manifest.sha256 || '').trim().toLowerCase();
    if (sha256 && !/^[a-f0-9]{64}$/.test(sha256)) throw new Error('SHA-256 校验值格式无效');
    return { version: String(manifest.version).replace(/^v/i, ''), url: resolvedUrl, sha256, notes: String(manifest.notes || '') };
}

function request(url, destination) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https:') ? https : http;
        const req = client.get(url, { headers: { 'User-Agent': 'DocWiki-Updater' } }, response => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                response.resume();
                return resolve(request(new URL(response.headers.location, url).toString(), destination));
            }
            if (response.statusCode !== 200) {
                response.resume();
                return reject(new Error(`更新服务器返回 ${response.statusCode}`));
            }
            if (!destination) {
                let body = '';
                response.setEncoding('utf8');
                response.on('data', chunk => { body += chunk; });
                response.on('end', () => resolve(body));
                response.on('error', reject);
                return;
            }
            const output = fs.createWriteStream(destination);
            response.pipe(output);
            output.on('finish', () => output.close(() => resolve(destination)));
            output.on('error', reject);
        });
        req.setTimeout(30000, () => req.destroy(new Error('更新服务器连接超时')));
        req.on('error', reject);
    });
}

async function fetchManifest(manifestUrl) {
    if (!/^https?:\/\//i.test(String(manifestUrl || ''))) throw new Error('更新源必须使用 HTTP 或 HTTPS');
    return validateManifest(JSON.parse(await request(manifestUrl)), manifestUrl);
}

function sha256File(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const input = fs.createReadStream(filePath);
        input.on('data', chunk => hash.update(chunk));
        input.on('end', () => resolve(hash.digest('hex')));
        input.on('error', reject);
    });
}

function copyIfExists(source, destination) {
    if (fs.existsSync(source)) fs.cpSync(source, destination, { recursive: true, force: true });
}

function createUpdateBackup(installRoot, recoveryMarker) {
    const backupRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'DocWiki-update-backup-'));
    copyIfExists(path.join(installRoot, 'data'), path.join(backupRoot, 'data'));
    copyIfExists(path.join(installRoot, '.docwiki', 'state'), path.join(backupRoot, 'state'));
    fs.mkdirSync(path.dirname(recoveryMarker), { recursive: true });
    fs.writeFileSync(recoveryMarker, JSON.stringify({ backupRoot, createdAt: new Date().toISOString() }), 'utf8');
    return backupRoot;
}

function restorePendingBackup(installRoot, recoveryMarker) {
    if (!fs.existsSync(recoveryMarker)) return false;
    const marker = JSON.parse(fs.readFileSync(recoveryMarker, 'utf8'));
    if (!marker.backupRoot || !fs.existsSync(marker.backupRoot)) throw new Error('更新备份不存在，无法自动恢复');
    copyIfExists(path.join(marker.backupRoot, 'data'), path.join(installRoot, 'data'));
    copyIfExists(path.join(marker.backupRoot, 'state'), path.join(installRoot, '.docwiki', 'state'));
    fs.rmSync(marker.backupRoot, { recursive: true, force: true });
    fs.rmSync(recoveryMarker, { force: true });
    return true;
}

module.exports = {
    compareVersions,
    validateManifest,
    fetchManifest,
    request,
    sha256File,
    createUpdateBackup,
    restorePendingBackup
};
