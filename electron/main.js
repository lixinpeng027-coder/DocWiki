const { app, BrowserWindow, ipcMain, dialog, Menu, shell, nativeImage } = require('electron');
const { spawn } = require('node:child_process');
const { cpSync, existsSync, mkdirSync, writeFileSync, accessSync, constants } = require('node:fs');
const fs = require('node:fs');  // 用于内联的 update-manager 函数
const http = require('node:http');
const https = require('node:https');
const crypto = require('node:crypto');
const path = require('node:path');
const os = require('node:os');
// ========== 更新管理器（内联自 update-manager.cjs，避免 ASAR 打包遗漏） ==========
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

function request(url, destination, _redirectCount = 0) {
    if (_redirectCount > 10) return Promise.reject(new Error('更新服务器重定向次数过多'));
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https:') ? https : http;
        const req = client.get(url, { headers: { 'User-Agent': 'DocWiki-Updater' } }, response => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                response.resume();
                return resolve(request(new URL(response.headers.location, url).toString(), destination, _redirectCount + 1));
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
            response.on('error', err => { output.destroy(); reject(err); });
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
// ========== 更新管理器结束 ==========

const isDev = process.argv.includes('--dev');
const port = Number(process.env.DOCWIKI_PORT || 4173);
const serviceUrl = `http://127.0.0.1:${port}`;
let serverProcess = null;
let ownsServer = false;
let mainWindow = null;
let isQuitting = false;
let closeHandshakeInProgress = false;

function updateRecoveryMarker() {
    return path.join(app.getPath('userData'), 'update-recovery.json');
}

function probeEndpoint(pathname, timeoutMs = 800) {
    return new Promise(resolve => {
        const request = http.get(`${serviceUrl}${pathname}`, { timeout: timeoutMs }, response => {
            let body = '';
            response.setEncoding('utf8');
            response.on('data', chunk => { body += chunk; });
            response.on('end', () => {
                if (response.statusCode !== 200) return resolve(false);
                if (pathname === '/api/tree') return resolve(true);
                try {
                    const health = JSON.parse(body);
                    resolve(health.status === 'ok' && health.service === 'docwiki');
                } catch { resolve(false); }
            });
        });
        request.on('timeout', () => { request.destroy(); resolve(false); });
        request.on('error', () => resolve(false));
    });
}

async function probeServer(timeoutMs = 800) {
    if (await probeEndpoint('/api/health', timeoutMs)) return true;
    return isDev ? probeEndpoint('/api/tree', timeoutMs) : false;
}

async function waitForServer(timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    let attempts = 0;
    while (Date.now() < deadline) {
        if (await probeServer()) {
            console.log(`[Electron] 本地服务在第 ${attempts + 1} 次探测后成功响应`);
            return;
        }
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    throw new Error(`本地服务未能在 ${Math.ceil(timeoutMs / 1000)} 秒内启动（共探测 ${attempts} 次），请确认端口 4173 未被占用`);
}

/**
 * 准备存储目录。
 * - 开发模式：使用源码目录 data/ 和 .webwiki/
 * - 生产模式：使用安装根目录下的 data/ 和 .docwiki/state/
 *   安装根目录 = path.dirname(app.getPath('exe'))
 *   从打包模板 data/ 初始化（首次启动）
 *   创建/写入失败时给出中文错误并终止启动，绝不静默回退 APPDATA
 */
function prepareStorage() {
    const appPath = app.getAppPath();

    if (isDev) {
        return {
            dataDir: path.join(appPath, 'data'),
            stateDir: path.join(appPath, '.webwiki')
        };
    }

    // 生产模式：安装根目录
    const installRoot = path.dirname(app.getPath('exe'));
    const dataDir = path.join(installRoot, 'data');
    const stateDir = path.join(installRoot, '.docwiki', 'state');
    const dbDir = path.join(installRoot, '.docwiki', 'db');

    // 创建目录并验证写权限
    for (const dir of [installRoot, dataDir, stateDir, dbDir]) {
        try {
            mkdirSync(dir, { recursive: true });
        } catch (err) {
            dialog.showErrorBox(
                '启动失败',
                `无法创建数据目录，请确认安装路径有写入权限。\n\n路径：${dir}\n错误：${err.message}`
            );
            app.quit();
            throw new Error(`目录创建失败: ${dir} — ${err.message}`);
        }
    }

    // 验证写入权限
    try {
        const testFile = path.join(stateDir, '.writetest');
        writeFileSync(testFile, 'ok', 'utf8');
        fs.unlinkSync(testFile);
    } catch (err) {
        dialog.showErrorBox(
            '启动失败',
            `数据目录无写入权限，请以管理员身份运行或将 DocWiki 安装到非系统保护目录。\n\n路径：${stateDir}\n错误：${err.message}`
        );
        app.quit();
        throw new Error(`写入权限验证失败: ${stateDir} — ${err.message}`);
    }

    // 首次启动：从打包模板 data 初始化（不覆盖已有文件）
    const templateData = path.join(appPath.replace('.asar', '.asar.unpacked'), 'data');
    try {
        if (existsSync(templateData) && !existsSync(path.join(dataDir, '任务'))) {
            cpSync(templateData, dataDir, { recursive: true, errorOnExist: false });
            console.log('[Electron] 已从模板初始化数据目录:', dataDir);
        }
    } catch (err) {
        // 模板复制失败不阻止启动，可能已有用户数据
        console.error('[Electron] 模板数据复制失败（可能已有用户数据）:', err.message);
    }

    // electron-builder does not preserve empty directories. Ensure every
    // top-level workspace exists on a clean installation.
    for (const category of ['项目', '文献', '报告', 'SOP', '软件', '写作', '任务']) {
        mkdirSync(path.join(dataDir, category), { recursive: true });
    }

    console.log(`[Electron] 数据目录: ${dataDir}`);
    console.log(`[Electron] 状态目录: ${stateDir}`);
    return { dataDir, stateDir };
}

async function startServer() {
    if (await probeServer()) {
        if (isDev) {
            console.log(`[Electron] 使用已运行的开发服务: ${serviceUrl}`);
            return;
        }
        console.log('[Electron] 检测到已有服务运行，尝试自动关闭...');
        try {
            const { execSync } = require('node:child_process');
            execSync(
                `powershell -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }"`,
                { stdio: 'pipe', timeout: 5000 }
            );
            console.log('[Electron] 已尝试关闭旧进程');
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
            console.error('[Electron] 自动关闭旧进程失败:', err.message);
            throw new Error(`端口 ${port} 已有 DocWiki 服务运行，请先关闭该服务后重试`);
        }
    }

    const appPath = app.getAppPath();
    const storage = prepareStorage();
    const childEnv = {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        PORT: String(port),
        DOCWIKI_DATA_DIR: storage.dataDir,
        DOCWIKI_STATE_DIR: storage.stateDir,
        WEBWIKI_DATA_DIR: storage.dataDir,
        WEBWIKI_STATE_DIR: storage.stateDir
    };
    const serverPath = isDev
        ? path.join(appPath, 'server.mjs')
        : path.join(appPath.replace('.asar', '.asar.unpacked'), 'server.mjs');
    const serverCwd = path.dirname(appPath);
    serverProcess = spawn(process.execPath, [serverPath], {
        cwd: serverCwd,
        env: childEnv,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
    });
    ownsServer = true;
    const startupLog = [];
    serverProcess.stdout.on('data', chunk => {
        const msg = chunk.toString().trimEnd();
        startupLog.push(msg);
        console.log(`[Server] ${msg}`);
    });
    serverProcess.stderr.on('data', chunk => {
        const msg = chunk.toString().trimEnd();
        startupLog.push('[stderr] ' + msg);
        console.error(`[Server] ${msg}`);
    });

    const child = serverProcess;
    let ready = false;
    const earlyFailure = new Promise((_resolve, reject) => {
        child.once('error', reject);
        child.once('exit', (code, signal) => reject(new Error(`本地服务提前退出 (${signal || code})`)));
    });
    try {
        await Promise.race([waitForServer(), earlyFailure]);
        ready = true;
        child.removeAllListeners('error');
        child.removeAllListeners('exit');
        child.on('error', error => console.error('[Electron] 本地服务错误', error));
        child.once('exit', (code, signal) => {
            if (!ready || isQuitting || !ownsServer) return;
            ownsServer = false;
            serverProcess = null;
            console.error(`[Electron] 本地服务意外退出 (${signal || code})`);
            dialog.showErrorBox('本地服务已停止', 'DocWiki 本地服务意外退出，应用将关闭。');
            isQuitting = true;
            app.quit();
        });
    } catch (error) {
        stopServer();
        throw error;
    }
}

function stopServer() {
    if (!serverProcess || !ownsServer) return;
    console.log('[Electron] 正在停止本地服务');
    const child = serverProcess;
    const pid = child.pid;
    child.removeAllListeners();
    serverProcess = null;
    ownsServer = false;

    try {
        if (process.platform === 'win32') {
            const { execSync } = require('node:child_process');
            execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'ignore', timeout: 3000 });
        } else {
            child.kill('SIGTERM');
            setTimeout(() => {
                try { child.kill('SIGKILL'); } catch {}
            }, 2000).unref();
        }
    } catch (err) {
        console.error('[Electron] 终止服务失败:', err.message);
    }
}

function sendToWindow(channel) {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel);
}

function createMenu() {
    // DocWiki 1.2.0: 移除原生菜单栏
    Menu.setApplicationMenu(null);
}

// 设置应用图标
const appIcon = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'icon.ico'));
if (process.platform === 'win32') {
    app.setAppUserModelId('com.docwiki.desktop');
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400, height: 900, minWidth: 1000, minHeight: 700,
        title: 'DocWiki',
        icon: appIcon,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https?:/i.test(url)) shell.openExternal(url);
        return { action: 'deny' };
    });
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (!url.startsWith(serviceUrl)) {
            event.preventDefault();
            if (/^https?:/i.test(url)) shell.openExternal(url);
        }
    });
    mainWindow.once('ready-to-show', () => mainWindow?.show());

    // ========== DocWiki 1.2.0 关闭流程 — 三步确认，绝不丢数据 ==========
    // 1. 用户点 X → 显示 messageBox（保存并退出 / 不保存退出 / 取消）
    // 2. 「保存并退出」→ IPC 通知渲染进程保存 → 等待确认 → 退出
    // 3. 「不保存退出」→ 直接退出（数据由最后 auto-save 保护）
    // 4. 「取消」→ 不做任何操作，窗口保持打开
    // 5. 不设强制超时——保存失败使用户可重试

    mainWindow.on('close', async (event) => {
        // 如果已经在退出流程中，允许通过
        if (isQuitting) return;
        if (closeHandshakeInProgress) return;

        // 总是先阻止默认关闭
        event.preventDefault();

        // 显示 DocWiki 风格确认对话框
        const choice = await dialog.showMessageBox(mainWindow, {
            type: 'question',
            title: 'DocWiki',
            message: '确定要退出 DocWiki 吗？',
            detail: '选择「保存并退出」将确保所有修改被保存。',
            buttons: ['保存并退出', '不保存退出', '取消'],
            defaultId: 0,  // 默认选中「保存并退出」
            cancelId: 2,   // 「取消」按钮 / ESC 键
            noLink: true
        });

        if (choice.response === 2) {
            // 用户点「取消」→ 不做任何事，窗口保持打开
            console.log('[Electron] 用户取消关闭');
            return;
        }

        if (choice.response === 1) {
            // 用户点「不保存退出」→ 直接退出
            console.log('[Electron] 用户选择不保存退出');
            isQuitting = true;
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.destroy();
            }
            stopServer();
            app.quit();
            return;
        }

        // choice.response === 0：「保存并退出」→ IPC 握手
        console.log('[Electron] 用户选择保存并退出，开始握手...');
        closeHandshakeInProgress = true;

        // 创建一次性 Promise 等待渲染进程回复
        const handshakeResult = await new Promise((resolve) => {
            const SAFE_TIMEOUT_MS = 8000; // 8 秒后给出二次确认，而非强制退出

            const timeout = setTimeout(() => {
                // 超时不强制退出！弹出二次确认对话框
                console.log('[Electron] 保存握手等待中...');
                ipcMain.removeListener('confirm-close', onConfirm);
                ipcMain.removeListener('cancel-close', onCancel);
                resolve('timeout-warn');
            }, SAFE_TIMEOUT_MS);

            function onConfirm() {
                clearTimeout(timeout);
                ipcMain.removeListener('confirm-close', onConfirm);
                ipcMain.removeListener('cancel-close', onCancel);
                resolve('confirmed');
            }
            function onCancel(_event, reason) {
                clearTimeout(timeout);
                ipcMain.removeListener('confirm-close', onConfirm);
                ipcMain.removeListener('cancel-close', onCancel);
                console.log('[Electron] 渲染进程取消关闭:', reason);
                resolve('cancelled');
            }
            ipcMain.once('confirm-close', onConfirm);
            ipcMain.once('cancel-close', onCancel);

            // ★ 关键修复：注册监听后立即发送 before-close 通知渲染进程开始保存
            console.log('[Electron] ' + new Date().toISOString() + ' 发送 before-close 到渲染进程');
            sendToWindow('before-close');
            console.log('[Electron] ' + new Date().toISOString() + ' before-close 已发送，等待渲染进程响应');
        });

        closeHandshakeInProgress = false;

        if (handshakeResult === 'confirmed') {
            console.log('[Electron] 保存完成，安全退出');
            isQuitting = true;
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.destroy();
            }
            stopServer();
            app.quit();
        } else if (handshakeResult === 'cancelled') {
            // 保存失败 → 取消关闭，用户可以手动重试保存
            console.log('[Electron] 保存失败，关闭已取消');
        } else {
            // timeout-warn：渲染进程超时未响应，二次确认
            console.log('[Electron] 握手超时，二次确认...');
            const retryChoice = await dialog.showMessageBox(mainWindow, {
                type: 'warning',
                title: 'DocWiki',
                message: '保存操作未在预期时间内完成。',
                detail: '可能由于网络延迟或模型调用未完成。\n\n「等待并重试」将再等待 10 秒。\n「强制退出」将直接退出（最近修改可能丢失）。\n「取消」返回编辑窗口。',
                buttons: ['等待并重试', '强制退出', '取消'],
                defaultId: 0,
                cancelId: 2,
                noLink: true
            });

            if (retryChoice.response === 2) {
                // 取消
                console.log('[Electron] 用户取消强制退出');
                return;
            }

            if (retryChoice.response === 1) {
                // 强制退出
                console.log('[Electron] 用户选择强制退出');
                isQuitting = true;
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.destroy();
                }
                stopServer();
                app.quit();
                return;
            }

            // 「等待并重试」→ 再等 10 秒
            console.log('[Electron] 等待并重试...');
            const retryResult = await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve('timeout-final'), 10000);
                function onConfirm() { clearTimeout(timeout); resolve('confirmed'); }
                function onCancel() { clearTimeout(timeout); resolve('cancelled'); }
                ipcMain.once('confirm-close', onConfirm);
                ipcMain.once('cancel-close', onCancel);
                // ★ 重试时也发送 before-close
                sendToWindow('before-close');
            });

            ipcMain.removeAllListeners('confirm-close');
            ipcMain.removeAllListeners('cancel-close');

            if (retryResult === 'confirmed') {
                console.log('[Electron] 重试保存成功，安全退出');
                isQuitting = true;
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.destroy();
                }
                stopServer();
                app.quit();
            } else {
                // 仍然失败 → 最终二次确认
                console.log('[Electron] 重试失败，最终确认...');
                const finalChoice = await dialog.showMessageBox(mainWindow, {
                    type: 'warning',
                    title: 'DocWiki',
                    message: '仍然无法完成保存。',
                    detail: '「强制退出」将直接退出，未保存的修改将丢失。\n「取消」返回编辑窗口手动保存。',
                    buttons: ['强制退出', '取消'],
                    defaultId: 1,
                    cancelId: 1,
                    noLink: true
                });

                if (finalChoice.response === 0) {
                    isQuitting = true;
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.destroy();
                    }
                    stopServer();
                    app.quit();
                }
            }
        }
    });

    mainWindow.on('closed', () => { mainWindow = null; });
    mainWindow.loadURL(serviceUrl).catch(error => {
        console.error('[Electron] 页面加载失败', error);
        dialog.showErrorBox('启动失败', '本地页面加载失败，请重新启动应用。');
    });
    if (isDev) mainWindow.webContents.once('did-finish-load', () => mainWindow?.webContents.openDevTools({ mode: 'detach' }));
    createMenu();
}

// ========== IPC 处理器 ==========
ipcMain.handle('get-app-path', () => app.getAppPath());
ipcMain.handle('get-data-path', () => prepareStorage().dataDir);
ipcMain.handle('get-desktop-status', async () => ({
    isDesktop: true, serviceUrl, serviceReady: await probeServer(), version: app.getVersion()
}));
ipcMain.handle('show-open-dialog', (_event, options) => dialog.showOpenDialog(mainWindow, options));
ipcMain.handle('show-save-dialog', (_event, options) => dialog.showSaveDialog(mainWindow, options));
ipcMain.handle('show-message-box', (_event, options) => dialog.showMessageBox(mainWindow, options));
ipcMain.handle('open-external', (_event, url) => /^https?:\/\//i.test(url) ? shell.openExternal(url) : false);
ipcMain.handle('check-update', async (_event, manifestUrl) => {
    const manifest = await fetchManifest(manifestUrl);
    return {
        currentVersion: app.getVersion(),
        updateAvailable: compareVersions(manifest.version, app.getVersion()) > 0,
        manifest
    };
});
ipcMain.handle('install-update', async (_event, manifestUrl) => {
    if (isDev) throw new Error('开发模式不执行软件更新');
    const manifest = await fetchManifest(manifestUrl);
    if (compareVersions(manifest.version, app.getVersion()) <= 0) {
        return { installed: false, reason: 'latest' };
    }
    const confirmation = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        title: 'DocWiki 软件更新',
        message: `发现新版本 ${manifest.version}，是否下载并安装？`,
        detail: `${manifest.notes || '本次更新将保留现有知识库和模型配置。'}\n\n当前版本：${app.getVersion()}`,
        buttons: ['下载并安装', '取消'],
        defaultId: 0,
        cancelId: 1,
        noLink: true
    });
    if (confirmation.response !== 0) return { installed: false, reason: 'cancelled' };

    const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'DocWiki-update-'));
    const installerPath = path.join(downloadDir, `DocWiki-Setup-${manifest.version}.exe`);
    await request(manifest.url, installerPath);
    if (manifest.sha256) {
        const actualHash = await sha256File(installerPath);
        if (actualHash.toLowerCase() !== manifest.sha256) {
            fs.rmSync(downloadDir, { recursive: true, force: true });
            throw new Error('安装包 SHA-256 校验失败，更新已取消');
        }
    }

    const installRoot = path.dirname(app.getPath('exe'));
    createUpdateBackup(installRoot, updateRecoveryMarker());
    const child = spawn(installerPath, [], { detached: true, stdio: 'ignore', windowsHide: false });
    child.unref();
    isQuitting = true;
    stopServer();
    setTimeout(() => app.quit(), 300);
    return { installed: true };
});

app.whenReady().then(async () => {
    try {
        if (!isDev) {
            restorePendingBackup(path.dirname(app.getPath('exe')), updateRecoveryMarker());
        }
        await startServer();
        createWindow();
    } catch (error) {
        console.error('[Electron] 启动失败', error);
        dialog.showErrorBox('启动失败', error.message);
        isQuitting = true;
        app.quit();
    }
});
app.on('before-quit', () => { isQuitting = true; stopServer(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
