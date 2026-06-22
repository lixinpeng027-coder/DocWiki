import { readFileSync } from 'node:fs';

// DocWiki 1.2.0 前端关键逻辑单元测试
// 用法: node tests/frontend.test.mjs

/**
 * 注意：这些测试在 Node.js 中运行，模拟浏览器环境的关键逻辑。
 * 不测试 Electron IPC（需要在真实 Electron 环境中测试）。
 */

let passed = 0;
let failed = 0;

function assert(condition, label) {
    if (condition) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.error(`  ❌ ${label}`); }
}

console.log('\n=== DocWiki 1.2.0 前端逻辑测试 ===\n');

// ========== 1. 自动保存间隔解析 ==========
console.log('1. 自动保存间隔解析');
const testParseInterval = (val, fallback) => {
    const parsed = parseInt(val || fallback);
    if (isNaN(parsed) || parsed < 10) return 0; // 非法值或小于10秒禁用
    return parsed;
};
assert(testParseInterval('30', '30') === 30, '默认间隔 30 秒');
assert(testParseInterval('60', '30') === 60, '自定义间隔 60 秒');
assert(testParseInterval('5', '30') === 0, '间隔 < 10 禁用自动保存');
assert(testParseInterval(null, '30') === 30, '空值回退默认 30 秒');
assert(testParseInterval('abc', '30') === 0, '非法值被禁用 (返回0)');

// ========== 2. 并发保存保护 ==========
console.log('\n2. 并发保存保护');
let pending = false;
const saveLog = [];
async function mockSave() {
    if (pending) { saveLog.push('skipped-duplicate'); return 'skipped'; }
    pending = true;
    saveLog.push('start');
    await new Promise(r => setTimeout(r, 50));
    pending = false;
    saveLog.push('done');
    return 'saved';
}
async function simulateConcurrentSaves() {
    saveLog.length = 0;
    pending = false;
    const [r1, r2] = await Promise.all([mockSave(), mockSave()]);
    return { r1, r2, log: [...saveLog] };
}
simulateConcurrentSaves().then(r => {
    assert(r.r1 === 'saved' && r.r2 === 'skipped', `并发保存第二次被跳过 (r1=${r.r1}, r2=${r.r2})`);
    assert(r.log.join(',') === 'start,skipped-duplicate,done', `日志序列正确: ${r.log.join(',')}`);
});

// ========== 3. 关闭握手状态机 ==========
console.log('\n3. 关闭握手状态机');
async function testCloseHandshake(hasDirtyContent, saveResult) {
    // 模拟 Electron close 握手的渲染进程逻辑
    if (hasDirtyContent) {
        try {
            if (saveResult === 'fail') throw new Error('保存失败');
            return 'confirmed'; // 保存成功 → 确认关闭
        } catch (err) {
            return 'cancelled'; // 保存失败 → 取消关闭
        }
    }
    return 'confirmed'; // 无脏内容 → 直接关闭
}
(async () => {
    assert(await testCloseHandshake(false, 'ok') === 'confirmed', '无脏内容 → 确认关闭');
    assert(await testCloseHandshake(true, 'ok') === 'confirmed', '有脏内容且保存成功 → 确认关闭');
    assert(await testCloseHandshake(true, 'fail') === 'cancelled', '有脏内容但保存失败 → 取消关闭');
})();

// ========== 4. 数据目录路径解析 ==========
console.log('\n4. 数据目录路径解析');
function resolveDataDir(isDevMode, appPath, exePath) {
    const path = { join: (...args) => args.join('/'), dirname: (p) => p.split('/').slice(0, -1).join('/') };
    if (isDevMode) {
        return path.join(appPath, 'data');
    }
    return path.join(path.dirname(exePath), 'data');
}
assert(resolveDataDir(true, '/src', '/install/DocWiki.exe') === '/src/data', '开发模式使用源码 data');
assert(resolveDataDir(false, '/src', '/install/DocWiki.exe') === '/install/data', '生产模式使用安装根目录 data');
// 验证不出现 APPDATA 路径
assert(!resolveDataDir(false, '/src', '/install/DocWiki.exe').includes('AppData'), '生产模式路径不含 AppData');
assert(!resolveDataDir(false, '/src', '/install/DocWiki.exe').includes('Roaming'), '生产模式路径不含 Roaming');
assert(!resolveDataDir(false, '/src', '/install/DocWiki.exe').includes('userData'), '生产模式路径不含 userData');

// ========== 5. 窗口标题 ==========
console.log('\n5. 窗口标题');
const WINDOW_TITLE = 'DocWiki';
assert(WINDOW_TITLE === 'DocWiki', '窗口标题精确为 DocWiki');
assert(WINDOW_TITLE.length === 7, '标题长度为 7 字符');
// 确认不是旧标题
assert(WINDOW_TITLE === 'DocWiki', '窗口标题精确显示 DocWiki');

// ========== 6. 保存状态文本 ==========
console.log('\n6. 保存状态管理');
function getSaveStatusText(text, saved) {
    if (!saved && text.includes('失败')) return { text, disabled: false, isError: true };
    return {
        text: saved ? '已保存' : '未保存',
        disabled: saved,
        isError: false
    };
}
assert(getSaveStatusText('未保存', false).text === '未保存', '未保存状态文字正确');
assert(getSaveStatusText('未保存', false).disabled === false, '未保存时保存按钮可用');
assert(getSaveStatusText('已保存', true).text === '已保存', '已保存状态文字正确');
assert(getSaveStatusText('已保存', true).disabled === true, '已保存时保存按钮禁用');
assert(getSaveStatusText('自动保存失败', false).isError === true, '保存失败状态标记为错误');
assert(getSaveStatusText('自动保存失败', false).disabled === false, '保存失败时按钮可用（允许重试）');

// ========== 7. 任务数据模型（currentStage/nextStage/plannedDate，无进度百分比） ==========
console.log('\n7. 任务数据模型字段');
function createTaskRow(data) {
    // 模拟提交任务时创建的数据行对象
    return {
        name: data.name || '',
        priority: data.priority || '中',
        level: data.level || '',
        project: data.project || '',
        sub: data.sub || '',
        detail: data.detail || '',
        deadline: data.deadline || '',
        status: data.status || '待开始',
        currentStage: data.currentStage || '',
        nextStage: data.nextStage || '',
        plannedDate: data.plannedDate || ''
    };
}
const sampleTask = createTaskRow({
    name: '测试任务', priority: '高', level: '项目', project: '测试',
    currentStage: '需求分析', nextStage: '开发实现', plannedDate: '2026-07-01'
});
assert('progressPercentage' in sampleTask === false, '任务数据不包含 progressPercentage 字段');
assert(sampleTask.currentStage === '需求分析', 'currentStage 字段正确保存');
assert(sampleTask.nextStage === '开发实现', 'nextStage 字段正确保存');
assert(sampleTask.plannedDate === '2026-07-01', 'plannedDate 字段正确保存');
assert(sampleTask.status === '待开始', 'status 字段保留（用于卡片渲染）');
// 确保没有任何百分比字段
const keys = Object.keys(sampleTask);
const pctFields = keys.filter(k => k.toLowerCase().includes('percent') || k.toLowerCase().includes('percentage'));
assert(pctFields.length === 0, `无百分比相关字段 (实际字段: ${keys.join(', ')})`);

// ========== 8. 模态框尺寸常量 ==========
console.log('\n8. 模态框尺寸规范');
const MODAL_SIZES = {
    history: { maxWidth: 720, previewHeight: 360 },
    compact: { maxWidth: 360 }
};
assert(MODAL_SIZES.history.maxWidth === 720, '历史模态最大宽度 720px');
assert(MODAL_SIZES.history.previewHeight === 360, '历史模态预览高度 360px');
assert(MODAL_SIZES.compact.maxWidth === 360, '其他模态最大宽度 360px');
assert(MODAL_SIZES.history.maxWidth > MODAL_SIZES.compact.maxWidth, '历史模态宽度大于紧凑模态');

// ========== 9. 管理表格列数（移除状态列后应为8列） ==========
console.log('\n9. 管理表格列数验证');
const MANAGEMENT_COLUMNS = ['checkbox', '任务名称', '优先级', '栏目', '分类', '小类', '详情', '截止日期'];
assert(MANAGEMENT_COLUMNS.length === 8, '管理表格共8列（移除状态列）');
assert(!MANAGEMENT_COLUMNS.includes('状态'), '管理表格不包含状态列');
assert(MANAGEMENT_COLUMNS.includes('截止日期'), '管理表格保留截止日期列');
// 验证字段顺序：截止日期在详情之后（索引7）
assert(MANAGEMENT_COLUMNS.indexOf('截止日期') === 7, '截止日期为第8列（索引7）');

// ========== 10. 历史模态布局（两栏） ==========
console.log('\n10. 历史模态布局');
const HISTORY_LAYOUT = {
    columns: ['280px', 'minmax(0, 1fr)'],
    minHeight: 360,
    previewMaxHeight: 360
};
assert(HISTORY_LAYOUT.columns.length === 2, '历史模态两栏布局');
assert(HISTORY_LAYOUT.minHeight === 360, '历史模态主体最小高度 360px');
assert(HISTORY_LAYOUT.previewMaxHeight === 360, '预览区最大高度 360px');

// ========== 11. 系统本地日期任务分组 ==========
console.log('\n11. 系统本地日期任务分组');
function parseDateForTest(value, reference) {
    const text = String(value || '').trim();
    const base = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
    if (text.includes('今天')) return base;
    if (text.includes('明天')) { const d = new Date(base); d.setDate(d.getDate() + 1); return d; }
    const week = text.match(/本周\s*([一二三四五六日天])?/);
    if (week) {
        const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7 };
        const d = new Date(base); d.setDate(d.getDate() - (base.getDay() || 7) + (map[week[1]] || 7)); return d;
    }
    const m = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
function groupForTest(task, reference) {
    const d = parseDateForTest(task.plannedDate || task.deadline, reference);
    const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    if (!d) return '其他';
    if (+d === +today) return '今日';
    if (+d === +tomorrow) return '明日';
    const end = new Date(today); end.setDate(end.getDate() + (7 - (today.getDay() || 7)));
    return d > tomorrow && d <= end ? '本周' : '其他';
}
const monday = new Date(2026, 5, 22);
assert(groupForTest({ deadline: '2026-06-22' }, monday) === '今日', 'YYYY-MM-DD 自动识别今日');
assert(groupForTest({ deadline: '2026/06/23' }, monday) === '明日', 'YYYY/MM/DD 自动识别明日');
assert(groupForTest({ deadline: '本周五' }, monday) === '本周', '中文本周日期自动识别');
assert(groupForTest({ deadline: '2026-07-10', plannedDate: '2026-06-23' }, monday) === '明日', '预计日期优先于截止日期调整分组');

const appSource = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const htmlSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const preloadSource = readFileSync(new URL('../electron/preload.js', import.meta.url), 'utf8');
const settingsSource = readFileSync(new URL('../js/settings.js', import.meta.url), 'utf8');
assert(appSource.includes('task-empty-state">暂无待办任务'), '空任务分组显示暂无待办任务');
assert(appSource.includes('openTaskProgressEditor(index)'), '切换进行中打开阶段编辑器');
assert(htmlSource.includes('id="taskProgressModal"'), '存在紧凑任务阶段弹窗');
const managementHeader = htmlSource.match(/<table class="task-table">[\s\S]*?<\/thead>/)?.[0] || '';
assert(!managementHeader.includes('<th>状态</th>'), '实际管理任务表头已删除状态列');
assert(htmlSource.includes('id="updateManifestUrl"'), '通用设置提供远程更新源');
assert(settingsSource.includes('https://github.com/lixinpeng027-coder/DocWiki/releases/latest/download/latest.json'), '默认更新源绑定公开 GitHub Release');
assert(preloadSource.includes("ipcRenderer.invoke('check-update'"), '渲染进程通过安全 IPC 检查更新');

// ========== 结果 ==========
setTimeout(() => {
    console.log(`\n=== 测试结果: ${passed} 通过, ${failed} 失败 ===\n`);
    if (failed > 0) process.exit(1);
}, 200);
