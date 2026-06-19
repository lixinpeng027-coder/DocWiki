// ========== 导航数据 ==========
const navData = {
    task: [
        { name: '待办事项', file: '待办事项.md' },
        { name: '本周计划', file: '本周计划.md' }
    ],
    project: [
        {
            name: '新橙皮苷',
            children: [
                {
                    name: '酶筛选',
                    children: [
                        { name: '筛选实验', file: '筛选实验.md' },
                        { name: '结果分析', file: '结果分析.md' }
                    ]
                },
                { name: '工艺优化', file: '工艺优化.md' }
            ]
        },
        {
            name: '甜菊糖苷',
            children: [
                { name: '提取工艺', file: '提取工艺.md' },
                { name: '纯化方法', file: '纯化方法.md' }
            ]
        }
    ],
    literature: [
        { name: '酶学综述', file: '酶学综述.md' },
        { name: '黄酮类化合物', file: '黄酮类化合物.md' }
    ],
    report: [
        { name: '周报', children: [
            { name: '2024年第1周', file: 'week1.md' },
            { name: '2024年第2周', file: 'week2.md' }
        ]},
        { name: '月报', file: 'monthly.md' }
    ],
    sop: [
        { name: '实验室安全', file: '实验室安全.md' },
        { name: '仪器操作', children: [
            { name: 'HPLC操作规程', file: 'hplc.md' },
            { name: '离心机使用', file: 'centrifuge.md' }
        ]}
    ],
    software: [
        { name: 'ChemDraw', file: 'chemdraw.md' },
        { name: 'Origin', file: 'origin.md' }
    ],
    writing: [
        { name: '论文草稿', children: [
            { name: '引言部分', file: 'introduction.md' },
            { name: '方法部分', file: 'methods.md' }
        ]}
    ],
    settings: []
};

// ========== 项目文件树数据 ==========
const projectTreeData = {
    '新橙皮苷': {
        '项目概述.md': '# 项目概述\n新橙皮苷项目概述...',
        '文献调研.md': '# 文献调研\n整理相关文献资料...',
        '酶筛选': {
            '01_筛选方案.md': '# 筛选方案\n\n## 1. 目标\n筛选对新橙皮苷具有高转化效率的酶。',
            '02_筛选结果.md': '# 筛选结果\n\n## 1. 项目背景\n本实验旨在筛选对新橙皮苷具有高转化效率的酶，并评估其产物得率和稳定性。通过对自建酶库 E01-E12 的系统筛选，我们希望找到最优的催化酶用于后续工业化放大。\n\n## 2. 实验设计\n- 底物：新橙皮苷\n- 酶库来源：自建酶库 E01-E12\n- 反应条件：30℃，pH 7.0，反应时间 24 h\n- 检测方法：HPLC 定量分析转化率和产物得率\n\n## 3. 数据结果\n\n### 3.1 转化率结果\n\n| 酶编号 | 转化率（%） | 产物得率（%） | 重复 1（%） | 重复 2（%） | 平均值（%） |\n|---|---|---|---|---|---|\n| E01 | 85.3 | 78.6 | 84.5 | 86.1 | 85.3 |\n| E02 | 92.7 | 87.4 | 91.3 | 94.1 | 92.7 |\n| E03 | 76.1 | 71.2 | 75.4 | 76.8 | 76.1 |\n| E04 | 68.9 | 63.5 | 68.2 | 69.6 | 68.9 |\n| E05 | 91.2 | 85.1 | 90.5 | 91.9 | 91.2 |\n\n### 3.2 产物得率结果\n在最优条件下，E02 和 E05 表现出最高的产物得率，分别为 87.4% 和 85.1%。两者转化率均超过 90%，具有工业化应用潜力。\n\n### 3.3 稳定性结果\n对 E02 和 E05 进行连续 5 批次重复实验，结果显示转化率波动在 ±2% 以内，表明酶的稳定性良好。\n\n## 4. 问题分析\n在筛选过程中发现，部分酶在反应后期出现活性下降现象，可能与底物抑制或产物反馈抑制有关。后续需要进一步优化反应条件。\n\n## 5. 下一步计划\n- 对 E02 和 E05 进行固定化处理，提高重复使用性\n- 优化反应温度和 pH 条件，提升转化率\n- 开展 100 mL 规模的放大实验',
            '03_数据分析.md': '# 数据分析\n\n## 1. 统计方法\n使用 SPSS 26.0 进行统计分析。',
            '04_结果验证.md': '# 结果验证\n进一步验证实验结论...',
            'assets': {}
        },
        '结构验证': {
            '结构分析.md': '# 结构验证分析\n分析产物结构...',
            '图谱数据': {
                '质谱图.md': '# 质谱数据\n质谱分析结果...',
                '核磁图.md': '# 核磁数据\n核磁共振分析...'
            }
        }
    },
    'FR1 发酵': {
        '项目概述.md': '# FR1 发酵项目\n发酵项目概述...',
        '工艺参数.md': '# 发酵工艺参数\n记录发酵条件...',
        '数据分析.md': '# 数据分析\n发酵数据分析...',
        '批次记录': {
            'FR1_Batch001.md': '# 批次记录 001\n第一批发酵记录...',
            'FR1_Batch002.md': '# 批次记录 002\n第二批发酵记录...',
            'FR1_Batch003.md': '# 批次记录 003\n第三批发酵记录...',
            'FR1_Batch004.md': '# 批次记录 004\n第四批发酵记录...',
            'FR1_Batch005.md': '# 批次记录 005\n第五批发酵记录...',
            'FR1_Batch006.md': '# 批次记录 006\n第六批发酵记录...',
            'FR1_Batch007.md': '# 批次记录 007\n第七批发酵记录...'
        },
        '周报总结': {
            '第01周.md': '# 第01周周报\n本周工作总结...',
            '第02周.md': '# 第02周周报\n本周工作总结...',
            '第03周.md': '# 第03周周报\n本周工作总结...'
        }
    },
    'FN1 发酵': {
        '项目概述.md': '# FN1 发酵项目\n发酵项目概述...',
        '工艺优化.md': '# 工艺优化方案\n优化发酵工艺...',
        '问题分析': {
            '问题记录01.md': '# 问题记录 01\n记录问题...',
            '问题记录02.md': '# 问题记录 02\n记录问题...',
            '问题记录03.md': '# 问题记录 03\n记录问题...',
            '解决方案.md': '# 解决方案\n问题解决方案...'
        },
        '稳定性研究.md': '# 稳定性研究\n发酵稳定性分析...'
    }
};

let currentDocMode = 'read';
let currentDocFile = null;

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

function docTreeNew() { alert('新建文件（待实现）'); }
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
        // 从 path 中恢复：path = "新橙皮苷/酶筛选/01_筛选方案.md"
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

// 新建文件
function ctxNewFile() {
    hideCtxMenu();
    const name = prompt('请输入新文件名（不含 .md）：');
    if (!name) return;

    // 确定插入位置
    let parentObj = projectTreeData;
    let parentPath = '';

    if (ctxTargetPath) {
        const parts = ctxTargetPath.split('/');
        parentPath = parts.slice(0, -1).join('/');
        if (parentPath) {
            let node = projectTreeData;
            for (let i = 0; i < parts.length - 1; i++) {
                if (node[parts[i]]) node = node[parts[i]];
                else { node = null; break; }
            }
            parentObj = node;
        }
    }

    if (!parentObj || typeof parentObj !== 'object') return;

    const fileName = name + '.md';
    parentObj[fileName] = '# ' + name + '\n\n';
    renderDocTree();

    // 自动打开新文件
    if (parentPath) {
        docOpenFile('project', parentPath, fileName);
    }
}

// 新建文件夹
function ctxNewFolder() {
    hideCtxMenu();
    const name = prompt('请输入新文件夹名：');
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
function ctxDelete() {
    hideCtxMenu();
    if (!ctxTargetPath) return;

    if (!confirm('确定要删除 "' + ctxTargetPath + '" 吗？')) return;

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

    if (homePage) homePage.classList.add('hidden');
    if (taskPage) taskPage.classList.remove('active');
    if (projectPage) projectPage.classList.remove('active');
    if (docPage) docPage.classList.remove('active');

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
    } else {
        if (docPage) docPage.classList.add('active');
        renderDocTree();
    }

    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
}

// ========== 项目总览页面函数 ==========

// 项目元数据（描述信息）
const projectMetaData = {
    '新橙皮苷': {
        description: '橙皮苷合成路径优化与酶工程研究',
        iconColor: '#2563eb'
    },
    'FR1 发酵': {
        description: 'FR1 菌株发酵过程与周报总结',
        iconColor: '#10b981'
    },
    'FN1 发酵': {
        description: 'FN1 菌株发酵工艺优化与稳定性研究',
        iconColor: '#f59e0b'
    }
};

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

// 从项目总览页打开文件 - 直接使用文档页模式
function projOpenFile(projectPath, fileName) {
    // 直接切换到文档页面
    const projectPage = document.getElementById('projectPage');
    const docPage = document.getElementById('docPage');
    
    if (projectPage) projectPage.classList.remove('active');
    if (docPage) docPage.classList.add('active');
    
    // 打开文件
    docOpenFile('project', projectPath, fileName);
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

function createNewFile() {
    const location = document.getElementById('newFileLocation').value;
    let fileName = document.getElementById('newFileName').value;
    
    if (!fileName.trim()) {
        alert('请输入文件名');
        return;
    }
    
    if (!fileName.endsWith('.md')) {
        fileName += '.md';
    }
    
    const [projectPath, folderName] = location.split('/');
    
    alert('已创建文件: ' + location + '/' + fileName);
    closeNewFileModal();
    renderProjectTree();
}

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
        alert('请输入文件夹名称');
        return;
    }
    
    alert('已创建文件夹: ' + project + '/' + folderName);
    closeNewFolderModal();
    renderProjectTree();
}

// ========== 文档跳转 ==========
function navigateToDoc(category, docName) {
    switchTab(category);
    const sidebarTitle = document.getElementById('docSidebarTitle');
    if (sidebarTitle) sidebarTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);

    // 更新面包屑
    const breadcrumb = document.getElementById('docBreadcrumb');
    if (breadcrumb) {
        breadcrumb.innerHTML = '<span>' + category + '</span><span class="doc-breadcrumb-sep">/</span><span class="doc-breadcrumb-current">' + docName + '</span>';
    }

    // 更新阅读内容
    const content = '# ' + docName + '\n\n> 此文档内容正在加载中...';
    renderMarkdownContent(content);

    const textarea = document.getElementById('editorTextarea');
    if (textarea) { textarea.value = content; editorUpdateLineNumbers(); }
}

// ========== 表格数据管理 ==========
function loadTableData() {
    try {
        const saved = localStorage.getItem('wiki_task_data');
        if (saved) return JSON.parse(saved);
    } catch(e) {}
    return null;
}

function saveTableData() {
    const tbody = document.getElementById('taskTableBody');
    if (!tbody) return;

    const rows = [];
    tbody.querySelectorAll('tr').forEach(tr => {
        const cells = tr.querySelectorAll('td');
        if (cells.length < 9) return;

        rows.push({
            name: cells[1].textContent.trim(),
            priority: cells[2].textContent.trim() || '中',
            level: cells[3].textContent.trim(),
            project: cells[4].textContent.trim(),
            sub: cells[5].textContent.trim(),
            detail: cells[6].textContent.trim(),
            status: cells[7].textContent.trim(),
            deadline: cells[8].textContent.trim()
        });
    });

    localStorage.setItem('wiki_task_data', JSON.stringify(rows));
    renderReadMode(rows);
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

    const grouped = { '今日': [], '本周': [], '其他': [] };
    rows.forEach(r => {
        if (r.status === '已完成') return;
        const dl = r.deadline || '';
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
        if (dl.includes('今天') || dl === today) grouped['今日'].push(r);
        else if (dl.includes('本周')) grouped['本周'].push(r);
        else grouped['其他'].push(r);
    });

    let html = '';
    const sections = [
        { key: '今日', title: '今日任务' },
        { key: '本周', title: '本周任务' },
        { key: '其他', title: '全部任务' }
    ];

    sections.forEach(s => {
        const items = grouped[s.key];
        if (items.length === 0) return;
        html += '<section class="task-section"><h2 class="task-section-title">' + s.title + ' <span>' + items.length + '</span></h2><div class="task-grid">';
        items.forEach(r => {
            const icon = levelIcons[r.level] || levelIcons['项目'];
            const pCls = priorityClass[r.priority] || 'priority-mid';
            const pLbl = priorityLabel[r.priority] || r.priority;
            const sCls = statusClass[r.status] || 'status-pending';
            const sLbl = statusLabel[r.status] || r.status;
            const docLevel = r.level || 'task';
            const docProject = r.project || r.name;
            html += '<div class="task-card-v2"><div class="tc2-icon">' + icon + '</div><div class="tc2-body"><div class="tc2-header"><span class="tc2-title">' + r.name + '</span><span class="tc2-badge ' + pCls + '">' + pLbl + '</span><span class="tc2-badge ' + sCls + '">' + sLbl + '</span></div><p class="tc2-desc">' + (r.detail || '') + '</p><div class="tc2-footer"><span class="tc2-meta"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>截止：' + (r.deadline || '未设置') + '</span><span class="tc2-divider"></span><span class="tc2-meta"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>' + r.level + '：' + (r.project || '未指定') + '</span><a href="#" class="tc2-link" onclick="navigateToDoc(\'' + docLevel + '\', \'' + docProject.replace(/'/g, "\\'") + '\'); return false;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>关联文档</a></div></div></div>';
        });
        html += '</div></section>';
    });

    if (!html) {
        html = '<p style="text-align:center;color:#94a3b8;padding:48px;">暂无待办任务</p>';
    }

    container.querySelectorAll('.task-section').forEach(s => s.remove());
    container.insertAdjacentHTML('beforeend', html);
}

// ========== 任务模式切换 ==========
function switchTaskMode(mode) {
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
function deleteSelectedRow() {
    const tbody = document.getElementById('taskTableBody');
    if (!tbody) return;
    const selected = tbody.querySelector('tr.selected');
    if (!selected) {
        alert('请先选中一条任务');
        return;
    }
    if (confirm('确定删除选中的任务？')) {
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
        alert('请先选中一条任务');
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

    const preview = document.querySelector('.ai-preview');
    if (preview) preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ========== 提交AI解析预览内容到任务列表 ==========
function submitEditedTask() {
    const name = document.getElementById('previewName').value.trim();
    if (!name) {
        alert('请填写任务名称');
        return;
    }

    const level = document.getElementById('previewLevel').value;
    const project = document.getElementById('previewProject').value.trim();
    const sub = document.getElementById('previewSub').value.trim();
    const detail = document.getElementById('previewDetail').value.trim();
    const status = document.getElementById('previewStatus').value;
    const deadline = document.getElementById('previewDeadline').value;

    const tbody = document.getElementById('taskTableBody');
    if (!tbody) return;

    const selected = tbody.querySelector('tr.selected');

    const statusBadge = '<span class="status-badge ' + status + '">' + status + '</span>';
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
        selected.dataset.taskStatus = status;
        selected.dataset.taskDeadline = deadlineDisplay;

        const cells = selected.querySelectorAll('td');
        cells[1].textContent = name;
        cells[2].textContent = priority;
        cells[3].textContent = level;
        cells[4].textContent = project;
        cells[5].textContent = sub;
        cells[6].textContent = detail;
        cells[7].innerHTML = statusBadge;
        cells[8].textContent = deadlineDisplay;
    } else {
        // 新增行（radio，与现有行一致）
        const priority = '中';
        const tr = document.createElement('tr');
        tr.onclick = function() { selectTaskRow(this); };
        tr.dataset.taskName = name;
        tr.dataset.taskPriority = priority;
        tr.dataset.taskCategory = level;
        tr.dataset.taskProject = project;
        tr.dataset.taskSub = sub;
        tr.dataset.taskDetail = detail;
        tr.dataset.taskStatus = status;
        tr.dataset.taskDeadline = deadlineDisplay;
        tr.innerHTML =
            '<td><input type="radio" name="taskRadio" class="row-radio"></td>' +
            '<td>' + name + '</td>' +
            '<td>' + priority + '</td>' +
            '<td>' + level + '</td>' +
            '<td>' + project + '</td>' +
            '<td>' + sub + '</td>' +
            '<td>' + detail + '</td>' +
            '<td>' + statusBadge + '</td>' +
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
    writing: '写作'
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

function insertEditorLink() {
    const url = prompt('请输入链接地址：', 'https://');
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
    if (!currentDocFile) return alert('请先打开一个 Markdown 文件');
    document.getElementById('editorImageInput')?.click();
}

async function uploadEditorImage(file) {
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) return alert('图片不能超过 6MB');
    const extension = (file.name.split('.').pop() || '').toLowerCase();
    if (!['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) return alert('不支持该图片格式');
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
        alert(error.message);
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
                '<div class="tree-folder-header" style="padding-left:' + (16 + depth * 18) + 'px" onclick="docToggleFolder(this)">' +
                '<span class="tree-folder-name">' + escapeHtml(node.name) + '</span>' +
                '<span class="tree-folder-arrow' + open + '">▶</span></div>' +
                '<div class="tree-folder-children' + open + '">' + renderKnowledgeNodes(node.children, depth + 1) + '</div></div>';
        }
        if (!node.name.toLowerCase().endsWith('.md')) return '';
        const active = currentDocFile === node.path ? ' active' : '';
        return '<div class="tree-file' + active + '" style="padding-left:' + (34 + depth * 18) + 'px" data-file-path="' + escapeHtml(node.path) + '">' +
            '<span class="tree-file-name">' + escapeHtml(node.name.replace(/\.md$/i, '')) + '</span></div>';
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
        container.querySelector('[data-overview-tab]')?.addEventListener('click', () => switchTab(currentCategory));
    } else {
        container.innerHTML = category ? renderKnowledgeNodes(category.children) : '<div class="tree-empty">该栏目暂无内容</div>';
    }
    container.querySelectorAll('[data-file-path]').forEach(element => {
        element.addEventListener('click', event => {
            event.stopPropagation();
            openKnowledgeFile(element.dataset.filePath);
        });
    });
};

async function openKnowledgeFile(relativePath) {
    try {
        const file = await apiRequest('/api/file?path=' + encodeURIComponent(relativePath));
        currentDocFile = file.path;
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
    } catch (error) {
        alert(error.message);
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
    if (!currentDocFile) return alert('请先打开一个 Markdown 文件');
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
        alert(error.message);
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
    container.querySelector('[data-overview-tab]')?.addEventListener('click', () => switchTab(currentCategory));
    container.querySelectorAll('[data-file-path]').forEach(element => {
        element.addEventListener('click', event => {
            event.stopPropagation();
            document.getElementById('projectPage')?.classList.remove('active');
            document.getElementById('docPage')?.classList.add('active');
            renderDocTree();
            openKnowledgeFile(element.dataset.filePath);
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
    if (!firstFile) return alert('该项目中还没有 Markdown 文件');
    rememberRecentEntry({ type: currentCategory, path: project.path, name: project.name });
    document.getElementById('projectPage')?.classList.remove('active');
    document.getElementById('docPage')?.classList.add('active');
    renderDocTree();
    await openKnowledgeFile(firstFile.path);
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
    if (!fileName) return alert('请输入文件名');
    if (!fileName.toLowerCase().endsWith('.md')) fileName += '.md';
    try {
        const relativePath = location + '/' + fileName;
        await apiRequest('/api/file', { method: 'POST', body: JSON.stringify({ path: relativePath, content: '# ' + fileName.replace(/\.md$/i, '') + '\n\n' }) });
        closeNewFileModal();
        await loadKnowledgeTree();
        renderProjectTree();
        renderProjectCards();
        document.getElementById('projectPage')?.classList.remove('active');
        document.getElementById('docPage')?.classList.add('active');
        renderDocTree();
        await openKnowledgeFile(relativePath);
    } catch (error) {
        alert(error.message);
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
    if (!folderName) return alert('请输入文件夹名称');
    try {
        await apiRequest('/api/folder', { method: 'POST', body: JSON.stringify({ path: parentPath + '/' + folderName }) });
        closeNewFolderModal();
        await loadKnowledgeTree();
        renderProjectTree();
        renderProjectCards();
    } catch (error) {
        alert(error.message);
    }
};

ctxNewFile = async function() {
    const name = prompt('请输入新文件名（不含 .md）：');
    if (!name) return;
    const categoryRoot = categoryDirectoryMap[currentCategory];
    const parent = currentDocFile ? currentDocFile.split('/').slice(0, -1).join('/') : categoryRoot;
    try {
        await apiRequest('/api/file', { method: 'POST', body: JSON.stringify({ path: parent + '/' + name.replace(/\.md$/i, '') + '.md', content: '# ' + name.replace(/\.md$/i, '') + '\n\n' }) });
        await loadKnowledgeTree();
        renderDocTree();
    } catch (error) { alert(error.message); }
};

ctxNewFolder = async function() {
    const name = prompt('请输入新文件夹名：');
    if (!name) return;
    const categoryRoot = categoryDirectoryMap[currentCategory];
    const parent = currentDocFile ? currentDocFile.split('/').slice(0, -1).join('/') : categoryRoot;
    try {
        await apiRequest('/api/folder', { method: 'POST', body: JSON.stringify({ path: parent + '/' + name }) });
        await loadKnowledgeTree();
        renderDocTree();
    } catch (error) { alert(error.message); }
};

const prototypeSwitchTab = switchTab;
switchTab = async function(tab) {
    if (tab === 'home' || tab === 'settings') return prototypeSwitchTab(tab);
    try {
        if (!knowledgeTree) await loadKnowledgeTree();
    } catch (error) {
        alert(error.message);
        return prototypeSwitchTab('home');
    }

    document.querySelectorAll('.nav-tab').forEach(element => element.classList.toggle('active', element.dataset.tab === tab));
    document.querySelector('.home-page')?.classList.add('hidden');
    document.getElementById('taskPage')?.classList.remove('active');
    document.getElementById('projectPage')?.classList.remove('active');
    document.getElementById('docPage')?.classList.remove('active');
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
    // 首次加载：如果 localStorage 为空，从 HTML 表格初始化数据
    const existing = loadTableData();
    if (!existing || existing.length === 0) {
        const tbody = document.getElementById('taskTableBody');
        if (tbody && tbody.querySelectorAll('tr').length > 0) {
            saveTableData();
        }
    }

    // 渲染查看任务卡片视图
    renderReadMode();

    // 标签点击事件
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });

    // 主题切换
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            this.classList.toggle('dark');
        });
    }

    // 副标题轮播
    const subtitles = [
        '以 Markdown 为核，沉淀知效，专注研发。',
        '本地优先，文件即知识库，无需数据库。',
        '多级导航自动映射，零配置维护。',
        '所见即所得编辑，保留标准 Markdown。',
        '多工具共享同一目录，无需导入导出。',
        'AI 排版助手，一键美化文档结构。'
    ];
    let subIdx = 0;
    const subEl = document.getElementById('heroSubtitle');
    if (subEl) {
        setInterval(() => {
            const nextIdx = (subIdx + 1) % subtitles.length;
            subEl.classList.add('slide-out');
            setTimeout(() => {
                subEl.textContent = subtitles[nextIdx];
                subEl.classList.remove('slide-out');
                subEl.classList.add('slide-in');
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        subEl.classList.remove('slide-in');
                    });
                });
                subIdx = nextIdx;
            }, 400);
        }, 4000);
    }

    // 三级联动预设数据
    const defaults = {
        '项目': {
            '高效酶改造项目': ['酶筛选', '酶活性分析'],
            '发酵工艺优化项目': ['OD跟踪', '产量对比'],
            '新橙皮苷': ['合成路线', '纯化工艺'],
            '甜菊糖苷': ['提取工艺'],
            '实验流程规范化': ['操作规范', '安全培训']
        },
        '报告': {
            '周报汇总': ['本周实验', '数据汇总'],
            '月报总结': ['月度回顾'],
            '研发进展报告': ['项目进展']
        },
        '文献': {
            '酶学综述': ['酶动力学'],
            '黄酮类化合物': ['结构分析'],
            '底物特异性研究': ['底物筛选']
        },
        'SOP': {
            '实验室安全': ['安全须知', '应急处理'],
            '仪器操作': ['HPLC操作规程', 'GC操作规程'],
            '蛋白纯化SOP': ['柱层析', '电泳'],
            'HPLC操作规程': ['方法开发', '系统适用性']
        },
        '软件': {
            '数据分析平台': ['数据导入', '图表生成'],
            'ChemDraw': ['结构绘制'],
            'Origin': ['数据拟合']
        },
        '写作': {
            '论文草稿': ['引言', '方法'],
            '综述': ['文献调研'],
            '专利': ['权利要求']
        }
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

    setTimeout(() => { onLevelChange(); }, 100);
});

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
