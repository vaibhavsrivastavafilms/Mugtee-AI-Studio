#!/usr/bin/env node
/**
 * Fix markdownlint issues in *REPORT*.md files:
 * - MD060: aligned tables with spaces around pipes
 * - MD022/MD032/MD031: blank lines around headings, lists, fences
 * - MD040: language tags on fenced code blocks
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function findReportFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
      results.push(...findReportFiles(full));
    } else if (entry.isFile() && /REPORT\.md$/i.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function parseTableRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) return null;
  const inner = trimmed.replace(/^\|/, '').replace(/\|$/, '');
  return inner.split('|').map((c) => c.trim());
}

function isSeparatorRow(cells) {
  return cells.every((c) => /^:?-{3,}:?$/.test(c));
}

function formatTable(rows) {
  const colCount = Math.max(...rows.map((r) => r.length));
  const normalized = rows.map((r) => {
    const copy = [...r];
    while (copy.length < colCount) copy.push('');
    return copy;
  });

  const widths = Array.from({ length: colCount }, (_, i) =>
    Math.max(3, ...normalized.map((r) => r[i].length))
  );

  const formatRow = (cells, isSep = false) => {
    const parts = cells.map((cell, i) => {
      if (isSep) {
        const w = widths[i];
        const left = cell.startsWith(':') ? ':' : '';
        const right = cell.endsWith(':') ? ':' : '';
        const dashLen = Math.max(3, w - left.length - right.length);
        return `${left}${'-'.repeat(dashLen)}${right}`.padEnd(w);
      }
      return cell.padEnd(widths[i]);
    });
    return `| ${parts.join(' | ')} |`;
  };

  return normalized.map((cells, idx) => {
    const isSep = isSeparatorRow(cells);
    return formatRow(cells, isSep);
  });
}

function fixTables(content) {
  const lines = content.split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const cells = parseTableRow(lines[i]);
    if (cells && i + 1 < lines.length) {
      const nextCells = parseTableRow(lines[i + 1]);
      if (nextCells && isSeparatorRow(nextCells)) {
        const tableRows = [cells, nextCells];
        let j = i + 2;
        while (j < lines.length) {
          const rowCells = parseTableRow(lines[j]);
          if (!rowCells) break;
          tableRows.push(rowCells);
          j++;
        }
        out.push(...formatTable(tableRows));
        i = j;
        continue;
      }
    }
    out.push(lines[i]);
    i++;
  }

  return out.join('\n');
}

function inferFenceLanguage(info, body) {
  const t = info.trim().toLowerCase();
  if (t) return info.trim();
  const sample = body.slice(0, 500);
  if (/^\s*[{\[]/.test(sample) && /["']/.test(sample)) return 'json';
  if (/^\s*(import |export |const |let |function |interface |type )/m.test(sample)) return 'ts';
  if (/^\s*(npm |npx |git |cp |rg |curl )/m.test(sample)) return 'bash';
  if (/^\s*<\w+/m.test(sample)) return 'tsx';
  if (/→|✔|PASS|FAIL/.test(sample) && !/[{]/.test(sample)) return 'text';
  return 'text';
}

function fixFences(content) {
  const fenceRe = /^(`{3,})(\w*)\s*$/;
  const lines = content.split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const openMatch = lines[i].match(fenceRe);
    if (openMatch) {
      if (out.length > 0 && out[out.length - 1].trim() !== '') out.push('');
      const marker = openMatch[1];
      let lang = openMatch[2];
      const bodyLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith(marker)) {
        bodyLines.push(lines[i]);
        i++;
      }
      if (!lang) lang = inferFenceLanguage('', bodyLines.join('\n'));
      out.push(`${marker}${lang}`);
      out.push(...bodyLines);
      if (i < lines.length) {
        out.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim() !== '') out.push('');
      continue;
    }
    out.push(lines[i]);
    i++;
  }

  return out.join('\n');
}

function fixBlanksAroundHeadingsAndLists(content) {
  const lines = content.split('\n');
  const out = [];

  const isHeading = (l) => /^#{1,6}\s/.test(l);
  const isList = (l) => /^(\s*[-*+]|\s*\d+\.)\s/.test(l);
  const isBlank = (l) => l.trim() === '';
  const isFence = (l) => /^(`{3,}|~{3,})/.test(l);
  const isTable = (l) => /^\|/.test(l.trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prev = out.length ? out[out.length - 1] : '';
    const next = i + 1 < lines.length ? lines[i + 1] : '';

    if (isHeading(line)) {
      if (prev && !isBlank(prev) && !isFence(prev)) out.push('');
      out.push(line);
      if (next && !isBlank(next) && !isFence(next) && !isHeading(next)) out.push('');
      continue;
    }

    if (isList(line)) {
      const prevIsList = isList(prev);
      if (prev && !isBlank(prev) && !prevIsList && !isFence(prev) && !isTable(prev)) out.push('');
      out.push(line);
      const nextIsList = isList(next);
      if (next && !isBlank(next) && !nextIsList && !isHeading(next) && !isFence(next) && !isTable(next)) {
        out.push('');
      }
      continue;
    }

    out.push(line);
  }

  return out.join('\n');
}

function wrapText(text, width) {
  if (text.length <= width) return [text];
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= width) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function wrapProseLines(content, maxLen = 80) {
  const lines = content.split('\n');
  const out = [];
  let inFence = false;
  let fenceMarker = '';

  for (const line of lines) {
    const fenceOpen = line.match(/^(`{3,}|~{3,})/);
    if (fenceOpen) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fenceOpen[1];
      } else if (line.startsWith(fenceMarker)) {
        inFence = false;
      }
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }
    if (!line.trim()) {
      out.push(line);
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      out.push(line);
      continue;
    }
    if (/^\|/.test(line.trim())) {
      out.push(line);
      continue;
    }
    if (/^>/.test(line)) {
      out.push(line);
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      out.push(line);
      continue;
    }

    const listMatch = line.match(/^(\s*(?:[-*+]|\d+\.)\s+)(.*)/);
    if (listMatch) {
      const [, prefix, text] = listMatch;
      const indent = ' '.repeat(prefix.length);
      wrapText(text, maxLen - prefix.length).forEach((wl, i) => {
        out.push(i === 0 ? prefix + wl : indent + wl);
      });
      continue;
    }

    if (line.length > maxLen) {
      wrapText(line, maxLen).forEach((wl) => out.push(wl));
    } else {
      out.push(line);
    }
  }

  return out.join('\n');
}

function normalizeContent(content) {
  let result = content.replace(/\r\n/g, '\n');
  result = fixTables(result);
  result = fixFences(result);
  result = fixBlanksAroundHeadingsAndLists(result);
  result = wrapProseLines(result);
  result = result.replace(/\n{3,}/g, '\n\n');
  if (!result.endsWith('\n')) result += '\n';
  return result;
}

const files = findReportFiles(root);
let changed = 0;
for (const file of files.sort()) {
  const before = fs.readFileSync(file, 'utf8');
  const after = normalizeContent(before);
  if (before !== after) {
    fs.writeFileSync(file, after, 'utf8');
    changed++;
    console.log('fixed:', path.relative(root, file));
  }
}
console.log(`\nProcessed ${files.length} files, updated ${changed}.`);
