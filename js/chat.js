// AI 对话功能
// 管理对话侧栏、消息渲染、API 调用

// 全局状态
let currentConversation = null;
let currentMessages = [];
let chatLoading = false;
let currentChatModel = null;

// 处理键盘事件
function handleChatKeydown(event) {
    // Enter 发送，Shift+Enter 换行
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendChatMessage();
    }
}

// 初始化对话功能
async function initChat() {
    await loadConversations();
    await refreshCurrentModel();
}

// 加载对话列表
async function loadConversations() {
    try {
        const response = await fetch('/api/agent/conversations');
        const data = await response.json();
        renderChatList(data.conversations || []);
    } catch (err) {
        console.error('加载对话列表失败:', err);
    }
}

// 渲染对话列表
function renderChatList(conversations) {
    const container = document.getElementById('chatList');
    if (!container) return;

    if (conversations.length === 0) {
        container.innerHTML = '<div class="chat-list-empty">暂无对话记录</div>';
        return;
    }

    container.innerHTML = conversations.map(conv => `
        <div class="chat-item ${currentConversation?.id === conv.id ? 'active' : ''}" 
             onclick="openConversation('${conv.id}')"
             data-id="${conv.id}">
            <div class="chat-item-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
            </div>
            <div class="chat-item-content">
                <div class="chat-item-title">${escapeHtml(conv.title || '新对话')}</div>
                <div class="chat-item-meta">
                    <span class="chat-item-scene">${getSceneLabel(conv.scene)}</span>
                    <span class="chat-item-time">${formatTime(conv.updated_at)}</span>
                </div>
            </div>
            <button class="chat-item-delete" onclick="event.stopPropagation(); deleteConversation('${conv.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `).join('');
}

function resetToNewConversation() {
    currentConversation = null;
    currentMessages = [];
    const title = document.getElementById('chatPanelTitle');
    const scene = document.getElementById('chatPanelScene');
    const panel = document.getElementById('chatPanel');
    if (title) title.textContent = '新对话';
    if (scene) scene.textContent = getSceneLabel('default');
    if (panel) panel.style.display = 'flex';
    renderMessages();
    document.querySelectorAll('.chat-item.active').forEach(item => item.classList.remove('active'));
    window.setTimeout(() => document.getElementById('chatInput')?.focus(), 0);
}

// 加号只创建本地草稿；发送第一条消息时才持久化，避免累积空白会话。
function createNewConversation() {
    resetToNewConversation();
}

async function persistNewConversation() {
    try {
        const response = await fetch('/api/agent/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: '新对话', scene: 'default' })
        });
        const data = await response.json();
        if (data.conversation) {
            currentConversation = data.conversation;
            currentMessages = [];
            document.getElementById('chatPanelTitle').textContent = data.conversation.title || '新对话';
            document.getElementById('chatPanelScene').textContent = getSceneLabel(data.conversation.scene);
            await loadConversations();
            return data.conversation;
        }
    } catch (err) {
        console.error('创建对话失败:', err);
    }
    return null;
}

// 打开对话
async function openConversation(id) {
    try {
        const convResponse = await fetch(`/api/agent/conversations/${id}`);
        const convData = await convResponse.json();
        
        const msgResponse = await fetch(`/api/agent/conversations/${id}/messages`);
        const msgData = await msgResponse.json();
        
        currentConversation = convData;
        currentMessages = msgData.messages || [];
        
        document.getElementById('chatPanelTitle').textContent = convData.title || '新对话';
        document.getElementById('chatPanelScene').textContent = getSceneLabel(convData.scene);
        document.getElementById('chatPanel').style.display = 'flex';
        
        renderMessages();
        
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === id);
        });
        
        document.getElementById('chatInput').focus();
    } catch (err) {
        console.error('打开对话失败:', err);
    }
}

// 渲染消息列表
function renderMessages() {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    if (currentMessages.length === 0) {
        container.innerHTML = `
            <div class="chat-welcome">
                <div class="chat-welcome-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                </div>
                <h3>开始新对话</h3>
                <p>Agent 会自动检索知识库回答问题，直接开始提问即可</p>
            </div>
        `;
        return;
    }

    container.innerHTML = currentMessages.map(msg => {
        // 思考状态
        if (msg.thinking) {
            return `
                <div class="chat-message assistant">
                    <div class="chat-message-avatar"><img src="assets/images/logo.png" alt="AI"></div>
                    <div class="chat-message-content">
                        <div class="chat-message-text thinking-indicator">
                            <span class="dot-typing"></span>
                            正在检索知识库并思考...
                        </div>
                    </div>
                </div>
            `;
        }
        // 导航确认消息
        if (msg._navigationConfirm) {
            const nav = msg._navigationConfirm;
            return `
            <div class="chat-message assistant">
                <div class="chat-message-avatar"><img src="assets/images/logo.png" alt="AI"></div>
                <div class="chat-message-content">
                    <div class="chat-message-text">
                        <div class="nav-confirm-box">
                            <div class="nav-confirm-label">🔗 我将要跳转到 <strong>${escapeHtml(nav.pageLabel)}</strong> 页面，是否跳转？</div>
                            <div class="nav-confirm-buttons">
                                <button class="nav-confirm-yes" data-nav-page="${escapeHtml(nav.page || '')}" data-nav-file="${escapeHtml(nav.file || '')}">是</button>
                                <button class="nav-confirm-no">否</button>
                            </div>
                        </div>
                    </div>
                    <div class="chat-message-meta">
                        <span class="chat-message-time">${formatTime(msg.created_at)}</span>
                    </div>
                </div>
            </div>
            `;
        }
        return `
        <div class="chat-message ${msg.role}">
            <div class="chat-message-avatar">
                ${msg.role === 'user' ? '<span class="avatar-initials">U</span>' : '<img src="assets/images/logo.png" alt="AI">'}
            </div>
            <div class="chat-message-content">
                <div class="chat-message-text">${formatMessageContent(msg.content)}</div>
                <div class="chat-message-meta">
                    ${msg.model_id ? `<span class="chat-message-model">${msg.model_id}</span>` : ''}
                    <span class="chat-message-time">${formatTime(msg.created_at)}</span>
                </div>
            </div>
        </div>
        `;
    }).join('');
    
    container.scrollTop = container.scrollHeight;

    // 为动态渲染的导航确认按钮绑定事件（事件委托）
    attachNavConfirmHandlers(container);
}

// 绑定导航确认按钮事件
function attachNavConfirmHandlers(container) {
    container.querySelectorAll('.nav-confirm-yes').forEach(btn => {
        btn.addEventListener('click', async function () {
            const page = this.dataset.navPage;
            const file = this.dataset.navFile;
            await handleNavConfirmYes(page, file);
        });
    });
    container.querySelectorAll('.nav-confirm-no').forEach(btn => {
        btn.addEventListener('click', function () {
            // 移除所有导航确认消息（用户说否，AI 已经回答了）
            currentMessages = currentMessages.filter(m => !m._navigationConfirm);
            renderMessages();
        });
    });
}

// 处理导航确认 — "是"
async function handleNavConfirmYes(page, file) {
    // 1. 先保存所有未保存的修改
    const saved = await saveAllChanges();
    if (!saved) {
        // 保存失败，询问用户是否继续
        const forceNavigation = confirm('保存未成功的修改，仍然继续跳转吗？');
        if (!forceNavigation) return;
    }

    // 2. 移除确认消息
    currentMessages = currentMessages.filter(m => !m._navigationConfirm);
    renderMessages();

    // 3. 执行跳转
    executeNavigation(page, file);
}

// 保存所有未保存的修改（文档 + 任务）
async function saveAllChanges() {
    try {
        // 保存文档修改
        if (typeof currentDocDirty !== 'undefined' && currentDocDirty) {
            if (typeof window.saveCurrentDocument === 'function') {
                await window.saveCurrentDocument();
            }
        }

        // 保存任务修改 — 总是读取 DOM 表最新数据并保存
        if (typeof window.saveTableData === 'function') {
            window.saveTableData();
        }
        // 额外触发任务修改保存（兼容 saveTaskChanges 接口）
        if (typeof window.saveTaskChanges === 'function') {
            window.saveTaskChanges();
        }

        return true;
    } catch (err) {
        console.error('保存失败:', err);
        return false;
    }
}

// 执行页面跳转
function executeNavigation(page, file) {
    if (file) {
        // 解析文件路径 "项目/新橙皮苷/项目概述.md" → category=project, subfolder="新橙皮苷", fileName="项目概述.md"
        const parts = file.replace(/\\/g, '/').replace(/\.md$/i, '').split('/').filter(Boolean);
        const categoryMap = { '任务': 'task', '项目': 'project', '报告': 'report', 'SOP': 'sop', '软件': 'software', '写作': 'writing', '文献': 'literature' };
        const category = categoryMap[parts[0]] || page || 'project';
        if (parts.length >= 2 && typeof window.docOpenFile === 'function') {
            // ✅ 修复：folderPath 去掉分类目录前缀（parts[0]），因为 docOpenFile 会自动拼接
            const folderPath = parts.slice(1, -1).join('/');
            const fileName = parts[parts.length - 1] + '.md';
            window.switchTab(category);
            window.docOpenFile(category, folderPath, fileName);
        } else {
            window.switchTab(category);
        }
    } else if (page) {
        window.switchTab(page);
    }
}

// 格式化消息内容（支持 Markdown）
function formatMessageContent(content) {
    if (!content) return '';
    if (typeof marked !== 'undefined') {
        return marked.parse(content);
    }
    return escapeHtml(content).replace(/\n/g, '<br>');
}

// 发送消息（Agent 模式：模型自主检索知识库）
async function sendChatMessage() {
    if (chatLoading) return;

    const input = document.getElementById('chatInput');
    const content = input.value.trim();

    if (!content) return;

    if (!currentConversation) {
        await persistNewConversation();
        if (!currentConversation) return;
    }

    chatLoading = true;
    input.disabled = true;
    const sendBtn = document.querySelector('.chat-send-btn');
    if (sendBtn) sendBtn.disabled = true;

    try {
        // 添加用户消息到 UI
        const userMsg = { role: 'user', content, created_at: new Date().toISOString() };
        currentMessages.push(userMsg);
        renderMessages();
        input.value = '';

        // 保存到数据库
        await fetch(`/api/agent/conversations/${currentConversation.id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'user', content })
        });

        // 显示 Agent 思考状态
        const thinkingMsg = { 
            role: 'assistant', 
            content: '', 
            thinking: true,
            created_at: new Date().toISOString() 
        };
        currentMessages.push(thinkingMsg);
        renderMessages();

        // 构建消息列表（只发对话历史）
        const messages = currentMessages
            .filter(m => !m.thinking)
            .map(m => ({ role: m.role, content: m.content }));

        // 调用 Agent 接口（模型自主检索知识库）
        const response = await fetch('/api/agent/agent-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                scene: currentConversation.scene || 'default',
                messages
            })
        });

        const data = await response.json();

        // 移除思考状态消息
        const thinkingIdx = currentMessages.findIndex(m => m.thinking);
        if (thinkingIdx >= 0) currentMessages.splice(thinkingIdx, 1);

        if (data.success && data.content) {
            let aiContent = data.content;

            // 严格使用此次响应实际使用的模型，不回退到上一次/其它模型
            currentChatModel = data.used_model || null;
            updateCurrentModelDisplay();
            const usedModelId = currentChatModel?.model_id || currentChatModel?.id || null;

            const aiMsg = { 
                role: 'assistant', 
                content: aiContent,
                model_id: usedModelId,
                created_at: new Date().toISOString()
            };
            currentMessages.push(aiMsg);
            renderMessages();

            // 保存到数据库
            await fetch(`/api/agent/conversations/${currentConversation.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    role: 'assistant', 
                    content: data.content,
                    model_id: usedModelId
                })
            });

            // 更新对话标题
            if (currentMessages.length === 2) {
                const newTitle = content.slice(0, 30) + (content.length > 30 ? '...' : '');
                await updateConversationTitle(currentConversation.id, newTitle);
            }

            // 处理页面导航指令 — 先询问用户确认
            if (data.navigate) {
                const nav = data.navigate;
                // 解析页面描述
                const pageLabels = { task: '任务', project: '项目', report: '报告', sop: 'SOP', software: '软件', writing: '写作', literature: '文献', doc: '文档页' };
                let pageLabel = pageLabels[nav.page] || nav.page || '目标页面';
                if (nav.file) {
                    const fileName = nav.file.replace(/\.md$/i, '').split('/').pop() || '';
                    if (fileName) pageLabel += ' - ' + fileName;
                }
                // 在对话中追加确认消息
                const confirmMsg = {
                    role: 'assistant',
                    content: '',
                    created_at: new Date().toISOString(),
                    _navigationConfirm: { page: nav.page, file: nav.file, pageLabel }
                };
                currentMessages.push(confirmMsg);
                renderMessages();
            }
        } else if (data.error) {
            currentChatModel = null;
            updateCurrentModelDisplay();
            const suggestion = data.suggestion ? `\n\n💡 建议：${data.suggestion}` : '';
            const errorMsg = {
                role: 'assistant',
                content: `⚠️ ${data.error}${suggestion}`,
                created_at: new Date().toISOString()
            };
            currentMessages.push(errorMsg);
            renderMessages();
        }
    } catch (err) {
        currentChatModel = null;
        updateCurrentModelDisplay();
        // 移除思考状态
        const thinkingIdx = currentMessages.findIndex(m => m.thinking);
        if (thinkingIdx >= 0) currentMessages.splice(thinkingIdx, 1);

        console.error('发送消息失败:', err);
        const errorMsg = { 
            role: 'assistant', 
            content: `⚠️ 请求失败，请检查网络连接或稍后重试。`,
            created_at: new Date().toISOString()
        };
        currentMessages.push(errorMsg);
        renderMessages();
    } finally {
        chatLoading = false;
        input.disabled = false;
        const sendBtn = document.querySelector('.chat-send-btn');
        if (sendBtn) sendBtn.disabled = false;
        input.focus();
    }
}

// 更新对话标题
async function updateConversationTitle(id, title) {
    try {
        await fetch(`/api/agent/conversations/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        document.getElementById('chatPanelTitle').textContent = title;
        await loadConversations();
    } catch (err) {
        console.error('更新标题失败:', err);
    }
}

// 删除对话
async function deleteConversation(id) {
    if (!confirm('确定要删除这个对话吗？')) return;

    try {
        await fetch(`/api/agent/conversations/${id}`, { method: 'DELETE' });

        if (currentConversation?.id === id) {
            currentConversation = null;
            currentMessages = [];
        }

        await loadConversations();
        return true;
    } catch (err) {
        console.error('删除对话失败:', err);
    }
    return false;
}

// 删除当前对话
async function deleteCurrentConversation() {
    if (!currentConversation) {
        alert('空白对话无需删除，直接开始提问即可。');
        return;
    }
    if (currentMessages.length === 0) {
        alert('空白对话无需删除，直接开始提问即可。');
        return;
    }

    const deleted = await deleteConversation(currentConversation.id);
    if (!deleted) return;
    // 删除后：如果有其他对话，打开第一个；否则打开新对话面板
    if (!currentConversation) {
        try {
            const response = await fetch('/api/agent/conversations');
            const data = await response.json();
            const remaining = data.conversations || [];
            if (remaining.length > 0) {
                await openConversation(remaining[0].id);
            } else {
                resetToNewConversation();
            }
        } catch {
            resetToNewConversation();
        }
    }
}

// 搜索对话
async function searchConversations(keyword) {
    if (!keyword.trim()) {
        await loadConversations();
        return;
    }

    try {
        const response = await fetch(`/api/agent/conversations?keyword=${encodeURIComponent(keyword)}`);
        const data = await response.json();
        renderChatList(data.conversations || []);
    } catch (err) {
        console.error('搜索失败:', err);
    }
}

// 获取场景当前优先模型
async function refreshCurrentModel(scene = 'default') {
    try {
        const response = await fetch(`/api/agent/routing/${encodeURIComponent(scene)}`);
        const data = await response.json();
        currentChatModel = data.model || null;
    } catch (err) {
        currentChatModel = null;
        console.error('读取模型路由失败:', err);
    }
    updateCurrentModelDisplay();
}

function updateCurrentModelDisplay() {
    const element = document.getElementById('chatCurrentModel');
    if (!element) return;
    element.textContent = currentChatModel
        ? `${currentChatModel.provider_name} / ${currentChatModel.name}`
        : '未配置可用模型';
    element.classList.toggle('unavailable', !currentChatModel);
}

// UI 控制函数
function openChatWindow() {
    const panel = document.getElementById('chatPanel');
    panel.style.display = 'flex';
    // 通知 avatar 更新状态
    document.getElementById('aiAssistant')?.classList.add('chat-open');
    renderMessages();
    refreshCurrentModel(currentConversation?.scene || 'default');
    window.setTimeout(() => document.getElementById('chatInput')?.focus(), 0);
}

function openChatSidebar() {
    openChatWindow();
}

function closeChatSidebar() {
    closeChatPanel();
}

function closeChatPanel() {
    document.getElementById('chatPanel').style.display = 'none';
    document.getElementById('aiAssistant')?.classList.remove('chat-open');
}

// 切换对话面板显示/隐藏（保持对话状态）
function toggleChatPanel() {
    const panel = document.getElementById('chatPanel');
    if (panel.style.display === 'none' || panel.style.display === '') {
        openChatWindow();
    } else {
        panel.style.display = 'none';  // 只隐藏，不销毁
    }
}

function toggleChatSize() {
    const panel = document.getElementById('chatPanel');
    const expanded = panel.classList.toggle('maximized');
    const button = document.getElementById('chatSizeToggle');
    button.title = expanded ? '还原' : '放大';
    button.setAttribute('aria-label', expanded ? '还原对话框' : '放大对话框');
}

function toggleChatSettings() {
    console.log('切换对话设置');
}

// 工具函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getSceneLabel(scene) {
    const labels = {
        'default': '通用',
        'knowledge_qa': '知识问答',
        'fast': '快速响应',
        'vision': '视觉理解'
    };
    return labels[scene] || scene;
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';

    return date.toLocaleDateString('zh-CN');
}

// 初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChat);
} else {
    initChat();
}

Object.assign(window, {
    openChatWindow,
    openChatSidebar,
    closeChatSidebar,
    closeChatPanel,
    toggleChatPanel,
    toggleChatSize,
    toggleChatSettings,
    createNewConversation,
    openConversation,
    sendChatMessage,
    deleteConversation,
    deleteCurrentConversation,
    searchConversations,
    handleChatKeydown,
    handleNavConfirmYes,
    executeNavigation,
    saveAllChanges
});

export {
    initChat,
    loadConversations,
    createNewConversation,
    openConversation,
    sendChatMessage,
    deleteConversation,
    toggleChatPanel
};
