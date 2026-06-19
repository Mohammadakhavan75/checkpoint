import * as React from 'react';

/**
 * TabBar — from @checkpoint/ds@1.0.0.
 */
export interface TabBarProps {
  /** The tab items to render */
  tabs: TabItem[];
  /** Key of the currently active tab */
  active: string;
  /** Called with the key of the clicked tab */
  onChange: (key: string) => void;
}

export declare const TabBar: React.ComponentType<TabBarProps>;
