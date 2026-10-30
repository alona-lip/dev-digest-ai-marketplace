import { useApp } from '../context';
import { t } from '../i18n';

export function GettingStarted() {
  const { catalog, go, copy, copiedId } = useApp();
  const s = t.gettingStarted;
  const example = Object.keys(catalog.plugins)[0] ?? s.examplePlugin;
  const steps = [
    { title: s.addTitle, desc: s.addDesc, cmd: `/plugin marketplace add ${catalog.repo}` },
    { title: s.installTitle, desc: s.installDesc, cmd: `/plugin install ${example}@${catalog.marketplace}` },
    { title: s.updateTitle, desc: s.updateDesc, cmd: `/plugin marketplace update ${catalog.marketplace}` },
  ];
  return (
    <main className="page gs-page">
      <button type="button" className="back-link" onClick={() => go({ screen: 'home' })}>
        {t.common.home}
      </button>
      <h1>{s.title}</h1>
      <p className="gs-lead">{s.lead}</p>
      <ol className="steps">
        {steps.map((step, i) => {
          const id = 's:' + i;
          const copied = copiedId === id;
          return (
            <li key={step.title} className="step">
              <div className="step-n" aria-hidden="true">{i + 1}</div>
              <div className="step-body">
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
                <div className="terminal">
                  <span className="prompt">$</span>
                  <span className="cmd" title={step.cmd}>{step.cmd}</span>
                  <button type="button" className={`step-copy${copied ? ' copied' : ''}`} onClick={() => copy(step.cmd, id)} aria-label={s.copyLabel(step.cmd)}>
                    {copied ? s.copied : s.copy}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="gs-note">
        <strong>{s.noteTitle}</strong> {s.noteText}
      </div>
    </main>
  );
}
