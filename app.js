document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const body = document.body;
    const themeToggleBtn = document.getElementById('theme-toggle');
    const kindleToggleBtn = document.getElementById('kindle-toggle');
    const fontSizeDecreaseBtn = document.getElementById('font-decrease');
    const fontSizeIncreaseBtn = document.getElementById('font-increase');
    
    // Default config values
    let isKindleMode = false;
    let currentTheme = 'system'; // 'system', 'light', 'dark'
    let fontScale = 1.0;
    
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
    } catch (e) {
        console.error('LocalStorage not available:', e);
    }
    
    // Apply initial state
    updateKindleModeUI();
    updateThemeUI();
    updateFontScaleUI();
    
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
});
