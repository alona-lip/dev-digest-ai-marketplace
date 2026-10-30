import { describe, expect, it } from 'vitest';
import { parseQuery, tokenize } from '../src/lib/query';

describe('parseQuery', () => {
  it('drops English stopwords and turns kind words into filters', () => {
    expect(parseQuery('I need a skill for code review')).toEqual({ groups: [['code'], ['review']], kinds: ['skill'], kindWords: ['skill'] });
  });

  it('handles Ukrainian stopwords, inflected kind words and synonyms', () => {
    const q = parseQuery('Мені треба скіл для перевірки коду');
    expect(q.kinds).toEqual(['skill']);
    expect(q.groups[0]).toEqual(['перевірки', 'check', 'verify', 'validate', 'test']);
    expect(q.groups[1]).toEqual(['коду', 'code']);
  });

  it('normalizes apostrophes', () => {
    expect(tokenize('рев’ю')).toEqual(["рев'ю"]);
    expect(parseQuery('рев’ю').groups).toEqual([["рев'ю", 'review']]);
  });

  it('returns only kinds for kind-only queries', () => {
    expect(parseQuery('агенти')).toEqual({ groups: [], kinds: ['agent'], kindWords: ['агенти'] });
  });
});
