// ========== DocWiki 1.2.0: 导航与文件树数据统一由后端 API 提供 ==========
// 不再使用硬编码数据，所有栏目和文件结构通过 /api/tree 动态加载
// 以下为最小 Fallback 数据（仅在 API 不可用时使用，不含任何演示/测试项目）
const navData = {};  // 废弃，保留引用以避免旧代码报错
// 废弃：所有文件树操作已迁移至 /api/tree API，仅保留空对象防止旧代码报错
const projectTreeData = {};

let currentDocMode = 'read';
let currentDocFile = null;

// ========== Toast 通知系统（替代 alert） ==========
function showToast(message, type) {
    type = type || 'error';
    const existing = document.querySelector('.app-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'app-toast app-toast-' + type;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('app-toast-fadeout');
        setTimeout(() => toast.remove(), 250);
    }, 2500);
}

function showError(message) {
    showToast(message, 'error');
}

// 自定义确认对话框（替代 confirm）
function showConfirm(message, title = 'DocWiki') {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.display = 'flex';
        overlay.innerHTML = '<div class="modal-content compact-modal-content">' +
            '<div class="modal-header"><h3>' + escapeHtml(title) + '</h3></div>' +
            '<div class="modal-body"><p style="margin:0;font-size:14px;">' + escapeHtml(message) + '</p></div>' +
            '<div class="modal-footer">' +
            '<button class="btn btn-secondary cancel-btn">取消</button>' +
            '<button class="btn btn-primary confirm-btn">确定</button>' +
            '</div></div>';
        document.body.appendChild(overlay);
        overlay.querySelector('.cancel-btn').onclick = () => { overlay.remove(); resolve(false); };
        overlay.querySelector('.confirm-btn').onclick = () => { overlay.remove(); resolve(true); };
        overlay.onclick = e => { if (e.target === overlay) { overlay.remove(); resolve(false); } };
    });
}

// 自定义输入对话框（替代 prompt）
function showPrompt(message, title = 'DocWiki', defaultValue = '', isPassword = false) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.display = 'flex';
        overlay.innerHTML = '<div class="modal-content compact-modal-content">' +
            '<div class="modal-header"><h3>' + escapeHtml(title) + '</h3></div>' +
            '<div class="modal-body">' +
            '<p style="margin:0 0 10px;font-size:14px;">' + escapeHtml(message) + '</p>' +
            '<input class="form-input prompt-input" type="' + (isPassword ? 'password' : 'text') + '" value="' + escapeHtml(defaultValue) + '" autofocus>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button class="btn btn-secondary cancel-btn">取消</button>' +
            '<button class="btn btn-primary confirm-btn">确定</button>' +
            '</div></div>';
        document.body.appendChild(overlay);
        const input = overlay.querySelector('.prompt-input');
        input.focus();
        input.select();
        overlay.querySelector('.cancel-btn').onclick = () => { overlay.remove(); resolve(null); };
        overlay.querySelector('.confirm-btn').onclick = () => { overlay.remove(); resolve(input.value); };
        input.onkeydown = e => { if (e.key === 'Enter') { overlay.remove(); resolve(input.value); } if (e.key === 'Escape') { overlay.remove(); resolve(null); } };
        overlay.onclick = e => { if (e.target === overlay) { overlay.remove(); resolve(null); } };
    });
}

// 渲染项目文件树（Easy Vibe 风格：纯文字、无图标、去 .md）
function renderDocTree() {
    const container = document.getElementById('docTree');
    if (!container) return;
    let html = '';

    Object.keys(projectTreeData).forEach(projectName => {
        const project = projectTreeData[projectName];
        html += '<div class="tree-folder">';
        html += '<div class="tree-folder-header" onclick="docToggleFolder(this)">';
        html += '<span class="tree-folder-name">' + projectName + '</span>';
        html += '<span class="tree-folder-arrow open">▶</span>';
        html += '</div>';
        html += '<div class="tree-folder-children open">';

        Object.keys(project).forEach(itemName => {
            if (itemName.endsWith('.md')) {
                // 文件：去掉 .md，无图标
                const displayName = itemName.replace('.md', '');
                const fullPath = projectName + '/' + itemName;
                const cssClass = 'tree-file' + (currentDocFile === fullPath ? ' active' : '');
                html += '<div class="' + cssClass + '" data-path="' + fullPath + '" onclick="docOpenFile(\'project\',\'' + projectName + '\',\'' + itemName + '\')">';
                html += '<span class="tree-file-name">' + displayName + '</span>';
                html += '</div>';
            } else if (typeof project[itemName] === 'object' && !Array.isArray(project[itemName])) {
                // 子文件夹
                html += '<div class="tree-folder">';
                html += '<div class="tree-folder-header tree-folder-header-sub" onclick="docToggleFolder(this)">';
                html += '<span class="tree-folder-name">' + itemName + '</span>';
                html += '<span class="tree-folder-arrow">▶</span>';
                html += '</div>';
                html += '<div class="tree-folder-children">';

                Object.keys(project[itemName]).forEach(fileItem => {
                    if (fileItem.endsWith('.md')) {
                        const displayName = fileItem.replace('.md', '');
                        const fullPath = projectName + '/' + itemName + '/' + fileItem;
                        const cssClass = 'tree-file tree-file-sub' + (currentDocFile === fullPath ? ' active' : '');
                        html += '<div class="' + cssClass + '" data-path="' + fullPath + '" onclick="docOpenFile(\'project\',\'' + projectName + '/' + itemName + '\',\'' + fileItem + '\')">';
                        html += '<span class="tree-file-name">' + displayName + '</span>';
                        html += '</div>';
                    } else {
                        // 子子文件夹（如 assets）
                        const subChildren = project[itemName][fileItem];
                        if (typeof subChildren === 'object' && Object.keys(subChildren).length > 0) {
                            html += '<div class="tree-folder">';
                            html += '<div class="tree-folder-header tree-folder-header-sub2" onclick="docToggleFolder(this)">';
                            html += '<span class="tree-folder-name">' + fileItem + '</span>';
                            html += '<span class="tree-folder-arrow">▶</span>';
                            html += '</div>';
                            html += '<div class="tree-folder-children">';
                            Object.keys(subChildren).forEach(f => {
                                const dn = f.replace('.md', '');
                                html += '<div class="tree-file tree-file-sub2">';
                                html += '<span class="tree-file-name">' + dn + '</span>';
                                html += '</div>';
                            });
                            html += '</div></div>';
                        } else {
                            html += '<div class="tree-file tree-file-sub">';
                            html += '<span class="tree-file-name">' + fileItem + '</span>';
                            html += '</div>';
                        }
                    }
                });

                html += '</div></div>';
            }
        });

        html += '</div></div>';
    });

    container.innerHTML = html;
}

// 切换文件夹展开/折叠
function docToggleFolder(header) {
    const arrow = header.querySelector('.tree-folder-arrow');
    const children = header.nextElementSibling;
    if (!arrow || !children) return;
    arrow.classList.toggle('open');
    children.classList.toggle('open');
}

// 打开文件
function docOpenFile(category, path, fileName) {
    currentDocFile = path + '/' + fileName;

    // 更新面包屑
    const breadcrumb = document.getElementById('docBreadcrumb');
    if (breadcrumb) {
        let bc = '<span>' + (category === 'project' ? '项目' : category) + '</span>';
        path.split('/').forEach(p => {
            bc += '<span class="doc-breadcrumb-sep">/</span><span>' + p + '</span>';
        });
        bc += '<span class="doc-breadcrumb-sep">/</span><span class="doc-breadcrumb-current">' + fileName + '</span>';
        breadcrumb.innerHTML = bc;
    }

    // 尝试从 treeData 获取内容
    let content = '';
    let found = false;

    if (category === 'project') {
        const parts = path.split('/');
        let node = projectTreeData;
        for (let i = 0; i < parts.length; i++) {
            if (node[parts[i]]) node = node[parts[i]];
            else { node = null; break; }
        }
        if (node && node[fileName]) {
            content = node[fileName];
            found = true;
        }
    }

    if (!found) {
        content = '# ' + fileName.replace('.md', '') + '\n\n> 此文件暂无内容，请切换到编辑模式开始编写。';
    }

    // 更新阅读内容
    renderMarkdownContent(content);

    // 更新编辑器
    const textarea = document.getElementById('editorTextarea');
    if (textarea) {
        textarea.value = content;
        editorUpdateLineNumbers();
    }

    // 更新树选中状态（不重渲染，不折叠文件夹）
    const targetPath = path + '/' + fileName;
    document.querySelectorAll('#docTree .tree-file').forEach(el => {
        el.classList.toggle('active', el.dataset.path === targetPath);
    });

    // 确保显示项目页面
    const docPage = document.getElementById('docPage');
    if (docPage && !docPage.classList.contains('active')) {
        switchTab('project');
    }
}

// 渲染 Markdown 内容到阅读区
function renderMarkdownContent(md) {
    const body = document.getElementById('docMarkdownBody');
    if (!body) return;

    let html = md
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
        .replace(/\|(.+)\|/g, function(match) {
            return '<tr>' + match.split('|').filter(c => c.trim()).map(c => '<td>' + c.trim() + '</td>').join('') + '</tr>';
        })
        .replace(/(<tr>.*<\/tr>\n?)+/g, function(match) {
            let rows = match.split('<tr>').filter(r => r);
            if (rows.length === 0) return match;
            let thead = '<thead><tr>' + rows[0].replace(/<\/tr>.*/, '').split('<td>').filter(c => c).map(c => '<th>' + c.replace(/<\/td>.*/, '') + '</th>').join('') + '</tr></thead>';
            let tbody = '<tbody>' + rows.slice(1).map(r => '<tr>' + r).join('') + '</tbody>';
            return '<table>' + thead + tbody + '</table>';
        })
        .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(?!<[hultbo])/gm, '');

    body.innerHTML = html;

    // 更新右侧 TOC
    updateToc();
}

// 更新页面导航目录
function updateToc() {
    const body = document.getElementById('docMarkdownBody');
    const tocList = document.getElementById('docTocList');
    if (!body || !tocList) return;

    let toc = '';
    body.querySelectorAll('h1, h2, h3').forEach((h, i) => {
        const level = h.tagName.toLowerCase();
        const text = h.textContent;
        const cls = level === 'h1' ? 'doc-toc-item' : (level === 'h2' ? 'doc-toc-item' : 'doc-toc-sub');
        toc += '<a class="' + cls + (i === 0 ? ' active' : '') + '" href="#' + level + i + '">' + text + '</a>';
    });
    tocList.innerHTML = toc;
}

// 面包屑编辑/恢复
function restoreBreadcrumb(editable) {
    const breadcrumb = document.getElementById('docBreadcrumb');
    if (!breadcrumb) return;
    const current = breadcrumb.querySelector('.doc-breadcrumb-current');
    if (!current) return;

    if (editable && !current.querySelector('input')) {
        // 当前文件名替换为 input
        const text = current.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = text;
        input.className = 'doc-breadcrumb-edit';
        current.textContent = '';
        current.appendChild(input);

        input.addEventListener('blur', function() {
            const newName = input.value.trim() || text;
            // 重命名文件
            if (newName !== text && currentDocFile) {
                const parts = currentDocFile.split('/');
                const oldFileName = parts[parts.length - 1];
                const suffix = oldFileName.includes('.') ? '.' + oldFileName.split('.').pop() : '';
                const newFileName = newName + suffix;
                let node = projectTreeData;
                for (let i = 0; i < parts.length - 1; i++) {
                    if (node[parts[i]]) node = node[parts[i]];
                    else { node = null; break; }
                }
                if (node && node[oldFileName]) {
                    node[newFileName] = node[oldFileName];
                    delete node[oldFileName];
                }
                const newPath = parts.slice(0, -1).concat(newFileName).join('/');
                if (currentDocFile) {
                    // 更新 data-path
                    document.querySelectorAll('#docTree .tree-file').forEach(el => {
                        if (el.dataset.path === currentDocFile) {
                            el.dataset.path = newPath;
                            el.textContent = newName;
                        }
                    });
                }
                currentDocFile = newPath;
                current.textContent = newName;
            } else {
                current.textContent = newName;
            }
        });
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            if (e.key === 'Escape') { input.value = text; input.blur(); }
        });
        input.focus();
        input.select();
    } else if (!editable) {
        // 恢复为纯文本
        const input = current.querySelector('input');
        if (input) {
            current.textContent = input.value.trim() || current.textContent;
        }
    }
}

// 切换阅读/编辑模式
function switchDocMode(mode) {
    currentDocMode = mode;
    const readContent = document.getElementById('docReadContent');
    const editContent = document.getElementById('docEditContent');
    const readBtn = document.getElementById('docModeRead');
    const editBtn = document.getElementById('docModeEdit');
    const tocPanel = document.getElementById('docTocPanel');
    const editAside = document.getElementById('docEditAside');
    const saveButton = document.getElementById('docSaveButton');

    if (mode === 'read') {
        // ★ 切换到阅读模式前尝试保存（非阻塞）
        if (currentDocDirty && currentDocFile) {
            saveCurrentDocument().catch(() => {});
        }
        if (readContent) readContent.style.display = '';
        if (editContent) editContent.style.display = 'none';
        if (readBtn) readBtn.classList.add('active');
        if (editBtn) editBtn.classList.remove('active');
        if (tocPanel) tocPanel.style.display = '';
        if (editAside) editAside.style.display = 'none';
        if (saveButton) saveButton.style.display = 'none';

        // 恢复面包屑为纯文本
        restoreBreadcrumb(false);

        // 从编辑器同步到阅读区
        const markdown = getEditorMarkdown();
        const textarea = document.getElementById('editorTextarea');
        if (textarea) textarea.value = markdown;
        renderMarkdownContent(markdown);
    } else {
        if (readContent) readContent.style.display = 'none';
        if (editContent) editContent.style.display = '';
        if (readBtn) readBtn.classList.remove('active');
        if (editBtn) editBtn.classList.add('active');
        if (tocPanel) tocPanel.style.display = 'none';
        if (editAside) editAside.style.display = '';
        if (saveButton) saveButton.style.display = 'inline-flex';

        // 面包屑文件名变为可编辑输入框
        restoreBreadcrumb(true);

        const textarea = document.getElementById('editorTextarea');
        if (!editorSourceMode) syncRichEditorFromMarkdown(textarea?.value || '');
        updateRichEditorCount();
    }
}

// 编辑器行号
function editorUpdateLineNumbers() {
    const textarea = document.getElementById('editorTextarea');
    const lineNums = document.getElementById('editorLineNumbers');
    const charCount = document.getElementById('editorCharCount');
    if (!textarea || !lineNums) return;

    const lines = textarea.value.split('\n');
    let nums = '';
    for (let i = 1; i <= lines.length; i++) {
        nums += i + '\n';
    }
    lineNums.textContent = nums;

    if (charCount) {
        const count = textarea.value.length;
        charCount.textContent = count.toLocaleString() + ' 个字符';
    }
}

// 编辑器滚动同步
function editorSyncScroll() {
    const textarea = document.getElementById('editorTextarea');
    const lineNums = document.getElementById('editorLineNumbers');
    if (textarea && lineNums) {
        lineNums.scrollTop = textarea.scrollTop;
    }
}

// 侧边栏标签切换
function switchDocAsideTab(btn, tab) {
    document.querySelectorAll('.doc-aside-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// ========== 文件树操作菜单 ==========
let ctxTargetEl = null; // 右键/双击的目标元素
let ctxTargetPath = ''; // 目标路径
// 暴露到 window 以便测试和外部调用
Object.defineProperty(window, 'ctxTargetPath', { get: () => ctxTargetPath, set: v => { ctxTargetPath = v; } });

function docTreeNew() { showError('新建文件（待实现）'); }
function docTreeRefresh() { renderDocTree(); }
function docTreeFilter(value) { /* 过滤文件树 */ }

// 双击文件弹出操作菜单
document.addEventListener('dblclick', function(e) {
    const fileEl = e.target.closest('.tree-file');
    if (fileEl) {
        e.preventDefault();
        showCtxMenu(e.clientX, e.clientY, fileEl, fileEl.dataset.path || '');
    }
});

// 点击文件夹头部时，如果在编辑模式下双击也可弹菜单（文件夹用长按暂不实现）

function showCtxMenu(x, y, targetEl, targetPath) {
    const menu = document.getElementById('treeContextMenu');
    if (!menu) return;
    ctxTargetEl = targetEl;
    ctxTargetPath = targetPath;

    // 如果是文件夹头，隐藏"重命名"以外的操作不适合，不过文件夹也支持重命名
    // 隐藏重命名按钮（暂不支持文件夹重命名）
    // menu.style.display 不控制，所有项都显示

    // 防止超出屏幕
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.add('show');

    // 延迟绑定关闭，避免触发自身
    setTimeout(() => {
        document.addEventListener('click', hideCtxMenu, { once: true });
    }, 0);
}

function hideCtxMenu() {
    const menu = document.getElementById('treeContextMenu');
    if (menu) menu.classList.remove('show');
}

// 重命名
function ctxRename() {
    hideCtxMenu();
    if (!ctxTargetEl || !ctxTargetPath) return;

    const nameEl = ctxTargetEl.querySelector('.tree-file-name');
    if (!nameEl) return;

    const oldName = nameEl.textContent.trim();
    const input = document.createElement('input');
    input.type = 'text';
    input.value = oldName;
    input.className = 'doc-breadcrumb-edit';
    input.style.cssText = 'width:' + nameEl.offsetWidth + 'px;font-size:13px;padding:1px 4px;';

    nameEl.replaceWith(input);
    input.focus();
    input.select();

    const finishRename = () => {
        const newName = input.value.trim() || oldName;
        // 保留原文件后缀（文件名中不含 .md，但数据里有）
        // 从 path 中恢复，如 path = "栏目/子目录/文件.md"
        const pathParts = ctxTargetPath.split('/');
        const oldFileName = pathParts[pathParts.length - 1]; // 含 .md
        const newDisplayName = newName; // 用户输入的是不含 .md 的

        // 如果原名以 .md 结尾，新名加上 .md
        const suffix = oldFileName.includes('.') ? '.' + oldFileName.split('.').pop() : '';
        const newFileName = newDisplayName + suffix;

        // 更新 projectTreeData
        let node = projectTreeData;
        for (let i = 0; i < pathParts.length - 1; i++) {
            if (node[pathParts[i]]) node = node[pathParts[i]];
            else { node = null; break; }
        }
        if (node && node[oldFileName]) {
            delete node[oldFileName];
            node[newFileName] = node[oldFileName] || '';
        }

        // 更新 currentDocFile
        if (currentDocFile === ctxTargetPath) {
            const newPath = pathParts.slice(0, -1).concat(newFileName).join('/');
            currentDocFile = newPath;
        }

        // 恢复显示
        const span = document.createElement('span');
        span.className = 'tree-file-name';
        span.textContent = newDisplayName;
        input.replaceWith(span);
    };

    input.addEventListener('blur', finishRename);
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { input.value = oldName; input.blur(); }
    });
}

// ========== 新建文件（统一入口，通过 /api/file 创建） ==========
async function ctxNewFile() {
    hideCtxMenu();
    const name = await showPrompt('请输入新文件名（不含 .md）：', '新建文件');
    if (!name) return;
    const safeName = name.replace(/\.md$/i, '');
    const categoryRoot = categoryDirectoryMap[currentCategory];
    const parent = currentDocFile ? currentDocFile.split('/').slice(0, -1).join('/') : categoryRoot;
    try {
        const relativePath = parent + '/' + safeName + '.md';
        await apiRequest('/api/file', { method: 'POST', body: JSON.stringify({ path: relativePath, content: '# ' + safeName + '\n\n\n' }) });
        await loadKnowledgeTree();
        renderDocTree();
        // ★ 自动打开新文件，光标定位到正文
        document.getElementById('projectPage')?.classList.remove('active');
        document.getElementById('docPage')?.classList.add('active');
        await openKnowledgeFile(relativePath);
        focusEditorBody();
    } catch (error) { showError(error.message); }
}

// 新建文件夹
async function ctxNewFolder() {
    hideCtxMenu();
    const name = await showPrompt('请输入新文件夹名：', '新建文件夹');
    if (!name) return;

    let parentObj = projectTreeData;
    if (ctxTargetPath) {
        const parts = ctxTargetPath.split('/');
        let node = projectTreeData;
        for (let i = 0; i < parts.length - 1; i++) {
            if (node[parts[i]]) node = node[parts[i]];
            else { node = null; break; }
        }
        parentObj = node;
    }

    if (!parentObj || typeof parentObj !== 'object') return;
    parentObj[name] = {};
    renderDocTree();
}

// 删除
async function ctxDelete() {
    hideCtxMenu();
    if (!ctxTargetPath) return;

    if (!await showConfirm('确定要删除 "' + ctxTargetPath + '" 吗？')) return;

    const parts = ctxTargetPath.split('/');
    let node = projectTreeData;
    for (let i = 0; i < parts.length - 1; i++) {
        if (node[parts[i]]) node = node[parts[i]];
        else { node = null; break; }
    }
    if (node) {
        delete node[parts[parts.length - 1]];
        if (currentDocFile === ctxTargetPath) {
            currentDocFile = null;
        }
        renderDocTree();
    }
}

// 渲染导航树（兼容旧接口）
function renderNavTree(items, level) {
    return '<div style="padding:16px;color:#64748b;">导航数据已迁移至项目文件树</div>';
}

// ========== 标签切换 ==========
function switchTab(tab) {
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
    const targetTab = document.querySelector(`[data-tab="${tab}"]`);
    if (targetTab) targetTab.classList.add('active');

    const homePage = document.querySelector('.home-page');
    const taskPage = document.getElementById('taskPage');
    const projectPage = document.getElementById('projectPage');
    const docPage = document.getElementById('docPage');
    const settingsPage = document.getElementById('settingsPage');
    const aiAssistant = document.getElementById('aiAssistant');

    if (homePage) homePage.classList.add('hidden');
    if (taskPage) taskPage.classList.remove('active');
    if (projectPage) projectPage.classList.remove('active');
    if (docPage) docPage.classList.remove('active');
    if (settingsPage) settingsPage.classList.remove('active');

    // 首页不展示 AI 助手，其他页面展示
    if (aiAssistant) {
        aiAssistant.style.display = tab === 'home' ? 'none' : 'block';
    }

    if (tab === 'home') {
        if (homePage) homePage.classList.remove('hidden');
    } else if (tab === 'task') {
        if (taskPage) taskPage.classList.add('active');
        const readMode = document.getElementById('taskReadMode');
        const editMode = document.getElementById('taskEditMode');
        const editTitleArea = document.querySelector('.edit-title-area');
        if (readMode) readMode.classList.add('active');
        if (editMode) editMode.classList.remove('active');
        if (readMode) {
            const readBtns = readMode.querySelectorAll('.mode-btn');
            readBtns.forEach(btn => btn.classList.remove('active'));
            if (readBtns[0]) readBtns[0].classList.add('active');
        }
        if (editTitleArea) editTitleArea.style.display = 'none';
    } else if (tab === 'project') {
        if (projectPage) projectPage.classList.add('active');
        renderProjectTree();
        renderProjectCards();
    } else if (tab === 'settings') {
        if (settingsPage) settingsPage.classList.add('active');
        if (typeof window.initSettingsPage === 'function') window.initSettingsPage();
    } else {
        if (docPage) docPage.classList.add('active');
        renderDocTree();
    }

    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
}

// ========== 项目总览页面函数 ==========

// 项目元数据（描述信息）— 由真实数据动态填充，不再硬编码演示项目
const projectMetaData = {};

// 计算项目中的文件数量
function countFilesInProject(obj) {
    let count = 0;
    Object.keys(obj).forEach(key => {
        if (key.endsWith('.md')) {
            count++;
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            count += countFilesInProject(obj[key]);
        }
    });
    return count;
}

// 渲染项目卡片
function renderProjectCards() {
    const container = document.getElementById('projectCardGrid');
    if (!container) return;
    
    let html = '';
    Object.keys(projectTreeData).forEach(projectName => {
        const project = projectTreeData[projectName];
        const fileCount = countFilesInProject(project);
        const meta = projectMetaData[projectName] || { description: '' };
        
        html += '<div class="project-card" onclick="navigateToProject(\'' + projectName + '\')">';
        html += '<h3>' + projectName + '</h3>';
        html += '<p>' + meta.description + '</p>';
        html += '<span class="project-file-count"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>' + fileCount + ' 个文件</span>';
        html += '</div>';
    });
    
    container.innerHTML = html;
}

// 渲染项目导航树（总览页专用，展开按钮在右侧）
function renderProjectTree() {
    const container = document.getElementById('projectTree');
    if (!container) return;
    let html = '';

    Object.keys(projectTreeData).forEach(projectName => {
        const project = projectTreeData[projectName];
        html += '<div class="proj-tree-item proj-tree-root" onclick="projToggleFolder(this, event)">';
        html += '<span class="proj-tree-name">' + projectName + '</span>';
        html += '<span class="proj-tree-arrow open">›</span>';
        html += '</div>';
        html += '<div class="proj-tree-children open">';

        Object.keys(project).forEach(itemName => {
            if (itemName.endsWith('.md')) {
                const displayName = itemName.replace('.md', '');
                const fullPath = projectName + '/' + itemName;
                html += '<div class="proj-tree-file" data-path="' + fullPath + '" onclick="projOpenFile(\'' + projectName + '\',\'' + itemName + '\'); event.stopPropagation()">';
                html += displayName;
                html += '</div>';
            } else if (typeof project[itemName] === 'object' && !Array.isArray(project[itemName])) {
                // 子文件夹
                html += '<div class="proj-tree-item proj-tree-sub" onclick="projToggleFolder(this, event)">';
                html += '<span class="proj-tree-name">' + itemName + '</span>';
                html += '<span class="proj-tree-arrow">›</span>';
                html += '</div>';
                html += '<div class="proj-tree-children">';

                Object.keys(project[itemName]).forEach(fileItem => {
                    if (fileItem.endsWith('.md')) {
                        const displayName = fileItem.replace('.md', '');
                        html += '<div class="proj-tree-file" data-path="' + projectName + '/' + itemName + '/' + fileItem + '" onclick="projOpenFile(\'' + projectName + '/' + itemName + '\',\'' + fileItem + '\'); event.stopPropagation()">';
                        html += displayName;
                        html += '</div>';
                    } else {
                        // 子子文件夹
                        const subChildren = project[itemName][fileItem];
                        if (typeof subChildren === 'object' && Object.keys(subChildren).length > 0) {
                            html += '<div class="proj-tree-item proj-tree-sub2" onclick="projToggleFolder(this, event)">';
                            html += '<span class="proj-tree-name">' + fileItem + '</span>';
                            html += '<span class="proj-tree-arrow">›</span>';
                            html += '</div>';
                            html += '<div class="proj-tree-children">';
                            Object.keys(subChildren).forEach(f => {
                                const dn = f.replace('.md', '');
                                html += '<div class="proj-tree-file" onclick="event.stopPropagation()">' + dn + '</div>';
                            });
                            html += '</div>';
                        } else {
                            html += '<div class="proj-tree-file" onclick="event.stopPropagation()">' + fileItem + '</div>';
                        }
                    }
                });

                html += '</div>';
            }
        });

        html += '</div>';
    });

    container.innerHTML = html;
}

// 切换项目树文件夹展开/折叠
function projToggleFolder(item, event) {
    if (event) {
        event.stopPropagation();
    }
    const arrow = item.querySelector('.proj-tree-arrow');
    const children = item.nextElementSibling;
    if (!arrow || !children) return;
    arrow.classList.toggle('open');
    children.classList.toggle('open');
}

// 从项目总览页打开文件 - 带未保存检查
function projOpenFile(projectPath, fileName) {
    // 直接切换到文档页面
    const projectPage = document.getElementById('projectPage');
    const docPage = document.getElementById('docPage');

    if (projectPage) projectPage.classList.remove('active');
    if (docPage) docPage.classList.add('active');

    // 打开文件（通过 docOpenFile，内部调用 openKnowledgeFile）
    guardedOpenKnowledgeFile([projectPath, fileName].join('/'));
}

// 导航到项目 - 展开对应项目
function navigateToProject(projectName) {
    const projectItems = document.querySelectorAll('.proj-tree-item');
    projectItems.forEach(item => {
        const nameEl = item.querySelector('.proj-tree-name');
        if (nameEl && nameEl.textContent === projectName) {
            projToggleFolder(item);
        }
    });
}

// 导航到文件 - 从总览页打开文件
function navigateToFile(projectPath, fileName) {
    projOpenFile(projectPath, fileName);
}

// 新建文件弹窗
function showNewFileModal() {
    document.getElementById('newFileModal').style.display = 'flex';
}

function closeNewFileModal() {
    document.getElementById('newFileModal').style.display = 'none';
    document.getElementById('newFileName').value = '';
}

// createNewFile 已在下方覆盖为 async API 版本，此函数已废弃

// 新建文件夹弹窗
function showNewFolderModal() {
    document.getElementById('newFolderModal').style.display = 'flex';
}

function closeNewFolderModal() {
    document.getElementById('newFolderModal').style.display = 'none';
    document.getElementById('newFolderName').value = '';
}

function createNewFolder() {
    const project = document.getElementById('newFolderProject').value;
    const folderName = document.getElementById('newFolderName').value;
    
    if (!folderName.trim()) {
        showError('请输入文件夹名称');
        return;
    }
    
    showToast('已创建文件夹: ' + project + '/' + folderName, 'info');
    closeNewFolderModal();
    renderProjectTree();
}

// ========== 文档跳转 ==========
function navigateToDoc(category, docName) {
    handleTabSwitch(category);
    const sidebarTitle = document.getElementById('docSidebarTitle');
    if (sidebarTitle) sidebarTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);

    // 更新面包屑
    const breadcrumb = document.getElementById('docBreadcrumb');
    if (breadcrumb) {
        breadcrumb.innerHTML = '<span>' + escapeHtml(category) + '</span><span class="doc-breadcrumb-sep">/</span><span class="doc-breadcrumb-current">' + escapeHtml(docName) + '</span>';
    }

    // 更新阅读内容
    const content = '# ' + docName + '\n\n> 此文档内容正在加载中...';
    renderMarkdownContent(content);

    const textarea = document.getElementById('editorTextarea');
    if (textarea) { textarea.value = content; editorUpdateLineNumbers(); }
}

// ========== 表格数据管理 ==========
// ★ 优先从后端 API 加载，fallback 到 localStorage
let taskDataCache = null; // { tasks: [], completedTasks: [] }

async function loadTableData() {
    // 尝试从 API 加载
    try {
        const resp = await fetch('/api/tasks');
        const data = await resp.json();
        if (data.tasks && data.tasks.length > 0) {
            taskDataCache = data;
            return data.tasks;
        }
    } catch (e) { /* API 不可用，使用 localStorage */ }
    // Fallback: localStorage
    try {
        const saved = localStorage.getItem('wiki_task_data');
        if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [];
}

async function loadCompletedTasks() {
    if (taskDataCache && taskDataCache.completedTasks) return taskDataCache.completedTasks;
    try {
        const resp = await fetch('/api/tasks');
        const data = await resp.json();
        if (data.completedTasks) {
            taskDataCache = data;
            return data.completedTasks;
        }
    } catch (e) { /* fallback */ }
    try {
        const saved = localStorage.getItem('wiki_completed_tasks');
        if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [];
}

function renderTaskTable(rows) {
    const tbody = document.getElementById('taskTableBody');
    if (!tbody) return;
    tbody.innerHTML = (rows || []).map(task =>
        '<tr data-task-name="' + escapeHtml(task.name || '') + '"' +
        ' data-task-priority="' + escapeHtml(task.priority || '中') + '"' +
        ' data-task-category="' + escapeHtml(task.level || '') + '"' +
        ' data-task-project="' + escapeHtml(task.project || '') + '"' +
        ' data-task-sub="' + escapeHtml(task.sub || '') + '"' +
        ' data-task-detail="' + escapeHtml(task.detail || '') + '"' +
        ' data-task-status="' + escapeHtml(task.status || '待开始') + '"' +
        ' data-task-deadline="' + escapeHtml(task.deadline || '') + '"' +
        ' data-task-current-stage="' + escapeHtml(task.currentStage || '') + '"' +
        ' data-task-next-stage="' + escapeHtml(task.nextStage || '') + '"' +
        ' data-task-planned-date="' + escapeHtml(task.plannedDate || '') + '" onclick="selectTaskRow(this)">' +
        '<td><input type="radio" name="taskRadio" class="row-radio"></td>' +
        '<td>' + escapeHtml(task.name || '') + '</td><td>' + escapeHtml(task.priority || '中') + '</td>' +
        '<td>' + escapeHtml(task.level || '') + '</td><td>' + escapeHtml(task.project || '') + '</td>' +
        '<td>' + escapeHtml(task.sub || '') + '</td><td>' + escapeHtml(task.detail || '') + '</td>' +
        '<td>' + escapeHtml(task.deadline || '') + '</td></tr>'
    ).join('');
    const footer = document.querySelector('#taskEditMode .table-footer');
    if (footer) footer.textContent = '共 ' + (rows || []).length + ' 条任务';
}

function saveTableData() {
    const tbody = document.getElementById('taskTableBody');
    if (!tbody) return;

    const rows = [];
    tbody.querySelectorAll('tr').forEach(tr => {
        const cells = tr.querySelectorAll('td');
        if (cells.length < 8) return;

        rows.push({
            name: cells[1].textContent.trim(),
            priority: cells[2].textContent.trim() || '中',
            level: cells[3].textContent.trim(),
            project: cells[4].textContent.trim(),
            sub: cells[5].textContent.trim(),
            detail: cells[6].textContent.trim(),
            deadline: cells[7].textContent.trim(),
            status: tr.dataset.taskStatus || '待开始',
            currentStage: tr.dataset.taskCurrentStage || '',
            nextStage: tr.dataset.taskNextStage || '',
            plannedDate: tr.dataset.taskPlannedDate || ''
        });
    });

    // 保存到 localStorage（立即生效，非阻塞缓存）
    try { localStorage.setItem('wiki_task_data', JSON.stringify(rows)); } catch(e) {}
    // 异步同步到后端 Markdown 存储
    syncTasksToServer();
    renderReadMode(rows);
}

function localDay(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseTaskDate(value, referenceDate = new Date()) {
    const text = String(value || '').trim();
    if (!text) return null;
    const base = localDay(referenceDate);
    if (text.includes('今天')) return base;
    if (text.includes('明天')) {
        const tomorrow = new Date(base);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
    }
    const weekMatch = text.match(/本周\s*([一二三四五六日天])?/);
    if (weekMatch) {
        const weekdayMap = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7 };
        const currentWeekday = base.getDay() || 7;
        const targetWeekday = weekdayMap[weekMatch[1]] || 7;
        const result = new Date(base);
        result.setDate(result.getDate() - currentWeekday + targetWeekday);
        return result;
    }
    const numeric = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (!numeric) return null;
    const parsed = new Date(Number(numeric[1]), Number(numeric[2]) - 1, Number(numeric[3]));
    if (parsed.getFullYear() !== Number(numeric[1]) || parsed.getMonth() !== Number(numeric[2]) - 1 || parsed.getDate() !== Number(numeric[3])) return null;
    return parsed;
}

function taskEffectiveDate(task, referenceDate = new Date()) {
    return parseTaskDate(task.plannedDate || task.deadline, referenceDate);
}

function taskDateGroup(task, referenceDate = new Date()) {
    const effective = taskEffectiveDate(task, referenceDate);
    if (!effective) return '其他';
    const today = localDay(referenceDate);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (effective.getTime() === today.getTime()) return '今日';
    if (effective.getTime() === tomorrow.getTime()) return '明日';
    const weekday = today.getDay() || 7;
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - weekday));
    if (effective > tomorrow && effective <= endOfWeek) return '本周';
    return '其他';
}

// ========== 渲染查看任务卡片视图（唯一） ==========
function renderReadMode(rows) {
    if (!rows) {
        try { rows = JSON.parse(localStorage.getItem('wiki_task_data') || '[]'); } catch(e) { rows = []; }
    }
    const container = document.getElementById('taskReadMode');
    if (!container) return;

    const _t = Date.now();
    const levelIcons = {
        '项目': '<img src="assets/images/card-project.png?t=' + _t + '" alt="项目" width="36" height="36" style="border-radius:8px;">',
        '报告': '<img src="assets/images/card-report.png?t=' + _t + '" alt="报告" width="36" height="36" style="border-radius:8px;">',
        '文献': '<img src="assets/images/card-literature.png?t=' + _t + '" alt="文献" width="36" height="36" style="border-radius:8px;">',
        'SOP': '<img src="assets/images/card-sop.png?t=' + _t + '" alt="SOP" width="36" height="36" style="border-radius:8px;">',
        '软件': '<img src="assets/images/card-software.png?t=' + _t + '" alt="软件" width="36" height="36" style="border-radius:8px;">',
        '写作': '<img src="assets/images/card-writing.png?t=' + _t + '" alt="写作" width="36" height="36" style="border-radius:8px;">',
    };

    const priorityClass = { '高': 'priority-high', '中': 'priority-mid', '低': 'priority-low' };
    const priorityLabel = { '高': '高优先级', '中': '中优先级', '低': '低优先级' };
    const statusClass = { '进行中': 'status-progress', '待开始': 'status-pending', '暂停': 'status-pending', '已完成': 'status-progress' };
    const statusLabel = { '进行中': '进行中', '待开始': '待开始', '暂停': '暂停', '已完成': '已完成' };

    const grouped = { '今日': [], '明日': [], '本周': [], '其他': [] };
    rows.forEach(r => {
        if (r.status === '已完成') return;
        grouped[taskDateGroup(r)].push(r);
    });
    const priorityOrder = { 高: 0, 中: 1, 低: 2 };
    Object.values(grouped).forEach(items => items.sort((a, b) => {
        const aDate = taskEffectiveDate(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bDate = taskEffectiveDate(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return aDate - bDate || (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
    }));

    let html = '';
    const sections = [
        { key: '今日', title: '今日任务' },
        { key: '明日', title: '明日任务' },
        { key: '本周', title: '本周任务' },
        { key: '其他', title: '全部任务' }
    ];

    sections.forEach(s => {
        const items = grouped[s.key];
        html += '<section class="task-section"><h2 class="task-section-title">' + s.title + ' <span>' + items.length + '</span></h2><div class="task-grid">';
        if (items.length === 0) html += '<div class="task-empty-state">暂无待办任务</div>';
        items.forEach(r => {
            const icon = levelIcons[r.level] || levelIcons['项目'];
            const pCls = priorityClass[r.priority] || 'priority-mid';
            const pLbl = priorityLabel[r.priority] || r.priority;
            const sCls = statusClass[r.status] || 'status-pending';
            const sLbl = statusLabel[r.status] || r.status;
            const docLevel = r.level || 'task';
            const docProject = r.project || r.name;
            const taskIdx = rows.indexOf(r);
            const stageHtml = r.status === '进行中'
                ? '<div class="tc2-stage"><span>当前：' + escapeHtml(r.currentStage || '未填写') + '</span><span>下一阶段：' + escapeHtml(r.nextStage || '未填写') + '</span><span>预计：' + escapeHtml(r.plannedDate || '未设置') + '</span><button type="button" onclick="openTaskProgressEditor(' + taskIdx + ')">编辑阶段</button></div>'
                : '';
            html += '<div class="task-card-v2"><div class="tc2-icon">' + icon + '</div><div class="tc2-body"><div class="tc2-header"><span class="tc2-title">' + r.name + '</span><span class="tc2-badge ' + pCls + '">' + pLbl + '</span><span class="tc2-badge ' + sCls + '">' + sLbl + '</span></div><p class="tc2-desc">' + (r.detail || '') + '</p><div class="tc2-footer"><span class="tc2-meta"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>截止：' + (r.deadline || '未设置') + '</span><span class="tc2-divider"></span><span class="tc2-meta"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>' + r.level + '：' + (r.project || '未指定') + '</span><a href="#" class="tc2-link" onclick="navigateToDoc(\'' + docLevel + '\', \'' + docProject.replace(/'/g, "\\'") + '\'); return false;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>关联文档</a></div>' +
            '<div class="tc2-status-actions">' +
            '<button class="tc2-status-btn status-pending-btn' + (r.status === '待开始' ? ' active' : '') + '" onclick="changeTaskStatus(' + taskIdx + ',\'待开始\')">待开始</button>' +
            '<button class="tc2-status-btn status-progress-btn' + (r.status === '进行中' ? ' active' : '') + '" onclick="changeTaskStatus(' + taskIdx + ',\'进行中\')">进行中</button>' +
            '<button class="tc2-status-btn status-done-btn' + (r.status === '已完成' ? ' active' : '') + '" onclick="changeTaskStatus(' + taskIdx + ',\'已完成\')">已完成</button>' +
            '</div></div></div>';
            if (stageHtml) {
                const marker = '</p><div class="tc2-footer">';
                const position = html.lastIndexOf(marker);
                if (position >= 0) html = html.slice(0, position + 4) + stageHtml + html.slice(position + 4);
            }
        });
        html += '</div></section>';
    });

    container.querySelectorAll('.task-section').forEach(s => s.remove());
    container.insertAdjacentHTML('beforeend', html);
}

// ========== 任务模式切换 ==========
async function switchTaskMode(mode) {
    const readMode = document.getElementById('taskReadMode');
    const editMode = document.getElementById('taskEditMode');
    const editTitleArea = document.querySelector('.edit-title-area');

    if (mode === 'read') {
        saveTableData();
    }

    if (readMode) {
        const readBtns = readMode.querySelectorAll('.mode-btn');
        readBtns.forEach(btn => btn.classList.remove('active'));
    }
    if (editMode) {
        const editBtns = editMode.querySelectorAll('.mode-btn');
        editBtns.forEach(btn => btn.classList.remove('active'));
    }

    if (mode === 'read') {
        if (readMode) readMode.classList.add('active');
        if (editMode) editMode.classList.remove('active');
        if (readMode) {
            const readBtns = readMode.querySelectorAll('.mode-btn');
            if (readBtns[0]) readBtns[0].classList.add('active');
        }
        if (editTitleArea) editTitleArea.style.display = 'none';
    } else {
        const rows = await loadTableData();
        renderTaskTable(rows || []);
        if (readMode) readMode.classList.remove('active');
        if (editMode) editMode.classList.add('active');
        if (editMode) {
            const editBtns = editMode.querySelectorAll('.mode-btn');
            if (editBtns[1]) editBtns[1].classList.add('active');
        }
        if (editTitleArea) editTitleArea.style.display = '';
    }

    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
}

// ========== 行选择（radio） ==========
function selectTaskRow(tr) {
    const tbody = tr.closest('tbody');
    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
    tr.classList.add('selected');
    const radio = tr.querySelector('.row-radio');
    if (radio) radio.checked = true;
}

// ========== 删除选中行 ==========
async function deleteSelectedRow() {
    const tbody = document.getElementById('taskTableBody');
    if (!tbody) return;
    const selected = tbody.querySelector('tr.selected');
    if (!selected) {
        showError('请先选中一条任务');
        return;
    }
    if (await showConfirm('确定删除选中的任务？')) {
        selected.remove();
        const count = tbody.querySelectorAll('tr').length;
        const footer = document.querySelector('#taskEditMode .table-footer');
        if (footer) footer.textContent = '共 ' + count + ' 条任务';
        saveTableData();
    }
}

// ========== 重新编辑：将选中行数据填入AI解析预览 ==========
function reEditSelectedRow() {
    const tbody = document.getElementById('taskTableBody');
    if (!tbody) return;
    const selected = tbody.querySelector('tr.selected');
    if (!selected) {
        showError('请先选中一条任务');
        return;
    }
    const d = selected.dataset;
    document.getElementById('previewName').value = d.taskName || '';
    document.getElementById('previewProject').value = d.taskProject || '';
    document.getElementById('previewSub').value = d.taskSub || '';
    document.getElementById('previewDetail').value = d.taskDetail || '';
    document.getElementById('previewDeadline').value = '';

    const levelEl = document.getElementById('previewLevel');
    if (levelEl) levelEl.value = d.taskCategory || '项目';

    const statusEl = document.getElementById('previewStatus');
    if (statusEl) statusEl.value = d.taskStatus || '待开始';

    const currentStageEl = document.getElementById('previewCurrentStage');
    if (currentStageEl) currentStageEl.value = d.taskCurrentStage || '';

    const nextStageEl = document.getElementById('previewNextStage');
    if (nextStageEl) nextStageEl.value = d.taskNextStage || '';

    const plannedDateEl = document.getElementById('previewPlannedDate');
    if (plannedDateEl) plannedDateEl.value = d.taskPlannedDate || '';

    const preview = document.querySelector('.ai-preview');
    if (preview) preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ========== 提交AI解析预览内容到任务列表 ==========
function submitEditedTask() {
    const name = document.getElementById('previewName').value.trim();
    if (!name) {
        showError('请填写任务名称');
        return;
    }

    const level = document.getElementById('previewLevel').value;
    const project = document.getElementById('previewProject').value.trim();
    const sub = document.getElementById('previewSub').value.trim();
    const detail = document.getElementById('previewDetail').value.trim();
    const status = document.getElementById('previewStatus').value;
    const deadline = document.getElementById('previewDeadline').value;
    const currentStage = document.getElementById('previewCurrentStage')?.value?.trim() || '';
    const nextStage = document.getElementById('previewNextStage')?.value?.trim() || '';
    const plannedDate = document.getElementById('previewPlannedDate')?.value || '';

    const tbody = document.getElementById('taskTableBody');
    if (!tbody) return;

    const selected = tbody.querySelector('tr.selected');

    let deadlineDisplay = deadline;
    if (deadline) {
        const parts = deadline.split('-');
        if (parts.length === 3) {
            deadlineDisplay = parts[0] + '/' + parts[1] + '/' + parts[2];
        }
    }

    if (selected) {
        // 更新选中行
        const priority = selected.dataset.taskPriority || '中';
        selected.dataset.taskName = name;
        selected.dataset.taskPriority = priority;
        selected.dataset.taskCategory = level;
        selected.dataset.taskProject = project;
        selected.dataset.taskSub = sub;
        selected.dataset.taskDetail = detail;
        selected.dataset.taskDeadline = deadlineDisplay;
        selected.dataset.taskStatus = status;
        selected.dataset.taskCurrentStage = currentStage;
        selected.dataset.taskNextStage = nextStage;
        selected.dataset.taskPlannedDate = plannedDate;

        const cells = selected.querySelectorAll('td');
        cells[1].textContent = name;
        cells[2].textContent = priority;
        cells[3].textContent = level;
        cells[4].textContent = project;
        cells[5].textContent = sub;
        cells[6].textContent = detail;
        cells[7].textContent = deadlineDisplay;
    } else {
        // 新增行（radio，与现有行一致），使用用户选择的优先级
        const priorityEl = document.getElementById('previewPriority');
        const priority = priorityEl ? priorityEl.value : '中';
        const tr = document.createElement('tr');
        tr.onclick = function() { selectTaskRow(this); };
        tr.dataset.taskName = name;
        tr.dataset.taskPriority = priority;
        tr.dataset.taskCategory = level;
        tr.dataset.taskProject = project;
        tr.dataset.taskSub = sub;
        tr.dataset.taskDetail = detail;
        tr.dataset.taskDeadline = deadlineDisplay;
        tr.dataset.taskStatus = status;
        tr.dataset.taskCurrentStage = currentStage;
        tr.dataset.taskNextStage = nextStage;
        tr.dataset.taskPlannedDate = plannedDate;
        tr.innerHTML =
            '<td><input type="radio" name="taskRadio" class="row-radio"></td>' +
            '<td>' + name + '</td>' +
            '<td>' + priority + '</td>' +
            '<td>' + level + '</td>' +
            '<td>' + project + '</td>' +
            '<td>' + sub + '</td>' +
            '<td>' + detail + '</td>' +
            '<td>' + deadlineDisplay + '</td>';
        tbody.appendChild(tr);
    }

    const count = tbody.querySelectorAll('tr').length;
    const footer = document.querySelector('#taskEditMode .table-footer');
    if (footer) footer.textContent = '共 ' + count + ' 条任务';

    saveTableData();
    clearPreview();
    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
}

// ========== AI 任务解析（调用 Agent API） ==========
async function parseTaskDescription() {
    const textarea = document.querySelector('.ai-textarea');
    if (!textarea) return;
    const description = textarea.value.trim();
    if (!description) {
        showError('请先输入任务描述');
        return;
    }

    const button = document.getElementById('taskParseButton');
    if (button) {
        button.disabled = true;
        button.innerHTML = '<span>⏳</span> 解析中...';
    }

    try {
        // 构建解析 prompt
        const messages = [
            { role: 'system', content: '你是一个任务解析助手。根据用户的任务描述，提取并返回JSON格式的任务信息。只返回JSON，不要其他内容。' },
            { role: 'user', content: `请从以下任务描述中提取信息，返回JSON格式：\n\n${description}\n\nJSON格式要求：\n{\n  "name": "任务名称（简洁）",\n  "level": "栏目（项目/报告/文献/SOP/软件/写作）",\n  "project": "分类/项目名",\n  "sub": "小类",\n  "detail": "详情描述",\n  "status": "状态（待开始/进行中/已完成/暂停）",\n  "priority": "优先级（高/中/低）",\n  "deadline": "截止日期（YYYY-MM-DD格式，如果描述中没有明确日期则不填）"\n}` }
        ];

        const response = await fetch('/api/agent/agent-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scene: 'fast', messages })
        });

        const data = await response.json();

        if (data.success && data.content) {
            // 尝试解析 JSON
            let parsed;
            try {
                const fenced = data.content.match(/```(?:json)?\s*([\s\S]*?)```/i);
                const candidate = fenced ? fenced[1].trim() : data.content.trim();
                const firstBrace = candidate.indexOf('{');
                const lastBrace = candidate.lastIndexOf('}');
                if (firstBrace < 0 || lastBrace <= firstBrace) throw new Error('回复中没有 JSON 对象');
                parsed = JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
            } catch {
                // 如果不是标准JSON，尝试简单提取
                parsed = {
                    name: description.slice(0, 30) + (description.length > 30 ? '...' : ''),
                    detail: description,
                    priority: '中',
                    status: '待开始',
                    level: '项目'
                };
            }

            // 填入预览表单
            if (parsed.name) document.getElementById('previewName').value = parsed.name;
            if (parsed.level) {
                const levelEl = document.getElementById('previewLevel');
                if (levelEl) {
                    for (const opt of levelEl.options) {
                        if (opt.value === parsed.level) { levelEl.value = parsed.level; break; }
                    }
                    levelEl.dispatchEvent(new Event('change'));
                }
            }
            if (parsed.project) document.getElementById('previewProject').value = parsed.project;
            if (parsed.sub) document.getElementById('previewSub').value = parsed.sub;
            if (parsed.detail) document.getElementById('previewDetail').value = parsed.detail;
            if (parsed.status) {
                const statusEl = document.getElementById('previewStatus');
                if (statusEl) statusEl.value = parsed.status;
            }
            if (parsed.priority) {
                const priorityEl = document.getElementById('previewPriority');
                if (priorityEl) priorityEl.value = parsed.priority;
            }
            if (parsed.deadline) document.getElementById('previewDeadline').value = parsed.deadline;
            if (parsed.currentStage) {
                const csEl = document.getElementById('previewCurrentStage');
                if (csEl) csEl.value = parsed.currentStage;
            }
            if (parsed.nextStage) {
                const nsEl = document.getElementById('previewNextStage');
                if (nsEl) nsEl.value = parsed.nextStage;
            }
            if (parsed.plannedDate) {
                const pdEl = document.getElementById('previewPlannedDate');
                if (pdEl) pdEl.value = parsed.plannedDate;
            }

            // 触发联动更新
            if (parsed.project) onCategoryChange();

            showToast('AI 解析完成，请确认后提交', 'info');
        } else {
            showError(data.error || 'AI 解析失败，请稍后重试');
        }
    } catch (err) {
        console.error('AI 任务解析失败:', err);
        showError('AI 解析请求失败，请检查网络连接和模型配置');
    } finally {
        const button = document.getElementById('taskParseButton');
        if (button) {
            button.disabled = false;
            button.innerHTML = '<span>✨</span> AI 解析';
        }
    }
}

// ========== 清空AI解析预览 ==========
function clearPreview() {
    document.getElementById('previewName').value = '';
    document.getElementById('previewProject').value = '';
    document.getElementById('previewSub').value = '';
    document.getElementById('previewDetail').value = '';
    document.getElementById('previewDeadline').value = '';
    const levelEl = document.getElementById('previewLevel');
    if (levelEl) levelEl.selectedIndex = 0;
    const statusEl = document.getElementById('previewStatus');
    if (statusEl) statusEl.selectedIndex = 0;
    const csEl = document.getElementById('previewCurrentStage');
    if (csEl) csEl.value = '';
    const nsEl = document.getElementById('previewNextStage');
    if (nsEl) nsEl.value = '';
    const pdEl = document.getElementById('previewPlannedDate');
    if (pdEl) pdEl.value = '';
}

// ========== 三级联动：栏目 → 分类 → 小类（localStorage持久化） ==========
function getAllCategoryData() {
    try {
        return JSON.parse(localStorage.getItem('wiki_three_level_category') || '{}');
    } catch(e) { return {}; }
}

function saveAllCategoryData(data) {
    try {
        localStorage.setItem('wiki_three_level_category', JSON.stringify(data));
    } catch(e) {}
}

function getCategoriesByLevel(level) {
    const all = getAllCategoryData();
    return Object.keys(all[level] || {});
}

function getSubsByLevel(level, category) {
    const all = getAllCategoryData();
    return all[level] && all[level][category] ? all[level][category] : [];
}

function addThreeLevelOption(level, category, sub) {
    if (!level) return;
    const all = getAllCategoryData();
    if (!all[level]) all[level] = {};
    if (category && sub) {
        if (!all[level][category]) all[level][category] = [];
        if (!all[level][category].includes(sub)) {
            all[level][category].push(sub);
        }
    } else if (category && !sub) {
        if (!all[level][category]) all[level][category] = [];
    }
    saveAllCategoryData(all);
}

function onLevelChange() {
    const level = document.getElementById('previewLevel').value;
    const catInput = document.getElementById('previewProject');
    const subInput = document.getElementById('previewSub');
    const catDatalist = document.getElementById('previewCategoryList');
    const subDatalist = document.getElementById('previewSubList');

    if (catDatalist) {
        catDatalist.innerHTML = '';
        const categories = getCategoriesByLevel(level);
        categories.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt;
            catDatalist.appendChild(o);
        });
    }

    if (catInput) catInput.value = '';
    if (subInput) subInput.value = '';
    if (subDatalist) subDatalist.innerHTML = '';
}

function onCategoryChange() {
    const level = document.getElementById('previewLevel').value;
    const category = document.getElementById('previewProject').value.trim();
    const subInput = document.getElementById('previewSub');
    const subDatalist = document.getElementById('previewSubList');

    if (subDatalist) {
        subDatalist.innerHTML = '';
        if (category) {
            const subs = getSubsByLevel(level, category);
            subs.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                subDatalist.appendChild(o);
            });
        }
    }
    if (subInput) subInput.value = '';
}

// ========== 本地 data 目录集成 ==========
const categoryDirectoryMap = {
    task: '任务',
    project: '项目',
    literature: '文献',
    report: '报告',
    sop: 'SOP',
    software: '软件',
    writing: '写作',
    doc: '项目'  // doc 兜底指向项目目录，防止导航到 doc 页面时路径出错
};

const overviewCategoryConfig = {
    project: {
        title: '项目总览',
        sectionTitle: '最近打开的项目',
        description: '在这里，你可以浏览本地知识库中的所有项目，查看项目结构，快速进入文档，并创建新的文件或文件夹。'
    },
    literature: {
        title: '文献总览',
        sectionTitle: '最近打开的文献',
        description: '在这里，你可以浏览文献目录，整理阅读主题，快速进入笔记，并创建新的文件或文件夹。'
    },
    report: {
        title: '报告总览',
        sectionTitle: '最近打开的报告',
        description: '在这里，你可以浏览报告目录，查看归档结构，快速进入内容，并创建新的文件或文件夹。'
    },
    sop: {
        title: 'SOP 总览',
        sectionTitle: '最近打开的 SOP',
        description: '在这里，你可以浏览 SOP 目录，管理操作规范，快速进入文档，并创建新的文件或文件夹。'
    },
    software: {
        title: '软件总览',
        sectionTitle: '最近打开的软件资料',
        description: '在这里，你可以浏览软件资料目录，整理工具说明，快速进入文档，并创建新的文件或文件夹。'
    },
    writing: {
        title: '写作总览',
        sectionTitle: '最近打开的写作目录',
        description: '在这里，你可以浏览写作目录，管理稿件结构，快速进入内容，并创建新的文件或文件夹。'
    }
};

let knowledgeTree = null;
let currentCategory = 'project';
let currentDocModifiedAt = null;
let currentDocDirty = false;
let editorSourceMode = false;

const turndownService = typeof TurndownService !== 'undefined'
    ? new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' })
    : null;

if (turndownService && typeof turndownPluginGfm !== 'undefined') {
    turndownService.use(turndownPluginGfm.gfm);
    turndownService.addRule('localKnowledgeImage', {
        filter: node => node.nodeName === 'IMG' && node.hasAttribute('data-markdown-src'),
        replacement: (content, node) => '![' + (node.getAttribute('alt') || '') + '](' + node.getAttribute('data-markdown-src') + ')'
    });
}

function normalizeKnowledgePath(baseDirectory, relativePath) {
    const parts = (baseDirectory + '/' + relativePath).replaceAll('\\', '/').split('/');
    const normalized = [];
    parts.forEach(part => {
        if (!part || part === '.') return;
        if (part === '..') normalized.pop();
        else normalized.push(part);
    });
    return normalized.join('/');
}

function markdownToSafeHtml(markdown) {
    if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
        return '<pre>' + escapeHtml(markdown) + '</pre>';
    }
    const parsed = DOMPurify.sanitize(marked.parse(markdown || ''), { ADD_ATTR: ['data-markdown-src'] });
    const template = document.createElement('template');
    template.innerHTML = parsed;
    const baseDirectory = currentDocFile ? currentDocFile.split('/').slice(0, -1).join('/') : '';
    template.content.querySelectorAll('img').forEach(image => {
        const source = image.getAttribute('src') || '';
        if (!source || /^(?:https?:|data:|\/api\/asset)/i.test(source)) return;
        const fullPath = normalizeKnowledgePath(baseDirectory, source);
        image.setAttribute('data-markdown-src', source);
        image.setAttribute('src', '/api/asset?path=' + encodeURIComponent(fullPath));
    });
    return template.innerHTML;
}

renderMarkdownContent = function(markdown) {
    const body = document.getElementById('docMarkdownBody');
    if (!body) return;
    body.innerHTML = markdownToSafeHtml(markdown);
    body.querySelectorAll('h1, h2, h3').forEach((heading, index) => { heading.id = 'heading-' + index; });
    updateToc();
};

function syncRichEditorFromMarkdown(markdown) {
    const richEditor = document.getElementById('richEditor');
    if (richEditor) richEditor.innerHTML = markdownToSafeHtml(markdown);
}

function getEditorMarkdown() {
    const textarea = document.getElementById('editorTextarea');
    if (editorSourceMode || !turndownService) return textarea?.value || '';
    const richEditor = document.getElementById('richEditor');
    const markdown = turndownService.turndown(richEditor?.innerHTML || '');
    return markdown ? markdown.replace(/^[\t ]+$/gm, '').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n' : '';
}

function updateRichEditorCount() {
    const count = getEditorMarkdown().length;
    const charCount = document.getElementById('editorCharCount');
    if (charCount) charCount.textContent = count.toLocaleString() + ' 个字符';
}

function markRichDocumentDirty() {
    currentDocDirty = true;
    setSaveStatus('未保存', false);
    updateRichEditorCount();
}

function setEditorFontColor(color) {
    if (editorSourceMode) return; // 源码模式不支持颜色
    const editor = document.getElementById('richEditor');
    editor?.focus();
    if (color === 'inherit') {
        document.execCommand('removeFormat', false, null);
    } else {
        document.execCommand('foreColor', false, color);
    }
    // 更新色板指示器
    const swatch = document.getElementById('editorColorSwatch');
    if (swatch) swatch.style.background = color === 'inherit' ? 'transparent' : color;
    markRichDocumentDirty();
}

// ★ 紧凑色板开关
function toggleColorPalette(event) {
    event.stopPropagation();
    const palette = document.getElementById('editorColorPalette');
    if (!palette) return;
    const isOpen = palette.style.display !== 'none';
    if (isOpen) {
        closeColorPalette();
    } else {
        palette.style.display = 'block';
        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', closeColorPalette, { once: true });
        }, 0);
    }
}

function closeColorPalette() {
    const palette = document.getElementById('editorColorPalette');
    if (palette) palette.style.display = 'none';
}

function richEditorCommand(command) {
    const target = editorSourceMode ? document.getElementById('editorTextarea') : document.getElementById('richEditor');
    target?.focus();
    document.execCommand(command, false, null);
    if (!editorSourceMode) markRichDocumentDirty();
}

function setEditorBlockStyle(block) {
    if (editorSourceMode) {
        const textarea = document.getElementById('editorTextarea');
        if (!textarea) return;
        const lineStart = textarea.value.lastIndexOf('\n', Math.max(0, textarea.selectionStart - 1)) + 1;
        const nextBreak = textarea.value.indexOf('\n', textarea.selectionEnd);
        const lineEnd = nextBreak === -1 ? textarea.value.length : nextBreak;
        const selectedLines = textarea.value.slice(lineStart, lineEnd).replace(/^#{1,6}\s+/gm, '');
        const prefix = block === 'h1' ? '# ' : block === 'h2' ? '## ' : block === 'h3' ? '### ' : '';
        textarea.setSelectionRange(lineStart, lineEnd);
        textarea.setRangeText(selectedLines.split('\n').map(line => prefix + line).join('\n'), lineStart, lineEnd, 'select');
        markDocumentDirty();
        return;
    }
    document.getElementById('richEditor')?.focus();
    document.execCommand('formatBlock', false, block);
    markRichDocumentDirty();
}

function insertHtmlAtEditorCursor(html) {
    const editor = document.getElementById('richEditor');
    editor?.focus();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !editor?.contains(selection.anchorNode)) {
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
    }
    document.execCommand('insertHTML', false, html);
    markRichDocumentDirty();
}

function insertBlockAtEditorCursor(html) {
    const editor = document.getElementById('richEditor');
    editor?.focus();
    const selection = window.getSelection();
    if (selection && selection.rangeCount && editor?.contains(selection.anchorNode)) {
        const anchor = selection.anchorNode.nodeType === Node.ELEMENT_NODE ? selection.anchorNode : selection.anchorNode.parentElement;
        const block = anchor?.closest('h1,h2,h3,h4,h5,h6,p,li,blockquote,table,pre');
        if (block && editor.contains(block)) {
            const range = document.createRange();
            range.setStartAfter(block);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
    insertHtmlAtEditorCursor(html);
}

function insertTextAtSourceCursor(text) {
    const textarea = document.getElementById('editorTextarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    textarea.setRangeText(text, start, textarea.selectionEnd, 'end');
    textarea.focus();
    markDocumentDirty();
}

function insertEditorTable() {
    if (editorSourceMode) {
        insertTextAtSourceCursor('| 列 1 | 列 2 | 列 3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n| 内容 | 内容 | 内容 |\n');
        return;
    }
    insertBlockAtEditorCursor('<table><thead><tr><th>列 1</th><th>列 2</th><th>列 3</th></tr></thead><tbody><tr><td>内容</td><td>内容</td><td>内容</td></tr><tr><td>内容</td><td>内容</td><td>内容</td></tr></tbody></table><p><br></p>');
}

async function insertEditorLink() {
    const url = await showPrompt('请输入链接地址：', '插入链接', 'https://');
    if (!url) return;
    if (editorSourceMode) {
        insertTextAtSourceCursor('[链接文字](' + url + ')');
        return;
    }
    const selection = window.getSelection();
    const text = selection?.toString() || url;
    document.execCommand('createLink', false, url);
    if (!selection?.toString()) insertHtmlAtEditorCursor('<a href="' + escapeHtml(url) + '">' + escapeHtml(text) + '</a>');
    else markRichDocumentDirty();
}

function chooseEditorImage() {
    if (!currentDocFile) return showError('请先打开一个 Markdown 文件');
    document.getElementById('editorImageInput')?.click();
}

async function uploadEditorImage(file) {
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) return showError('图片不能超过 6MB');
    const extension = (file.name.split('.').pop() || '').toLowerCase();
    if (!['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) return showError('不支持该图片格式');
    const safeBaseName = file.name.slice(0, -(extension.length + 1)).replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]+/g, '-').replace(/^-|-$/g, '') || 'image';
    const fileName = safeBaseName + '-' + Date.now() + '.' + extension;
    const documentDirectory = currentDocFile.split('/').slice(0, -1).join('/');
    const assetPath = documentDirectory + '/assets/' + fileName;
    const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('读取图片失败'));
        reader.readAsDataURL(file);
    });
    try {
        await apiRequest('/api/asset', { method: 'POST', body: JSON.stringify({ path: assetPath, data }) });
        const markdownPath = 'assets/' + fileName;
        if (editorSourceMode) insertTextAtSourceCursor('![' + file.name + '](' + markdownPath + ')');
        else insertBlockAtEditorCursor('<img src="/api/asset?path=' + encodeURIComponent(assetPath) + '" data-markdown-src="' + escapeHtml(markdownPath) + '" alt="' + escapeHtml(file.name) + '"><p><br></p>');
        await loadKnowledgeTree();
        renderDocTree();
    } catch (error) {
        showError(error.message);
    }
}

function toggleEditorSourceMode() {
    const body = document.querySelector('.doc-editor-body');
    const textarea = document.getElementById('editorTextarea');
    const toggle = document.getElementById('editorSourceToggle');
    const label = document.getElementById('editorFormatLabel');
    if (!editorSourceMode) {
        textarea.value = getEditorMarkdown();
        editorSourceMode = true;
        body?.classList.add('source-mode');
        toggle?.classList.add('active');
        if (toggle) toggle.textContent = '所见即所得';
        if (label) label.textContent = 'Markdown 源码';
        editorUpdateLineNumbers();
        textarea?.focus();
    } else {
        syncRichEditorFromMarkdown(textarea?.value || '');
        editorSourceMode = false;
        body?.classList.remove('source-mode');
        toggle?.classList.remove('active');
        if (toggle) toggle.textContent = 'Markdown 源码';
        if (label) label.textContent = '所见即所得 · Markdown';
        document.getElementById('richEditor')?.focus();
        updateRichEditorCount();
    }
}

// ★ 带未保存检查的 openKnowledgeFile（所有文件导航入口）
async function guardedOpenKnowledgeFile(relativePath) {
    if (currentDocDirty && currentDocFile) {
        try {
            showToast('正在自动保存...', 'info');
            await saveCurrentDocument();
        } catch (err) {
            showError('保存失败，请手动保存后重试: ' + (err.message || '未知错误'));
            setSaveStatus('保存失败', false);
            return; // ★ 保存失败阻止切换
        }
    }
    return openKnowledgeFile(relativePath);
}

// ★ 新建文件后将光标定位到正文（标题分隔线之后）
function focusEditorBody() {
    // 切换到编辑模式
    if (currentDocMode !== 'edit') switchDocMode('edit');
    // 富文本编辑器：将光标放到末尾（标题下方）
    const richEditor = document.getElementById('richEditor');
    if (richEditor) {
        richEditor.focus();
        const range = document.createRange();
        range.selectNodeContents(richEditor);
        range.collapse(false); // 折叠到末尾
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
    // 源码模式：光标移到第一行标题之后
    const textarea = document.getElementById('editorTextarea');
    if (textarea && editorSourceMode) {
        const firstLineEnd = textarea.value.indexOf('\n');
        if (firstLineEnd >= 0) {
            // 跳过标题行和空行，定位到正文
            const bodyStart = textarea.value.indexOf('\n', textarea.value.indexOf('\n', firstLineEnd + 1) + 1);
            textarea.setSelectionRange(bodyStart >= 0 ? bodyStart + 1 : firstLineEnd + 1, bodyStart >= 0 ? bodyStart + 1 : firstLineEnd + 1);
        }
        textarea.focus();
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

async function apiRequest(url, options = {}) {
    if (window.location.protocol === 'file:') {
        throw new Error('请通过 npm start 启动知识库，再访问 http://127.0.0.1:4173');
    }
    const response = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(result.error || '本地文件操作失败');
        error.status = response.status;
        throw error;
    }
    return result;
}

async function loadKnowledgeTree() {
    knowledgeTree = await apiRequest('/api/tree');
    return knowledgeTree;
}

function getCategoryNode(tab = currentCategory) {
    const directoryName = categoryDirectoryMap[tab];
    return knowledgeTree?.children?.find(node => node.type === 'directory' && node.name === directoryName) || null;
}

function findTreeNode(relativePath, nodes = knowledgeTree?.children || []) {
    for (const node of nodes) {
        if (node.path === relativePath) return node;
        if (node.children) {
            const found = findTreeNode(relativePath, node.children);
            if (found) return found;
        }
    }
    return null;
}

function countMarkdownFiles(node) {
    if (!node) return 0;
    if (node.type === 'file') return node.name.toLowerCase().endsWith('.md') ? 1 : 0;
    return (node.children || []).reduce((total, child) => total + countMarkdownFiles(child), 0);
}

function renderKnowledgeNodes(nodes, depth = 0) {
    return (nodes || []).map(node => {
        if (node.type === 'directory') {
            const open = depth === 0 ? ' open' : '';
            return '<div class="tree-folder">' +
                '<div class="tree-folder-header" style="padding-left:' + (16 + depth * 18) + 'px" onclick="docToggleFolder(this)"' +
                ' draggable="true" data-drag-path="' + escapeHtml(node.path) + '" data-drag-type="directory">' +
                '<span class="tree-folder-name">' + escapeHtml(node.name) + '</span>' +
                '<span class="tree-folder-arrow' + open + '">▶</span></div>' +
                '<div class="tree-folder-children' + open + '">' + renderKnowledgeNodes(node.children, depth + 1) + '</div></div>';
        }
        if (!node.name.toLowerCase().endsWith('.md')) return '';
        const active = currentDocFile === node.path ? ' active' : '';
        const displayName = node.name.replace(/\.md$/i, '');
        return '<div class="tree-file' + active + '" style="padding-left:' + (34 + depth * 18) + 'px"' +
            ' data-file-path="' + escapeHtml(node.path) + '"' +
            ' draggable="true" data-drag-path="' + escapeHtml(node.path) + '" data-drag-type="file">' +
            '<span class="tree-file-name">' + escapeHtml(displayName) + '</span></div>';
    }).join('');
}

renderDocTree = function() {
    const container = document.getElementById('docTree');
    if (!container) return;
    const category = getCategoryNode();
    const overviewConfig = overviewCategoryConfig[currentCategory];
    document.getElementById('docSidebar')?.classList.toggle('project-context', Boolean(overviewConfig));
    if (overviewConfig && category) {
        container.innerHTML = '<button class="project-overview-link" type="button" data-overview-tab="' + escapeHtml(currentCategory) + '">' +
            '<span>' + escapeHtml(overviewConfig.title) + '</span></button>' + renderProjectTreeNodes(category.children);
        container.querySelector('[data-overview-tab]')?.addEventListener('click', () => { handleTabSwitch(currentCategory); });
    } else {
        container.innerHTML = category ? renderKnowledgeNodes(category.children) : '<div class="tree-empty">该栏目暂无内容</div>';
    }
    // 点击打开文件
    container.querySelectorAll('[data-file-path]').forEach(element => {
        element.addEventListener('click', event => {
            event.stopPropagation();
            guardedOpenKnowledgeFile(element.dataset.filePath);
        });
    });
    // 拖拽事件
    container.querySelectorAll('[data-drag-path]').forEach(element => {
        element.addEventListener('dragstart', handleTreeDragStart);
        element.addEventListener('dragend', handleTreeDragEnd);
        element.addEventListener('dragover', handleTreeDragOver);
        element.addEventListener('drop', handleTreeDrop);
    });
    // container 本身也接受 drop（作为根目录）
    container.addEventListener('dragover', handleTreeDragOver);
    container.addEventListener('drop', function(e) {
        // 如果 drop 在 container 直接区域（非子节点），移动到根目录
        const target = e.target.closest('[data-drag-path]');
        if (!target && dndSourcePath) {
            e.preventDefault();
            handleTreeDropOnRoot(e);
        }
    });
};

async function openKnowledgeFile(relativePath) {
    // 修复 .md.md 双后缀问题
    let cleanPath = relativePath;
    if (cleanPath.toLowerCase().endsWith('.md.md')) {
        cleanPath = cleanPath.replace(/\.md$/i, '');
    }
    try {
        if (!knowledgeTree) await loadKnowledgeTree();
        const file = await apiRequest('/api/file?path=' + encodeURIComponent(cleanPath));
        currentDocFile = file.path;
        const rootDirectory = file.path.split('/')[0];
        const matchingCategory = Object.entries(categoryDirectoryMap)
            .find(([, directory]) => directory === rootDirectory)?.[0];
        if (matchingCategory) currentCategory = matchingCategory;
        currentDocModifiedAt = file.modifiedAt;
        currentDocDirty = false;
        rememberRecentEntry({ type: 'file', path: file.path, name: file.path.split('/').pop() });

        const parts = file.path.split('/');
        const breadcrumb = document.getElementById('docBreadcrumb');
        if (breadcrumb) {
            breadcrumb.innerHTML = parts.map((part, index) => {
                const cls = index === parts.length - 1 ? ' class="doc-breadcrumb-current"' : '';
                return (index ? '<span class="doc-breadcrumb-sep">/</span>' : '') + '<span' + cls + '>' + escapeHtml(part) + '</span>';
            }).join('');
        }

        const textarea = document.getElementById('editorTextarea');
        if (textarea) textarea.value = file.content;
        editorSourceMode = false;
        document.querySelector('.doc-editor-body')?.classList.remove('source-mode');
        document.getElementById('editorSourceToggle')?.classList.remove('active');
        const sourceToggle = document.getElementById('editorSourceToggle');
        if (sourceToggle) sourceToggle.textContent = 'Markdown 源码';
        const formatLabel = document.getElementById('editorFormatLabel');
        if (formatLabel) formatLabel.textContent = '所见即所得 · Markdown';
        syncRichEditorFromMarkdown(file.content);
        renderMarkdownContent(file.content);
        editorUpdateLineNumbers();
        setSaveStatus('已保存', true);
        renderDocTree();
        updateDocNavFooter();
    } catch (error) {
        showError(error.message);
    }
}

docOpenFile = function(category, folderPath, fileName) {
    const directory = categoryDirectoryMap[category] || categoryDirectoryMap.project;
    const relativePath = [directory, folderPath, fileName].filter(Boolean).join('/');
    return openKnowledgeFile(relativePath);
};

function setSaveStatus(text, saved) {
    const status = document.getElementById('editorSaveStatus');
    const button = document.getElementById('docSaveButton');
    if (status) status.textContent = text;
    if (button) button.disabled = Boolean(saved);
}

function markDocumentDirty() {
    editorUpdateLineNumbers();
    currentDocDirty = true;
    setSaveStatus('未保存', false);
}

async function saveCurrentDocument() {
    if (!currentDocFile) return showError('请先打开一个 Markdown 文件');
    const textarea = document.getElementById('editorTextarea');
    const markdown = getEditorMarkdown();
    try {
        setSaveStatus('保存中...', true);
        const saved = await apiRequest('/api/file', {
            method: 'PUT',
            body: JSON.stringify({
                path: currentDocFile,
                content: markdown,
                expectedModifiedAt: currentDocModifiedAt
            })
        });
        currentDocModifiedAt = saved.modifiedAt;
        currentDocDirty = false;
        if (textarea) textarea.value = markdown;
        setSaveStatus('已保存', true);
        renderMarkdownContent(markdown);
        await loadKnowledgeTree();
    } catch (error) {
        setSaveStatus('保存失败', false);
        showError(error.message);
    }
}

function renderProjectTreeNodes(nodes, depth = 0) {
    return (nodes || []).map(node => {
        if (node.type === 'directory') {
            const rootClass = depth === 0 ? ' proj-tree-root' : '';
            const subClass = depth > 0 ? ' proj-tree-sub' : '';
            const open = depth === 0 ? ' open' : '';
            const left = depth === 0 ? 20 : 22 + (depth - 1) * 18;
            const arrow = '<svg class="proj-tree-arrow' + open + '" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
            const label = '<span class="proj-tree-name">' + escapeHtml(node.name) + '</span>';
            const header = '<div class="proj-tree-item' + rootClass + subClass + '" style="padding-left:' + left + 'px" onclick="projToggleFolder(this,event)">' +
                (depth === 0 ? label + arrow : arrow + label) + '</div>';
            const children = '<div class="proj-tree-children' + open + '">' + renderProjectTreeNodes(node.children, depth + 1) + '</div>';
            return depth === 0 ? '<div class="proj-tree-group">' + header + children + '</div>' : header + children;
        }
        if (!node.name.toLowerCase().endsWith('.md')) return '';
        const active = currentDocFile === node.path ? ' active' : '';
        return '<div class="proj-tree-file' + active + '" style="padding-left:' + (24 + depth * 18) + 'px" data-file-path="' + escapeHtml(node.path) + '">' + escapeHtml(node.name) + '</div>';
    }).join('');
}

renderProjectTree = function() {
    const container = document.getElementById('projectTree');
    if (!container) return;
    const category = getCategoryNode(currentCategory);
    const config = overviewCategoryConfig[currentCategory];
    container.innerHTML = '<button class="project-overview-link active" type="button" data-overview-tab="' + escapeHtml(currentCategory) + '">' +
        '<span>' + escapeHtml(config.title) + '</span></button>' +
        (category ? renderProjectTreeNodes(category.children) : '<div class="tree-empty">该栏目目录为空</div>');
    container.querySelector('[data-overview-tab]')?.addEventListener('click', () => { handleTabSwitch(currentCategory); });
    container.querySelectorAll('[data-file-path]').forEach(element => {
        element.addEventListener('click', event => {
            event.stopPropagation();
            document.getElementById('projectPage')?.classList.remove('active');
            document.getElementById('docPage')?.classList.add('active');
            renderDocTree();
            guardedOpenKnowledgeFile(element.dataset.filePath);
        });
    });
};

renderProjectCards = function() {
    const container = document.getElementById('projectCardGrid');
    if (!container) return;
    const categoryName = categoryDirectoryMap[currentCategory];
    const folders = getCategoryNode(currentCategory)?.children?.filter(node => node.type === 'directory') || [];
    container.innerHTML = folders.map(folder => {
        const meta = currentCategory === 'project' ? projectMetaData[folder.name] : null;
        const description = meta?.description || '本地' + categoryName + '知识与资料目录';
        return '<div class="project-card" data-project-path="' + escapeHtml(folder.path) + '"><h3>' + escapeHtml(folder.name) + '</h3><p>' +
            escapeHtml(description) + '</p><span class="project-file-count"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>' + countMarkdownFiles(folder) + ' 个文件</span></div>';
    }).join('');
    container.querySelectorAll('[data-project-path]').forEach(element => {
        element.addEventListener('click', () => openFirstProjectFile(element.dataset.projectPath));
    });
};

function findFirstMarkdown(node) {
    if (!node) return null;
    if (node.type === 'file' && node.name.toLowerCase().endsWith('.md')) return node;
    for (const child of node.children || []) {
        const found = findFirstMarkdown(child);
        if (found) return found;
    }
    return null;
}

async function openFirstProjectFile(projectPath) {
    const project = findTreeNode(projectPath);
    const firstFile = findFirstMarkdown(project);
    if (!firstFile) return showError('该项目中还没有 Markdown 文件');
    rememberRecentEntry({ type: currentCategory, path: project.path, name: project.name });
    document.getElementById('projectPage')?.classList.remove('active');
    document.getElementById('docPage')?.classList.add('active');
    renderDocTree();
    await guardedOpenKnowledgeFile(firstFile.path);
}

function getRecentEntries() {
    try {
        return JSON.parse(localStorage.getItem('wiki_recent_entries') || '[]');
    } catch (error) {
        return [];
    }
}

function rememberRecentEntry(entry) {
    const entries = getRecentEntries().filter(item => !(item.type === entry.type && item.path === entry.path));
    entries.unshift({ ...entry, openedAt: new Date().toISOString() });
    localStorage.setItem('wiki_recent_entries', JSON.stringify(entries.slice(0, 10)));
    if (document.getElementById('projectPage')?.classList.contains('active')) renderRecentOpenList();
}

function formatRecentTime(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    return sameDay ? '今天 ' + time : date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ' ' + time;
}

function renderRecentOpenList() {
    const container = document.getElementById('recentOpenList');
    if (!container) return;
    const entries = getRecentEntries().filter(entry => findTreeNode(entry.path));
    if (!entries.length) {
        container.innerHTML = '<div class="recent-empty">打开项目或文件后，将在这里显示最近记录</div>';
        return;
    }
    container.innerHTML = entries.slice(0, 6).map(entry => {
        const isProject = entry.type === 'project';
        const parentPath = entry.path.split('/').slice(0, -1).join(' / ');
        const icon = isProject
            ? '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>'
            : '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>';
        return '<div class="recent-item" data-recent-type="' + entry.type + '" data-recent-path="' + escapeHtml(entry.path) + '">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="1.8">' + icon + '</svg>' +
            '<span class="recent-name">' + escapeHtml(entry.name) + '</span><span class="recent-path">' + escapeHtml(parentPath) +
            '</span><time class="recent-time">' + escapeHtml(formatRecentTime(entry.openedAt)) + '</time></div>';
    }).join('');
    container.querySelectorAll('[data-recent-path]').forEach(element => {
        element.addEventListener('click', () => {
            if (element.dataset.recentType === 'project') openFirstProjectFile(element.dataset.recentPath);
            else {
                document.getElementById('projectPage')?.classList.remove('active');
                document.getElementById('docPage')?.classList.add('active');
                currentCategory = element.dataset.recentPath.startsWith('项目/') ? 'project' : currentCategory;
                renderDocTree();
                openKnowledgeFile(element.dataset.recentPath);
            }
        });
    });
}

function collectDirectories(node, output = []) {
    if (!node) return output;
    if (node.type === 'directory') {
        output.push(node);
        (node.children || []).forEach(child => collectDirectories(child, output));
    }
    return output;
}

showNewFileModal = function() {
    const select = document.getElementById('newFileLocation');
    const category = getCategoryNode(currentCategory);
    const categoryName = categoryDirectoryMap[currentCategory];
    if (select && category) {
        select.innerHTML = collectDirectories(category, []).map(node => '<option value="' + escapeHtml(node.path) + '">' + escapeHtml(node.path.replace(new RegExp('^' + categoryName + '/?'), '').replaceAll('/', ' / ') || categoryName) + '</option>').join('');
    }
    const label = document.getElementById('newFileLocationLabel');
    if (label) label.textContent = '所属' + categoryName + ' / 放置位置';
    document.getElementById('newFileModal').style.display = 'flex';
};

createNewFile = async function() {
    const location = document.getElementById('newFileLocation').value;
    let fileName = document.getElementById('newFileName').value.trim();
    if (!fileName) return showError('请输入文件名');
    if (!fileName.toLowerCase().endsWith('.md')) fileName += '.md';
    const title = fileName.replace(/\.md$/i, '');
    try {
        const relativePath = location + '/' + fileName;
        // ★ 统一内容格式：标题 + 两个空行（标题分隔线 + 正文区）
        await apiRequest('/api/file', { method: 'POST', body: JSON.stringify({ path: relativePath, content: '# ' + title + '\n\n\n' }) });
        closeNewFileModal();
        await loadKnowledgeTree();
        renderProjectTree();
        renderProjectCards();
        document.getElementById('projectPage')?.classList.remove('active');
        document.getElementById('docPage')?.classList.add('active');
        renderDocTree();
        await openKnowledgeFile(relativePath);
        focusEditorBody();
    } catch (error) {
        showError(error.message);
    }
};

showNewFolderModal = function() {
    const select = document.getElementById('newFolderProject');
    const category = getCategoryNode(currentCategory);
    const categoryName = categoryDirectoryMap[currentCategory];
    const directories = collectDirectories(category, []);
    if (select) select.innerHTML = directories.map(node => '<option value="' + escapeHtml(node.path) + '">' + escapeHtml(node.path.replaceAll('/', ' / ')) + '</option>').join('');
    const label = document.getElementById('newFolderProjectLabel');
    if (label) label.textContent = '所属' + categoryName;
    document.getElementById('newFolderModal').style.display = 'flex';
};

createNewFolder = async function() {
    const parentPath = document.getElementById('newFolderProject').value;
    const folderName = document.getElementById('newFolderName').value.trim();
    if (!folderName) return showError('请输入文件夹名称');
    try {
        await apiRequest('/api/folder', { method: 'POST', body: JSON.stringify({ path: parentPath + '/' + folderName }) });
        closeNewFolderModal();
        await loadKnowledgeTree();
        renderProjectTree();
        renderProjectCards();
    } catch (error) {
        showError(error.message);
    }
};

// ctxNewFile 已在上方统一为 API 版本

ctxNewFolder = async function() {
    const name = await showPrompt('请输入新文件夹名：', '新建文件夹');
    if (!name) return;
    const categoryRoot = categoryDirectoryMap[currentCategory];
    const parent = currentDocFile ? currentDocFile.split('/').slice(0, -1).join('/') : categoryRoot;
    try {
        await apiRequest('/api/folder', { method: 'POST', body: JSON.stringify({ path: parent + '/' + name }) });
        await loadKnowledgeTree();
        renderDocTree();
    } catch (error) { showError(error.message); }
};

// ========== 文件/文件夹复制 ==========
// ========== 文件复制 — 通过模态框选择目标 ==========
async function ctxCopy() {
    hideCtxMenu();
    if (!ctxTargetPath) return;
    fileTransferAction = 'copy';
    openFileTransferModal('复制：' + ctxTargetPath.split('/').pop());
}

// ========== 文件移动 — 通过模态框选择目标 ==========
async function ctxMove() {
    hideCtxMenu();
    if (!ctxTargetPath) return;
    fileTransferAction = 'move';
    openFileTransferModal('移动：' + ctxTargetPath.split('/').pop());
}

// ========== 文件传输模态框 ==========
let fileTransferAction = 'copy'; // 'copy' | 'move'

function openFileTransferModal(title) {
    const modal = document.getElementById('fileTransferModal');
    if (!modal) return;
    const titleEl = document.getElementById('fileTransferModalTitle');
    if (titleEl) titleEl.textContent = title || '选择目标位置';
    const hintEl = document.getElementById('fileTransferModalHint');
    if (hintEl) hintEl.textContent = fileTransferAction === 'copy'
        ? '选择目标栏目和目录，将在目标位置创建副本。'
        : '选择目标栏目和目录，将移动文件/文件夹到目标位置。';
    const statusEl = document.getElementById('fileTransferStatus');
    if (statusEl) statusEl.textContent = '';

    // 预设当前栏目
    const curCatDir = categoryDirectoryMap[currentCategory] || '项目';
    const catSelect = document.getElementById('fileTransferCategory');
    if (catSelect) {
        for (const opt of catSelect.options) {
            if (opt.value === curCatDir) { catSelect.value = curCatDir; break; }
        }
    }

    // 填充目标目录（从 knowledgeTree 动态生成）
    loadKnowledgeTree().then(() => {
        populateFileTransferDirs(curCatDir);
    }).catch(() => {});

    modal.style.display = 'flex';
}

function closeFileTransferModal() {
    document.getElementById('fileTransferModal').style.display = 'none';
    fileTransferAction = 'copy';
}

/**
 * 从 knowledgeTree 动态生成目标目录选项（递归列出所有子目录）
 */
function populateFileTransferDirs(categoryDirName) {
    const select = document.getElementById('fileTransferDir');
    if (!select) return;
    select.innerHTML = '<option value="">（根目录）</option>';

    const catNode = knowledgeTree?.children?.find(n => n.type === 'directory' && n.name === categoryDirName);
    if (!catNode) return;

    function collectDirs(node, prefix) {
        const dirs = [];
        (node.children || []).forEach(child => {
            if (child.type === 'directory') {
                dirs.push({ path: child.path, label: prefix + child.name });
                collectDirs(child, prefix + child.name + ' / ');
            }
        });
        return dirs;
    }

    const dirs = collectDirs(catNode, '');
    dirs.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.path;
        opt.textContent = d.label;
        select.appendChild(opt);
    });
}

function onFileTransferCategoryChange() {
    const catName = document.getElementById('fileTransferCategory').value;
    loadKnowledgeTree().then(() => {
        populateFileTransferDirs(catName);
    }).catch(() => {});
}

async function confirmFileTransfer() {
    if (!ctxTargetPath) return;

    const targetCat = document.getElementById('fileTransferCategory').value;
    const targetDir = document.getElementById('fileTransferDir').value;
    const statusEl = document.getElementById('fileTransferStatus');
    const fileName = ctxTargetPath.split('/').pop();

    // 构建新路径
    let newPath;
    if (targetDir) {
        newPath = targetDir + '/' + fileName;
    } else {
        newPath = targetCat + '/' + fileName;
    }

    // 验证
    if (fileTransferAction === 'move') {
        if (newPath === ctxTargetPath) {
            if (statusEl) statusEl.textContent = '目标路径与源路径相同';
            return;
        }
        if (newPath.startsWith(ctxTargetPath + '/')) {
            if (statusEl) statusEl.textContent = '不能将文件夹移动到自身子目录';
            return;
        }
    } else {
        if (newPath === ctxTargetPath) {
            if (statusEl) statusEl.textContent = '目标路径与源路径相同';
            return;
        }
    }

    if (statusEl) statusEl.textContent = fileTransferAction === 'copy' ? '正在复制...' : '正在移动...';
    const confirmBtn = document.getElementById('fileTransferConfirmBtn');
    if (confirmBtn) confirmBtn.disabled = true;

    try {
        if (fileTransferAction === 'copy') {
            await apiRequest('/api/entry/copy', {
                method: 'POST',
                body: JSON.stringify({ path: ctxTargetPath, newPath: newPath })
            });
            showToast('已复制: ' + fileName, 'info');
        } else {
            await apiRequest('/api/entry', {
                method: 'PATCH',
                body: JSON.stringify({ path: ctxTargetPath, newPath: newPath })
            });
            showToast('已移动: ' + fileName, 'info');
            if (currentDocFile === ctxTargetPath) currentDocFile = newPath;
        }
        closeFileTransferModal();
        await loadKnowledgeTree();
        renderDocTree();
    } catch (error) {
        if (statusEl) statusEl.textContent = error.message;
        if (confirmBtn) confirmBtn.disabled = false;
    }
}

// ========== 带未保存检查的标签切换 ==========
async function handleTabSwitch(tab) {
    const currentActive = document.querySelector('.nav-tab.active')?.dataset?.tab;
    if (tab === currentActive) return; // 已在当前 tab

    // ★ 统一 flush：有脏数据时先尝试保存，保存失败阻止切换
    if (currentDocDirty && currentDocFile && tab !== currentActive) {
        try {
            showToast('正在自动保存...', 'info');
            await saveCurrentDocument();
            showToast('已自动保存，正在切换页面', 'info');
        } catch (err) {
            // 保存失败 → 阻止切换，让用户手动处理
            showError('保存失败，请手动保存后重试: ' + (err.message || '未知错误'));
            setSaveStatus('保存失败', false);
            return;
        }
    }

    // 切换到任务/首页/设置时同步任务数据
    if (tab === 'task' || tab === 'home' || tab === 'settings') {
        saveTableData();
    }
    await switchTab(tab);
}

const prototypeSwitchTab = switchTab;
switchTab = async function(tab) {
    if (tab === 'home' || tab === 'task' || tab === 'settings') return prototypeSwitchTab(tab);
    try {
        if (!knowledgeTree) await loadKnowledgeTree();
    } catch (error) {
        showError(error.message);
        return prototypeSwitchTab('home');
    }

    document.querySelectorAll('.nav-tab').forEach(element => element.classList.toggle('active', element.dataset.tab === tab));
    document.querySelector('.home-page')?.classList.add('hidden');
    document.getElementById('taskPage')?.classList.remove('active');
    document.getElementById('projectPage')?.classList.remove('active');
    document.getElementById('docPage')?.classList.remove('active');
    const settingsPageEl = document.getElementById('settingsPage');
    if (settingsPageEl) settingsPageEl.classList.remove('active');
    currentCategory = tab;

    if (overviewCategoryConfig[tab]) {
        document.getElementById('projectPage')?.classList.add('active');
        const config = overviewCategoryConfig[tab];
        const title = document.getElementById('overviewTitle');
        const description = document.getElementById('overviewDescription');
        const sectionTitle = document.getElementById('overviewSectionTitle');
        if (title) title.textContent = config.title;
        if (description) description.textContent = config.description;
        if (sectionTitle) sectionTitle.textContent = config.sectionTitle;
        renderProjectTree();
        renderProjectCards();
    } else {
        document.getElementById('docPage')?.classList.add('active');
        renderDocTree();
    }
    window.scrollTo(0, 0);
};

// ========== 单个 DOMContentLoaded（合并） ==========
document.addEventListener('DOMContentLoaded', function() {
    // 初始化主题（localStorage 持久化）
    initTheme();

    // ★ 首次加载：优先从 API 加载，fallback localStorage
    (async function initTaskData() {
        let rows = await loadTableData();
        if (!rows || rows.length === 0) {
            // 如果 API 和 localStorage 都没有，尝试从 HTML 表格初始化
            const tbody = document.getElementById('taskTableBody');
            if (tbody && tbody.querySelectorAll('tr').length > 0) {
                saveTableData();
                rows = await loadTableData();
            }
        }
        // ★ 如果从 API 拿到旧 JSON 数据（任务缺少 id 字段），触发迁移
        if (taskDataCache && rows && rows.some(t => !t.id)) {
            try {
                const resp = await fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'migrate' })
                });
                const result = await resp.json();
                if (result.success) {
                    console.log('任务迁移完成:', result.message);
                    // 重新加载迁移后的数据
                    taskDataCache = null;
                    rows = await loadTableData();
                }
            } catch (e) {
                console.error('任务迁移失败:', e);
            }
        }
        renderTaskTable(rows || []);
        renderReadMode(rows);
        // 加载已完成任务
        const completed = await loadCompletedTasks();
        if (completed.length > 0) {
            localStorage.setItem('wiki_completed_tasks', JSON.stringify(completed));
        }
        renderCompletedTasks();
    })();

    // 标签点击事件
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            handleTabSwitch(this.dataset.tab);
        });
        // 让栏目标签页接受拖拽放置（项目/文献/报告/SOP/软件/写作）
        const tabName = tab.dataset.tab;
        if (tabName && tabName !== 'home' && tabName !== 'task' && tabName !== 'settings') {
            tab.addEventListener('dragover', function(e) {
                e.preventDefault();
                if (!dndSourcePath) return;
                e.dataTransfer.dropEffect = 'move';
                document.querySelectorAll('.nav-tab.drop-target').forEach(n => n.classList.remove('drop-target'));
                this.classList.add('drop-target');
            });
            tab.addEventListener('dragleave', function() {
                this.classList.remove('drop-target');
            });
            tab.addEventListener('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                this.classList.remove('drop-target');
                if (!dndSourcePath) return;
                const fileName = dndSourcePath.split('/').pop();
                const destDir = categoryDirectoryMap[tabName] || '';
                const newPath = destDir + '/' + fileName;
                if (newPath === dndSourcePath) { dndSourcePath = null; return; }
                apiRequest('/api/entry', {
                    method: 'PATCH',
                    body: JSON.stringify({ path: dndSourcePath, newPath: newPath })
                }).then(() => {
                    showToast('已移动到 ' + tab.textContent.trim() + ': ' + fileName, 'info');
                    if (currentDocFile === dndSourcePath) currentDocFile = newPath;
                    return loadKnowledgeTree();
                }).then(() => {
                    handleTabSwitch(tabName);
                }).catch(err => {
                    showError('移动失败: ' + err.message);
                }).finally(() => {
                    dndSourcePath = null;
                });
            });
        }
    });

    // 主题切换
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            toggleTheme();
        });
    }

    // ========== 搜索功能 ==========
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    if (searchInput) {
        // Enter 键搜索
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
            }
        });
        // 输入时实时搜索建议
        let searchTimer;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimer);
            const q = this.value.trim();
            if (!q) {
                if (searchResults) searchResults.style.display = 'none';
                return;
            }
            searchTimer = setTimeout(() => performSearch(q), 300);
        });
    }
    // 点击搜索图标
    const searchIcon = document.querySelector('.search-icon');
    if (searchIcon) {
        searchIcon.parentElement?.addEventListener('click', function(e) {
            if (e.target === searchIcon || searchIcon.contains(e.target)) {
                performSearch();
            }
        });
    }

    // ========== 自动保存（debounce + 定时双重机制） ==========
    let autoSaveTimer = null;
    let autoSavePending = false; // 防止并发保存

    // debounce 自动保存：编辑变脏后延迟保存
    function scheduleAutoSave() {
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        const interval = parseInt(localStorage.getItem('wiki_auto_save_interval') || '10');
        if (isNaN(interval) || interval < 5) return; // 最小 5 秒
        autoSaveTimer = setTimeout(() => {
            if (currentDocDirty && currentDocFile &&
                !autoSavePending) {
                autoSavePending = true;
                saveCurrentDocument().then(() => {
                    autoSavePending = false;
                }).catch(err => {
                    autoSavePending = false;
                    setSaveStatus('自动保存失败', false);
                    console.error('自动保存失败:', err);
                });
            }
        }, Math.min(interval * 1000, 30000)); // max 30s debounce
    }

    function saveAutoSaveInterval(val) {
        const interval = parseInt(val);
        if (!isNaN(interval) && interval >= 5) {
            localStorage.setItem('wiki_auto_save_interval', String(interval));
            showToast('自动保存间隔已更新', 'info');
        }
    }

    // ========== 软件更新 ==========
    async function checkForDocWikiUpdate(showToastFlag) {
        const url = localStorage.getItem('wiki_update_manifest_url') ||
                    document.getElementById('updateManifestUrl')?.value?.trim() ||
                    'https://github.com/lixinpeng027-coder/DocWiki/releases/latest/download/latest.json';
        if (!url) {
            if (showToastFlag) showToast('请先设置更新源地址', 'warning');
            return;
        }
        if (!window.isElectron) {
            if (showToastFlag) showToast('自动更新仅在桌面版支持', 'info');
            return;
        }
        const statusEl = document.getElementById('updateCheckStatus');
        const resultRow = document.getElementById('updateResultRow');
        const resultText = document.getElementById('updateResultText');
        try {
            if (statusEl) statusEl.textContent = '⏳ 正在检查...';
            const result = await window.electronAPI.checkUpdate(url);
            if (result.updateAvailable) {
                if (statusEl) statusEl.textContent = '';
                if (resultRow) resultRow.style.display = 'flex';
                if (resultText) resultText.innerHTML = '<span style="color:#22c55e;font-weight:600;">发现新版本 v' + escapeHtml(result.manifest.version) + '</span>' +
                    (result.manifest.notes ? '<br><span style="color:#94a3b8;">' + escapeHtml(result.manifest.notes) + '</span>' : '') +
                    ' <button class="btn btn-primary" style="margin-left:12px;padding:6px 16px;" onclick="installDocWikiUpdate()">下载并安装</button>';
                showToast('发现新版本 v' + result.manifest.version, 'info');
            } else {
                if (statusEl) statusEl.textContent = '✓ 已是最新版本';
                if (resultRow) resultRow.style.display = 'none';
                if (showToastFlag) showToast('已是最新版本', 'info');
            }
            localStorage.setItem('wiki_last_update_check', new Date().toISOString());
        } catch (e) {
            if (statusEl) statusEl.textContent = '检查失败';
            if (showToastFlag) showError('更新检查失败: ' + (e.message || '网络错误'));
        }
    }

    async function installDocWikiUpdate() {
        const url = localStorage.getItem('wiki_update_manifest_url') ||
                    document.getElementById('updateManifestUrl')?.value?.trim() ||
                    'https://github.com/lixinpeng027-coder/DocWiki/releases/latest/download/latest.json';
        if (!url || !window.isElectron) return;
        try {
            await window.electronAPI.installUpdate(url);
        } catch (e) {
            showError('安装更新失败: ' + (e.message || '未知错误'));
        }
    }

    function saveUpdateManifestUrl() {
        const url = document.getElementById('updateManifestUrl')?.value?.trim();
        if (!url) { showToast('请输入有效的 URL', 'warning'); return; }
        localStorage.setItem('wiki_update_manifest_url', url);
        showToast('更新源已保存', 'info');
    }

    function toggleAdvancedUpdateSettings() {
        const el = document.getElementById('advancedUpdateSettings');
        if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
    }

    function toggleAutoUpdateCheck(enabled) {
        localStorage.setItem('wiki_auto_update_check', enabled ? '1' : '0');
    }

    // 定时自动保存（兜底，较长间隔）
    function startAutoSave() {
        const interval = parseInt(localStorage.getItem('wiki_auto_save_interval') || '10');
        if (isNaN(interval) || interval < 5) return;
        // 使用较长的固定间隔作为兜底，debounce 负责响应式保存
        const pollInterval = Math.max(interval * 2, 30) * 1000;
        setInterval(() => {
            if (currentDocDirty && currentDocFile &&
                !autoSavePending) {
                autoSavePending = true;
                saveCurrentDocument().then(() => {
                    autoSavePending = false;
                }).catch(err => {
                    autoSavePending = false;
                    setSaveStatus('自动保存失败', false);
                    console.error('定时自动保存失败:', err);
                });
            }
        }, pollInterval);
    }
    startAutoSave();

    // ★ 编辑变脏时触发 debounce 自动保存
    const _origMarkDocumentDirty = markDocumentDirty;
    markDocumentDirty = function() {
        _origMarkDocumentDirty();
        scheduleAutoSave();
    };
    const _origMarkRichDocumentDirty = markRichDocumentDirty;
    markRichDocumentDirty = function() {
        _origMarkRichDocumentDirty();
        scheduleAutoSave();
    };

    // ========== 离开/关闭前拦截未保存内容 ==========
    let electronCloseConfirmed = false;
    window.addEventListener('beforeunload', function(e) {
        // ★ Electron 握手已确认关闭时，跳过 beforeunload 拦截
        if (electronCloseConfirmed) return;
        if (currentDocDirty && currentDocFile) {
            e.preventDefault();
            e.returnValue = '您有未保存的修改，确定要离开吗？';
            return e.returnValue;
        }
    });

    // ========== Electron 关闭握手 ==========
    if (window.isElectron && window.electronAPI?.onBeforeClose) {
        window.electronAPI.onBeforeClose(async () => {
            try {
                // 保存文档（如果有脏数据）
                if (currentDocDirty && currentDocFile) {
                    await saveCurrentDocument();
                }
                // 同步保存任务数据
                try { saveTableData(); } catch (e) { /* non-critical */ }
                // 同步任务到后端
                try { await syncTasksToServer(); } catch (e) { /* non-critical */ }
                // ★ 标记握手已确认，防止 beforeunload 二次拦截
                electronCloseConfirmed = true;
                console.log('[Renderer] ' + new Date().toISOString() + ' electronCloseConfirmed=true，发送 confirmClose');
                window.electronAPI.confirmClose();
            } catch (err) {
                console.error('关闭前保存失败:', err);
                showToast('保存失败，请手动保存后重试: ' + (err.message || '未知错误'), 'error');
                window.electronAPI.cancelClose('文档保存失败: ' + (err.message || '未知错误'));
            }
        });
    }

    // 初始化 Hero 对话状态
    initHeroChat();

    // 三级联动预设数据 — 初始为空，由用户使用过程中自动积累
    const defaults = {
        '项目': {},
        '报告': {},
        '文献': {},
        'SOP': {},
        '软件': {},
        '写作': {}
    };
    const all = getAllCategoryData();
    let changed = false;
    Object.keys(defaults).forEach(level => {
        if (!all[level]) {
            all[level] = defaults[level];
            changed = true;
        }
    });
    if (changed) saveAllCategoryData(all);

    // 绑定三级联动事件
    const levelEl = document.getElementById('previewLevel');
    const catEl = document.getElementById('previewProject');
    if (levelEl) levelEl.addEventListener('change', onLevelChange);
    if (catEl) catEl.addEventListener('input', onCategoryChange);

    // 初始化首页导航
    handleTabSwitch('home');

    setTimeout(() => { onLevelChange(); }, 100);
});

// ========== 主题管理 ==========
function initTheme() {
    const saved = localStorage.getItem('wiki_theme');
    if (saved === 'dark') {
        document.documentElement.classList.add('dark-theme');
        const toggle = document.getElementById('themeToggle');
        if (toggle) toggle.classList.add('dark');
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark-theme');
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        if (isDark) toggle.classList.add('dark');
        else toggle.classList.remove('dark');
    }
    localStorage.setItem('wiki_theme', isDark ? 'dark' : 'light');
}

// ========== 搜索功能 ==========
async function performSearch(queryOverride) {
    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');
    const q = queryOverride || (input ? input.value.trim() : '');

    if (!q) {
        if (results) results.style.display = 'none';
        return;
    }

    try {
        const resp = await fetch('/api/search?q=' + encodeURIComponent(q));
        const data = await resp.json();
        const items = data.results || [];

        if (results) {
            if (items.length === 0) {
                results.innerHTML = '<div class="search-result-empty">未找到匹配结果</div>';
            } else {
                results.innerHTML = items.map(item =>
                    '<div class="search-result-item" data-path="' + escapeHtml(item.path) + '">' +
                    '<span class="search-result-name">' + escapeHtml(item.name) + '</span>' +
                    '<span class="search-result-path">' + escapeHtml(item.path) + '</span>' +
                    (item.snippet ? '<span class="search-result-snippet">' + escapeHtml(item.snippet) + '</span>' : '') +
                    '</div>'
                ).join('');

                // 点击搜索结果打开文件
                results.querySelectorAll('.search-result-item').forEach(el => {
                    el.addEventListener('click', function() {
                        const path = this.dataset.path;
                        results.style.display = 'none';
                        if (input) input.value = '';
                        guardedOpenKnowledgeFile(path);
                    });
                });
            }
            results.style.display = 'block';
        }
    } catch (err) {
        console.error('搜索失败:', err);
        if (results) {
            results.innerHTML = '<div class="search-result-empty">搜索失败，请稍后重试</div>';
            results.style.display = 'block';
        }
    }
}

// ========== 在阅读模式中直接更改任务状态 ==========
async function changeTaskStatus(index, newStatus) {
    let rows;
    try { rows = JSON.parse(localStorage.getItem('wiki_task_data') || '[]'); } catch(e) { rows = []; }
    if (index < 0 || index >= rows.length) return;

    if (newStatus === '进行中') {
        openTaskProgressEditor(index);
        return;
    }

    if (newStatus === '已完成') {
        // 移到已完成列表
        const task = rows.splice(index, 1)[0];
        task.status = '已完成';
        task.completedAt = new Date().toISOString().slice(0, 10);
        let completed;
        try { completed = JSON.parse(localStorage.getItem('wiki_completed_tasks') || '[]'); } catch(e) { completed = []; }
        completed.unshift(task);
        localStorage.setItem('wiki_completed_tasks', JSON.stringify(completed));
        // ★ API: 完成任务
        try {
            await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'complete', id: task.id })
            });
        } catch (e) { console.error('API complete 失败:', e); }
    } else {
        rows[index].status = newStatus;
    }

    localStorage.setItem('wiki_task_data', JSON.stringify(rows));
    renderTaskTable(rows);
    syncTasksToServer();
    renderReadMode(rows);
    renderCompletedTasks();
}

function openTaskProgressEditor(index) {
    let rows;
    try { rows = JSON.parse(localStorage.getItem('wiki_task_data') || '[]'); } catch(e) { rows = []; }
    if (index < 0 || index >= rows.length) return;
    const task = rows[index];
    document.getElementById('taskProgressIndex').value = String(index);
    document.getElementById('taskCurrentStage').value = task.currentStage || '';
    document.getElementById('taskNextStage').value = task.nextStage || '';
    document.getElementById('taskPlannedDate').value = task.plannedDate || '';
    document.getElementById('taskProgressModal').style.display = 'flex';
}

function closeTaskProgressEditor() {
    const modal = document.getElementById('taskProgressModal');
    if (modal) modal.style.display = 'none';
}

function saveTaskProgress() {
    let rows;
    try { rows = JSON.parse(localStorage.getItem('wiki_task_data') || '[]'); } catch(e) { rows = []; }
    const index = Number(document.getElementById('taskProgressIndex')?.value);
    if (!Number.isInteger(index) || index < 0 || index >= rows.length) return;
    rows[index].status = '进行中';
    rows[index].currentStage = document.getElementById('taskCurrentStage')?.value.trim() || '';
    rows[index].nextStage = document.getElementById('taskNextStage')?.value.trim() || '';
    rows[index].plannedDate = document.getElementById('taskPlannedDate')?.value || '';
    localStorage.setItem('wiki_task_data', JSON.stringify(rows));
    renderTaskTable(rows);
    closeTaskProgressEditor();
    syncTasksToServer();
    renderReadMode(rows);
    showToast('任务阶段已更新', 'info');
}

// 渲染已完成任务列表
function renderCompletedTasks() {
    const tbody = document.getElementById('completedTableBody');
    const footer = document.getElementById('completedTableFooter');
    if (!tbody) return;
    let completed;
    try { completed = JSON.parse(localStorage.getItem('wiki_completed_tasks') || '[]'); } catch(e) { completed = []; }

    tbody.innerHTML = completed.map((t, i) =>
        '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td>' + escapeHtml(t.name || '') + '</td>' +
        '<td>' + escapeHtml(t.level || '') + '</td>' +
        '<td>' + escapeHtml(t.project || '') + '</td>' +
        '<td>' + escapeHtml(t.sub || '') + '</td>' +
        '<td>' + escapeHtml(t.deadline || '') + '</td>' +
        '<td>' + escapeHtml(t.completedAt || '') + '</td>' +
        '<td><button class="btn-action" onclick="restoreCompletedTask(' + i + ')">恢复</button></td>' +
        '</tr>'
    ).join('');

    if (footer) footer.textContent = '共 ' + completed.length + ' 条已完成任务';
}

async function restoreCompletedTask(index) {
    let completed;
    try { completed = JSON.parse(localStorage.getItem('wiki_completed_tasks') || '[]'); } catch(e) { completed = []; }
    if (index < 0 || index >= completed.length) return;

    const task = completed.splice(index, 1)[0];
    task.status = '待开始';
    localStorage.setItem('wiki_completed_tasks', JSON.stringify(completed));

    let rows;
    try { rows = JSON.parse(localStorage.getItem('wiki_task_data') || '[]'); } catch(e) { rows = []; }
    rows.push(task);
    localStorage.setItem('wiki_task_data', JSON.stringify(rows));

    // ★ API: 恢复任务
    try {
        await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'restore', id: task.id })
        });
    } catch (e) { console.error('API restore 失败:', e); }

    syncTasksToServer();
    renderReadMode(rows);
    renderCompletedTasks();
}

// ★ 同步任务到后端（使用 Markdown API）
async function syncTasksToServer() {
    try {
        let tasks;
        try { tasks = JSON.parse(localStorage.getItem('wiki_task_data') || '[]'); } catch(e) { tasks = []; }
        let completed;
        try { completed = JSON.parse(localStorage.getItem('wiki_completed_tasks') || '[]'); } catch(e) { completed = []; }
        await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'sync', tasks, completedTasks: completed })
        });
        // ★ 同步成功后清理 localStorage（数据已存储在后端 Markdown）
        // 保留 localStorage 作为离线缓存，但标记为已同步
        taskDataCache = { tasks, completedTasks };
    } catch (err) {
        console.error('同步任务失败:', err);
    }
}

// ========== 任务修改保存包装（供 chat.js saveAllChanges 调用） ==========
function saveTaskChanges() {
    // 保存任务表格数据（同 saveTableData，提供给 chat.js 的统一接口）
    saveTableData();
}

// ========== 提交时保存三级分类选项（包装 submitEditedTask） ==========
const _origSubmit = window.submitEditedTask;
if (_origSubmit) {
    window.submitEditedTask = function() {
        const level = document.getElementById('previewLevel').value;
        const proj = document.getElementById('previewProject').value.trim();
        const sub = document.getElementById('previewSub').value.trim();
        if (level) {
            addThreeLevelOption(level, proj || undefined, sub || undefined);
        }
        _origSubmit();
        if (level) {
            onLevelChange();
        }
    };
}

// ========== 文档历史版本 ==========
async function showDocumentHistory() {
    if (!currentDocFile) return showError('请先打开一个 Markdown 文件');
    const modal = document.getElementById('historyModal');
    const list = document.getElementById('historyVersionList');
    const preview = document.getElementById('historyPreview');
    const restoreBtn = document.getElementById('historyRestoreButton');

    if (modal) modal.style.display = 'flex';
    if (list) list.innerHTML = '<div class="history-loading">加载中...</div>';
    if (preview) preview.textContent = '选择一个版本以预览内容';
    if (restoreBtn) restoreBtn.disabled = true;

    try {
        const resp = await fetch('/api/history?path=' + encodeURIComponent(currentDocFile));
        const data = await resp.json();
        const versions = data.versions || [];

        if (list) {
            if (versions.length === 0) {
                list.innerHTML = '<div class="history-empty">暂无历史版本</div>';
            } else {
                list.innerHTML = versions.map((v, i) =>
                    '<div class="history-version-item' + (i === 0 ? ' selected' : '') + '" data-version="' + escapeHtml(v.name) + '" data-index="' + i + '" onclick="selectHistoryVersion(this)">' +
                    '<span class="history-version-time">' + escapeHtml(v.timestamp) + '</span>' +
                    '</div>'
                ).join('');
                if (versions[0]) {
                    selectHistoryVersion(list.querySelector('.history-version-item'));
                }
            }
        }
    } catch (err) {
        console.error('加载历史版本失败:', err);
        if (list) list.innerHTML = '<div class="history-empty">加载失败</div>';
    }
}

function closeDocumentHistory() {
    const modal = document.getElementById('historyModal');
    if (modal) modal.style.display = 'none';
}

let selectedHistoryVersion = null;

function selectHistoryVersion(el) {
    const list = document.getElementById('historyVersionList');
    if (list) list.querySelectorAll('.history-version-item').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    selectedHistoryVersion = el.dataset.version;

    // 加载预览
    const preview = document.getElementById('historyPreview');
    const restoreBtn = document.getElementById('historyRestoreButton');
    if (preview) preview.textContent = '加载中...';
    if (restoreBtn) restoreBtn.disabled = true;

    fetch('/api/history/content?path=' + encodeURIComponent(currentDocFile) + '&version=' + encodeURIComponent(selectedHistoryVersion))
        .then(r => r.json())
        .then(data => {
            if (preview) preview.textContent = data.content ? data.content.slice(0, 3000) : '(空内容)';
            if (restoreBtn) restoreBtn.disabled = false;
        })
        .catch(() => {
            if (preview) preview.textContent = '加载预览失败';
        });
}

async function restoreSelectedHistory() {
    if (!currentDocFile || !selectedHistoryVersion) return;
    if (!await showConfirm('确定要恢复此历史版本吗？当前内容将被保存为历史版本。')) return;

    try {
        const resp = await fetch('/api/history/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: currentDocFile, version: selectedHistoryVersion })
        });
        const data = await resp.json();
        if (data.path) {
            // 重新加载文件
            await openKnowledgeFile(data.path);
            closeDocumentHistory();
            showToast('已恢复历史版本', 'info');
        }
    } catch (err) {
        showError('恢复失败: ' + err.message);
    }
}

// ========== 动态前后文件导航 ==========
function updateDocNavFooter() {
    const footer = document.getElementById('docNavFooter');
    if (!footer || !currentDocFile) {
        if (footer) footer.style.display = 'none';
        return;
    }

    // 获取当前文件所在目录的同级文件列表
    const parts = currentDocFile.split('/');
    const dirPath = parts.slice(0, -1).join('/');
    const currentFileName = parts[parts.length - 1];

    // 从知识树中查找同级文件
    const category = getCategoryNode();
    if (!category) { footer.style.display = 'none'; return; }

    const siblings = [];
    function findSiblings(nodes, targetDir) {
        for (const node of nodes) {
            if (node.type === 'directory' && node.path === targetDir) {
                (node.children || []).forEach(child => {
                    if (child.type === 'file' && child.name.toLowerCase().endsWith('.md')) {
                        siblings.push(child);
                    }
                });
                return true;
            }
            if (node.children && findSiblings(node.children, targetDir)) return true;
        }
        return false;
    }
    findSiblings(category.children || [], dirPath);

    if (siblings.length < 2) { footer.style.display = 'none'; return; }

    const currentIdx = siblings.findIndex(s => s.name === currentFileName);
    if (currentIdx < 0) { footer.style.display = 'none'; return; }

    let html = '';
    // 上一篇
    if (currentIdx > 0) {
        const prev = siblings[currentIdx - 1];
        html += '<a class="doc-nav-prev" href="#" onclick="openKnowledgeFile(\'' + escapeHtml(prev.path).replace(/'/g, "\\'") + '\'); return false;">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>' +
            escapeHtml(prev.name) + '</a>';
    } else {
        html += '<span class="doc-nav-prev doc-nav-disabled"></span>';
    }
    // 下一篇
    if (currentIdx < siblings.length - 1) {
        const next = siblings[currentIdx + 1];
        html += '<a class="doc-nav-next" href="#" onclick="openKnowledgeFile(\'' + escapeHtml(next.path).replace(/'/g, "\\'") + '\'); return false;">' +
            escapeHtml(next.name) +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></a>';
    } else {
        html += '<span class="doc-nav-next doc-nav-disabled"></span>';
    }

    footer.innerHTML = html;
    footer.style.display = 'flex';
}

// ========== 文件树拖拽移动 ==========
let dndSourcePath = null;      // 被拖拽的文件/文件夹 path
let dndSourceType = null;      // 'file' | 'directory'

async function handleTreeDropOnRoot(e) {
    document.querySelectorAll('.tree-drop-target, .nav-tab.drop-target').forEach(n => n.classList.remove('tree-drop-target', 'drop-target'));
    if (!dndSourcePath) return;
    if (dndSourcePath.split('/').length === 1) { dndSourcePath = null; return; } // 已在根目录
    const fileName = dndSourcePath.split('/').pop();
    const categoryDir = categoryDirectoryMap[currentCategory] || '';
    const newPath = categoryDir + '/' + fileName;
    if (newPath === dndSourcePath) { dndSourcePath = null; return; }
    try {
        await apiRequest('/api/entry', { method: 'PATCH', body: JSON.stringify({ path: dndSourcePath, newPath: newPath }) });
        showToast('已移动到根目录: ' + fileName, 'info');
        if (currentDocFile === dndSourcePath) currentDocFile = newPath;
        await loadKnowledgeTree();
        renderDocTree();
    } catch (error) {
        showError('移动失败: ' + error.message);
    }
    dndSourcePath = null;
}

function handleTreeDragStart(e) {
    const el = e.target.closest('[data-drag-path]');
    if (!el) return;
    dndSourcePath = el.dataset.dragPath;
    dndSourceType = el.dataset.dragType || 'file';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dndSourcePath);
    el.classList.add('tree-dragging');
    // 延迟隐藏拖拽图（使用透明图片）
    const img = new Image(); img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
}

function handleTreeDragEnd(e) {
    const el = e.target.closest('[data-drag-path]');
    if (el) el.classList.remove('tree-dragging');
    // 清除所有 drop 高亮
    document.querySelectorAll('.tree-drop-target, .nav-tab.drop-target').forEach(n => n.classList.remove('tree-drop-target', 'drop-target'));
    dndSourcePath = null;
    dndSourceType = null;
}

function handleTreeDragOver(e) {
    e.preventDefault();
    if (!dndSourcePath) return;
    e.dataTransfer.dropEffect = 'move';
    // 高亮当前悬停目标
    const dropEl = e.target.closest('[data-drag-path]') || e.target.closest('.tree-folder-header') || e.target.closest('.nav-tab[data-tab]');
    document.querySelectorAll('.tree-drop-target, .nav-tab.drop-target').forEach(n => n.classList.remove('tree-drop-target', 'drop-target'));
    if (dropEl) {
        const highlight = dropEl.closest('[data-drag-path]') || dropEl;
        if (highlight.dataset.dragPath !== dndSourcePath) {
            highlight.classList.add('tree-drop-target');
        }
    }
}

async function handleTreeDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    document.querySelectorAll('.tree-drop-target, .nav-tab.drop-target').forEach(n => n.classList.remove('tree-drop-target', 'drop-target'));

    if (!dndSourcePath) return;

    // 判断 drop 目标
    let targetDir = null; // 目标目录路径（相对于 category root）
    let targetCategory = currentCategory; // 目标栏目 tab

    // 1. nav-tab drop：移动到目标栏目根目录
    const navTab = e.target.closest('.nav-tab[data-tab]');
    if (navTab) {
        const tabName = navTab.dataset.tab;
        if (tabName && tabName !== 'home' && tabName !== 'task' && tabName !== 'settings') {
            targetCategory = tabName;
            targetDir = ''; // 根目录
        }
    }

    // 2. 文件夹 drop：移动到该文件夹内
    const folderEl = e.target.closest('[data-drag-path][data-drag-type="directory"]');
    if (folderEl && folderEl.dataset.dragPath !== dndSourcePath) {
        targetDir = folderEl.dataset.dragPath;
    }

    // 3. 同一目录下的文件项 drop：移到同级
    const fileEl = e.target.closest('[data-drag-path][data-drag-type="file"]');
    if (fileEl && fileEl.dataset.dragPath !== dndSourcePath && !targetDir) {
        const parentParts = fileEl.dataset.dragPath.split('/');
        parentParts.pop();
        targetDir = parentParts.join('/');
    }

    // 如果没有匹配任何目标，取消
    if (!targetDir && targetCategory === currentCategory && (!folderEl || folderEl.dataset.dragPath === dndSourcePath)) {
        dndSourcePath = null;
        return;
    }

    // 如果目标栏目不同，需要重新计算目标路径
    const sourceCategoryDir = categoryDirectoryMap[currentCategory] || '';
    const destCategoryDir = categoryDirectoryMap[targetCategory] || '';

    let newPath;
    const fileName = dndSourcePath.split('/').pop();

    if (targetCategory !== currentCategory) {
        // 跨栏目移动
        newPath = targetDir
            ? destCategoryDir + '/' + targetDir + '/' + fileName
            : destCategoryDir + '/' + fileName;
    } else if (targetDir) {
        // 同栏目内移动
        const sourceDir = dndSourcePath.split('/').slice(0, -1).join('/');
        if (targetDir === sourceDir) { dndSourcePath = null; return; } // 相同目录不移动
        newPath = targetDir + '/' + fileName;
    } else {
        dndSourcePath = null;
        return;
    }

    // 禁止移动到自身子目录
    if (newPath.startsWith(dndSourcePath + '/')) {
        showError('不能将文件夹移动到自身子目录');
        dndSourcePath = null;
        return;
    }

    // 禁止源和目标相同
    if (newPath === dndSourcePath) {
        dndSourcePath = null;
        return;
    }

    try {
        await apiRequest('/api/entry', {
            method: 'PATCH',
            body: JSON.stringify({ path: dndSourcePath, newPath: newPath })
        });
        showToast('已移动: ' + fileName, 'info');
        if (currentDocFile === dndSourcePath) currentDocFile = newPath;
        await loadKnowledgeTree();
        if (targetCategory !== currentCategory) {
            await handleTabSwitch(targetCategory);
        }
        renderDocTree();
    } catch (error) {
        showError('移动失败: ' + error.message);
    }

    dndSourcePath = null;
}

// ========== Hero 内嵌对话功能 ==========
let heroConversationId = null;
let heroMessages = [];
let heroChatLoading = false;

// 初始化 Hero 对话状态
function initHeroChat() {
    // ★ 使用 sessionStorage：关闭软件重开后恢复初始 hero
    try {
        heroConversationId = sessionStorage.getItem('wiki_hero_conversation_id') || null;
    } catch (e) {
        heroConversationId = null;
    }

    // Hero 输入框自动调整高度
    const heroInput = document.getElementById('heroChatInput');
    if (heroInput) {
        heroInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 150) + 'px';
        });
    }

    // 如果有当前会话的对话，尝试加载（不自动显示对话视图，保持初始 hero）
    if (heroConversationId) {
        loadHeroConversation(heroConversationId).catch(() => {
            // 对话加载失败，清除状态，显示初始视图
            heroConversationId = null;
            sessionStorage.removeItem('wiki_hero_conversation_id');
        });
    }
}

// 加载 Hero 对话
async function loadHeroConversation(convId) {
    try {
        const msgResponse = await fetch('/api/agent/conversations/' + encodeURIComponent(convId) + '/messages');
        const msgData = await msgResponse.json();
        heroMessages = msgData.messages || [];
    } catch (err) {
        console.error('加载 Hero 对话失败:', err);
        heroMessages = [];
    }
}

// 切换到对话视图
function switchToHeroConversation() {
    const heroSection = document.querySelector('.hero-section');
    const heroConversation = document.getElementById('heroConversation');

    if (heroSection) heroSection.classList.add('in-conversation');
    if (heroConversation) heroConversation.style.display = 'block';
}

// 切换回初始视图（如果需要）
function switchToHeroInitial() {
    const heroSection = document.querySelector('.hero-section');
    const heroConversation = document.getElementById('heroConversation');

    if (heroSection) heroSection.classList.remove('in-conversation');
    if (heroConversation) heroConversation.style.display = 'none';
}

// 渲染 Hero 消息
function renderHeroMessages() {
    const container = document.getElementById('heroMessages');
    if (!container) return;

    if (heroMessages.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = heroMessages.map(msg => {
        if (msg.thinking) {
            return '<div class="chat-message assistant"><div class="chat-message-avatar"><img src="assets/images/logo.png" alt="AI"></div><div class="chat-message-content"><div class="chat-message-text thinking-indicator"><span class="dot-typing"></span> 正在思考...</div></div></div>';
        }
        return '<div class="chat-message ' + msg.role + '"><div class="chat-message-avatar">' +
            (msg.role === 'user' ? '<span class="avatar-initials">U</span>' : '<img src="assets/images/logo.png" alt="AI">') +
            '</div><div class="chat-message-content"><div class="chat-message-text">' + formatHeroMessageContent(msg.content) +
            '</div><div class="chat-message-meta"><span class="chat-message-time">' + formatHeroTime(msg.created_at) + '</span></div></div></div>';
    }).join('');

    container.scrollTop = container.scrollHeight;
}

// 格式化 Hero 消息内容
function formatHeroMessageContent(content) {
    if (!content) return '';
    if (typeof marked !== 'undefined') {
        return marked.parse(content);
    }
    return escapeHtml(content).replace(/\n/g, '<br>');
}

// 格式化 Hero 时间
function formatHeroTime(timeStr) {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

// 处理 Hero 输入框键盘事件
function handleHeroChatKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendHeroChatMessage();
    }
}

// 发送 Hero 对话消息
async function sendHeroChatMessage() {
    if (heroChatLoading) return;

    const input = document.getElementById('heroChatInput');
    if (!input) return;
    const content = input.value.trim();
    if (!content) return;

    heroChatLoading = true;
    input.disabled = true;
    const sendBtn = document.querySelector('.hero-chat-send-btn');
    if (sendBtn) sendBtn.disabled = true;

    try {
        // 如果没有对话，先创建
        if (!heroConversationId) {
            const convResponse = await fetch('/api/agent/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: '首页对话', scene: 'default' })
            });
            const convData = await convResponse.json();
            if (convData.conversation) {
                heroConversationId = convData.conversation.id;
                sessionStorage.setItem('wiki_hero_conversation_id', heroConversationId);
            }
        }

        // 添加用户消息
        const userMsg = { role: 'user', content, created_at: new Date().toISOString() };
        heroMessages.push(userMsg);
        renderHeroMessages();
        input.value = '';

        // 切换到对话视图
        switchToHeroConversation();

        // 保存用户消息到数据库
        await fetch('/api/agent/conversations/' + encodeURIComponent(heroConversationId) + '/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'user', content })
        });

        // 显示思考状态
        const thinkingMsg = { role: 'assistant', content: '', thinking: true, created_at: new Date().toISOString() };
        heroMessages.push(thinkingMsg);
        renderHeroMessages();

        // 构建消息列表
        const messages = heroMessages
            .filter(m => !m.thinking)
            .map(m => ({ role: m.role, content: m.content }));

        // 调用 Agent 接口
        const response = await fetch('/api/agent/agent-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scene: 'default', messages })
        });

        const data = await response.json();

        // 移除思考状态
        const thinkingIdx = heroMessages.findIndex(m => m.thinking);
        if (thinkingIdx >= 0) heroMessages.splice(thinkingIdx, 1);

        if (data.success && data.content) {
            const aiMsg = {
                role: 'assistant',
                content: data.content,
                model_id: data.used_model?.model_id || data.used_model?.id || null,
                created_at: new Date().toISOString()
            };
            heroMessages.push(aiMsg);
            renderHeroMessages();

            // 保存 AI 回复到数据库
            await fetch('/api/agent/conversations/' + encodeURIComponent(heroConversationId) + '/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'assistant', content: data.content, model_id: aiMsg.model_id })
            });
        } else if (data.error) {
            const suggestion = data.suggestion ? '\n\n💡 建议：' + data.suggestion : '';
            const errorMsg = { role: 'assistant', content: '⚠️ ' + data.error + suggestion, created_at: new Date().toISOString() };
            heroMessages.push(errorMsg);
            renderHeroMessages();
        }
    } catch (err) {
        const thinkingIdx = heroMessages.findIndex(m => m.thinking);
        if (thinkingIdx >= 0) heroMessages.splice(thinkingIdx, 1);
        console.error('Hero 对话发送失败:', err);
        const errorMsg = { role: 'assistant', content: '⚠️ 请求失败，请检查网络连接或稍后重试。', created_at: new Date().toISOString() };
        heroMessages.push(errorMsg);
        renderHeroMessages();
    } finally {
        heroChatLoading = false;
        input.disabled = false;
        const sendBtn = document.querySelector('.hero-chat-send-btn');
        if (sendBtn) sendBtn.disabled = false;
        input.focus();
    }
}

// 导出到全局作用域
Object.assign(window, {
    handleHeroChatKeydown,
    sendHeroChatMessage,
    initHeroChat,
    switchToHeroConversation,
    handleTabSwitch,
    saveAutoSaveInterval,
    performSearch,
    toggleTheme,
    initTheme,
    parseTaskDescription,
    showDocumentHistory,
    closeDocumentHistory,
    selectHistoryVersion,
    restoreSelectedHistory,
    updateDocNavFooter,
    changeTaskStatus,
    openTaskProgressEditor,
    closeTaskProgressEditor,
    saveTaskProgress,
    renderCompletedTasks,
    restoreCompletedTask,
    syncTasksToServer,
    ctxCopy,
    ctxMove,
    ctxRename,
    ctxDelete,
    ctxNewFile,
    ctxNewFolder,
    openFileTransferModal,
    closeFileTransferModal,
    confirmFileTransfer,
    onFileTransferCategoryChange,
    handleTreeDragStart,
    handleTreeDragEnd,
    handleTreeDragOver,
    handleTreeDrop,
    handleTreeDropOnRoot,
    saveCurrentDocument,
    switchDocMode,
    toggleColorPalette,
    closeColorPalette,
    focusEditorBody,
    guardedOpenKnowledgeFile,
    // E2E 诊断：只读当前文档状态
    getCurrentDocState: () => ({ currentDocFile, currentDocDirty, currentDocMode, currentDocModifiedAt, currentCategory })
});
