import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const [installerArg, publicUrl, notes = 'DocWiki 软件更新'] = process.argv.slice(2);
if (!installerArg || !publicUrl) {
    console.error('用法: node scripts/create-update-manifest.mjs <安装包路径> <公网下载地址> [更新说明]');
    process.exit(1);
}
const installerPath = path.resolve(installerArg);
if (!existsSync(installerPath)) throw new Error(`安装包不存在: ${installerPath}`);
if (!/^https?:\/\//i.test(publicUrl)) throw new Error('公网下载地址必须使用 HTTP 或 HTTPS');
const versionMatch = path.basename(installerPath).match(/(\d+\.\d+\.\d+)/);
if (!versionMatch) throw new Error('无法从安装包文件名识别 x.y.z 版本号');

const hash = createHash('sha256');
await new Promise((resolve, reject) => {
    const input = createReadStream(installerPath);
    input.on('data', chunk => hash.update(chunk));
    input.on('end', resolve);
    input.on('error', reject);
});
const manifest = {
    version: versionMatch[1],
    url: publicUrl,
    sha256: hash.digest('hex'),
    notes,
    publishedAt: new Date().toISOString()
};
const output = path.join(path.dirname(installerPath), 'latest.json');
await writeFile(output, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(output);
