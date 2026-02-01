/**
 * Project type definitions shared between packages
 */

export interface Project {
  id: string;
  name: string;
  path: string;
  created: string;
  lastOpened: string;
  color?: string;
  icon?: string;
}

export interface ProjectSettings {
  projectsRootPath: string;
  lastOpenedProjectId: string | null;
  recentProjects: string[];
}

/**
 * File entry for project file operations.
 * Includes absolutePath for file system operations.
 */
export interface ProjectFileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  absolutePath: string;
}
