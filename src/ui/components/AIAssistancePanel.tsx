import React, { useState, useRef, useEffect } from 'react';
import type { AIAssistanceMessage } from '../../types';

interface AIAssistancePanelProps {
  messages: AIAssistanceMessage[];
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  onApplyCode: (code: string) => void;
  onClose: () => void;
}

// Icons
const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3l8 8M11 3l-8 8" />
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M14.5 8L1.5 14.5L3.5 8L1.5 1.5L14.5 8Z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 6l3 3 5-6" />
  </svg>
);

export function AIAssistancePanel({
  messages,
  isLoading,
  onSendMessage,
  onApplyCode,
  onClose,
}: AIAssistancePanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus textarea
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="ai-assistance-panel">
      <div className="ai-assistance-header">
        <span className="ai-assistance-header__title">AI Assistant</span>
        <button
          className="ai-assistance-close-btn"
          onClick={onClose}
          aria-label="Close AI assistant"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="ai-assistance-messages">
        {messages.length === 0 && !isLoading && (
          <div className="ai-assistance-empty">
            <p style={{ color: 'var(--pb-text-tertiary)', fontSize: 'var(--pb-text-sm)', textAlign: 'center', padding: 'var(--pb-space-4)' }}>
              Ask me to help modify your code. For example:
              <br /><br />
              <em>"Add error handling"</em>
              <br />
              <em>"Make this more efficient"</em>
              <br />
              <em>"Add type hints"</em>
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`ai-assistance-message ai-assistance-message--${message.role}`}
          >
            <div className="ai-assistance-message__content">
              {message.content}
              {message.suggestedCode && (
                <>
                  <pre className="ai-assistance-message__code">
                    {message.suggestedCode}
                  </pre>
                  <div className="ai-assistance-message__actions">
                    <button
                      className="ai-assistance-apply-btn"
                      onClick={() => onApplyCode(message.suggestedCode!)}
                    >
                      <CheckIcon /> Apply
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="ai-assistance-loading">
            <div className="ai-assistance-loading-spinner" />
            <span>Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="ai-assistance-input">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask AI to modify your code..."
          disabled={isLoading}
        />
        <button
          className="ai-assistance-send-btn"
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
