document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const body = document.body;
    const themeToggleBtn = document.getElementById('theme-toggle');
    const kindleToggleBtn = document.getElementById('kindle-toggle');
    const genZToggleBtn = document.getElementById('genz-toggle');
    const fontSizeDecreaseBtn = document.getElementById('font-decrease');
    const fontSizeIncreaseBtn = document.getElementById('font-increase');
    const originalTextNodes = new WeakMap();
    
    // Default config values
    let isKindleMode = false;
    let currentTheme = 'system'; // 'system', 'light', 'dark'
    let fontScale = 1.0;
    let isGenZMode = false;
    
    // Load config from localStorage
    try {
        if (localStorage.getItem('kindle-mode') === 'true') {
            isKindleMode = true;
        } else if (localStorage.getItem('kindle-mode') === 'false') {
            isKindleMode = false;
        } else {
            // Auto detect Kindle from User-Agent
            const ua = navigator.userAgent.toLowerCase();
            if (ua.includes('kindle') || ua.includes('silk') || ua.includes('paperwhite') || ua.includes('bookeen') || ua.includes('kobo') || ua.includes('ereader')) {
                isKindleMode = true;
            }
        }
        
        currentTheme = localStorage.getItem('site-theme') || 'system';
        fontScale = parseFloat(localStorage.getItem('font-scale')) || 1.0;
        isGenZMode = localStorage.getItem('genz-mode') === 'true';
    } catch (e) {
        console.error('LocalStorage not available:', e);
    }
    
    // Apply initial state
    updateKindleModeUI();
    updateThemeUI();
    updateFontScaleUI();
    updateGenZModeUI();
    
    // Kindle mode toggle handler
    if (kindleToggleBtn) {
        kindleToggleBtn.addEventListener('click', () => {
            isKindleMode = !isKindleMode;
            try {
                localStorage.setItem('kindle-mode', isKindleMode);
            } catch (e) {}
            updateKindleModeUI();
        });
    }
    
    // Gen Z translation toggle handler
    if (genZToggleBtn) {
        genZToggleBtn.addEventListener('click', () => {
            isGenZMode = !isGenZMode;
            try {
                localStorage.setItem('genz-mode', isGenZMode);
            } catch (e) {}
            updateGenZModeUI();
        });
    }
    
    // Theme toggle handler (only applicable when not in Kindle mode)
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            if (isKindleMode) return; // Ignore clicks in Kindle Mode
            
            if (root.classList.contains('dark-theme')) {
                currentTheme = 'light';
                root.classList.remove('dark-theme');
                root.classList.add('light-theme');
            } else if (root.classList.contains('light-theme')) {
                currentTheme = 'dark';
                root.classList.remove('light-theme');
                root.classList.add('dark-theme');
            } else {
                // System default, determine current and switch
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                currentTheme = prefersDark ? 'light' : 'dark';
                root.classList.add(currentTheme + '-theme');
            }
            
            try {
                localStorage.setItem('site-theme', currentTheme);
            } catch (e) {}
            updateThemeUI();
        });
    }
    
    // Font scale handlers (primarily for Kindle/E-Ink Mode)
    if (fontSizeDecreaseBtn) {
        fontSizeDecreaseBtn.addEventListener('click', () => {
            if (fontScale > 0.8) {
                fontScale -= 0.1;
                saveFontScale();
            }
        });
    }
    
    if (fontSizeIncreaseBtn) {
        fontSizeIncreaseBtn.addEventListener('click', () => {
            if (fontScale < 1.6) {
                fontScale += 0.1;
                saveFontScale();
            }
        });
    }
    
    function saveFontScale() {
        try {
            localStorage.setItem('font-scale', fontScale.toFixed(1));
        } catch (e) {}
        updateFontScaleUI();
    }
    
    function updateKindleModeUI() {
        if (isKindleMode) {
            body.classList.add('kindle-mode');
            if (kindleToggleBtn) {
                kindleToggleBtn.textContent = 'Modern Web Mode';
                kindleToggleBtn.setAttribute('aria-label', 'Switch to standard web mode');
                kindleToggleBtn.setAttribute('aria-pressed', 'true');
            }
            if (themeToggleBtn) {
                themeToggleBtn.style.display = 'none'; // Hide light/dark toggle in Kindle Mode
            }
        } else {
            body.classList.remove('kindle-mode');
            if (kindleToggleBtn) {
                kindleToggleBtn.textContent = 'Kindle / E-Ink Mode';
                kindleToggleBtn.setAttribute('aria-label', 'Switch to high-contrast Kindle mode');
                kindleToggleBtn.setAttribute('aria-pressed', 'false');
            }
            if (themeToggleBtn) {
                themeToggleBtn.style.display = 'inline-flex';
            }
            updateThemeUI();
        }
    }
    
    function updateThemeUI() {
        if (isKindleMode) return;
        
        // Remove classes
        root.classList.remove('light-theme', 'dark-theme');
        
        if (currentTheme === 'light') {
            root.classList.add('light-theme');
            if (themeToggleBtn) {
                themeToggleBtn.textContent = 'Dark';
                themeToggleBtn.setAttribute('aria-label', 'Switch to dark mode');
                themeToggleBtn.setAttribute('aria-pressed', 'false');
            }
        } else if (currentTheme === 'dark') {
            root.classList.add('dark-theme');
            if (themeToggleBtn) {
                themeToggleBtn.textContent = 'Light';
                themeToggleBtn.setAttribute('aria-label', 'Switch to light mode');
                themeToggleBtn.setAttribute('aria-pressed', 'true');
            }
        } else {
            // System Default
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (themeToggleBtn) {
                themeToggleBtn.textContent = prefersDark ? 'Light' : 'Dark';
                themeToggleBtn.setAttribute('aria-label', prefersDark ? 'Switch to light mode' : 'Switch to dark mode');
                themeToggleBtn.setAttribute('aria-pressed', prefersDark ? 'true' : 'false');
            }
        }
    }
    
    function updateFontScaleUI() {
        body.style.setProperty('--font-scale', fontScale);
    }

    function updateGenZModeUI() {
        body.classList.toggle('genz-mode', isGenZMode);
        if (genZToggleBtn) {
            genZToggleBtn.textContent = isGenZMode ? 'Original' : 'Gen Z';
            genZToggleBtn.setAttribute('aria-label', isGenZMode ? 'Restore original page text' : 'Translate page to Gen Z speak');
            genZToggleBtn.setAttribute('aria-pressed', isGenZMode ? 'true' : 'false');
        }

        const walker = document.createTreeWalker(
            document.querySelector('main') || body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                    if (shouldSkipTranslation(node.parentElement)) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);

        for (const node of textNodes) {
            if (!originalTextNodes.has(node)) {
                originalTextNodes.set(node, node.nodeValue);
            }
            const original = originalTextNodes.get(node);
            node.nodeValue = isGenZMode ? translateToGenZ(original, node.parentElement) : original;
        }
    }

    function shouldSkipTranslation(element) {
        return Boolean(element && element.closest([
            'code',
            'pre',
            'kbd',
            'script',
            'style',
            'svg',
            'canvas',
            '.chapter-meta',
            '.chapter-navigation',
            '.sources-list'
        ].join(',')));
    }

    function translateToGenZ(text, element) {
        const trimmed = text.trim();
        if (!trimmed) return text;

        let translated = text
            .replace(/\bArtificial Intelligence\b/g, 'AI')
            .replace(/\bartificial intelligence\b/g, 'AI')
            .replace(/\bLarge Language Models\b/g, 'LLMs')
            .replace(/\blarge language models\b/g, 'LLMs')
            .replace(/\bunderstand\b/gi, 'get')
            .replace(/\bUnderstanding\b/g, 'Getting')
            .replace(/\bExplore\b/g, 'Vibe-check')
            .replace(/\bexplore\b/g, 'vibe-check')
            .replace(/\bLearn\b/g, 'Lock in on')
            .replace(/\blearn\b/g, 'lock in on')
            .replace(/\bCreating\b/g, 'Cooking up')
            .replace(/\bcreating\b/g, 'cooking up')
            .replace(/\brequires\b/gi, 'needs')
            .replace(/\bjourney\b/gi, 'arc')
            .replace(/\bhelpful\b/gi, 'solid')
            .replace(/\bmultiple\b/gi, 'a bunch of')
            .replace(/\bdivided\b/gi, 'split')
            .replace(/\bimportant\b/gi, 'key')
            .replace(/\bpowerful\b/gi, 'cracked')
            .replace(/\befficient\b/gi, 'low-key efficient')
            .replace(/\bfast\b/gi, 'speedy')
            .replace(/\bdifficult\b/gi, 'rough')
            .replace(/\bcomplex\b/gi, 'big-brain')
            .replace(/\bexcellent\b/gi, 'goated')
            .replace(/\bsignificant\b/gi, 'major')
            .replace(/\badvancements\b/gi, 'glow-ups')
            .replace(/\bbreakthroughs\b/gi, 'glow-ups')
            .replace(/\bstate-of-the-art\b/gi, 'frontier-tier');

        const leading = text.match(/^\s*/)[0];
        const content = translated.trim();
        const trailing = text.match(/\s*$/)[0];
        const hasInlineMarkup = element && [...element.childNodes].some(child => child.nodeType === Node.ELEMENT_NODE);
        const isInlineElement = element && ['A', 'EM', 'STRONG', 'SPAN'].includes(element.tagName);

        if (content.length < 14 || hasInlineMarkup || isInlineElement || /^(Chapter|Previous|Next|First)$/i.test(content)) {
            return translated;
        }

        const prefix = chooseGenZPrefix(content);
        const ending = chooseGenZEnding(content);
        const withPrefix = prefix && !/^(Basically|Low-key|Real talk|Big picture),/i.test(content)
            ? `${prefix}${content.charAt(0).toLowerCase()}${content.slice(1)}`
            : content;

        return `${leading}${applyEnding(withPrefix, ending)}${trailing}`;
    }

    function chooseGenZPrefix(content) {
        const prefixes = ['Basically, ', 'Low-key, ', 'Real talk, ', 'Big picture, '];
        return prefixes[content.length % prefixes.length];
    }

    function chooseGenZEnding(content) {
        const endings = [' no cap.', ' fr.', ' and it kind of slaps.', ''];
        return endings[content.length % endings.length];
    }

    function applyEnding(content, ending) {
        if (!ending || /[?!:]$/.test(content) || /\b(no cap|fr|slaps)\.?$/i.test(content)) {
            return content;
        }
        return content.replace(/[.。]?$/, ending);
    }
});
