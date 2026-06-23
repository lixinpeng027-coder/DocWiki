// Electron 预加载脚本
// 在隔离的上下文中运行，提供安全的 API 暴露给渲染进程

const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 应用路径
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
    getDataPath: () => ipcRenderer.invoke('get-data-path'),
    getDesktopStatus: () => ipcRenderer.invoke('get-desktop-status'),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    checkUpdate: (manifestUrl) => ipcRenderer.invoke('check-update', manifestUrl),
    installUpdate: (manifestUrl) => ipcRenderer.invoke('install-update', manifestUrl),

    // 对话框
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showMessage: (options) => ipcRenderer.invoke('show-message-box', options),

    // 菜单事件
    onMenuNew: (callback) => ipcRenderer.on('menu-new', callback),
    onMenuSave: (callback) => ipcRenderer.on('menu-save', callback),

    // ========== 关闭握手 ==========
    // 主进程发送 before-close 时，渲染进程尝试保存并回复 can-close 或 cancel-close
    onBeforeClose: (callback) => {
        const handler = () => {
            try { callback(); } catch (e) { console.error('[Preload] before-close 回调异常:', e); }
        };
        ipcRenderer.on('before-close', handler);
        // 返回取消注册函数（只移除自己的 handler）
        return () => ipcRenderer.removeListener('before-close', handler);
    },
    confirmClose: () => ipcRenderer.send('confirm-close'),
    cancelClose: (reason) => ipcRenderer.send('cancel-close', reason || '用户取消了关闭'),

    // ⚠️ 已弃用：此方法会移除该 channel 的全部监听器。
    // 请优先使用 onBeforeClose 返回的清理函数来移除特定监听器。
    removeAllListeners: (channel) => {
        console.warn('[Preload] removeAllListeners 已弃用，请使用 onBeforeClose 返回的清理函数');
        ipcRenderer.removeAllListeners(channel);
    }
});

// 检测是否在 Electron 环境
contextBridge.exposeInMainWorld('isElectron', true);
