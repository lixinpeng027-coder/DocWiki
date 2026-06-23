// 设置页面模块
// 管理模型配置、供应商管理、场景分配等

// ========== 全局状态 ==========
let settingsProviders = [];
let settingsModels = [];
let settingsAssignments = [];
const UPDATE_MANIFEST_STORAGE_KEY = 'wiki_update_manifest_url';
const DEFAULT_UPDATE_MANIFEST_URL = 'https://raw.githubusercontent.com/lixinpeng027-coder/DocWiki/main/latest.json';

function loadUpdateManifestUrl() {
    const input = document.getElementById('updateManifestUrl');
    const value = localStorage.getItem(UPDATE_MANIFEST_STORAGE_KEY) || DEFAULT_UPDATE_MANIFEST_URL;
    if (input) input.value = value;
    return value;
}

function saveUpdateManifestUrl() {
    const input = document.getElementById('updateManifestUrl');
    const value = (input?.value || '').trim();
    if (value && !/^https?:\/\//i.test(value)) {
        showError('更新源必须是 HTTP 或 HTTPS 地址');
        return false;
    }
    if (value) localStorage.setItem(UPDATE_MANIFEST_STORAGE_KEY, value);
    else localStorage.removeItem(UPDATE_MANIFEST_STORAGE_KEY);
    showToast(value ? '远程更新源已保存' : '已关闭自动更新检查', 'info');
    return true;
}

async function checkForDocWikiUpdate(interactive = false) {
    const status = document.getElementById('updateCheckStatus');
    const button = document.getElementById('checkUpdateButton');
    const manifestUrl = loadUpdateManifestUrl();
    if (!manifestUrl) {
        if (interactive) showError('请先填写并保存远程更新源');
        return;
    }
    if (!window.electronAPI?.checkUpdate) {
        if (interactive) showError('软件更新仅在桌面版中可用');
        return;
    }
    if (button) button.disabled = true;
    if (status) status.textContent = '正在检查...';
    try {
        const result = await window.electronAPI.checkUpdate(manifestUrl);
        if (!result.updateAvailable) {
            if (status) status.textContent = `已是最新版本 ${result.currentVersion}`;
            if (interactive) showToast('当前已是最新版本', 'info');
            return;
        }
        if (status) status.textContent = `发现 ${result.manifest.version}`;
        await window.electronAPI.installUpdate(manifestUrl);
    } catch (error) {
        if (status) status.textContent = '检查失败';
        if (interactive) showError('检查更新失败: ' + error.message);
        else console.warn('自动检查更新失败:', error.message);
    } finally {
        if (button) button.disabled = false;
    }
}

// ========== 页面切换 ==========

// 切换设置页面的子区域
function switchSettingsSection(section) {
    // 更新导航状态
    document.querySelectorAll('.settings-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });
    
    // 更新内容区域
    document.querySelectorAll('.settings-section').forEach(el => {
        el.style.display = el.id === `settings${capitalize(section)}` ? 'block' : 'none';
    });
    
    // 加载对应数据
    switch (section) {
        case 'models':
            loadModelsList();
            break;
        case 'providers':
            loadProvidersList();
            break;
        case 'assignments':
            loadAssignmentsList();
            break;
        case 'general':
            initGeneralSettings();
            break;
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ========== 通用设置初始化 ==========
async function initGeneralSettings() {
    // 恢复更新源 URL
    const savedManifestUrl = localStorage.getItem('wiki_update_manifest_url');
    const manifestInput = document.getElementById('updateManifestUrl');
    if (savedManifestUrl && manifestInput) {
        manifestInput.value = savedManifestUrl;
    }

    // 恢复自动检查更新开关
    const autoCheck = localStorage.getItem('wiki_auto_update_check');
    const autoCheckCheckbox = document.getElementById('autoUpdateCheck');
    if (autoCheckCheckbox) {
        autoCheckCheckbox.checked = autoCheck === '1';
    }

    // 动态获取版本号
    const helpVersion = document.getElementById('helpVersion');
    if (helpVersion) {
        try {
            const resp = await fetch('/api/health');
            const data = await resp.json();
            helpVersion.textContent = 'DocWiki ' + (data.version || '1.2.2');
        } catch (e) {
            helpVersion.textContent = 'DocWiki 1.2.2';
        }
    }

    // 如果在 Electron 环境且启用了自动检查，静默检查更新
    if (window.isElectron && autoCheck === '1') {
        // 延迟 2 秒，让 UI 先渲染
        setTimeout(() => {
            if (typeof checkForDocWikiUpdate === 'function') {
                checkForDocWikiUpdate(false);
            }
        }, 2000);
    }
}

// ========== 数据加载 ==========

// 加载供应商列表
async function loadProvidersList() {
    try {
        const response = await fetch('/api/agent/providers');
        const data = await response.json();
        settingsProviders = data.providers || [];
        
        renderProvidersList();
        updateProviderFilter();
    } catch (err) {
        console.error('加载供应商失败:', err);
        const providersList = document.getElementById('providersList');
        if (providersList) {
            providersList.innerHTML = '<p class="error">加载失败，请刷新重试</p>';
        }
    }
}

// 加载模型列表
async function loadModelsList() {
    try {
        const modelProviderFilter = document.getElementById('modelProviderFilter');
        const providerId = modelProviderFilter ? modelProviderFilter.value : '';
        const url = providerId ? `/api/agent/models?provider_id=${providerId}` : '/api/agent/models';
        const response = await fetch(url);
        const data = await response.json();
        settingsModels = data.models || [];
        
        renderModelsList();
    } catch (err) {
        console.error('加载模型失败:', err);
        const modelsList = document.getElementById('modelsList');
        if (modelsList) {
            modelsList.innerHTML = '<p class="error">加载失败，请刷新重试</p>';
        }
    }
}

// 加载场景分配列表
async function loadAssignmentsList() {
    try {
        const [assignmentsRes, modelsRes, providersRes] = await Promise.all([
            fetch('/api/agent/assignments'),
            fetch('/api/agent/models'),
            fetch('/api/agent/providers')
        ]);
        
        const assignmentsData = await assignmentsRes.json();
        const modelsData = await modelsRes.json();
        const providersData = await providersRes.json();
        
        settingsAssignments = assignmentsData.assignments || [];
        settingsModels = modelsData.models || [];
        settingsProviders = providersData.providers || [];
        
        renderAssignmentsList();
    } catch (err) {
        console.error('加载场景分配失败:', err);
        const container = document.getElementById('assignmentsList');
        if (container) container.innerHTML = '<p class="error">加载失败，请刷新重试</p>';
    }
}

// ========== 渲染函数 ==========

// 渲染供应商列表
function renderProvidersList() {
    const container = document.getElementById('providersList');
    if (!container) return;
    
    // 只显示已配置密钥的供应商
    const configuredProviders = settingsProviders.filter(p => p.hasKey);
    
    if (configuredProviders.length === 0) {
        container.innerHTML = '<p class="empty">暂无已配置密钥的供应商，请在模型配置页面添加</p>';
        return;
    }
    
    container.innerHTML = configuredProviders.map(provider => `
        <div class="provider-card" data-id="${provider.id}">
            <div class="provider-card-header">
                <div class="provider-card-name">${provider.name}</div>
                <span class="provider-type-badge">${provider.provider_type}</span>
            </div>
            <div class="provider-card-body">
                <div class="provider-key-status has-key">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span>密钥已配置 (${provider.keyHint || '****'})</span>
                </div>
                <div class="provider-key-actions">
                    <button class="btn btn-sm btn-secondary" onclick="showApiKeyModal('${provider.id}', '${provider.name}')">
                        更新密钥
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="testProviderKey('${provider.id}')">
                        测试连接
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// 渲染模型列表
function renderModelsList() {
    const container = document.getElementById('modelsList');
    if (!container) return;
    
    if (settingsModels.length === 0) {
        container.innerHTML = '<p class="empty">暂无模型配置，请先配置供应商密钥后添加模型</p>';
        return;
    }
    
    container.innerHTML = settingsModels.map(model => `
        <div class="model-card" data-id="${model.id}">
            <div class="model-card-info">
                <div class="model-card-name">${model.name}</div>
                <div class="model-card-meta">
                    <span>${model.provider_name}</span> · 
                    <span>${model.model_id}</span>
                </div>
            </div>
            <div class="model-card-actions">
                <button class="btn btn-sm btn-secondary" onclick="testModel('${model.id}')">测试</button>
                <button class="btn btn-sm btn-danger" onclick="deleteModel('${model.id}')">删除</button>
            </div>
        </div>
    `).join('');
}

// 渲染场景分配列表
function renderAssignmentsList() {
    const container = document.getElementById('assignmentsList');
    if (!container) return;
    
    const sceneNames = {
        'default': '默认场景',
        'knowledge_qa': '知识库问答',
        'fast': '快速响应',
        'vision': '视觉理解'
    };
    
    // 只显示已配置密钥的供应商的模型
    const configuredProviderIds = new Set(
        settingsProviders.filter(p => p.hasKey).map(p => p.id)
    );
    const availableModels = settingsModels.filter(m => configuredProviderIds.has(m.provider_id));
    
    container.innerHTML = settingsAssignments.map(assignment => `
        <div class="assignment-card">
            <div class="assignment-card-header">
                <div class="assignment-card-name">${sceneNames[assignment.scene] || assignment.scene}</div>
            </div>
            <select class="assignment-model-select" data-scene="${assignment.scene}">
                <option value="">-- 未分配 --</option>
                ${availableModels.map(model => `
                    <option value="${model.id}" ${assignment.primary_model_id === model.id ? 'selected' : ''}>
                        ${model.provider_name} / ${model.name}
                    </option>
                `).join('')}
            </select>
        </div>
    `).join('');
}

// 更新供应商筛选下拉框
function updateProviderFilter() {
    const select = document.getElementById('modelProviderFilter');
    if (!select) return;
    
    select.innerHTML = '<option value="">所有供应商</option>' +
        settingsProviders.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

// ========== 操作函数 ==========

// 按供应商筛选模型
function filterModelsByProvider() {
    loadModelsList();
}

// 显示 API 密钥配置弹窗
async function showApiKeyModal(providerId, providerName) {
    const existingKey = await showPrompt('请输入 ' + providerName + ' 的 API 密钥：', 'API 密钥', '', true);
    if (!existingKey) return;

    if (existingKey && existingKey.trim()) {
        storeApiKey(providerId, existingKey.trim());
    }
}

// 存储 API 密钥
async function storeApiKey(providerId, apiKey) {
    try {
        const response = await fetch(`/api/agent/keys/${providerId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('密钥已保存', 'info');
            loadProvidersList();
        } else {
            showError('保存失败: ' + (data.error || data.message));
        }
    } catch (err) {
        showError('保存失败: ' + err.message);
    }
}

// 测试供应商连接
async function testProviderKey(providerId) {
    try {
        const response = await fetch(`/api/agent/keys/${providerId}/test`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(data.provider + ' 连接测试成功', 'info');
        } else {
            showError('测试失败: ' + (data.error || data.message));
        }
    } catch (err) {
        showError('测试失败: ' + err.message);
    }
}

// 显示添加模型弹窗
async function showAddModelModal() {
    const providerId = await showPrompt('请输入供应商 ID（如 prov_deepseek）：', '添加模型');
    if (!providerId) return;

    const modelId = await showPrompt('请输入模型 ID（如 deepseek-chat）：', '添加模型');
    if (!modelId) return;

    const modelName = await showPrompt('请输入模型显示名称（如 DeepSeek Chat）：', '添加模型');
    if (!modelName) return;

    addModel(providerId, modelId, modelName);
}

// 添加模型
async function addModel(providerId, modelId, modelName) {
    try {
        const response = await fetch('/api/agent/models', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider_id: providerId,
                model_id: modelId,
                name: modelName
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('模型已添加', 'info');
            loadModelsList();
        } else {
            showError('添加失败: ' + (data.error || data.message));
        }
    } catch (err) {
        showError('添加失败: ' + err.message);
    }
}

// 测试模型
async function testModel(modelId) {
    const testMessage = '你好，请用一句话介绍自己';
    
    try {
        const response = await fetch('/api/agent/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model_id: modelId,
                messages: [{ role: 'user', content: testMessage }]
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('模型测试完成，请查看响应', 'info');
        } else {
            showError('测试失败: ' + (data.error || data.message));
        }
    } catch (err) {
        showError('测试失败: ' + err.message);
    }
}

// 删除模型
async function deleteModel(modelId) {
    if (!await showConfirm('确定要删除这个模型吗？')) return;
    
    try {
        const response = await fetch(`/api/agent/models/${modelId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('模型已删除', 'info');
            loadModelsList();
        } else {
            showError('删除失败: ' + (data.error || data.message));
        }
    } catch (err) {
        showError('删除失败: ' + err.message);
    }
}

// 更新场景分配
// 批量保存所有场景分配
async function saveAllAssignments() {
    const selects = document.querySelectorAll('.assignment-model-select');
    const results = [];
    
    for (const select of selects) {
        const scene = select.dataset.scene;
        const modelId = select.value || null;
        
        try {
            const response = await fetch(`/api/agent/assignments/${scene}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ primary_model_id: modelId })
            });
            
            const data = await response.json();
            if (data.success) {
                results.push(`${scene}: 成功`);
            } else {
                results.push(`${scene}: ${data.error || '失败'}`);
            }
        } catch (err) {
            results.push(`${scene}: ${err.message}`);
        }
    }
    
    showToast('场景分配已保存！', 'info');
}

function updateAssignment(scene, modelId) {
    // 兼容旧调用
    fetch(`/api/agent/assignments/${scene}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_model_id: modelId || null })
    }).catch(err => console.error('更新分配失败:', err));
}

// ========== 初始化 ==========

// 初始化设置页面
function initSettingsPage() {
    // 加载初始数据
    loadProvidersList();
    loadModelsList();
    // 初始化简洁配置界面
    initSimpleSettings();
    loadUpdateManifestUrl();
}

document.addEventListener('DOMContentLoaded', () => {
    loadUpdateManifestUrl();
    setTimeout(() => checkForDocWikiUpdate(false), 1200);
});

// ========== 简洁配置界面 ==========

// 初始化简洁配置界面
function initSimpleSettings() {
    loadProvidersList().then(() => {
        renderProviderSelect();
        renderConfiguredProviders();
        renderManualModelProviderSelect();
    });
}

// 渲染手动添加模型的厂商下拉框
function renderManualModelProviderSelect() {
    const select = document.getElementById('manualModelProvider');
    if (!select) return;
    
    select.innerHTML = '<option value="">请选择厂商</option>' +
        settingsProviders.filter(p => p.hasKey).map(p =>
            `<option value="${p.id}">${escapeHtml(p.name)}</option>`
        ).join('');
}

// 手动添加模型
async function manualAddModel() {
    const modelId = document.getElementById('manualModelId').value.trim();
    const providerId = document.getElementById('manualModelProvider').value;
    
    if (!modelId) {
        showError('请输入模型 ID');
        return;
    }
    
    if (!providerId) {
        showError('请选择厂商');
        return;
    }
    
    try {
        const response = await fetch('/api/agent/models', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider_id: providerId,
                model_id: modelId,
                name: modelId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('模型添加成功！', 'info');
            document.getElementById('manualModelId').value = '';
            await loadModelsList();
        } else {
            showError('添加失败: ' + (data.error || data.message));
        }
    } catch (err) {
        console.error('添加模型失败:', err);
        showError('添加模型失败: ' + err.message);
    }
}

// 渲染厂商选择下拉框
function renderProviderSelect() {
    const select = document.getElementById('providerSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">请选择厂商</option>' +
        settingsProviders.map(p => `<option value="${p.id}" data-url="${p.api_base_url}">${escapeHtml(p.name)}</option>`).join('');
    
    // 监听厂商选择变化
    select.onchange = function() {
        const selected = settingsProviders.find(p => p.id === this.value);
        const baseUrlInput = document.getElementById('providerBaseUrl');
        const apiKeyInput = document.getElementById('providerApiKey');
        const modelSelect = document.getElementById('providerDefaultModel');
        
        // 清空模型下拉框
        modelSelect.innerHTML = '<option value="">请选择模型</option>';
        
        if (selected) {
            baseUrlInput.value = selected.api_base_url || '';
            // 如果已有密钥，显示提示
            if (selected.hasKey) {
                apiKeyInput.placeholder = '密钥已配置，留空表示不更改';
                apiKeyInput.value = '';
            } else {
                apiKeyInput.placeholder = '请输入 API Key';
                apiKeyInput.value = '';
            }
            modelSelect.value = '';
        } else {
            baseUrlInput.value = '';
            apiKeyInput.placeholder = '请输入 API Key';
            apiKeyInput.value = '';
            modelSelect.value = '';
        }
    };
    
    // 监听 API Key 输入，自动获取模型
    const apiKeyInput = document.getElementById('providerApiKey');
    apiKeyInput.onblur = function() {
        const providerId = document.getElementById('providerSelect').value;
        const apiKey = this.value.trim();
        
        if (providerId && apiKey && apiKey.length > 10) {
            // 自动获取模型（延迟一下，避免频繁请求）
            setTimeout(() => {
                refreshModelsList();
            }, 500);
        }
    };
}

// 渲染已配置厂商列表
function renderConfiguredProviders() {
    const container = document.getElementById('configuredProvidersList');
    if (!container) return;
    
    const configured = settingsProviders.filter(p => p.hasKey);
    
    if (configured.length === 0) {
        container.innerHTML = '<p class="empty">暂无已配置的厂商</p>';
        return;
    }
    
    container.innerHTML = configured.map(provider => `
        <div class="provider-item">
            <div class="provider-item-info">
                <div class="provider-item-name">
                    <span class="status-dot"></span>
                    ${provider.name}
                </div>
                <div class="provider-item-url">${provider.api_base_url}</div>
            </div>
            <div class="provider-item-actions">
                <span class="model-count">${getProviderModelCount(provider.id)} 个模型</span>
            </div>
        </div>
    `).join('');
}

// 获取供应商的模型数量
function getProviderModelCount(providerId) {
    return settingsModels.filter(m => m.provider_id === providerId).length;
}

// 检查模型输入方式
function checkModelInput() {
    const modelSelect = document.getElementById('providerDefaultModel');
    const manualInput = document.getElementById('manualModelInput');
    
    if (modelSelect.value === '__manual__') {
        manualInput.style.display = 'block';
    } else {
        manualInput.style.display = 'none';
        manualInput.value = '';
    }
}

// 获取当前选择的模型 ID
function getSelectedModelId() {
    const modelSelect = document.getElementById('providerDefaultModel');
    const manualInput = document.getElementById('manualModelInput');
    
    if (modelSelect.value === '__manual__') {
        return manualInput.value.trim();
    }
    return modelSelect.value;
}

// 刷新模型列表（使用当前输入的 API Key）
async function refreshModelsList() {
    const providerId = document.getElementById('providerSelect').value;
    const apiKey = document.getElementById('providerApiKey').value;
    
    if (!providerId) {
        showError('请先选择厂商');
        return;
    }
    
    if (!apiKey) {
        showError('请先输入 API Key');
        return;
    }
    
    try {
        const response = await fetch(`/api/agent/providers/${providerId}/models`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey })
        });
        
        // 检查 HTTP 状态码
        if (!response.ok) {
            const errorText = await response.text();
            showError('请求失败: ' + response.status + ' - ' + errorText);
            return;
        }
        
        const data = await response.json();
        
        // 检查是否有错误
        if (data.error) {
            showError('获取模型失败: ' + data.error);
            return;
        }
        
        if (data.models && data.models.length > 0) {
            // 填充模型下拉框
            const modelSelect = document.getElementById('providerDefaultModel');
            modelSelect.innerHTML = '<option value="">请选择模型</option>' +
                data.models.map(model =>
                    `<option value="${model.id}">${escapeHtml(model.name || model.id)}</option>`
                ).join('');
            
            // 自动选择第一个模型
            modelSelect.value = data.models[0].id;
            
            // 添加模型到数据库
            let addedCount = 0;
            for (const model of data.models) {
                const addResponse = await fetch('/api/agent/models', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        provider_id: providerId,
                        model_id: model.id,
                        name: model.name || model.id
                    })
                });
                const addData = await addResponse.json();
                if (addData.success || addData.error?.includes('已存在')) {
                    addedCount++;
                }
            }
            
            showToast('已获取 ' + data.models.length + ' 个模型，已保存 ' + addedCount + ' 个到数据库', 'info');
            
            // 刷新模型列表
            await loadModelsList();
        } else {
            showError('未获取到可用模型，请检查 API Key 是否正确，或该供应商可能不支持模型列表 API');
        }
    } catch (err) {
        console.error('刷新模型失败:', err);
        showError('刷新模型失败: ' + err.message);
    }
}

// 保存供应商配置
async function saveProviderConfig() {
    const providerId = document.getElementById('providerSelect').value;
    const baseUrl = document.getElementById('providerBaseUrl').value;
    const apiKey = document.getElementById('providerApiKey').value;
    const defaultModel = getSelectedModelId();
    
    if (!providerId) {
        showError('请选择厂商');
        return;
    }
    
    if (!apiKey) {
        showError('请输入 API Key');
        return;
    }
    
    if (!defaultModel) {
        showError('请选择或输入默认模型');
        return;
    }
    
    try {
        // 更新供应商信息
        if (baseUrl) {
            await fetch(`/api/agent/providers/${providerId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_base_url: baseUrl })
            });
        }
        
        // 保存 API 密钥
        const keyResponse = await fetch(`/api/agent/keys/${providerId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey })
        });
        const keyData = await keyResponse.json();
        
        if (!keyData.success && !keyData.error) {
            console.error('密钥保存失败:', keyData);
        }
        
        // 测试连接
        const testResponse = await fetch(`/api/agent/providers/${providerId}/test`, {
            method: 'POST'
        });
        const testData = await testResponse.json();
        
        if (testData.success) {
            // 如果是手动输入的模型，添加到数据库
            const modelSelect = document.getElementById('providerDefaultModel');
            if (modelSelect.value === '__manual__') {
                await fetch('/api/agent/models', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        provider_id: providerId,
                        model_id: defaultModel,
                        name: defaultModel
                    })
                });
            }
            
            showToast('配置成功！', 'info');
            
            // 重新加载并刷新界面，同时保留当前配置
            await loadProvidersList();
            await loadModelsList();
            renderProviderSelect();
            renderConfiguredProviders();
            
            // 恢复表单值
            document.getElementById('providerSelect').value = providerId;
            document.getElementById('providerBaseUrl').value = baseUrl;
            document.getElementById('providerApiKey').value = ''; // 不显示密钥
            document.getElementById('providerApiKey').placeholder = '密钥已配置，留空表示不更改';
            
            // 重新填充模型下拉框
            const providerModels = settingsModels.filter(m => m.provider_id === providerId);
            modelSelect.innerHTML = '<option value="">请选择模型</option>' +
                '<option value="__manual__">手动输入模型 ID</option>' +
                providerModels.map(m =>
                    `<option value="${m.model_id}" ${m.model_id === defaultModel ? 'selected' : ''}>${escapeHtml(m.name)}</option>`
                ).join('');
            
            // 如果是手动输入的模型，保持手动输入状态
            if (modelSelect.value !== defaultModel) {
                modelSelect.value = '__manual__';
                document.getElementById('manualModelInput').value = defaultModel;
                document.getElementById('manualModelInput').style.display = 'block';
            }
        } else {
            showError('测试失败: ' + (testData.message || '未知错误'));
        }
    } catch (err) {
        console.error('保存配置失败:', err);
        showError('保存配置失败: ' + err.message);
    }
}

// 导出函数
window.switchSettingsSection = switchSettingsSection;
window.filterModelsByProvider = filterModelsByProvider;
window.showApiKeyModal = showApiKeyModal;
window.storeApiKey = storeApiKey;
window.testProviderKey = testProviderKey;
window.showAddModelModal = showAddModelModal;
window.testModel = testModel;
window.deleteModel = deleteModel;
// 简洁界面函数
window.refreshModelsList = refreshModelsList;
window.saveProviderConfig = saveProviderConfig;
window.updateAssignment = updateAssignment;
window.saveAllAssignments = saveAllAssignments;
window.initSettingsPage = initSettingsPage;
window.saveUpdateManifestUrl = saveUpdateManifestUrl;
window.checkForDocWikiUpdate = checkForDocWikiUpdate;
window.manualAddModel = manualAddModel;
window.renderManualModelProviderSelect = renderManualModelProviderSelect;
