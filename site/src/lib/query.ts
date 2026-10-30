// Turns a natural-language query ("I need a skill for code review", "мені треба скіл для рев'ю")
// into search term groups plus an optional kind filter.
import type { Kind } from './types';
import { SYNONYM_STEMS } from './synonyms';

export interface ParsedQuery {
  /** Each group must match (AND); words inside a group are alternatives (OR). */
  groups: string[][];
  kinds: Kind[];
  /** The words that were read as kinds, so callers can retry with them as plain terms. */
  kindWords: string[];
}

const STOPWORDS = new Set([
  // English
  'a', 'an', 'the', 'i', 'me', 'my', 'we', 'our', 'need', 'needs', 'want', 'wants', 'looking', 'look', 'find',
  'search', 'some', 'something', 'any', 'for', 'to', 'of', 'with', 'that', 'which', 'can', 'could', 'should',
  'would', 'help', 'helps', 'do', 'does', 'how', 'is', 'are', 'be', 'it', 'in', 'on', 'at', 'and', 'or', 'by',
  'please', 'there', 'what', 'who', 'this', 'from', 'into', 'about', 'use', 'using',
  // Ukrainian
  'мені', 'мене', 'нам', 'треба', 'потрібно', 'потрібен', 'потрібна', 'потрібне', 'потрібні', 'хочу', 'шукаю',
  'знайди', 'знайти', 'покажи', 'дай', 'для', 'який', 'яка', 'яке', 'які', 'щоб', 'що', 'як', 'і', 'й', 'та',
  'в', 'у', 'на', 'з', 'із', 'зі', 'до', 'по', 'це', 'є', 'або', 'чи', 'щось', 'якийсь', 'мати', 'допоможе',
  'допомагає', 'будь', 'ласка',
]);

const KIND_EXACT: Record<string, Kind> = {
  plugin: 'plugin', plugins: 'plugin',
  skill: 'skill', skills: 'skill',
  agent: 'agent', agents: 'agent', subagent: 'agent', subagents: 'agent',
  command: 'command', commands: 'command',
  hook: 'hook', hooks: 'hook',
  mcp: 'mcp',
};

// Ukrainian words are inflected, so kinds and synonyms match by stem.
const KIND_STEMS: [string, Kind][] = [
  ['плагін', 'plugin'], ['плагин', 'plugin'],
  ['скіл', 'skill'], ['навичк', 'skill'],
  ['агент', 'agent'], ['субагент', 'agent'],
  ['команд', 'command'],
  ['хук', 'hook'],
];

export function tokenize(raw: string): string[] {
  return raw
    .toLowerCase()
    .replace(/[’ʼ`]/g, "'")
    .split(/[^\p{L}\p{N}'_-]+/u)
    .map((t) => t.replace(/^['-]+|['-]+$/g, ''))
    .filter(Boolean);
}

function kindOf(token: string): Kind | undefined {
  return KIND_EXACT[token] ?? KIND_STEMS.find(([stem]) => token.startsWith(stem))?.[1];
}

export function synonymsOf(token: string): string[] {
  const out: string[] = [];
  for (const [stem, words] of SYNONYM_STEMS) if (token.startsWith(stem)) out.push(...words);
  return [...new Set(out)];
}

export function parseQuery(raw: string): ParsedQuery {
  const groups: string[][] = [];
  const kinds = new Set<Kind>();
  const kindWords: string[] = [];
  for (const token of tokenize(raw)) {
    const kind = kindOf(token);
    if (kind) {
      kinds.add(kind);
      kindWords.push(token);
      continue;
    }
    if (STOPWORDS.has(token)) continue;
    groups.push([token, ...synonymsOf(token).filter((s) => s !== token)]);
  }
  return { groups, kinds: [...kinds], kindWords };
}
