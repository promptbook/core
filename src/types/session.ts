/**
 * Session type definitions shared between core and electron packages
 */

export interface TabState {
  id: string;
  filePath: string;
  scrollPosition: number;
  activeCellId: string | null;
}

export interface SidebarState {
  isVisible: boolean;
  isPinned: boolean;
  width: number;
}

export interface SessionState {
  projectId: string;
  openTabs: TabState[];
  activeTabId: string | null;
  sidebar: SidebarState;
}
