import { useApp } from '../context';

export function GettingStarted() {
  const { catalog, go, copy, copiedId } = useApp();
  const example = Object.keys(catalog.plugins)[0] ?? '<plugin>';
  const steps = [
    {
      title: 'Add the marketplace as a source',
      desc: 'Registers this catalog repository in your Claude Code.',
      cmd: `/plugin marketplace add ${catalog.repo}`,
    },
    {
      title: 'Install a plugin',
      desc: 'Install a specific plugin from this marketplace by name.',
      cmd: `/plugin install ${example}@${catalog.marketplace}`,
    },
    {
      title: 'Keep it up to date',
      desc: 'Refresh the marketplace now and then, then run /reload-plugins or start a new session.',
      cmd: `/plugin marketplace update ${catalog.marketplace}`,
    },
  ];
  return (
    <main className="page gs-page">
      <button type="button" className="back-link" onClick={() => go({ screen: 'home' })}>
        ← Home
      </button>
      <h1>Connect the marketplace</h1>
      <p className="gs-lead">Three steps. Add the marketplace as a source, then install individual plugins.</p>
      <ol className="steps">
        {steps.map((s, i) => {
          const id = 's:' + i;
          const copied = copiedId === id;
          return (
            <li key={s.title} className="step">
              <div className="step-n" aria-hidden="true">{i + 1}</div>
              <div className="step-body">
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <div className="terminal">
                  <span className="prompt">$</span>
                  <span className="cmd" title={s.cmd}>{s.cmd}</span>
                  <button type="button" className={`step-copy${copied ? ' copied' : ''}`} onClick={() => copy(s.cmd, id)} aria-label={`Copy: ${s.cmd}`}>
                    {copied ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="gs-note">
        <strong>marketplace update vs plugin update.</strong> The first refreshes the list of sources; the second updates
        the code of an installed plugin.
      </div>
    </main>
  );
}
