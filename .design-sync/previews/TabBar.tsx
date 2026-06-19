import { TabBar } from '@checkpoint/ds';

const frame = { background: 'var(--ink)', padding: '20px 20px 0', borderRadius: '12px 12px 0 0', minWidth: 380 };

export function AppViews() {
  return (
    <div style={frame}>
      <TabBar
        tabs={[
          { key: 'today', label: 'Today' },
          { key: 'ready', label: 'Ready to Go' },
          { key: 'reservoir', label: 'Reservoir' },
        ]}
        active="today"
        onChange={() => {}}
      />
    </div>
  );
}

export function MiddleActive() {
  return (
    <div style={frame}>
      <TabBar
        tabs={[
          { key: 'today', label: 'Today' },
          { key: 'ready', label: 'Ready to Go' },
          { key: 'reservoir', label: 'Reservoir' },
        ]}
        active="ready"
        onChange={() => {}}
      />
    </div>
  );
}

export function ManyTabs() {
  return (
    <div style={frame}>
      <TabBar
        tabs={[
          { key: 'all', label: 'All' },
          { key: 'active', label: 'Active' },
          { key: 'done', label: 'Done' },
          { key: 'killed', label: 'Killed' },
        ]}
        active="active"
        onChange={() => {}}
      />
    </div>
  );
}
