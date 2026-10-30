import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { t } from '../src/i18n';

// UI text lives in src/i18n.ts. These patterns catch text written inline in components instead.
const SRC = join(__dirname, '..', 'src');
const INLINE_TEXT: [string, RegExp][] = [
  // After an opening or closing tag, up to the next tag or the end of the line. A `<` right after a name is a generic, not a tag.
  ['text after a tag', /(?<![\w.])<\/?[A-Za-z][^<>]*>[^<>{}]*\p{L}[^<>{}]*(<|$)/u],
  ['text alone on a JSX line', /^\s*\p{L}[\p{L} .'’!?…:-]*$/u],
  ['text attribute', /\b(placeholder|aria-label|title|alt)=["'][^"']*\p{L}/u],
  // A JSX child expression, such as {copied ? 'Copied' : 'Copy'}.
  ['string literal in a JSX child', /^\s*\{[^}]*(\?|:|&&|\|\|)\s*(['"`])[^'"`]*\p{L}[^'"`]*\2|^\s*\{\s*(['"`])[^'"`]*\p{L}[^'"`]*\3\s*\}/u],
  // A text attribute with an expression, such as aria-label={dark ? 'Light theme' : 'Dark theme'}.
  ['string literal in a text attribute', /\b(placeholder|aria-label|title|alt)=\{[^}]*(\?|:|&&|\|\|)\s*(['"`])[^'"`]*\p{L}[^'"`]*\3/u],
];

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return path.endsWith('.tsx') ? [path] : [];
  });
}

// Values of these attributes are not UI text, so they are cut out before checking a line.
const NON_TEXT_ATTR = /\b(className|key|id|style|type|href|rel|target|role)=(\{`[^`]*`\}|\{\{[^}]*\}\}|\{[^}]*\}|"[^"]*"|'[^']*')/g;

function findInlineText(source: string): string[] {
  return source.split('\n').flatMap((raw, i) => {
    // Object literals such as { title: s.addTitle, cmd: `/plugin …` } hold commands, not UI text.
    if (/^\s*\{\s*\w+:/.test(raw)) return [];
    const line = raw.replace(NON_TEXT_ATTR, '');
    return INLINE_TEXT.filter(([, re]) => re.test(line)).map(([what]) => `${i + 1}: ${what}: ${raw.trim()}`);
  });
}

describe('i18n', () => {
  it('keeps UI text out of components', () => {
    const problems = tsxFiles(SRC).flatMap((file) => findInlineText(readFileSync(file, 'utf8')).map((p) => `${relative(SRC, file)}:${p}`));
    expect(problems).toEqual([]);
  });

  it('detects inline text', () => {
    expect(findInlineText('<h1>Hello world</h1>')).toHaveLength(1);
    expect(findInlineText('<span className="ok">✓</span> Copied to clipboard')).toHaveLength(1);
    expect(findInlineText('<a className="x" href={url} target="_blank">GitHub</a>')).toHaveLength(1);
    expect(findInlineText('const byName = (a, b) => a.name.localeCompare(b.name);')).toEqual([]);
    expect(findInlineText('const ref = useRef<HTMLInputElement>(null);')).toEqual([]);
    expect(findInlineText('  <button>\n    Reset filters\n  </button>')).toHaveLength(1);
    expect(findInlineText('<input placeholder="Search…" />')).toHaveLength(1);
    expect(findInlineText("        {copied ? 'Copied' : t.common.copyInstall}")).toHaveLength(1);
    expect(findInlineText("aria-label={dark ? 'Light theme' : t.header.toDarkTheme}")).toHaveLength(1);
    expect(findInlineText("const next = theme === 'dark' ? 'light' : 'dark';")).toEqual([]);
    expect(findInlineText("aria-label={theme === 'dark' ? t.header.toLightTheme : t.header.toDarkTheme}")).toEqual([]);
    expect(findInlineText('<h1>{t.home.titleLine1}</h1>')).toEqual([]);
    expect(findInlineText("<span className={`step${copied ? ' copied' : ''}`} />")).toEqual([]);
  });

  it('has a label for every kind', () => {
    for (const k of ['plugin', 'skill', 'agent', 'command', 'hook', 'mcp'] as const) {
      expect(t.kinds.label[k]).toBeTruthy();
      expect(t.kinds.plural[k]).toBeTruthy();
    }
  });
});
