import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlFiles = collectHtml(root);
const errors = [];

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const rel = path.relative(root, file);

  check(!html.includes('**'), rel, 'contains Markdown bold markers; use <strong> in HTML');
  check(/<html\s+lang="en"/.test(html), rel, 'is missing <html lang="en">');
  check(/<meta\s+name="viewport"/.test(html), rel, 'is missing a viewport meta tag');
  check(/<title>[^<]+<\/title>/.test(html), rel, 'is missing a title');
  check(/<meta\s+name="description"/.test(html), rel, 'is missing a meta description');
  check(/<script\s+src="[^"]*app\.js"/.test(html), rel, 'does not load app.js');
  check(/class="[^"]*\bgenz-link\b/.test(html), rel, 'is missing the Gen Z/static original link');

  for (const href of extractAttributes(html, 'href')) {
    if (isExternal(href) || href.startsWith('mailto:') || href.startsWith('#')) continue;
    const target = path.resolve(path.dirname(file), href.split('#')[0]);
    check(existsSync(target), rel, `links to missing file: ${href}`);
  }

  for (const src of extractAttributes(html, 'src')) {
    if (isExternal(src) || src.startsWith('data:')) continue;
    const target = path.resolve(path.dirname(file), src.split('#')[0]);
    check(existsSync(target), rel, `references missing asset: ${src}`);
  }

  for (const button of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const attrs = button[1];
    const text = stripTags(button[2]).trim();
    const hasLabel = /aria-label=/.test(attrs) || text.length > 0;
    check(hasLabel, rel, `has an unlabeled button: ${button[0].slice(0, 80)}...`);
  }

  if (isTechnicalChapter(rel)) {
    check(html.includes('Last reviewed: May 2026'), rel, 'is missing last reviewed metadata');
    check(html.includes('class="sources-list"'), rel, 'is missing a sources list');
  }
}

if (errors.length > 0) {
  console.error(`Validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validated ${htmlFiles.length} HTML files.`);

function collectHtml(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === '.git' || entry === 'node_modules') continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...collectHtml(full));
    } else if (entry.endsWith('.html')) {
      out.push(full);
    }
  }
  return out.sort();
}

function extractAttributes(html, attr) {
  return [...html.matchAll(new RegExp(`${attr}="([^"]+)"`, 'g'))].map((match) => match[1]);
}

function isExternal(value) {
  return /^https?:\/\//.test(value) || value.startsWith('//');
}

function isTechnicalChapter(rel) {
  const normalized = rel.split(path.sep).join('/');
  return normalized.includes('chapters/chapter');
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, '');
}

function check(condition, file, message) {
  if (!condition) errors.push(`${file}: ${message}`);
}
