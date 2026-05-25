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

    initGame();

    function initGame() {
        const game = document.getElementById('ai-game');
        if (!game) return;

        const scenarios = [
            {
                chapter: 'Chapter 1: Transformers',
                title: 'A sentence has two meanings for one word.',
                prompt: 'Your model reads: "The bank robber ran to the river bank." Which mechanism lets it connect each use of "bank" to the right surrounding words?',
                source: 'chapters/chapter1-transformers.html',
                choices: [
                    ['Self-attention with Query, Key, and Value vectors', true, 'Correct. Attention compares each token with the surrounding tokens, so "robber" and "river" can pull the two meanings apart.'],
                    ['A larger static dictionary', false, 'A dictionary lists meanings, but it does not decide which meaning fits this sentence.'],
                    ['More image training data', false, 'Images can help multimodal models, but this is a language context problem.']
                ]
            },
            {
                chapter: 'Chapter 2: Training',
                title: 'A base model keeps completing instead of helping.',
                prompt: 'It can predict text well, but it does not follow instructions reliably. What training stage turns it into an assistant?',
                source: 'chapters/chapter2-llms.html',
                choices: [
                    ['Supervised fine-tuning on prompt-response examples', true, 'Correct. SFT teaches the model the interaction pattern: read the user request and answer helpfully.'],
                    ['Only increasing the context window', false, 'A longer prompt gives more room, but it does not teach assistant behavior by itself.'],
                    ['Quantizing the weights', false, 'Quantization makes inference cheaper; it does not align behavior.']
                ]
            },
            {
                chapter: 'Chapter 3: RAG',
                title: 'The answer depends on a new policy PDF.',
                prompt: 'The model was trained before the policy changed, and the source is private. What should the app do before generating?',
                source: 'chapters/chapter3-rag.html',
                choices: [
                    ['Retrieve the relevant chunks and place them in context', true, 'Correct. RAG grounds the answer in fresh private evidence instead of asking the model to guess.'],
                    ['Ask the model to remember harder', false, 'Parametric memory cannot access a private file it never saw.'],
                    ['Use diffusion to denoise the PDF', false, 'Diffusion is useful for generative media, not policy retrieval.']
                ]
            },
            {
                chapter: 'Chapter 4: Efficiency',
                title: 'The model is huge but most tokens are simple.',
                prompt: 'You want more total capacity without paying dense-model compute on every token. Which architecture helps?',
                source: 'chapters/chapter4-moe.html',
                choices: [
                    ['Mixture of Experts with sparse routing', true, 'Correct. The router activates only a few experts per token, reducing active compute while preserving large capacity.'],
                    ['A bigger dense feed-forward network', false, 'That raises capacity, but every token still pays for the larger network.'],
                    ['A longer prompt template', false, 'Prompting can guide behavior, but it does not reduce per-token compute.']
                ]
            },
            {
                chapter: 'Chapter 5: Diffusion',
                title: 'You need to generate an image from text.',
                prompt: 'The system starts from random noise and repeatedly removes predicted noise under prompt guidance. What family of models is this?',
                source: 'chapters/chapter5-diffusion.html',
                choices: [
                    ['Diffusion models', true, 'Correct. Diffusion generation is a learned denoising loop, often running in latent space for efficiency.'],
                    ['A vector database', false, 'A vector database retrieves existing chunks; it does not synthesize images.'],
                    ['A reward model', false, 'Reward models score outputs during alignment; they do not generate the pixels.']
                ]
            },
            {
                chapter: 'Chapter 6: Agents',
                title: 'The task needs live weather and arithmetic.',
                prompt: 'The model should not guess tomorrow\'s forecast or multiply large numbers in text. What should the host application provide?',
                source: 'chapters/chapter6-agents.html',
                choices: [
                    ['Tool calls for weather and calculation', true, 'Correct. Tool use lets the model delegate exact or live operations to reliable external systems.'],
                    ['A prettier answer style', false, 'Tone does not fix stale data or exact arithmetic.'],
                    ['A lower token limit', false, 'A smaller context usually makes complex tasks harder, not safer.']
                ]
            },
            {
                chapter: 'Chapter 7: Frontiers',
                title: 'The problem is hard enough to justify extra thinking.',
                prompt: 'A coding agent must inspect files, run tests, repair failures, and continue until the work is done. Which frontier pattern fits?',
                source: 'chapters/chapter7-frontiers.html',
                choices: [
                    ['Test-time compute in an agent loop', true, 'Correct. The system spends extra inference-time work on planning, acting, observing, and revising.'],
                    ['One immediate next-token answer', false, 'A single pass is fast, but it is brittle for long workflows with feedback.'],
                    ['Training only on unverified synthetic data', false, 'Unverified synthetic loops can compound errors; useful synthetic data needs checks.']
                ]
            }
        ];

        const roundEl = document.getElementById('game-round');
        const scoreEl = document.getElementById('game-score');
        const healthEl = document.getElementById('game-health');
        const chapterEl = document.getElementById('game-chapter');
        const titleEl = document.getElementById('game-title');
        const scenarioEl = document.getElementById('game-scenario');
        const choicesEl = document.getElementById('game-choices');
        const feedbackEl = document.getElementById('game-feedback');
        const resultEl = document.getElementById('game-result');
        const explanationEl = document.getElementById('game-explanation');
        const sourceEl = document.getElementById('game-source');
        const nextBtn = document.getElementById('game-next');
        const restartBtn = document.getElementById('game-restart');

        let round = 0;
        let score = 0;
        let answered = false;

        renderRound();

        choicesEl.addEventListener('click', (event) => {
            const button = event.target;
            if (!button || answered) return;
            if (button.tagName !== 'BUTTON' || !button.hasAttribute('data-choice')) return;
            answer(Number(button.getAttribute('data-choice')));
        });

        nextBtn.addEventListener('click', () => {
            if (round < scenarios.length - 1) {
                round += 1;
                renderRound();
            } else {
                renderSummary();
            }
        });

        restartBtn.addEventListener('click', () => {
            round = 0;
            score = 0;
            renderRound();
        });

        function renderRound() {
            const current = scenarios[round];
            answered = false;
            roundEl.textContent = (round + 1) + ' / ' + scenarios.length;
            scoreEl.textContent = String(score);
            healthEl.textContent = getHealth();
            chapterEl.textContent = current.chapter;
            titleEl.textContent = current.title;
            scenarioEl.textContent = current.prompt;
            sourceEl.href = current.source;
            sourceEl.textContent = 'Review ' + current.chapter;
            feedbackEl.hidden = true;
            nextBtn.hidden = true;
            nextBtn.textContent = round === scenarios.length - 1 ? 'Show Score' : 'Next Round';

            const fragment = document.createDocumentFragment();
            choicesEl.textContent = '';
            current.choices.forEach((choice, index) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'choice-button';
                button.setAttribute('data-choice', String(index));
                button.textContent = choice[0];
                fragment.appendChild(button);
            });
            choicesEl.appendChild(fragment);
        }

        function answer(index) {
            const current = scenarios[round];
            const selected = current.choices[index];
            const buttons = choicesEl.querySelectorAll('.choice-button');
            answered = true;

            if (selected[1]) score += 1;

            for (let i = 0; i < buttons.length; i += 1) {
                buttons[i].disabled = true;
                if (current.choices[i][1]) buttons[i].classList.add('correct');
            }
            if (!selected[1]) buttons[index].classList.add('incorrect');

            scoreEl.textContent = String(score);
            healthEl.textContent = getHealth();
            resultEl.textContent = selected[1] ? 'Good system call.' : 'That design would be risky.';
            explanationEl.textContent = selected[2];
            feedbackEl.hidden = false;
            nextBtn.hidden = false;
            nextBtn.focus();
        }

        function renderSummary() {
            answered = true;
            roundEl.textContent = scenarios.length + ' / ' + scenarios.length;
            scoreEl.textContent = String(score);
            healthEl.textContent = getHealth();
            chapterEl.textContent = 'Complete';
            titleEl.textContent = score >= 6 ? 'Production-ready instincts' : 'Review, then replay';
            scenarioEl.textContent = 'Final score: ' + score + ' of ' + scenarios.length + '. ' + getSummary();
            choicesEl.textContent = '';
            feedbackEl.hidden = true;
            nextBtn.hidden = true;
        }

        function getHealth() {
            if (score >= 6) return 'Robust';
            if (score >= 4) return 'Stable';
            if (score >= 2) return 'Needs Review';
            return 'Fragile';
        }

        function getSummary() {
            if (score >= 6) return 'You matched most scenarios to the right AI system pattern.';
            if (score >= 4) return 'You have the core map. Revisit the missed chapters to tighten the tradeoffs.';
            return 'Start with Transformers, RAG, and Agents. Those three unlock most of the guide.';
        }
    }
});
