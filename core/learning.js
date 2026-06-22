// Agent 自主学习模块
// 记录成功的问答对，提取文档路径关联，下次类似问题时优先检索
import { queryAll, queryOne, execute } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

// 提取关键词（去掉标点、转小写、去停用词）
function extractKeywords(text) {
    const stopWords = new Set([
        '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
        '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
        '自己', '这', '他', '她', '它', '们', '那', '些', '什么', '怎么', '如何', '哪', '哪些',
        '请', '能', '可以', '吗', '呢', '吧', '啊', '嗯', '哦', '？', '！', '。', '，',
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
        'may', 'might', 'shall', 'can', 'need', 'dare', 'ought', 'used',
        'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
        'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
        'what', 'which', 'who', 'whom', 'where', 'when', 'why', 'how',
        'not', 'no', 'nor', 'but', 'or', 'and', 'if', 'then', 'else', 'so',
        'with', 'from', 'to', 'for', 'of', 'in', 'on', 'at', 'by', 'about', 'as', 'into',
    ]);

    return text
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]/g, ' ')  // 中文和英文单词
        .split(/\s+/)
        .filter(w => w.length >= 2 && !stopWords.has(w))
        .slice(0, 10);  // 最多10个关键词
}

// 记录一次成功的问答
export function recordQuery(userQuestion, docPaths = [], docTitles = []) {
    if (!userQuestion || docPaths.length === 0) return;

    const keywords = extractKeywords(userQuestion);
    const normalizedQuery = userQuestion.toLowerCase().replace(/[^\w\u4e00-\u9fa5]/g, '').slice(0, 100);

    // 检查是否已有类似查询（关键词重叠）
    const existing = queryOne(
        'SELECT id, doc_paths, doc_titles, query_count FROM query_history WHERE query = ?',
        [normalizedQuery]
    );

    if (existing) {
        // 合并文档路径（去重）
        const oldPaths = JSON.parse(existing.doc_paths || '[]');
        const oldTitles = JSON.parse(existing.doc_titles || '[]');
        const mergedPaths = [...new Set([...oldPaths, ...docPaths])];
        const mergedTitles = [...new Set([...oldTitles, ...docTitles])];

        execute(`
            UPDATE query_history 
            SET doc_paths = ?, doc_titles = ?, query_count = query_count + 1, last_used_at = datetime('now')
            WHERE id = ?
        `, [JSON.stringify(mergedPaths), JSON.stringify(mergedTitles), existing.id]);
    } else {
        execute(`
            INSERT INTO query_history (id, query, question_keywords, doc_paths, doc_titles)
            VALUES (?, ?, ?, ?, ?)
        `, [
            uuidv4(),
            normalizedQuery,
            JSON.stringify(keywords),
            JSON.stringify(docPaths),
            JSON.stringify(docTitles)
        ]);
    }
}

// 根据问题查找历史经验中的推荐路径
export function findRelevantPaths(userQuestion, limit = 5) {
    const keywords = extractKeywords(userQuestion);
    if (keywords.length === 0) return [];

    // 方式1：按关键词匹配历史记录
    const allHistory = queryAll(
        'SELECT query, question_keywords, doc_paths, doc_titles, query_count FROM query_history WHERE success = 1 ORDER BY query_count DESC, last_used_at DESC LIMIT 200'
    );

    const scored = allHistory.map(record => {
        const storedKeywords = JSON.parse(record.question_keywords || '[]');
        // 计算关键词重叠分数
        const overlap = keywords.filter(k => storedKeywords.includes(k)).length;
        const score = overlap * (record.query_count || 1);
        return { ...record, score, paths: JSON.parse(record.doc_paths || '[]'), titles: JSON.parse(record.doc_titles || '[]') };
    }).filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score);

    // 收集推荐路径
    const result = [];
    const seenPaths = new Set();
    for (const record of scored) {
        for (let i = 0; i < record.paths.length && result.length < limit; i++) {
            if (!seenPaths.has(record.paths[i])) {
                seenPaths.add(record.paths[i]);
                result.push({
                    path: record.paths[i],
                    title: record.titles[i] || record.paths[i],
                    score: record.score
                });
            }
        }
    }

    return result;
}

// ============= 用户偏好管理 =============

// 获取所有用户偏好
export function getAllPreferences() {
    const rows = queryAll('SELECT key, value, scope FROM preferences ORDER BY updated_at DESC');
    const result = {};
    for (const row of rows) {
        result[row.key] = { value: row.value, scope: row.scope };
    }
    return result;
}

// 获取单个偏好值
export function getPreference(key) {
    const row = queryOne('SELECT value, scope FROM preferences WHERE key = ?', [key]);
    return row ? { value: row.value, scope: row.scope } : null;
}

// 保存偏好（存在则更新，不存在则插入）
export function setPreference(key, value, scope = 'global') {
    const existing = queryOne('SELECT id FROM preferences WHERE key = ?', [key]);
    if (existing) {
        execute(
            "UPDATE preferences SET value = ?, scope = ?, updated_at = datetime('now') WHERE key = ?",
            [value, scope, key]
        );
    } else {
        execute(
            'INSERT INTO preferences (id, key, value, scope) VALUES (?, ?, ?, ?)',
            [uuidv4(), key, value, scope]
        );
    }
    return { key, value, scope };
}

// 删除偏好
export function deletePreference(key) {
    execute('DELETE FROM preferences WHERE key = ?', [key]);
}

// 获取偏好摘要（供 Agent system prompt 使用）
export function getPreferencesSummary() {
    const prefs = getAllPreferences();
    const lines = [];
    for (const [key, { value }] of Object.entries(prefs)) {
        lines.push(`- ${key}: ${value}`);
    }
    return lines.length > 0 ? lines.join('\n') : '暂无用户偏好记录';
}

export default { recordQuery, findRelevantPaths, getAllPreferences, getPreference, setPreference, deletePreference, getPreferencesSummary };
