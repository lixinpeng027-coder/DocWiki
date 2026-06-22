// 文档索引核心逻辑
import { queryAll, queryOne, execute } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, readdirSync, statSync, lstatSync } from 'fs';
import { join, basename, extname } from 'path';
import { marked } from 'marked';

// 文档存储路径
const DOCS_PATH = process.env.WEBWIKI_DATA_DIR
    ? join(process.env.WEBWIKI_DATA_DIR)
    : join(process.cwd(), 'data');

// 索引文档
export function indexDocument(filePath, relativePath) {
    try {
        const content = readFileSync(filePath, 'utf-8');
        const stats = statSync(filePath);
        
        // 解析 Markdown
        const tokens = marked.lexer(content);
        
        // 提取标题结构
        const headings = [];
        const sections = [];
        let currentSection = { level: 0, title: '', content: '', startLine: 0 };
        
        for (const token of tokens) {
            if (token.type === 'heading') {
                // 保存上一个 section
                if (currentSection.title && currentSection.content) {
                    sections.push({
                        title: currentSection.title,
                        content: currentSection.content.trim(),
                        level: currentSection.level,
                        startLine: currentSection.startLine
                    });
                }
                
                currentSection = {
                    level: token.depth,
                    title: token.text,
                    content: '',
                    startLine: token.loc?.startLine || 0
                };
                
                headings.push({
                    level: token.depth,
                    text: token.text,
                    line: token.loc?.startLine || 0
                });
            } else if (currentSection.title) {
                currentSection.content += token.raw;
            }
        }
        
        // 保存最后一个 section
        if (currentSection.title && currentSection.content) {
            sections.push({
                title: currentSection.title,
                content: currentSection.content.trim(),
                level: currentSection.level,
                startLine: currentSection.startLine
            });
        }
        
        // 提取纯文本用于搜索
        const plainText = tokens
            .filter(t => t.type === 'paragraph' || t.type === 'heading' || t.type === 'table')
            .map(t => t.text || t.raw)
            .join('\n');
        
        // 计算关键词（简单实现：词频统计）
        const keywords = extractKeywords(plainText);
        
        // 存储到数据库
        const docId = uuidv4();
        execute(`
            INSERT OR REPLACE INTO document_index 
            (id, path, title, headings, sections, keywords, plain_text, word_count, indexed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
            docId,
            relativePath,
            getDocTitle(content, relativePath),
            JSON.stringify(headings),
            JSON.stringify(sections),
            JSON.stringify(keywords),
            plainText,
            countWords(plainText)
        ]);
        
        return {
            id: docId,
            path: relativePath,
            title: getDocTitle(content, relativePath),
            headings,
            sections: sections.length,
            keywords: keywords.slice(0, 10),
            wordCount: countWords(plainText)
        };
    } catch (err) {
        console.error(`索引文档失败: ${filePath}`, err);
        return null;
    }
}

// 批量索引目录
export function indexDirectory(dirPath = DOCS_PATH, basePath = '') {
    const results = {
        success: 0,
        failed: 0,
        documents: []
    };
    
    try {
        const entries = readdirSync(dirPath).filter(entry => !entry.startsWith('.'));
        
        for (const entry of entries) {
            const fullPath = join(dirPath, entry);
            const relativePath = basePath ? `${basePath}/${entry}` : entry;
            
            try {
                const stat = lstatSync(fullPath);
                if (stat.isSymbolicLink()) continue;
                
                if (stat.isDirectory()) {
                    // 递归索引子目录
                    const subResults = indexDirectory(fullPath, relativePath);
                    results.success += subResults.success;
                    results.failed += subResults.failed;
                    results.documents.push(...subResults.documents);
                } else if (/\.md$/.test(entry)) {
                    // 索引 Markdown 文件
                    const result = indexDocument(fullPath, relativePath);
                    if (result) {
                        results.success++;
                        results.documents.push(result);
                    } else {
                        results.failed++;
                    }
                }
            } catch (err) {
                results.failed++;
                console.error(`处理文件失败: ${fullPath}`, err);
            }
        }
    } catch (err) {
        console.error(`读取目录失败: ${dirPath}`, err);
    }
    
    return results;
}

// 重建索引，确保数据库只包含应用 data 目录中的当前 Markdown 文件。
export function rebuildIndex() {
    execute('DELETE FROM document_index');
    return indexDirectory();
}

// 搜索文档
export function searchDocuments(query, options = {}) {
    const { limit = 20, offset = 0 } = options;
    
    // 简单关键词匹配搜索
    const keywords = getSearchKeywords(query);
    const categoryTerms = ['项目', '任务', '文献', '报告', 'sop', '软件', '写作'];
    const category = categoryTerms.find(term => String(query).toLowerCase().includes(term.toLowerCase()));
    const contentKeywords = keywords.filter(keyword => keyword !== category);
    
    if (keywords.length === 0) {
        return [];
    }
    
    // 构建搜索条件
    const termsToMatch = contentKeywords.length > 0 ? contentKeywords : keywords;
    const conditions = termsToMatch.map(() => 
        `(LOWER(plain_text) LIKE ? OR LOWER(title) LIKE ? OR LOWER(path) LIKE ?)`
    ).join(' OR ');
    
    const matchParams = termsToMatch.flatMap(k => [`%${k}%`, `%${k}%`, `%${k}%`]);
    
    // 构建 WHERE 子句
    let whereClause = conditions;
    let params = [...matchParams];
    
    // 如果有分类词，添加路径前缀过滤
    if (category) {
        whereClause = `(${whereClause}) AND (LOWER(path) LIKE ?)`;
        params.push(`%${category.toLowerCase()}%`);
    }
    
    const results = queryAll(`
        SELECT id, path, title, headings, plain_text, word_count, indexed_at
        FROM document_index
        WHERE ${whereClause}
        ORDER BY indexed_at DESC, path ASC
        LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    
    // 提取上下文片段
    return results.map(doc => {
        const headings = JSON.parse(doc.headings || '[]');
        const plainText = doc.plain_text || '';
        
        // 找到匹配的上下文
        const snippets = findSnippets(plainText, keywords[0]);
        
        return {
            id: doc.id,
            path: doc.path,
            title: doc.title,
            headings: headings.slice(0, 5),
            wordCount: doc.word_count,
            indexedAt: doc.indexed_at,
            snippets: snippets.slice(0, 3)
        };
    });
}

// 将自然语言问题收敛为知识库中的高价值分类词和内容词。
function getSearchKeywords(query) {
    const normalized = String(query || '').toLowerCase().trim();
    const categoryTerms = ['项目', '任务', '文献', '报告', 'sop', '软件', '写作'];
    // 修复：使用toLowerCase()进行比较
    const categories = categoryTerms.filter(term => normalized.includes(term.toLowerCase()));
    const cleaned = normalized
        .replace(/[，。！？、,.!?;；:：()（）\[\]【】]/g, ' ')
        .replace(/我|目前|现在|当前|已经|正在|都|有哪(?:些)?|有什么|请问|请|帮我|告诉我|看一下|查看/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 1 && !categoryTerms.includes(word));
    return [...new Set([...categories, ...cleaned])].slice(0, 8);
}

// 语义搜索（简化版：基于关键词）
export function semanticSearch(query, options = {}) {
    // 这里可以实现更复杂的语义搜索
    // 暂时使用关键词搜索
    return searchDocuments(query, options);
}

// 获取单个文档
export function getDocument(path) {
    const doc = queryOne('SELECT * FROM document_index WHERE path = ?', [path]);
    if (!doc) return null;
    
    return {
        id: doc.id,
        path: doc.path,
        title: doc.title,
        headings: JSON.parse(doc.headings || '[]'),
        sections: JSON.parse(doc.sections || '[]'),
        keywords: JSON.parse(doc.keywords || '[]'),
        plainText: doc.plain_text,
        wordCount: doc.word_count,
        indexedAt: doc.indexed_at
    };
}

// 获取文档目录树
export function getDocumentTree(dirPath = DOCS_PATH, basePath = '') {
    const tree = [];
    
    try {
        const entries = readdirSync(dirPath).filter(entry => !entry.startsWith('.'));
        
        for (const entry of entries) {
            const fullPath = join(dirPath, entry);
            const relativePath = basePath ? `${basePath}/${entry}` : entry;
            
            try {
                const stat = lstatSync(fullPath);
                if (stat.isSymbolicLink()) continue;
                
                if (stat.isDirectory()) {
                    tree.push({
                        name: entry,
                        path: relativePath,
                        type: 'directory',
                        children: getDocumentTree(fullPath, relativePath)
                    });
                } else if (/\.md$/.test(entry)) {
                    const doc = queryOne('SELECT title, word_count FROM document_index WHERE path = ?', [relativePath]);
                    tree.push({
                        name: entry,
                        path: relativePath,
                        type: 'file',
                        title: doc?.title || entry,
                        wordCount: doc?.word_count || 0
                    });
                }
            } catch (err) {
                console.error(`处理失败: ${fullPath}`, err);
            }
        }
    } catch (err) {
        console.error(`读取目录失败: ${dirPath}`, err);
    }
    
    return tree;
}

// 删除文档索引
export function removeDocumentIndex(path) {
    execute('DELETE FROM document_index WHERE path = ?', [path]);
    return { success: true };
}

// 获取索引统计
export function getIndexStats() {
    const total = queryOne('SELECT COUNT(*) as count FROM document_index');
    const words = queryOne('SELECT SUM(word_count) as total FROM document_index');
    const recent = queryAll(`
        SELECT path, title, indexed_at 
        FROM document_index 
        ORDER BY indexed_at DESC 
        LIMIT 5
    `);
    
    return {
        totalDocuments: total?.count || 0,
        totalWords: words?.total || 0,
        recentDocuments: recent
    };
}

// ========== 辅助函数 ==========

// 提取关键词
function extractKeywords(text) {
    const words = text.toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 1 && !isStopWord(w));
    
    // 简单词频统计
    const freq = {};
    for (const word of words) {
        freq[word] = (freq[word] || 0) + 1;
    }
    
    // 返回按频率排序的关键词
    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .map(([word]) => word)
        .slice(0, 50);
}

// 判断是否为停用词
function isStopWord(word) {
    const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
        'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
        'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what',
        'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
        'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
        'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't',
        '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
        '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着',
        '没有', '看', '好', '自己', '这', '那', '他', '她', '它', '们'
    ]);
    return stopWords.has(word);
}

// 获取文档标题
function getDocTitle(content, path) {
    // 从第一个 H1 获取标题
    const match = content.match(/^#\s+(.+)$/m);
    if (match) return match[1].trim();
    
    // 否则使用文件名
    return basename(path, extname(path));
}

// 统计字数
function countWords(text) {
    // 中英文混合计数
    const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const english = (text.match(/[a-zA-Z]+/g) || []).length;
    return chinese + english;
}

// 查找上下文片段
function findSnippets(text, keyword, contextLen = 100) {
    const snippets = [];
    const lowerText = text.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    
    let index = 0;
    while ((index = lowerText.indexOf(lowerKeyword, index)) !== -1 && snippets.length < 5) {
        const start = Math.max(0, index - contextLen);
        const end = Math.min(text.length, index + keyword.length + contextLen);
        let snippet = text.slice(start, end);
        
        if (start > 0) snippet = '...' + snippet;
        if (end < text.length) snippet = snippet + '...';
        
        snippets.push(snippet);
        index += keyword.length;
    }
    
    return snippets;
}

export default {
    indexDocument,
    indexDirectory,
    rebuildIndex,
    searchDocuments,
    semanticSearch,
    getDocument,
    getDocumentTree,
    removeDocumentIndex,
    getIndexStats
};
