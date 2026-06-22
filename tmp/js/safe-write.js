// 安全写入机制
// 处理文件锁、冲突检测、自动保存等功能

// 文件锁状态
const fileLocks = new Map();

// 文件版本跟踪
const fileVersions = new Map();

// 写入队列
const writeQueue = [];

// 正在写入的文件
let writingFile = null;

// 文件锁状态枚举
export const LockStatus = {
    UNLOCKED: 'unlocked',
    LOCKED: 'locked',
    PENDING: 'pending'
};

// 获取文件锁
export function acquireFileLock(filePath) {
    return new Promise((resolve, reject) => {
        const currentLock = fileLocks.get(filePath);
        
        if (!currentLock || currentLock.status === LockStatus.UNLOCKED) {
            // 文件未锁定，可以立即获取锁
            fileLocks.set(filePath, {
                status: LockStatus.LOCKED,
                acquiredAt: Date.now(),
                holder: 'local'
            });
            resolve(true);
        } else if (currentLock.status === LockStatus.LOCKED) {
            // 文件已被锁定，检查是否超时（超过30秒视为超时）
            if (Date.now() - currentLock.acquiredAt > 30000) {
                // 超时，强制获取锁
                console.warn(`文件锁超时，强制获取: ${filePath}`);
                fileLocks.set(filePath, {
                    status: LockStatus.LOCKED,
                    acquiredAt: Date.now(),
                    holder: 'local'
                });
                resolve(true);
            } else {
                // 等待锁释放
                fileLocks.set(filePath, {
                    ...currentLock,
                    status: LockStatus.PENDING
                });
                resolve(false);
            }
        } else {
            // 已有等待者，加入等待队列
            resolve(false);
        }
    });
}

// 释放文件锁
export function releaseFileLock(filePath) {
    const lock = fileLocks.get(filePath);
    if (lock) {
        fileLocks.set(filePath, {
            status: LockStatus.UNLOCKED,
            acquiredAt: null,
            holder: null
        });
        // 触发下一个写入任务
        processWriteQueue();
    }
}

// 添加到写入队列
export function queueWrite(filePath, content, options = {}) {
    return new Promise((resolve, reject) => {
        const task = {
            filePath,
            content,
            options: {
                autoRetry: options.autoRetry !== false,
                maxRetries: options.maxRetries || 3,
                retryDelay: options.retryDelay || 1000,
                onProgress: options.onProgress
            },
            resolve,
            reject,
            createdAt: Date.now(),
            attempts: 0
        };
        
        writeQueue.push(task);
        processWriteQueue();
    });
}

// 处理写入队列
async function processWriteQueue() {
    if (writingFile || writeQueue.length === 0) return;
    
    const task = writeQueue.shift();
    if (!task) return;
    
    writingFile = task.filePath;
    
    try {
        const locked = await acquireFileLock(task.filePath);
        
        if (!locked) {
            // 无法获取锁，重新加入队列
            task.attempts++;
            if (task.options.autoRetry && task.attempts < task.options.maxRetries) {
                setTimeout(() => {
                    writeQueue.unshift(task);
                    processWriteQueue();
                }, task.options.retryDelay);
            } else {
                task.reject(new Error('无法获取文件锁'));
            }
            writingFile = null;
            return;
        }
        
        // 执行写入
        const result = await safeWriteFile(task.filePath, task.content, task.options);
        task.resolve(result);
        
        // 释放锁
        releaseFileLock(task.filePath);
    } catch (error) {
        task.attempts++;
        if (task.options.autoRetry && task.attempts < task.options.maxRetries) {
            setTimeout(() => {
                writeQueue.unshift(task);
                processWriteQueue();
            }, task.options.retryDelay);
        } else {
            task.reject(error);
            releaseFileLock(task.filePath);
        }
    } finally {
        writingFile = null;
    }
}

// 安全写入文件
async function safeWriteFile(filePath, content, options) {
    try {
        // 使用已有的 /api/file PUT 路由
        const result = await fetch('/api/file', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: filePath, content })
        });
        
        if (!result.ok) {
            throw new Error(`写入失败: ${result.status}`);
        }
        
        const data = await result.json();
        
        // 更新版本
        const newVersion = generateVersion();
        fileVersions.set(filePath, {
            version: newVersion,
            lastModified: Date.now(),
            size: content.length
        });
        
        return {
            success: true,
            version: newVersion,
            filePath,
            size: content.length,
            savedAt: new Date().toISOString(),
            serverResponse: data
        };
    } catch (err) {
        console.error('安全写入失败:', err);
        throw err;
    }
}

// 生成版本号
function generateVersion() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// 检查文件是否有未保存的更改
export function hasPendingChanges(filePath) {
    const lock = fileLocks.get(filePath);
    return lock && lock.status !== LockStatus.UNLOCKED;
}

// 获取文件状态
export function getFileStatus(filePath) {
    const lock = fileLocks.get(filePath);
    const version = fileVersions.get(filePath);
    
    return {
        locked: lock ? lock.status !== LockStatus.UNLOCKED : false,
        lockStatus: lock?.status || LockStatus.UNLOCKED,
        version: version?.version || null,
        lastModified: version?.lastModified || null,
        size: version?.size || null,
        hasPendingChanges: hasPendingChanges(filePath)
    };
}

// 取消待处理的写入任务
export function cancelPendingWrites(filePath) {
    const filtered = writeQueue.filter(task => task.filePath !== filePath);
    const cancelled = writeQueue.length - filtered.length;
    writeQueue.length = 0;
    writeQueue.push(...filtered);
    return cancelled;
}

// 冲突检测
export function detectConflict(filePath, serverVersion) {
    const localVersion = fileVersions.get(filePath);
    if (!localVersion) return null;
    
    if (serverVersion && localVersion.version !== serverVersion) {
        return {
            type: 'version_conflict',
            localVersion: localVersion.version,
            serverVersion: serverVersion,
            localLastModified: localVersion.lastModified,
            message: '文件已被其他客户端修改'
        };
    }
    
    return null;
}

// 合并冲突内容
export function mergeConflicts(localContent, serverContent) {
    return {
        merged: `<<<<<<< 本地版本\n${localContent}\n=======\n${serverContent}\n>>>>>>> 服务器版本`,
        hasConflicts: true,
        localLength: localContent.length,
        serverLength: serverContent.length
    };
}

// 初始化监控
export function initFileMonitor() {
    // 定期清理过期的锁（每30秒检查一次）
    setInterval(() => {
        const now = Date.now();
        fileLocks.forEach((lock, filePath) => {
            if (lock.status === LockStatus.LOCKED && 
                lock.acquiredAt && 
                now - lock.acquiredAt > 60000) {
                console.warn(`清理过期文件锁: ${filePath}`);
                fileLocks.set(filePath, {
                    status: LockStatus.UNLOCKED,
                    acquiredAt: null,
                    holder: null
                });
            }
        });
    }, 30000);
}

// 暴露到全局作用域
if (typeof window !== 'undefined') {
    window.safeWrite = {
        acquireFileLock,
        releaseFileLock,
        queueWrite,
        hasPendingChanges,
        getFileStatus,
        cancelPendingWrites,
        detectConflict,
        mergeConflicts,
        initFileMonitor,
        LockStatus
    };
}

export default {
    acquireFileLock,
    releaseFileLock,
    queueWrite,
    hasPendingChanges,
    getFileStatus,
    cancelPendingWrites,
    detectConflict,
    mergeConflicts,
    initFileMonitor,
    LockStatus
};