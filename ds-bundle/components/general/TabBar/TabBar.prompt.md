TabBar from @checkpoint/ds. Use via `window.CheckpointDS.TabBar` (bundle loaded from the root `_ds_bundle.js`).

Horizontal tab navigation bar. Wraps `.tabbar` / `.tab`.

## Props

```ts
interface TabBarProps {
  /** The tab items to render */
  tabs: TabItem[];
  /** Key of the currently active tab */
  active: string;
  /** Called with the key of the clicked tab */
  onChange: (key: string) => void;
}
```
