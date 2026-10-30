// HTML is rendered from repository markdown at build time (raw HTML escaped, links filtered).
export function Markdown({ html }: { html: string }) {
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}
