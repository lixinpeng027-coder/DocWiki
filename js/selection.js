// 选区操作核心功能
// 处理文本选区、上下文分析、快捷操作

// 获取选区信息
export function getSelectionInfo(selection, editorElement) {
    if (!selection || selection.rangeCount === 0) {
        return null;
    }
    
    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();
    
    if (!text) {
        return null;
    }
    
    const rect = range.getBoundingClientRect();
    const editorRect = editorElement.getBoundingClientRect();
    
    return {
        text: text,
        startOffset: getTextOffset(editorElement, range.startContainer, range.startOffset),
        endOffset: getTextOffset(editorElement, range.endContainer, range.endOffset),
        rect: {
            top: rect.top - editorRect.top,
            left: rect.left - editorRect.left,
            width: rect.width,
            height: rect.height
        },
        context: getSelectionContext(editorElement, range),
        lineNumber: getLineNumber(editorElement, range.startContainer)
    };
}

// 获取文本节点中的字符偏移
function getTextOffset(root, node, offset) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let totalOffset = 0;
    let currentNode;
    
    while (currentNode = walker.nextNode()) {
        if (currentNode === node) {
            return totalOffset + offset;
        }
        totalOffset += currentNode.textContent.length;
    }
    
    return totalOffset;
}

// 获取选区上下文
function getSelectionContext(editorElement, range) {
    const container = range.commonAncestorContainer;
    let contextElement = container;
    
    // 找到最近的块级元素
    while (contextElement && contextElement !== editorElement) {
        if (contextElement.tagName && ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE'].includes(contextElement.tagName)) {
            break;
        }
        contextElement = contextElement.parentNode;
    }
    
    // 获取上下文文本
    const contextText = contextElement ? contextElement.textContent : '';
    const selectedText = range.toString();
    const contextStart = contextText.indexOf(selectedText);
    
    return {
        element: contextElement,
        fullText: contextText,
        selectedText: selectedText,
        startInContext: contextStart >= 0 ? contextStart : 0,
        endInContext: contextStart >= 0 ? contextStart + selectedText.length : selectedText.length,
        heading: getNearestHeading(contextElement),
        listItem: getNearestListItem(contextElement)
    };
}

// 获取最近的标题
function getNearestHeading(element) {
    let current = element;
    while (current && current !== document.body) {
        if (current.tagName && current.tagName.match(/^H[1-6]$/)) {
            return {
                level: parseInt(current.tagName[1]),
                text: current.textContent.trim()
            };
        }
        current = current.parentNode;
    }
    return null;
}

// 获取最近的列表项
function getNearestListItem(element) {
    let current = element;
    while (current && current !== document.body) {
        if (current.tagName === 'LI') {
            const list = current.parentNode;
            const items = Array.from(list.children);
            const index = items.indexOf(current);
            return {
                text: current.textContent.trim(),
                index: index,
                ordered: list.tagName === 'OL'
            };
        }
        current = current.parentNode;
    }
    return null;
}

// 获取行号
function getLineNumber(editorElement, node) {
    const lines = editorElement.textContent.split('\n');
    let charCount = 0;
    
    const walker = document.createTreeWalker(editorElement, NodeFilter.SHOW_TEXT);
    let currentNode;
    
    while (currentNode = walker.nextNode()) {
        if (currentNode === node) {
            break;
        }
        charCount += currentNode.textContent.length;
    }
    
    return lines.slice(0, charCount).filter(l => l === '').length + 1;
}

// 快捷操作类型
export const QUICK_ACTIONS = {
    // 文本格式化
    'bold': { icon: 'B', label: '粗体', shortcut: 'Ctrl+B', category: 'format' },
    'italic': { icon: 'I', label: '斜体', shortcut: 'Ctrl+I', category: 'format' },
    'code': { icon: '<>', label: '行内代码', shortcut: 'Ctrl+`', category: 'format' },
    'strikethrough': { icon: '~~', label: '删除线', shortcut: '', category: 'format' },
    
    // 标题
    'h1': { icon: 'H1', label: '一级标题', shortcut: '', category: 'heading' },
    'h2': { icon: 'H2', label: '二级标题', shortcut: '', category: 'heading' },
    'h3': { icon: 'H3', label: '三级标题', shortcut: '', category: 'heading' },
    
    // 列表
    'ul': { icon: '•', label: '无序列表', shortcut: '- ', category: 'list' },
    'ol': { icon: '1.', label: '有序列表', shortcut: '1. ', category: 'list' },
    'todo': { icon: '☐', label: '待办事项', shortcut: '- [ ] ', category: 'list' },
    
    // 块级
    'quote': { icon: '"', label: '引用', shortcut: '> ', category: 'block' },
    'codeblock': { icon: '{ }', label: '代码块', shortcut: '```', category: 'block' },
    'hr': { icon: '—', label: '分割线', shortcut: '---', category: 'block' },
    
    // 链接
    'link': { icon: '🔗', label: '链接', shortcut: '[text](url)', category: 'link' },
    'image': { icon: '🖼', label: '图片', shortcut: '![alt](url)', category: 'link' },
    
    // AI 操作
    'ai_rewrite': { icon: '✨', label: 'AI 重写', shortcut: '', category: 'ai', action: 'rewrite' },
    'ai_summary': { icon: '📝', label: 'AI 摘要', shortcut: '', category: 'ai', action: 'summary' },
    'ai_translate': { icon: '🌐', label: 'AI 翻译', shortcut: '', category: 'ai', action: 'translate' },
    'ai_explain': { icon: '💡', label: 'AI 解释', shortcut: '', category: 'ai', action: 'explain' },
    'ai_qa': { icon: '❓', label: 'AI 问答', shortcut: '', category: 'ai', action: 'qa' }
};

// 应用选区操作
export function applyAction(selection, action, editorElement) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    
    const range = sel.getRangeAt(0);
    const text = sel.toString();
    
    if (!text) return false;
    
    let newText = text;
    
    switch (action) {
        case 'bold':
            newText = `**${text}**`;
            break;
        case 'italic':
            newText = `*${text}*`;
            break;
        case 'code':
            newText = `\`${text}\``;
            break;
        case 'strikethrough':
            newText = `~~${text}~~`;
            break;
        case 'h1':
            newText = `# ${text}`;
            break;
        case 'h2':
            newText = `## ${text}`;
            break;
        case 'h3':
            newText = `### ${text}`;
            break;
        case 'quote':
            newText = text.split('\n').map(line => `> ${line}`).join('\n');
            break;
        case 'codeblock':
            newText = `\`\`\`\n${text}\n\`\`\``;
            break;
        case 'link':
            newText = `[${text}](url)`;
            break;
        case 'image':
            newText = `![${text}](url)`;
            break;
        case 'todo':
            newText = text.split('\n').map(line => `- [ ] ${line}`).join('\n');
            break;
        default:
            return false;
    }
    
    // 替换选区
    range.deleteContents();
    range.insertNode(document.createTextNode(newText));
    range.collapse(false);
    
    return true;
}

// 获取快捷操作面板位置
export function getActionPanelPosition(selection, editorElement) {
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    const editorRect = editorElement.getBoundingClientRect();
    
    return {
        top: rect.bottom - editorRect.top + 8,
        left: rect.left - editorRect.left + (rect.width / 2) - 150
    };
}

export default {
    getSelectionInfo,
    QUICK_ACTIONS,
    applyAction,
    getActionPanelPosition
};