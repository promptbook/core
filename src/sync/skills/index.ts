/**
 * Skill types for the AI sync system
 * Note: Skills are loaded by Claude natively from .claude/skills/
 * We don't need to load them programmatically - Claude handles this
 */

export type {
  Skill,
  ParsedSkillFile,
  SkillLoaderOptions,
} from './types';

export {
  SkillLoadError,
  SkillParseError,
} from './types';
