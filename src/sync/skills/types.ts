/**
 * Skill type definitions for the AI sync system
 */

/**
 * A loaded skill with its metadata and content
 */
export interface Skill {
  /** Unique skill name from frontmatter */
  name: string;
  /** Description of when to use this skill */
  description: string;
  /** Full markdown content (without frontmatter) */
  content: string;
  /** Path where the skill was loaded from */
  sourcePath: string;
}

/**
 * Raw parsed skill file before validation
 */
export interface ParsedSkillFile {
  frontmatter: {
    name?: string;
    description?: string;
    [key: string]: unknown;
  };
  content: string;
}

/**
 * Options for loading skills
 */
export interface SkillLoaderOptions {
  /** Base directory to search for skills (defaults to .claude/skills in project root) */
  skillsDir?: string;
  /** Whether to cache loaded skills (defaults to true) */
  useCache?: boolean;
}

/**
 * Error thrown when a skill cannot be loaded
 */
export class SkillLoadError extends Error {
  constructor(
    public readonly skillName: string,
    public readonly reason: string,
    public readonly cause?: Error
  ) {
    super(`Failed to load skill '${skillName}': ${reason}`);
    this.name = 'SkillLoadError';
  }
}

/**
 * Error thrown when a skill file is malformed
 */
export class SkillParseError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly reason: string
  ) {
    super(`Failed to parse skill file '${filePath}': ${reason}`);
    this.name = 'SkillParseError';
  }
}
