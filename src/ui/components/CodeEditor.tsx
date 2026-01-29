import React from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  readOnly: boolean;
}

export function CodeEditor({ code, onChange, readOnly }: CodeEditorProps) {
  return (
    <div className="code-editor">
      <Editor
        height="200px"
        language="python"
        value={code}
        onChange={(value) => onChange(value ?? '')}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          wordWrap: 'on',
        }}
      />
    </div>
  );
}
