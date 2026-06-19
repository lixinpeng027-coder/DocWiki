
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
            
            if (tab === 'home') {
                document.querySelector('.home-content').style.display = 'block';
                document.getElementById('docPage').style.display = 'none';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                document.querySelector('.home-content').style.display = 'none';
                document.getElementById('docPage').style.display = 'block';
                
                // 更新导航树
                const items = navData[tab] || [];
                document.getElementById('navTree').innerHTML = renderNavTree(items);
            }
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
    