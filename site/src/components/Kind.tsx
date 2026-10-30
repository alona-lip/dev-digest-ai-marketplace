import { KIND_LABEL } from '../lib/catalog';
import type { Kind } from '../lib/types';

export function KindDot({ kind, large = false }: { kind: Kind; large?: boolean }) {
  return <span className={`kind-dot kind-${kind}${large ? ' lg' : ''}`} aria-hidden="true" />;
}

export function KindBadge({ kind, large = false }: { kind: Kind; large?: boolean }) {
  return <span className={`kind-badge kind-${kind}${large ? ' lg' : ''}`}>{KIND_LABEL[kind]}</span>;
}
