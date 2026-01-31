import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, Trash2, AlertCircle, Database, RefreshCw } from 'lucide-react';
import { ChatSession } from '../services/chatService';
import { employeeDB } from '../services/unifiedDB';
import ReactMarkdown from 'react-markdown';

const ChatAgent = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [dataContext, setDataContext] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  const chatSessionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load workforce data on mount
  useEffect(() => {
    loadWorkforceData();
  }, []);

  const loadWorkforceData = async () => {
    setDataLoading(true);
    try {
      const stats = await employeeDB.getStats();
      setDataContext(stats);

      // Create or update chat session with data context
      if (!chatSessionRef.current) {
        chatSessionRef.current = new ChatSession(stats);
      } else {
        chatSessionRef.current.setDataContext(stats);
      }
    } catch (err) {
      console.error('Failed to load workforce data:', err);
      // Create session without data context
      if (!chatSessionRef.current) {
        chatSessionRef.current = new ChatSession();
      }
    } finally {
      setDataLoading(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    setInput('');
    setError(null);
    setIsLoading(true);
    setStreamingMessage('');

    // Add user message immediately
    const userMessage = { role: 'user', content: trimmedInput, id: Date.now() };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Use streaming for better UX
      await chatSessionRef.current.sendStream(
        trimmedInput,
        (chunk) => {
          setStreamingMessage(prev => prev + chunk);
        }
      );

      // After streaming completes, add the full message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: chatSessionRef.current.getHistory().slice(-1)[0].content,
          id: Date.now()
        }
      ]);
      setStreamingMessage('');
    } catch (err) {
      console.error('Chat error:', err);
      setError(err.message || 'Failed to get response. Please try again.');
      // Remove the user message from our display if the request failed
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading]);

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setStreamingMessage('');
    setError(null);
    chatSessionRef.current?.clearHistory();
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Dynamic suggested questions based on data
  const suggestedQuestions = dataContext?.totalEmployees > 0 ? [
    "Wie viele Mitarbeiter haben wir insgesamt?",
    "Welche Abteilung hat die meisten Mitarbeiter?",
    "Wie hoch sind die Gesamtpersonalkosten?",
    "Zeige mir die Verteilung nach Standorten",
    "Wie viele Mitarbeiter sind in Reduktionsprogrammen?",
  ] : [
    "How do I import employee data?",
    "What reports are available?",
    "How can I track workforce costs?",
    "Explain the FTE calculation",
  ];

  return (
    <div className="space-y-5 animate-fade-in h-[calc(100vh-180px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-p3-midnight dark:text-white">
              AI Assistant
            </h1>
            <span className="px-2 py-0.5 text-xs font-medium bg-p3-electric/10 text-p3-electric rounded-full">
              GPT-4.1
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Fragen Sie nach Ihren Workforce-Daten
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Data Status Indicator */}
          <div className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
            ${dataContext?.totalEmployees > 0
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            }
          `}>
            <Database className="w-3.5 h-3.5" />
            {dataLoading ? (
              <span>Lade Daten...</span>
            ) : dataContext?.totalEmployees > 0 ? (
              <span>{dataContext.totalEmployees.toLocaleString()} Datensätze</span>
            ) : (
              <span>Keine Daten</span>
            )}
          </div>

          {/* Refresh Data Button */}
          <button
            onClick={loadWorkforceData}
            disabled={dataLoading}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-p3-electric transition-colors disabled:opacity-50"
            title="Daten aktualisieren"
          >
            <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
          </button>

          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="btn btn-ghost btn-sm text-gray-500 hover:text-warning"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Data Context Info */}
      {dataContext?.totalEmployees > 0 && messages.length === 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Daten geladen:</strong> {dataContext.totalEmployees.toLocaleString()} Mitarbeiter, {Object.keys(dataContext.departmentDetails || {}).length} Abteilungen, {Object.keys(dataContext.locationCounts || {}).length} Standorte.
            Der AI Assistant kann jetzt Fragen zu Ihren Daten beantworten.
          </p>
        </div>
      )}

      {/* Chat Container */}
      <div className="flex-1 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !streamingMessage ? (
            // Welcome State
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 bg-p3-electric/10 rounded-2xl flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-p3-electric" />
              </div>
              <h3 className="text-lg font-semibold text-p3-midnight dark:text-white mb-2">
                {dataContext?.totalEmployees > 0
                  ? 'Fragen Sie mich zu Ihren Daten'
                  : 'Willkommen beim AI Assistant'
                }
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6">
                {dataContext?.totalEmployees > 0
                  ? 'Ich habe Zugriff auf Ihre Workforce-Daten und kann Fragen zu Mitarbeitern, Abteilungen, Kosten und mehr beantworten.'
                  : 'Importieren Sie zunächst Ihre HR-Daten, um datenbasierte Fragen stellen zu können. Ich kann Ihnen auch bei der Navigation und den Features helfen.'
                }
              </p>

              {/* Suggested Questions */}
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {suggestedQuestions.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(question);
                      inputRef.current?.focus();
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Message List
            <>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {/* Streaming Message */}
              {streamingMessage && (
                <MessageBubble
                  message={{ role: 'assistant', content: streamingMessage }}
                  isStreaming
                />
              )}

              {/* Loading Indicator */}
              {isLoading && !streamingMessage && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-p3-electric/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-p3-electric" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-4 mb-2 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-sm text-warning">{error}</p>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={dataContext?.totalEmployees > 0
                  ? "Fragen Sie nach Mitarbeitern, Abteilungen, Kosten..."
                  : "Ask a question..."
                }
                rows={1}
                disabled={isLoading}
                className="w-full px-4 py-2.5 pr-12 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-p3-midnight dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-p3-electric/50 focus:border-p3-electric disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2.5 bg-p3-electric hover:bg-primary-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center">
            Enter zum Senden, Shift+Enter für neue Zeile
          </p>
        </div>
      </div>
    </div>
  );
};

// Message Bubble Component
const MessageBubble = ({ message, isStreaming = false }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`
        w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
        ${isUser
          ? 'bg-gray-200 dark:bg-gray-700'
          : 'bg-p3-electric/10'
        }
      `}>
        {isUser ? (
          <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        ) : (
          <Bot className="w-4 h-4 text-p3-electric" />
        )}
      </div>

      {/* Message Content */}
      <div className={`
        max-w-[80%] rounded-lg px-4 py-2.5
        ${isUser
          ? 'bg-p3-electric text-white'
          : 'bg-gray-100 dark:bg-gray-800 text-p3-midnight dark:text-gray-100'
        }
      `}>
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                code: ({ inline, children }) =>
                  inline ? (
                    <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">{children}</code>
                  ) : (
                    <pre className="p-2 bg-gray-200 dark:bg-gray-700 rounded text-xs overflow-x-auto mb-2">
                      <code>{children}</code>
                    </pre>
                  ),
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-p3-electric hover:underline">
                    {children}
                  </a>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-p3-electric/50 animate-pulse ml-0.5" />
        )}
      </div>
    </div>
  );
};

export default ChatAgent;
