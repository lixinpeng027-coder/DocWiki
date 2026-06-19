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
