import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'index.html',
  'game.html',
  ...readdirSync(path.join(root, 'chapters'))
    .filter((file) => file.endsWith('.html'))
    .sort()
    .map((file) => path.join('chapters', file)),
];

for (const rel of files) {
  const source = path.join(root, rel);
  const target = path.join(root, 'genz', rel);
  const html = readFileSync(source, 'utf8');
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, buildGenZPage(html, rel));
}

console.log(`Generated ${files.length} static Gen Z pages.`);

function buildGenZPage(html, rel) {
  let output = translateHtml(html);
  output = output.replace(/<html lang="en">/, '<html lang="en" class="genz-static">');
  output = output.replace(/<title>(.*?)<\/title>/, '<title>$1 — Gen Z Edition</title>');
  output = output.replace(
    /(<meta name="description" content=")([^"]*)(")/,
    (_, start, content, end) => `${start}${escapeAttribute(translatePlainText(content))}${end}`
  );
  output = rewriteStaticAssets(output, rel);
  output = rewriteGenZControl(output, rel);
  output = rewriteInternalLinks(output, rel);
  return output;
}

function translateHtml(html) {
  const tokens = html.split(/(<[^>]+>)/g);
  const tagStack = [];
  const classStack = [];

  return tokens.map((token) => {
    if (!token) return token;
    if (token.startsWith('<')) {
      trackTag(token, tagStack, classStack);
      return token;
    }
    if (isSkipped(tagStack, classStack)) return token;
    return translatePlainText(token);
  }).join('');
}

function trackTag(token, tagStack, classStack) {
  const close = token.match(/^<\/\s*([a-z0-9-]+)/i);
  if (close) {
    const name = close[1].toLowerCase();
    const idx = tagStack.lastIndexOf(name);
    if (idx !== -1) {
      tagStack.splice(idx);
      classStack.splice(idx);
    }
    return;
  }

  const open = token.match(/^<\s*([a-z0-9-]+)/i);
  if (!open || /\/\s*>$/.test(token) || /^<!/.test(token)) return;

  tagStack.push(open[1].toLowerCase());
  classStack.push(getClassNames(token));
}

function getClassNames(token) {
  const match = token.match(/\sclass="([^"]*)"/i);
  return match ? match[1].split(/\s+/).filter(Boolean) : [];
}

function isSkipped(tagStack, classStack) {
  const skippedTags = new Set(['code', 'pre', 'kbd', 'script', 'style', 'svg', 'canvas']);
  if (tagStack.some((tag) => skippedTags.has(tag))) return true;

  const skippedClasses = new Set(['chapter-meta', 'chapter-navigation', 'sources-list', 'controls']);
  return classStack.some((classes) => classes.some((className) => skippedClasses.has(className)));
}

function translatePlainText(text) {
  if (!text.trim()) return text;

  return text
    .replace(/\bArtificial Intelligence\b/g, 'AI')
    .replace(/\bartificial intelligence\b/g, 'AI')
    .replace(/\bLarge Language Models\b/g, 'LLMs')
    .replace(/\blarge language models\b/g, 'LLMs')
    .replace(/\bUnderstanding\b/g, 'Getting')
    .replace(/\bunderstand\b/gi, 'get')
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
}

function rewriteStaticAssets(html, rel) {
  if (isTopLevel(rel)) {
    return html
      .replaceAll('href="style.css"', 'href="../style.css"')
      .replaceAll('src="app.js"', 'src="../app.js"');
  }

  return html
    .replaceAll('href="../style.css"', 'href="../../style.css"')
    .replaceAll('src="../app.js"', 'src="../../app.js"');
}

function rewriteGenZControl(html, rel) {
  const originalHref = isTopLevel(rel) ? `../${rel}` : `../../${rel}`;
  return html.replace(
    /<a href="[^"]*" class="btn-icon genz-link" aria-label="[^"]+">Gen Z<\/a>/,
    `<a href="${originalHref}" class="btn-icon genz-link active" aria-label="Read the original version">Original</a>`
  );
}

function rewriteInternalLinks(html, rel) {
  if (isTopLevel(rel)) {
    return html
      .replaceAll('href="index.html"', 'href="index.html"')
      .replaceAll('href="game.html"', 'href="game.html"')
      .replaceAll('href="chapters/', 'href="chapters/');
  }

  return html
    .replaceAll('href="../index.html"', 'href="../index.html"')
    .replaceAll('href="chapter', 'href="chapter');
}

function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

function isTopLevel(rel) {
  return !rel.includes(path.sep) && !rel.includes('/');
}
