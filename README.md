# @promptbook/core

Core library for Promptbook - provides types, UI components, sync utilities, and kernel integration for building AI-powered notebook interfaces.

## Installation

```bash
npm install @promptbook/core
# or
pnpm add @promptbook/core
```

## Entry Points

The package provides multiple entry points to support both browser and Node.js environments:

| Entry Point | Environment | Description |
|-------------|-------------|-------------|
| `@promptbook/core` | Browser/Node | Types and UI components |
| `@promptbook/core/ui` | Browser/Node | React components only |
| `@promptbook/core/types` | Browser/Node | TypeScript types only |
| `@promptbook/core/sync` | Node.js only | AI sync providers and prompt builders |
| `@promptbook/core/kernel` | Node.js only | Jupyter kernel integration |
| `@promptbook/core/utils` | Node.js only | Utility functions |

## Usage

### Types

```typescript
import type {
  NotebookState,
  CellState,
  CellType,
  ExecutionState,
  AIAssistanceMessage
} from '@promptbook/core';
```

### UI Components

```typescript
import {
  Notebook,
  Cell,
  TextCell,
  CodeEditor,
  OutputArea,
  KernelStatus,
  GenerateCellsModal,
} from '@promptbook/core';

// Render a notebook
<Notebook
  notebook={notebookState}
  onUpdate={handleCellUpdate}
  onRunCell={handleRunCell}
  onSyncCell={handleSyncCell}
  onAddCell={handleAddCell}
  onDeleteCell={handleDeleteCell}
/>
```

### Hooks

```typescript
import {
  useCellResize,
  useCombinedAutocomplete,
  useDataFrameFilters,
  useDataFramePagination,
} from '@promptbook/core';

// Combined autocomplete for @ file references and # symbol references
const {
  textareaRef,
  showAutocomplete,
  handleKeyDown,
  insertCompletion
} = useCombinedAutocomplete({ listFiles, getSymbols });
```

### Sync Utilities (Node.js only)

```typescript
import {
  buildSyncPrompt,
  buildGenerateCellsPrompt,
  buildExplainOutputPrompt,
  extractHashMentions,
} from '@promptbook/core/sync';

// Build a sync prompt for code generation
const prompt = buildSyncPrompt(cellContext, kernelSymbols);
```

### Cell Factories

```typescript
import { createCodeCell, createTextCell, createEmptyNotebook } from '@promptbook/core';

// Create a new code cell
const cell = createCodeCell('cell-1');
cell.shortDescription = 'Load and process data';

// Create an empty notebook
const notebook = createEmptyNotebook();
```

## Components

### Notebook

Main container component that renders all cells with controls for adding, deleting, and reordering.

### Cell

Code cell component with three-tab interface:
- **Instructions**: Natural language description
- **Detailed**: Pseudo-code/detailed specification
- **Code**: Executable Python code

### OutputArea

Displays cell execution results including:
- Text/HTML output
- DataFrame visualization with pagination and filtering
- Error messages with stack traces
- Research assistance buttons (Explain, Debug, Find Papers)

### GenerateCellsModal

Modal dialog for generating multiple cells from a natural language description. Supports `@filename` references for including file context.

## Types Reference

### NotebookState

```typescript
interface NotebookState {
  metadata: NotebookMetadata;
  cells: CellState[];
}
```

### CellState

```typescript
interface CellState {
  id: string;
  cellType: 'code' | 'text';
  shortDescription: string;
  pseudoCode: string;
  code: string;
  executionState: ExecutionState;
  outputs: CellOutput[];
  lastEditedTab: 'instructions' | 'detailed' | 'code';
}
```

### ExecutionState

```typescript
type ExecutionState = 'idle' | 'pending' | 'running' | 'success' | 'error';
```

## Peer Dependencies

- `react` ^18.2.0
- `react-dom` ^18.2.0
- `@anthropic-ai/claude-agent-sdk` ^0.2.0 (optional, for AI sync)
- `zeromq` ^6.0.0 (optional, for kernel integration)

## License

MIT
