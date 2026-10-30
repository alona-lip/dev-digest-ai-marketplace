// Builds public/catalog.json and public/feed.xml from the marketplace sources.
// Runs before `vite dev` and `vite build`; the site never calls the GitHub API at runtime.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Marked } from 'marked';
import YAML from 'yaml';
import type { Catalog, ChangelogEntry, Dependency, Entry, Kind, PluginInfo } from '../src/lib/types';

export interface BuildOptions {
  repoRoot: string;
  /** "owner/name" on GitHub. */
  repo: string;
  branch?: string;
  /** Last commit date (YYYY-MM-DD) for a repo-relative path, or "" when unknown. */
  gitDate?: (relPath: string) => string;
  now?: Date;
}

type Json = Record<string, unknown>;

// ---------- small helpers ----------

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const toList = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(str).filter(Boolean);
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
};
const unique = <T>(xs: T[]): T[] => [...new Set(xs)];

export function titleCase(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

function readJson(path: string): Json | null {
  if (!existsSync(path)) return null;
  const data: unknown = JSON.parse(readFileSync(path, 'utf8'));
  return isObject(data) ? data : null;
}

function readText(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

const isDir = (p: string) => existsSync(p) && statSync(p).isDirectory();

export function parseFrontmatter(src: string): { data: Json; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  if (!m) return { data: {}, body: src };
  const data: unknown = YAML.parse(m[1]);
  return { data: isObject(data) ? data : {}, body: src.slice(m[0].length) };
}

/** Markdown → plain text, good enough for search indexing and summaries. */
export function toPlainText(md: string): string {
  return md
    .replace(/```[^\n]*\n([\s\S]*?)```/g, '$1')
    .replace(/^\s*\|?(\s*:?-{3,}:?\s*\|?)+\s*$/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[`*_~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/**
 * Renders repository markdown to HTML. Raw HTML is escaped, relative links point at GitHub,
 * and only http(s)/mailto links survive.
 */
export function renderMarkdown(md: string, blobBase: string, rawBase: string, fileUrl: string): string {
  const resolveHref = (href: string, base: string): string => {
    if (/^(https?:|mailto:)/i.test(href)) return href;
    if (href.startsWith('#')) return fileUrl + href;
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return '';
    try {
      return new URL(href, base).href;
    } catch {
      return '';
    }
  };
  const marked = new Marked({
    gfm: true,
    walkTokens(token) {
      if (token.type === 'link') token.href = resolveHref(token.href, blobBase);
      if (token.type === 'image') token.href = resolveHref(token.href, rawBase);
    },
    renderer: {
      html({ text }) {
        return escapeHtml(text);
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        if (!href) return text;
        const t = title ? ` title="${escapeHtml(title)}"` : '';
        return `<a href="${escapeHtml(href)}"${t} target="_blank" rel="noopener noreferrer">${text}</a>`;
      },
    },
  });
  return marked.parse(md, { async: false }) as string;
}

export function parseChangelog(md: string): ChangelogEntry[] {
  const out: ChangelogEntry[] = [];
  let current: { version: string; date: string; bullets: string[]; lines: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const parts = current.bullets.length ? current.bullets : current.lines.slice(0, 1);
    out.push({ version: current.version, date: current.date, summary: parts.map(toPlainText).join('; ') });
    current = null;
  };
  for (const line of md.split(/\r?\n/)) {
    const h = /^##\s+\[?([^\]\s]+)\]?(?:\s*[-–—]\s*(\d{4}-\d{2}-\d{2}))?/.exec(line);
    if (h && !line.startsWith('###')) {
      flush();
      if (!/^unreleased$/i.test(h[1])) current = { version: h[1].replace(/^v/, ''), date: h[2] ?? '', bullets: [], lines: [] };
      continue;
    }
    if (!current) continue;
    const b = /^\s*[-*]\s+(.*)$/.exec(line);
    if (b) current.bullets.push(b[1]);
    else if (line.trim() && !line.startsWith('#')) current.lines.push(line.trim());
  }
  flush();
  return out;
}

/** A plugin.json `dependencies` entry: "name", "name@marketplace" or { name, version?, marketplace? }. */
export function parseDependency(value: unknown): Dependency | null {
  let name: string;
  let version = '';
  let marketplace = '';
  if (isObject(value)) {
    name = str(value.name);
    version = str(value.version);
    marketplace = str(value.marketplace);
  } else {
    [name, marketplace = ''] = str(value).split('@');
  }
  if (!name) return null;
  const dep: Dependency = { name };
  if (version) dep.version = version;
  if (marketplace) dep.marketplace = marketplace;
  return dep;
}

function defaultGitDate(repoRoot: string) {
  return (relPath: string): string => {
    try {
      return execFileSync('git', ['log', '-1', '--format=%cs', '--', relPath], { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      return '';
    }
  };
}

// ---------- component discovery ----------

/** Directories (relative to the plugin) given as a string or list in plugin.json, plus the default one. */
function componentPaths(manifest: Json, field: string, fallback: string): string[] {
  return unique([fallback, ...toList(manifest[field])].map((p) => p.replace(/^\.\//, '')));
}

function findSkillFiles(pluginDir: string, paths: string[]): string[] {
  const files: string[] = [];
  for (const p of paths) {
    const dir = join(pluginDir, p);
    if (!isDir(dir)) continue;
    if (existsSync(join(dir, 'SKILL.md'))) {
      files.push(join(dir, 'SKILL.md'));
      continue;
    }
    for (const child of readdirSync(dir).sort()) {
      const f = join(dir, child, 'SKILL.md');
      if (existsSync(f)) files.push(f);
    }
  }
  return unique(files);
}

function findMarkdownFiles(pluginDir: string, paths: string[]): string[] {
  const files: string[] = [];
  for (const p of paths) {
    const target = join(pluginDir, p);
    if (!existsSync(target)) continue;
    if (!isDir(target)) {
      if (target.endsWith('.md')) files.push(target);
      continue;
    }
    for (const child of readdirSync(target).sort()) {
      if (child.endsWith('.md') && child.toLowerCase() !== 'readme.md') files.push(join(target, child));
    }
  }
  return unique(files);
}

/** Collects config objects from a default file plus a plugin.json field that is a path, list of paths, or inline object. */
function collectConfigs(pluginDir: string, manifestValue: unknown, defaultFile: string): { data: Json; file: string }[] {
  const out: { data: Json; file: string }[] = [];
  const add = (file: string) => {
    const data = readJson(join(pluginDir, file));
    if (data) out.push({ data, file });
  };
  add(defaultFile);
  if (isObject(manifestValue)) out.push({ data: manifestValue, file: '.claude-plugin/plugin.json' });
  else for (const p of toList(manifestValue)) if (p.replace(/^\.\//, '') !== defaultFile) add(p.replace(/^\.\//, ''));
  return out;
}

// ---------- main builder ----------

export function buildCatalog(opts: BuildOptions): Catalog {
  const { repoRoot, repo } = opts;
  const branch = opts.branch ?? 'main';
  const gitDate = opts.gitDate ?? defaultGitDate(repoRoot);
  const repoUrl = `https://github.com/${repo}`;
  const [owner, repoName] = repo.split('/');
  const siteUrl = `https://${owner.toLowerCase()}.github.io/${repoName}/`;

  const market = readJson(join(repoRoot, '.claude-plugin', 'marketplace.json'));
  if (!market) throw new Error('.claude-plugin/marketplace.json not found or invalid');
  const marketplace = str(market.name) || repoName;
  const ownerName = isObject(market.owner) ? str(market.owner.name) : '';

  const entries: Entry[] = [];
  const plugins: Record<string, PluginInfo> = {};
  const marketPlugins = Array.isArray(market.plugins) ? market.plugins.filter(isObject) : [];

  for (const mp of marketPlugins) {
    const name = str(mp.name);
    if (!name) continue;
    const source = typeof mp.source === 'string' ? mp.source : '';
    const local = source.startsWith('./');
    const pluginDir = local ? resolve(repoRoot, source) : '';
    const relDir = local ? relative(repoRoot, pluginDir).split('\\').join('/') : '';
    const manifest = (local && readJson(join(pluginDir, '.claude-plugin', 'plugin.json'))) || {};

    const treeUrl = (p = '') => (local ? `${repoUrl}/tree/${branch}/${posix.join(relDir, p)}`.replace(/\/$/, '') : repoUrl);
    const blobUrl = (p: string) => `${repoUrl}/blob/${branch}/${posix.join(relDir, p)}`;
    const rawBase = (p: string) => `https://raw.githubusercontent.com/${repo}/${branch}/${posix.join(relDir, p)}`;
    const md = (src: string, fileRel: string) => {
      const dir = posix.dirname(fileRel);
      // The page header already shows the name, so drop a leading H1.
      src = src.replace(/^\s*#\s[^\n]*\n/, '');
      return renderMarkdown(src, blobUrl(dir) + '/', rawBase(dir) + '/', blobUrl(fileRel));
    };

    const author = isObject(manifest.author) ? str(manifest.author.name) : str(manifest.author) || ownerName;
    const keywords = unique([...toList(manifest.keywords), ...toList(mp.tags), ...toList(mp.keywords)].map((k) => k.toLowerCase()));
    const readme = local ? readText(join(pluginDir, 'README.md')) : '';
    const changelog = local ? parseChangelog(readText(join(pluginDir, 'CHANGELOG.md'))) : [];
    const updated = (local && gitDate(relDir)) || changelog.find((c) => c.date)?.date || '';
    const version = str(manifest.version) || str(mp.version);
    const installText = `/plugin install ${name}@${marketplace}`;
    const deps = (Array.isArray(manifest.dependencies) ? manifest.dependencies : [])
      .map(parseDependency)
      .filter((d): d is Dependency => d !== null);

    const info: PluginInfo = {
      name,
      displayName: str(manifest.displayName) || str(mp.displayName) || titleCase(name),
      description: str(manifest.description) || str(mp.description),
      version,
      author,
      updated,
      category: str(mp.category) || undefined,
      keywords,
      deps,
      readmeHtml: readme ? md(readme, 'README.md') : '',
      changelog,
      githubUrl: treeUrl(),
      installText,
    };
    plugins[name] = info;

    const base = { plugin: name, keywords, author, version, updated, installText };
    entries.push({
      ...base,
      id: `plugin:${name}`,
      kind: 'plugin',
      name,
      displayName: info.displayName,
      description: info.description,
      githubUrl: info.githubUrl,
      invocation: '',
      tools: [],
      bodyText: toPlainText(readme),
      bodyHtml: info.readmeHtml,
    });
    if (!local) continue;

    const rel = (abs: string) => relative(pluginDir, abs).split('\\').join('/');
    const addDoc = (kind: Kind, file: string, fallbackName: string, invocation: (n: string) => string, url: string) => {
      const { data, body } = parseFrontmatter(readFileSync(file, 'utf8'));
      const n = str(data.name) || fallbackName;
      entries.push({
        ...base,
        id: `${kind}:${name}/${n}`,
        kind,
        name: n,
        displayName: str(data.displayName) || titleCase(n),
        description: str(data.description),
        githubUrl: url,
        invocation: invocation(n),
        tools: toList(data['allowed-tools'] ?? data.tools),
        model: str(data.model) || undefined,
        skills: kind === 'agent' ? toList(data.skills) : undefined,
        bodyText: toPlainText(body),
        bodyHtml: md(body, rel(file)),
      });
    };

    for (const f of findSkillFiles(pluginDir, componentPaths(manifest, 'skills', 'skills'))) {
      addDoc('skill', f, basename(dirname(f)), (n) => `/${name}:${n}`, treeUrl(rel(dirname(f))));
    }
    for (const f of findMarkdownFiles(pluginDir, componentPaths(manifest, 'agents', 'agents'))) {
      addDoc('agent', f, basename(f, '.md'), (n) => `${name}:${n}`, blobUrl(rel(f)));
    }
    for (const f of findMarkdownFiles(pluginDir, componentPaths(manifest, 'commands', 'commands'))) {
      addDoc('command', f, basename(f, '.md'), (n) => `/${name}:${n}`, blobUrl(rel(f)));
    }

    const seen = new Set<string>();
    for (const { data, file } of collectConfigs(pluginDir, manifest.hooks, 'hooks/hooks.json')) {
      const events = isObject(data.hooks) ? data.hooks : data;
      for (const [event, groups] of Object.entries(events)) {
        if (!Array.isArray(groups)) continue;
        groups.filter(isObject).forEach((g) => {
          const matcher = str(g.matcher);
          const handlers = Array.isArray(g.hooks) ? g.hooks.filter(isObject) : [];
          let id = matcher ? `${event}-${matcher.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')}` : event;
          for (let i = 2; seen.has(id); i++) id = `${id}-${i}`;
          seen.add(id);
          const lines = handlers.map((h) => {
            const type = str(h.type) || 'command';
            const value = str(h.command) || str(h.url) || str(h.prompt);
            return `**${type}**\n\n\`\`\`\n${value}\n\`\`\``;
          });
          const body = [`Event: \`${event}\`${matcher ? ` · matcher: \`${matcher}\`` : ''}`, ...lines].join('\n\n');
          entries.push({
            ...base,
            id: `hook:${name}/${id}`,
            kind: 'hook',
            name: id,
            displayName: matcher ? `${event} · ${matcher}` : event,
            description: `Runs on ${event}${matcher ? ` (matcher: ${matcher})` : ''}: ${handlers.length} handler${handlers.length === 1 ? '' : 's'}.`,
            githubUrl: blobUrl(file),
            invocation: '',
            tools: unique(handlers.map((h) => str(h.type) || 'command')),
            bodyText: toPlainText(body),
            bodyHtml: md(body, file),
          });
        });
      }
    }

    for (const { data, file } of collectConfigs(pluginDir, manifest.mcpServers, '.mcp.json')) {
      const servers = isObject(data.mcpServers) ? data.mcpServers : data;
      for (const [server, cfg] of Object.entries(servers)) {
        if (!isObject(cfg)) continue;
        const command = [str(cfg.command), ...toList(cfg.args)].filter(Boolean).join(' ');
        const url = str(cfg.url);
        const transport = str(cfg.type) || (url ? 'http' : 'stdio');
        const env = isObject(cfg.env) ? Object.keys(cfg.env) : [];
        const body = [
          `Transport: \`${transport}\``,
          command && `Command:\n\n\`\`\`\n${command}\n\`\`\``,
          url && `URL: \`${url}\``,
          env.length ? `Environment variables: ${env.map((e) => `\`${e}\``).join(', ')}` : '',
        ]
          .filter(Boolean)
          .join('\n\n');
        entries.push({
          ...base,
          id: `mcp:${name}/${server}`,
          kind: 'mcp',
          name: server,
          displayName: server,
          description: str(cfg.description) || `MCP server (${transport}) ${url ? `at ${url}` : `started with ${str(cfg.command) || 'a command'}`}.`,
          githubUrl: blobUrl(file),
          invocation: '',
          tools: env,
          bodyText: toPlainText(body),
          bodyHtml: md(body, file),
        });
      }
    }
  }

  return { marketplace, repo, repoUrl, siteUrl, generatedAt: (opts.now ?? new Date()).toISOString(), entries, plugins };
}

export function buildFeed(catalog: Catalog): string {
  const items = Object.values(catalog.plugins)
    .flatMap((p) => p.changelog.map((c) => ({ p, c })))
    .sort((a, b) => b.c.date.localeCompare(a.c.date));
  const iso = (d: string) => (d ? `${d}T00:00:00Z` : catalog.generatedAt);
  const x = escapeHtml;
  const entryXml = items
    .map(({ p, c }) => {
      const link = `${catalog.siteUrl}#/plugin/${encodeURIComponent(p.name)}`;
      return `  <entry>
    <title>${x(`${p.displayName} v${c.version}`)}</title>
    <link href="${x(link)}"/>
    <id>${x(`${link}@${c.version}`)}</id>
    <updated>${iso(c.date)}</updated>
    <summary>${x(c.summary)}</summary>
  </entry>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${x(catalog.marketplace)} releases</title>
  <link href="${x(catalog.siteUrl)}"/>
  <link rel="self" href="${x(catalog.siteUrl + 'feed.xml')}"/>
  <id>${x(catalog.siteUrl)}</id>
  <updated>${items.length ? iso(items[0].c.date) : catalog.generatedAt}</updated>
${entryXml}
</feed>
`;
}

/** "owner/name" from GITHUB_REPOSITORY, then the origin remote. */
export function detectRepo(repoRoot: string): string {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  try {
    const url = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const m = /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/.exec(url);
    if (m) return m[1];
  } catch {
    // fall through
  }
  return 'alona-lip/dev-digest-ai-marketplace';
}

function main() {
  const siteDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const repoRoot = resolve(siteDir, '..');
  const catalog = buildCatalog({ repoRoot, repo: detectRepo(repoRoot) });
  const outDir = join(siteDir, 'public');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'catalog.json'), JSON.stringify(catalog));
  writeFileSync(join(outDir, 'feed.xml'), buildFeed(catalog));
  console.log(`✔ catalog.json: ${Object.keys(catalog.plugins).length} plugin(s), ${catalog.entries.length} entries`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
