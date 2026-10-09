import { describe, expect, it } from 'vitest';
import { interpretQuery } from '../src/services/queryInterpreter.js';

describe('interpretQuery', () => {
  it('maps a plain-language need to categories and keywords', () => {
    const result = interpretQuery("I can't pay rent and I'm running low on food");
    expect(result.categories).toEqual(['Housing', 'Food']);
    expect(result.keywords).toEqual(['rent', 'food']);
  });

  it('returns only [a-z0-9] keywords so they are safe in a tsquery', () => {
    const { keywords } = interpretQuery("food'); DROP TABLE verified_resources; -- & | !");
    for (const k of keywords) expect(k).toMatch(/^[a-z0-9]+$/);
  });

  it('returns no categories for unrelated text', () => {
    expect(interpretQuery('xyzzy quux').categories).toEqual([]);
  });

  it('caps the number of keywords', () => {
    const query = Array.from({ length: 30 }, (_, i) => `word${i}`).join(' ');
    expect(interpretQuery(query).keywords).toHaveLength(10);
  });
});
