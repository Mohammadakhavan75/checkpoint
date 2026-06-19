import { Loading } from '@checkpoint/ds';

export function Default() {
  return (
    <div style={{ background: 'var(--ink)', padding: 40, borderRadius: 12, textAlign: 'center' }}>
      <Loading />
    </div>
  );
}
