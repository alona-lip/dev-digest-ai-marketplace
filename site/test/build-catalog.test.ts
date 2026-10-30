import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCatalog, buildFeed, parseChangelog, toPlainText } from '../scripts/build-catalog';

const fixture = (name: string) => resolve(__dirname, 'fixtures', name);
const build = (name = 'repo') =>
  buildCatalog({ repoRoot: fixture(name), repo: 'Acme/market', gitDate: () => '', now: new Date('2026-10-30T00:00:00Z') });

describe('buildCatalog', () => {
  const catalog = build();
  const byId = (id: string) => catalog.entries.find((e) => e.id === id)!;

  it('derives repo and site URLs', () => {
    expect(catalog.marketplace).toBe('test-market');
    expect(catalog.repoUrl).toBe('https://github.com/Acme/market');
    expect(catalog.siteUrl).toBe('https://acme.github.io/market/');
  });

  it('reads plugin metadata from plugin.json and the marketplace entry', () => {
    const p = catalog.plugins.demo;
    expect(p).toMatchObject({
      displayName: 'Demo',
      version: '1.2.0',
      description: 'Demo plugin for code review and security checks',
      author: 'Fixture Team',
      category: 'testing',
      keywords: ['review', 'security'],
      deps: ['remote-tool', 'missing-plugin:some-skill'],
      updated: '2026-09-01',
      installText: '/plugin install demo@test-market',
      githubUrl: 'https://github.com/Acme/market/tree/main/plugins/demo',
    });
  });

  it('parses the changelog without Unreleased', () => {
    expect(catalog.plugins.demo.changelog).toEqual([
      { version: '1.2.0', date: '2026-09-01', summary: 'code-review skill; Security agent' },
      { version: '1.0.0', date: '2026-01-15', summary: 'First release.' },
    ]);
  });

  it('indexes every component kind', () => {
    expect(catalog.entries.map((e) => e.id).sort()).toEqual([
      'agent:demo/security-auditor',
      'command:demo/changelog',
      'hook:demo/PreToolUse-Bash',
      'hook:demo/SessionStart',
      'mcp:demo/postgres',
      'plugin:demo',
      'plugin:remote-tool',
      'skill:demo/code-review',
    ]);
  });

  it('builds skills, agents and commands from frontmatter', () => {
    expect(byId('skill:demo/code-review')).toMatchObject({
      displayName: 'Code Review',
      invocation: '/demo:code-review',
      tools: ['Read', 'Grep'],
      keywords: ['review', 'security'],
      installText: '/plugin install demo@test-market',
    });
    expect(byId('agent:demo/security-auditor')).toMatchObject({ invocation: 'demo:security-auditor', tools: ['Read', 'Grep', 'Glob'], model: 'sonnet' });
    expect(byId('command:demo/changelog')).toMatchObject({ name: 'changelog', invocation: '/demo:changelog' });
  });

  it('describes hooks and MCP servers without leaking env values', () => {
    expect(byId('hook:demo/PreToolUse-Bash')).toMatchObject({ displayName: 'PreToolUse · Bash', tools: ['command'] });
    const mcp = byId('mcp:demo/postgres');
    expect(mcp.tools).toEqual(['DATABASE_URL']);
    expect(mcp.bodyText).toContain('npx -y pg-mcp@1.0.0');
    expect(JSON.stringify(catalog)).not.toContain('postgres://secret');
  });

  it('renders markdown safely with links resolved to GitHub', () => {
    const html = catalog.plugins.demo.readmeHtml;
    expect(html).not.toContain('<h1>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('href="https://github.com/Acme/market/blob/main/plugins/demo/docs/guide.md"');
    expect(html).toContain('href="https://github.com/Acme/market/blob/main/plugins/demo/README.md#usage"');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('<table>');
  });

  it('keeps plugins from other repositories with marketplace metadata only', () => {
    expect(catalog.plugins['remote-tool']).toMatchObject({ description: 'Lives in another repository', author: 'fixture-owner', changelog: [] });
  });

  it('handles an empty marketplace', () => {
    const empty = build('empty');
    expect(empty.entries).toEqual([]);
    expect(buildFeed(empty)).toContain('<feed');
  });
});

describe('helpers', () => {
  it('builds an Atom feed with escaped entries', () => {
    const feed = buildFeed(build());
    expect(feed).toContain('<title>Demo v1.2.0</title>');
    expect(feed).toContain('https://acme.github.io/market/#/plugin/demo');
  });

  it('strips markdown to plain text', () => {
    expect(toPlainText('## Title\n\n- **bold** [link](x) `code`\n\n| a | b |\n| --- | --- |')).toBe('Title bold link code a b');
  });

  it('accepts changelog headings without brackets or dates', () => {
    expect(parseChangelog('## v2.0.0\n- Breaking')).toEqual([{ version: '2.0.0', date: '', summary: 'Breaking' }]);
  });
});
