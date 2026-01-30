import React, { useEffect, useState } from 'react';
import Editor, { loader } from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  readOnly: boolean;
}

// Detect system dark mode
function useSystemTheme() {
  const [isDark, setIsDark] = useState(
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isDark;
}

// Configure Monaco for Python
loader.init().then((monaco) => {
  // Register Python-specific completions
  monaco.languages.registerCompletionItemProvider('python', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // Common Python snippets
      const suggestions = [
        {
          label: 'def',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'def ${1:function_name}(${2:params}):\n\t${3:pass}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Define a function',
          range,
        },
        {
          label: 'class',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'class ${1:ClassName}:\n\tdef __init__(self${2:, params}):\n\t\t${3:pass}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Define a class',
          range,
        },
        {
          label: 'for',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'for ${1:item} in ${2:iterable}:\n\t${3:pass}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'For loop',
          range,
        },
        {
          label: 'if',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'if ${1:condition}:\n\t${2:pass}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'If statement',
          range,
        },
        {
          label: 'import',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'import ${1:module}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Import a module',
          range,
        },
        {
          label: 'print',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'print(${1})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Print to stdout',
          range,
        },
      ];

      return { suggestions };
    },
  });
});

export function CodeEditor({ code, onChange, readOnly }: CodeEditorProps) {
  const isDark = useSystemTheme();

  return (
    <div className="code-editor">
      <Editor
        height="250px"
        language="python"
        theme={isDark ? 'vs-dark' : 'light'}
        value={code}
        onChange={(value) => onChange(value ?? '')}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'Geist Mono', 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
          fontLigatures: true,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          wordWrap: 'on',
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showFunctions: true,
            showVariables: true,
          },
        }}
      />
    </div>
  );
}
