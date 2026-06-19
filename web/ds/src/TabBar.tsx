export interface TabItem {
  key: string;
  label: string;
}

export interface TabBarProps {
  /** The tab items to render */
  tabs: TabItem[];
  /** Key of the currently active tab */
  active: string;
  /** Called with the key of the clicked tab */
  onChange: (key: string) => void;
}

/** Horizontal tab navigation bar. Wraps `.tabbar` / `.tab`. */
export function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <div className="tabbar">
      {tabs.map((t) => (
        <button
          key={t.key}
          className={`tab${active === t.key ? " on" : ""}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
