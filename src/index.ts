// @promptbook/core - facade package
// Re-exports from specialized packages for backwards compatibility

// Types
export * from '@promptbook/types';

// UI components
export * from '@promptbook/ui';

// Sync providers and utilities
export * from '@promptbook/sync';

// Note: kernel and utils are Node.js only - import via '@promptbook/core/kernel' or '@promptbook/core/utils'
// They are not exported from the main entry point to avoid bundling Node.js-specific code in browser builds
