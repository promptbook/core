import React from 'react';
import type { ResearchActionType } from './OutputActions';

/** Paper result from Semantic Scholar */
export interface Paper {
  paperId: string;
  title: string;
  abstract: string | null;
  year: number | null;
  authors: { name: string }[];
  citationCount: number;
  url: string;
}

export interface ResearchResultsPanelProps {
  /** Type of result being displayed */
  type: ResearchActionType;
  /** Content to display (markdown for explain/suggest/debug) */
  content?: string;
  /** Papers to display (for papers type) */
  papers?: Paper[];
  /** Whether the panel is loading */
  isLoading: boolean;
  /** Error message if any */
  error?: string;
  /** Handler to close the panel */
  onClose: () => void;
  /** Handler to apply suggested fix (for debug type) */
  onApplyFix?: (code: string) => void;
}

// Icons
const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 3l8 8M11 3l-8 8" strokeLinecap="round" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 3L3 9M9 3H5M9 3v4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CopyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="4" y="4" width="6" height="6" rx="1" />
    <path d="M8 4V3a1 1 0 00-1-1H3a1 1 0 00-1 1v4a1 1 0 001 1h1" />
  </svg>
);

// Panel titles by type
const PANEL_TITLES: Record<ResearchActionType, string> = {
  explain: 'Explanation',
  suggest: 'Suggested Next Steps',
  debug: 'Debug Analysis',
  papers: 'Related Papers',
};

// Extract code blocks from markdown
function extractCodeBlocks(content: string): { language: string; code: string }[] {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: { language: string; code: string }[] = [];
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push({
      language: match[1] || 'python',
      code: match[2].trim(),
    });
  }
  return blocks;
}

// Simple markdown renderer (basic formatting)
function renderMarkdown(content: string): React.ReactNode {
  // Split by code blocks first
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    // Code block
    if (part.startsWith('```')) {
      const match = part.match(/```(\w+)?\n([\s\S]*?)```/);
      if (match) {
        const code = match[2].trim();
        return (
          <pre key={index} className="research-panel__code-block">
            <code>{code}</code>
          </pre>
        );
      }
    }

    // Regular text - apply basic formatting
    const lines = part.split('\n');
    return lines.map((line, lineIndex) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h4 key={`${index}-${lineIndex}`} className="research-panel__h4">{line.slice(4)}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={`${index}-${lineIndex}`} className="research-panel__h3">{line.slice(3)}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={`${index}-${lineIndex}`} className="research-panel__h2">{line.slice(2)}</h2>;
      }

      // Bold text
      let processed: React.ReactNode = line;
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        processed = parts.map((p, i) => 
          i % 2 === 1 ? <strong key={i}>{p}</strong> : p
        );
      }

      // Numbered list items
      const listMatch = line.match(/^(\d+)\.\s+(.*)$/);
      if (listMatch) {
        return (
          <div key={`${index}-${lineIndex}`} className="research-panel__list-item">
            <span className="research-panel__list-number">{listMatch[1]}.</span>
            <span>{listMatch[2]}</span>
          </div>
        );
      }

      // Bullet points
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <div key={`${index}-${lineIndex}`} className="research-panel__bullet-item">
            <span className="research-panel__bullet">•</span>
            <span>{line.slice(2)}</span>
          </div>
        );
      }

      // Empty lines become spacing
      if (line.trim() === '') {
        return <div key={`${index}-${lineIndex}`} className="research-panel__spacer" />;
      }

      // Regular paragraph
      return <p key={`${index}-${lineIndex}`} className="research-panel__paragraph">{processed}</p>;
    });
  });
}

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="research-panel__loading">
      <div className="research-panel__spinner" />
      <span>Analyzing...</span>
    </div>
  );
}

// Error display component
function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="research-panel__error">
      <span className="research-panel__error-icon">⚠</span>
      <span>{message}</span>
    </div>
  );
}

// Papers list component
function PapersList({ papers }: { papers: Paper[] }) {
  if (papers.length === 0) {
    return (
      <div className="research-panel__empty">
        No papers found. Try different search terms.
      </div>
    );
  }

  return (
    <div className="research-panel__papers">
      {papers.map((paper) => (
        <a
          key={paper.paperId}
          href={paper.url}
          target="_blank"
          rel="noopener noreferrer"
          className="research-panel__paper"
        >
          <div className="research-panel__paper-header">
            <h4 className="research-panel__paper-title">{paper.title}</h4>
            <ExternalLinkIcon />
          </div>
          <div className="research-panel__paper-meta">
            {paper.authors.slice(0, 3).map(a => a.name).join(', ')}
            {paper.authors.length > 3 && ' et al.'}
            {paper.year && <span className="research-panel__paper-year">{paper.year}</span>}
            <span className="research-panel__paper-citations">
              {paper.citationCount} citations
            </span>
          </div>
          {paper.abstract && (
            <p className="research-panel__paper-abstract">
              {paper.abstract.slice(0, 200)}
              {paper.abstract.length > 200 && '...'}
            </p>
          )}
        </a>
      ))}
    </div>
  );
}

// Debug content with apply fix button
function DebugContent({
  content,
  onApplyFix,
}: {
  content: string;
  onApplyFix?: (code: string) => void;
}) {
  const codeBlocks = extractCodeBlocks(content);
  const pythonBlock = codeBlocks.find(b => b.language === 'python' || b.language === '');

  return (
    <div className="research-panel__debug">
      <div className="research-panel__content">
        {renderMarkdown(content)}
      </div>
      {pythonBlock && onApplyFix && (
        <div className="research-panel__actions">
          <button
            className="research-panel__apply-btn"
            onClick={() => onApplyFix(pythonBlock.code)}
          >
            <CopyIcon />
            Apply Fix
          </button>
        </div>
      )}
    </div>
  );
}

export function ResearchResultsPanel({
  type,
  content,
  papers,
  isLoading,
  error,
  onClose,
  onApplyFix,
}: ResearchResultsPanelProps) {
  return (
    <div className="research-panel">
      <div className="research-panel__header">
        <h3 className="research-panel__title">{PANEL_TITLES[type]}</h3>
        <button
          className="research-panel__close"
          onClick={onClose}
          aria-label="Close panel"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="research-panel__body">
        {isLoading && <LoadingSpinner />}
        {error && <ErrorDisplay message={error} />}
        {!isLoading && !error && type === 'papers' && papers && (
          <PapersList papers={papers} />
        )}
        {!isLoading && !error && type === 'debug' && content && (
          <DebugContent content={content} onApplyFix={onApplyFix} />
        )}
        {!isLoading && !error && (type === 'explain' || type === 'suggest') && content && (
          <div className="research-panel__content">
            {renderMarkdown(content)}
          </div>
        )}
      </div>
    </div>
  );
}
