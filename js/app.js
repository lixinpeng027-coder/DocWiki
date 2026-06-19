
// ========== 表格数据管理 ==========

// 从 localStorage 加载数据
function loadTableData() {
    try {
        const saved = localStorage.getItem('wiki_task_data');
        if (saved) {
            return JSON.parse(saved);
        }
    } catch(e) {}
    return null;
}

// 保存数据到 localStorage
function saveTableData() {
    const tbody = document.getElementById('taskTableBody');
    if (!tbody) return;
    
    const rows = [];
    tbody.querySelectorAll('tr').forEach(tr => {
        const cells = tr.querySelectorAll('td');
        if (cells.length < 9) return;
        
        const checkbox = cells[0].querySelector('.row-checkbox');
        const taskName = cells[1].textContent.trim() || cells[1].querySelector('input')?.value || '';
        const priority = cells[2].querySelector('select')?.value || '中';
            const category = cells[3].querySelector('select')?.value || cells[3].textContent.trim() || '';
        const project = cells[4].querySelector('input')?.value || cells[4].textContent.trim() || '';
        const subItem = cells[5].querySelector('.sub-text')?.textContent?.trim() || '';
        const detail = cells[6].textContent.trim() || '';
        const status = cells[7].querySelector('select')?.value || cells[7].querySelector('.status-badge')?.textContent?.trim() || '';
        const deadline = cells[8].querySelector('input')?.value || cells[8].textContent.trim() || '';
        
        rows.push({ taskName, priority, category, project, subItem, detail, status, deadline });
    });
    
    localStorage.setItem('wiki_task_data', JSON.stringify(rows));
    localStorage.setItem('wiki_categories', JSON.stringify(getAllCategories()));
    hasUnsaved = false;
    showSaveStatus('已保存');
}

// 获取所有已输入的栏目
function getAllCategories() {
    const cats = ['项目', '报告', '文献', 'SOP', '软件', '写作', '其他'];
    return cats;
}
    const cats = new Set(['项目', '报告', '文献', 'SOP', '软件', '写作', '其他']);
    const tbody = document.getElementById('taskTableBody');
    if (tbody) {
        tbody.querySelectorAll('tr').forEach(tr => {
            const input = tr.querySelector('td:nth-child(4) .level-combo');
            if (input && input.value) cats.add(input.value.trim());
        });
    }
    return Array.from(cats);
}

document.addEventListener('input', function(e) {

// 显示保存状态
function showSaveStatus(msg) {
    const btn = document.querySelector('.btn-action.btn-primary');
    if (btn) {
        const orig = btn.textContent;
        btn.textContent = '✅ ' + msg;
        setTimeout(() => { btn.textContent = orig; }, 2000);
    }
}

// 保存按钮点击
document.addEventListener('DOMContentLoaded', function() {
    // 绑定保存按钮
    document.querySelectorAll('.btn-action.btn-primary').forEach(btn => {
        if (btn.textContent.includes('保存')) {
            btn.onclick = saveTableData;
        }
    });
    
    // 加载已保存数据
    const saved = loadTableData();
    if (saved && saved.length > 0) {
        // 只在表格为空时加载
        const tbody = document.getElementById('taskTableBody');
        if (tbody && tbody.querySelectorAll('tr').length <= 1) {
            // Clear existing rows
            tbody.innerHTML = '';
            saved.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><input type="checkbox" class="row-checkbox" onchange="onRowCheck(this)"></td>
                    <td>${row.taskName}</td>
                    <td><select class="priority-select"><option value="高">高</option><option value="中" ${row.priority === '中' ? 'selected' : ''}>中</option><option value="低" ${row.priority === '低' ? 'selected' : ''}>低</option></select></td>
                    <td><select class="level-select category-select"><option value="项目">项目</option><option value="报告">报告</option><option value="文献">文献</option><option value="SOP">SOP</option><option value="软件">软件</option><option value="写作">写作</option><option value="其他">其他</option></select></td>
                    <td><input class="level-combo" list="project-list" value="${row.project}" placeholder="输入或选择项目"></td>
                    <td><span class="sub-text" onclick="editSub(this)">${row.subItem || '未设置'}</span><input class="sub-input" value="${row.subItem || ''}" onblur="saveSub(this)" onkeydown="if(event.key==='Enter')this.blur()"></td>
                    <td>${row.detail}</td>
                    <td><select class="status-select"><option value="待开始">待开始</option><option value="进行中" ${row.status === '进行中' ? 'selected' : ''}>进行中</option><option value="已完成" ${row.status === '已完成' ? 'selected' : ''}>已完成</option></select></td>
                    <td>${row.deadline ? `<input type="date" class="date-picker" value="${row.deadline}">` : '<input type="date" class="date-picker">'}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    }
    
});

// 监听编辑模式切换 - 自动保存
const _origSwitchTaskMode = window.switchTaskMode;
if (_origSwitchTaskMode) {
    window.switchTaskMode = function(mode) {
        if (mode === 'read') {
            saveTableData();
        }
        _origSwitchTaskMode(mode);
    };
}
// 导航数据
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
            ]
        };

        // 渲染导航树
        function renderNavTree(items, level = 0) {
            let html = '';
            items.forEach(item => {
                if (item.children) {
                    html += `
                        <div style="padding: 8px ${16 + level * 16}px; display: flex; align-items: center; cursor: pointer; color: #1e293b; font-size: 14px;" onclick="toggleFolder(this)">
                            <span style="flex: 1;">${item.name}</span>
                            <span style="color: #94a3b8; font-size: 12px;">▶</span>
                        </div>
                        <div class="tree-children" style="display: none; padding-left: 16px; border-left: 1px solid #e2e8f0; margin-left: 12px;">
                            ${renderNavTree(item.children, level + 1)}
                        </div>
                    `;
                } else {
                    html += `
                        <div style="padding: 7px ${16 + level * 16}px; cursor: pointer; color: #64748b; font-size: 14px;" onclick="openFile('${item.file}', '${item.name}')">
                            ${item.name}
                        </div>
                    `;
                }
            });
            return html;
        }

        // 切换文件夹
        function toggleFolder(element) {
            const arrow = element.querySelector('span:last-child');
            const children = element.nextElementSibling;
            arrow.textContent = arrow.textContent === '▶' ? '▼' : '▶';
            children.style.display = children.style.display === 'none' ? 'block' : 'none';
        }

        // 打开文件
        function openFile(file, name) {
            document.getElementById('docTitle').textContent = name;
        }

        // 切换标签
        function switchTab(tab) {
            document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
            document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
            
            // 隐藏所有页面
            const homePage = document.querySelector('.home-page');
            const taskPage = document.getElementById('taskPage');
            const docPage = document.getElementById('docPage');
            
            if (homePage) homePage.classList.add('hidden');
            if (taskPage) taskPage.classList.remove('active');
            if (docPage) docPage.classList.remove('active');
            
            if (tab === 'home') {
                if (homePage) homePage.classList.remove('hidden');
            } else if (tab === 'task') {
                // 任务页面特殊处理 - 默认显示阅读模式
                if (taskPage) taskPage.classList.add('active');
                // 确保阅读模式被激活
                const readMode = document.getElementById('taskReadMode');
                const editMode = document.getElementById('taskEditMode');
                const modeButtons = document.querySelectorAll('.mode-switch .mode-btn');
                if (readMode) readMode.classList.add('active');
                if (editMode) editMode.classList.remove('active');
                if (modeButtons.length > 0) {
                    modeButtons.forEach(btn => btn.classList.remove('active'));
                    modeButtons[0].classList.add('active'); // 激活阅读模式按钮
                }
            } else {
                // 其他栏目使用文档页面
                if (docPage) docPage.classList.add('active');
                // 更新导航树
                const items = navData[tab] || [];
                document.getElementById('navTree').innerHTML = renderNavTree(items);
            }
            
            // 滚动到页面顶部
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
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

        // 主题切换
        document.getElementById('themeToggle').addEventListener('click', function() {
            this.classList.toggle('dark');
        });

        // 标签点击事件
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                switchTab(this.dataset.tab);
            });
        });

// 下拉菜单切换
        function toggleDropdown(btn) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                if (menu !== btn.nextElementSibling) {
                    menu.classList.remove('show');
                }
            });
            btn.nextElementSibling.classList.toggle('show');
        }

        // 修改状态
        function changeStatus(item, status) {
            const dropdown = item.closest('.dropdown-menu');
            const btn = dropdown.previousElementSibling;
            
            btn.classList.remove('待开始', '进行中', '已完成', '暂停');
            btn.classList.add(status);
            btn.childNodes[0].textContent = status;
            
            dropdown.classList.remove('show');
        }

        // 点击其他区域关闭下拉菜单
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.status-dropdown')) {
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        });

        // 切换任务模式
        function navigateToDoc(category, docName) {
            switchTab(category);
            document.getElementById('docTitle').textContent = docName;
            document.getElementById('docContent').innerHTML = `<p>正在加载文档：<strong>${docName}</strong></p>
            <p>这是 "${docName}" 的文档内容编辑区域。</p>
            <p>您可以在这里编辑与任务相关的文档内容。</p>`;
        }

        function switchTaskMode(mode) {
            const readMode = document.getElementById('taskReadMode');
            const editMode = document.getElementById('taskEditMode');
            const modeButtons = document.querySelectorAll('.mode-switch .mode-btn');
            
            modeButtons.forEach(btn => btn.classList.remove('active'));
            
            if (mode === 'read') {
                readMode.classList.add('active');
                editMode.classList.remove('active');
                modeButtons[0].classList.add('active');
            } else {
                readMode.classList.remove('active');
                editMode.classList.add('active');
                modeButtons[1].classList.add('active');
            }
            
            // 滚动到页面顶部
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        }

        // 小类点击编辑
        function editSub(span) {
            const input = span.nextElementSibling;
            span.style.display = 'none';
            input.classList.add('active');
            input.focus();
            input.select();
        }

        function saveSub(input) {
            const span = input.previousElementSibling;
            span.textContent = input.value || '未设置';
            span.style.display = '';
            input.classList.remove('active');
            markUnsaved();
        }

        // 新增行
        function addTableRow() {
            const tbody = document.getElementById('taskTableBody');
            const row = document.createElement('tr');
            row.onclick = function() { selectRow(this); };
            row.innerHTML = `
                <td><input type="checkbox" class="row-checkbox" onchange="onRowCheck(this)"></td>
                <td><input class="level-combo" placeholder="输入任务名称" style="width:100%;"></td>
                <td><select class="priority-select"><option value="中" selected>中</option><option value="高">高</option><option value="低">低</option></select></td>
                <td><input class="level-combo" list="category-list" value="项目" placeholder="输入或选择分类"></td>
                <td><input class="level-combo" list="project-list" placeholder="输入或选择项目" style="width:100%;"></td>
                <td><span class="sub-text" onclick="editSub(this)">未设置</span><input class="sub-input" value="" onblur="saveSub(this)" onkeydown="if(event.key==='Enter')this.blur()"></td>
                <td><input class="level-combo" placeholder="输入详情" style="width:100%;"></td>
                <td><select class="status-select"><option value="待开始">待开始</option><option value="进行中" selected>进行中</option><option value="已完成">已完成</option></select></td>
                <td><input type="date" class="date-picker"></td>
            `;
            tbody.appendChild(row);
            markUnsaved();
        }

        // 行选中
        function selectRow(row) {
            document.querySelectorAll('#taskTableBody tr').forEach(r => r.classList.remove('selected'));
            row.classList.add('selected');
        }

        // 删除选中行
        // 删除选中行
        function deleteSelectedRow() {
            const checked = document.querySelectorAll('#taskTableBody .row-checkbox:checked');
            if (checked.length === 0) {
                alert('请先勾选要删除的行');
                return;
            }
            if (confirm('确定删除选中的 ' + checked.length + ' 行？')) {
                checked.forEach(cb => {
                    cb.closest('tr').remove();
                });
                markUnsaved();
            }
        }

        // 行复选框
        function onRowCheck(checkbox) {
            const row = checkbox.closest('tr');
            if (checkbox.checked) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        }

        // 全选/取消全选
        function selectAllRows(master) {
            const checkboxes = document.querySelectorAll('.row-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = master.checked;
                onRowCheck(cb);
            });
        }
