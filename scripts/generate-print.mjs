import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chapterDir = path.join(root, 'chapters');
const chapterFiles = readdirSync(chapterDir)
  .filter((file) => /^chapter\d+-.*\.html$/.test(file))
  .sort((a, b) => getChapterNumber(a) - getChapterNumber(b));

const chapters = chapterFiles.map((file) => {
  const rel = `chapters/${file}`;
  const html = readFileSync(path.join(root, rel), 'utf8');
  const title = extract(html, /<h1>([\s\S]*?)<\/h1>/, rel);
  const article = extract(html, /<article class="chapter-body">([\s\S]*?)<\/article>/, rel);
  return {
    id: file.replace(/\.html$/, ''),
    rel,
    title: stripTags(title),
    article
  };
});

const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Single-Page Edition — AI 101 Guide</title>
    <meta name="description" content="A complete single-page, printable edition of the AI 101 Guide for Kindle, e-ink, browser printing, and EPUB-style reading.">
    <link rel="stylesheet" href="style.css">
</head>
<body class="print-edition">
    <header>
        <div class="header-container">
            <div class="logo-section">
                <a href="index.html" class="logo-link">AI 101 <span class="logo-badge">PRINT</span></a>
            </div>
            <div class="controls">
                <div class="font-scale-controls">
                    <button id="font-decrease" class="btn-scale" title="Decrease Font Size" aria-label="Decrease font size">A−</button>
                    <button id="font-increase" class="btn-scale" title="Increase Font Size" aria-label="Increase font size">A+</button>
                </div>
                <a href="index.html" class="btn-icon" aria-label="Read the AI guide">Guide</a>
                <a href="glossary.html" class="btn-icon" aria-label="Open the AI glossary">Glossary</a>
                <a href="game.html" class="btn-icon" aria-label="Play the AI systems game">Play</a>
                <a href="genz/print.html" class="btn-icon genz-link" aria-label="Read the Gen Z version">Gen Z</a>
                <button id="theme-toggle" class="btn-icon" aria-label="Switch to dark mode" aria-pressed="false">Dark</button>
                <button id="kindle-toggle" class="btn-icon" aria-label="Switch to high-contrast Kindle mode" aria-pressed="false">Kindle / E-Ink</button>
            </div>
        </div>
    </header>

    <main class="animated">
        <section class="hero">
            <p class="eyebrow">Printable edition</p>
            <h1>AI 101 Guide</h1>
            <p>A complete single-page edition assembled from the canonical chapters. Use browser print, save as PDF, or read it as one continuous Kindle-friendly document.</p>
            <p class="hero-actions">
                <a href="index.html" class="btn-secondary">Table of Contents</a>
                <a href="glossary.html" class="btn-secondary">Glossary</a>
            </p>
        </section>

        <nav class="print-toc" aria-labelledby="print-toc-heading">
            <h2 id="print-toc-heading">Contents</h2>
            <ol>
${chapters.map((chapter) => `                <li><a href="#${chapter.id}">${escapeHtml(chapter.title)}</a></li>`).join('\n')}
            </ol>
        </nav>

${chapters.map((chapter) => `        <section class="print-chapter" id="${chapter.id}">
            ${rewriteChapterLinks(chapter.article)}
        </section>`).join('\n\n')}
    </main>

    <footer>
        <p>AI 101 Guide — Optimized for Kindle Web Browser.</p>
        <p>Generated from the canonical chapter files.</p>
        <p>If you have feedback, email us at <a href="mailto:ai@puma.tech">ai@puma.tech</a></p>
    </footer>

    <script src="app.js"></script>
</body>
</html>
`;

writeFileSync(path.join(root, 'print.html'), printHtml);
console.log(`Generated print.html with ${chapters.length} chapters.`);

function extract(html, pattern, rel) {
  const match = html.match(pattern);
  if (!match) throw new Error(`Could not extract content from ${rel}`);
  return match[1].trim();
}

function getChapterNumber(file) {
  const match = file.match(/^chapter(\d+)-/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function rewriteChapterLinks(html) {
  return html
    .replaceAll('href="../index.html"', 'href="index.html"')
    .replaceAll('href="../glossary.html"', 'href="glossary.html"')
    .replaceAll('href="chapter', 'href="chapters/chapter');
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
