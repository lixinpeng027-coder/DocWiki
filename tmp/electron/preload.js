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
    
    // 对话框
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showMessage: (options) => ipcRenderer.invoke('show-message-box', options),
    
    // 菜单事件
    onMenuNew: (callback) => ipcRenderer.on('menu-new', callback),
    onMenuSave: (callback) => ipcRenderer.on('menu-save', callback),
    
    // 清理监听器
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// 检测是否在 Electron 环境
contextBridge.exposeInMainWorld('isElectron', true);
