# Wiki 首页问题审查报告

> 审查日期：2026-06-19
> 文件版本：prototype.html 最新版

---

## 一、问题总览

| 序号 | 问题类型 | 严重程度 | 代码位置 |
|------|----------|----------|----------|
| 1 | Hero 区域结构不完整 | **严重** | 第706行 |
| 2 | 入口卡片区域结构问题 | **严重** | 第776行 |
| 3 | 图标图片路径问题 | 高 | 第712-769行 |
| 4 | 搜索入口缺失 | 中 | - |
| 5 | 入口卡片描述文字缺失 | 低 | 第712-769行 |

---

## 二、详细问题分析

### 问题①：Hero 区域结构不完整（严重）

**问题描述：**
Hero 区域代码中存在多余的 `</section>` 闭合标签，导致 HTML 结构错误。

**代码位置：**
```html
<!-- 第701-707行 -->
<section class="hero-section">
    <div class="hero-content">
        <img src="wiki-text.png" style="height:240px;display:inline-block;margin-bottom:4px;">
        <h1 class="hero-title">个人知识库</h1>
        <p class="hero-subtitle" id="heroSubtitle">以 Markdown 为核，沉淀知效，专注研发。</p>
        <div class="hero-actions">
            <button class="btn btn-primary" onclick="document.getElementById('featuresPage').scrollIntoView({behavior:'smooth'})">
                开始使用
            </button>
        </div>
    </div>
    

</section>  <!-- ⚠️ 多余的闭合标签 -->

</section>  <!-- ⚠️ 这行是多余的 -->
```

**影响：**
- HTML 结构不完整，可能导致页面渲染异常
- 后续的入口卡片区域可能无法正常显示

**修复建议：**
删除第706行的多余 `</section>` 标签。

---

### 问题②：入口卡片区域结构问题（严重）

**问题描述：**
入口卡片区域的 `</section>` 标签位置不正确，缩进混乱。

**代码位置：**
```html
<!-- 第775-778行 -->
            </div>
        </section>


</main>
```

**问题分析：**
- `</section>` 标签与其他内容的缩进不一致
- 缺少必要的闭合标签或注释不清晰

**修复建议：**
整理代码缩进，确保结构清晰。

---

### 问题③：图标图片路径问题（高）

**问题描述：**
所有入口卡片图标使用本地 PNG 图片文件，如果图片不存在会显示空白。

**代码位置：**
```html
<!-- 第712行 -->
<div class="feature-icon task">
    <img src="02_task_任务.png" style="width:80px;height:80px;border-radius:16px;display:block;">
</div>

<!-- 第717行 -->
<div class="feature-icon project">
    <img src="03_project_项目.png" style="width:80px;height:80px;border-radius:16px;display:block;">
</div>
```

**图标文件列表：**
- `02_task_任务.png`
- `03_project_项目.png`
- `04_literature_文献.png`
- `05_report_报告.png`
- `06_sop_SOP.png`
- `07_software_软件.png`
- `08_writing_写作.png`

**影响：**
- 如果图片文件不存在或路径错误，图标区域会显示空白
- 用户无法看到对应的图标

**修复建议：**
1. 确保所有 PNG 图片文件存在于正确目录
2. 或使用绝对路径/正确的相对路径
3. 添加 alt 文本作为备选显示

---

### 问题④：搜索入口缺失（中）

**问题描述：**
首页入口卡片中缺少"搜索"入口，之前版本中有的搜索卡片现在不见了。

**之前版本：**
```html
<div class="feature-card" onclick="document.querySelector('.search-box input').focus()">
    <div class="feature-icon search">🔍</div>
    <div class="feature-content">
        <div class="feature-title">搜索</div>
        <div class="feature-desc">全局搜索知识内容</div>
    </div>
    <div class="feature-arrow">→</div>
</div>
```

**当前版本：**
无搜索入口卡片。

**影响：**
- 用户无法通过首页快速访问搜索功能
- 需要通过顶部搜索框手动搜索

**修复建议：**
添加搜索入口卡片，或明确说明搜索功能已移至顶部。

---

### 问题⑤：入口卡片描述文字缺失（低）

**问题描述：**
所有入口卡片只显示标题，没有描述文字。

**当前代码：**
```html
<div class="feature-card" onclick="switchTab('task')">
    <div class="feature-icon task">
        <img src="02_task_任务.png" style="width:80px;height:80px;border-radius:16px;display:block;">
    </div>
    <div class="feature-content">
        <div class="feature-title">任务</div>
        <!-- 缺少描述文字 -->
    </div>
    <div class="feature-arrow">→</div>
</div>
```

**之前版本：**
```html
<div class="feature-content">
    <div class="feature-title">任务</div>
    <div class="feature-desc">跟踪待办与进度</div>
</div>
```

**影响：**
- 用户无法快速了解每个入口的功能
- 卡片信息不够完整

**修复建议：**
为每个入口卡片添加 `<div class="feature-desc">描述文字</div>`。

---

## 三、代码质量建议

### 3.1 缩进统一
当前代码缩进不一致，建议统一使用 4 空格缩进。

### 3.2 注释清晰
建议为每个主要区域添加清晰的注释：
```html
<!-- Hero 区域：主标题和副标题 -->
<section class="hero-section">
    ...
</section>

<!-- 功能入口卡片区域 -->
<section class="features-section" id="featuresPage">
    ...
</section>
```

### 3.3 图标路径管理
建议：
1. 将所有图标图片放在统一的 `icons/` 目录下
2. 使用相对路径：`src="icons/02_task.png"`
3. 或使用在线图片 URL

---

## 四、修复优先级

| 优先级 | 问题 | 建议操作 |
|--------|------|----------|
| **P0** | Hero 区域结构不完整 | 立即修复，删除多余 `</section>` |
| **P0** | 入口卡片区域结构 | 整理代码缩进 |
| **P1** | 图标图片路径 | 确认图片文件存在或替换为 SVG |
| **P1** | 搜索入口缺失 | 添加搜索卡片或确认设计意图 |
| **P2** | 描述文字缺失 | 根据需要添加 |

---

## 五、总结

当前首页存在 **2 个严重的 HTML 结构问题** 需要立即修复，否则可能导致页面显示异常。其他问题可根据实际需求决定是否修复。

**最紧急的修复：**
1. 删除 Hero 区域中多余的 `</section>` 标签（第706行）
2. 整理入口卡片区域的代码缩进
3. 确认图标图片文件是否存在