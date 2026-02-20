'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUnifiedCanvas } from '@/contexts/unified-canvas-context';
import { useAIChat, type ChatMessage } from '@/hooks/use-ai-chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  SparklesIcon, SendIcon, MessageSquareIcon, PlusIcon, ImageIcon,
  X, Trash2, MapPin, Camera, ChevronLeft,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function AIPanel() {
  const {
    activeFarm,
    captureScreenshot,
    pendingAIMessage,
    setPendingAIMessage,
  } = useUnifiedCanvas();

  // Map analysis handler — only available when farm + screenshot capture are ready
  const handleAnalyze = useCallback(async (query: string, conversationId?: string) => {
    if (!captureScreenshot || !activeFarm) {
      throw new Error('Map not ready for analysis');
    }

    const { analyzeWithOptimization } = await import('@/lib/ai/optimized-analyze');
    const screenshot = await captureScreenshot();

    const result = await analyzeWithOptimization({
      userQuery: query,
      screenshotDataURL: screenshot,
      farmContext: { zones: [], plantings: [], lines: [], goals: [], nativeSpecies: [] },
      farmInfo: {
        id: activeFarm.id,
        climate_zone: activeFarm.climate_zone,
        rainfall_inches: activeFarm.rainfall_inches,
        soil_type: activeFarm.soil_type,
      },
    });

    return {
      response: result.response,
      conversationId: conversationId || 'new',
      analysisId: 'new',
      screenshot,
      generatedImageUrl: undefined,
    };
  }, [captureScreenshot, activeFarm]);

  const {
    conversations,
    messages,
    loading,
    currentConversationId,
    submitMessage,
    startNewConversation,
    selectConversation,
    deleteConversation,
  } = useAIChat({
    farmId: activeFarm?.id || null,
    initialMessage: pendingAIMessage || undefined,
    onAnalyze: captureScreenshot && activeFarm ? handleAnalyze : undefined,
  });

  const [input, setInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [includeScreenshot, setIncludeScreenshot] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Clear pending message after it's been picked up
  useEffect(() => {
    if (pendingAIMessage) {
      setPendingAIMessage(null);
    }
  }, [pendingAIMessage, setPendingAIMessage]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    submitMessage(msg, includeScreenshot);
    setIncludeScreenshot(false);
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation? This cannot be undone.')) return;
    deleteConversation(id);
  };

  const canUseMapAnalysis = !!captureScreenshot && !!activeFarm;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 flex-shrink-0">
        <SparklesIcon className="h-5 w-5 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold">AI Assistant</h2>
          {activeFarm && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {activeFarm.name}
            </p>
          )}
        </div>
        <div className="flex gap-1.5">
          <Button
            onClick={() => setShowSidebar(!showSidebar)}
            variant="outline"
            size="sm"
            className="text-xs h-8"
            aria-label="View conversations"
          >
            <MessageSquareIcon className="h-3 w-3 mr-1" />
            {conversations.length}
          </Button>
          <Button
            onClick={startNewConversation}
            variant="outline"
            size="sm"
            className="text-xs h-8"
            aria-label="New conversation"
          >
            <PlusIcon className="h-3 w-3 mr-1" />
            New
          </Button>
        </div>
      </div>

      {/* Farm context bar */}
      {!activeFarm && (
        <div className="px-4 py-2 bg-accent/30 border-b border-border/20 text-xs text-muted-foreground">
          General permaculture Q&A — select a farm for map analysis
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Sidebar */}
        <div
          role="navigation"
          aria-label="Conversation history"
          className={`absolute inset-0 bg-background z-10 transform transition-transform duration-200 ease-out ${
            showSidebar ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center gap-2 p-3 border-b">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSidebar(false)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">Conversations</span>
          </div>
          <div className="overflow-y-auto h-[calc(100%-49px)]">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No conversations yet
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`flex items-center justify-between px-4 py-3 border-b hover:bg-accent/50 transition-colors group ${
                    conv.id === currentConversationId ? 'bg-accent' : ''
                  }`}
                >
                  <button
                    onClick={() => { selectConversation(conv.id); setShowSidebar(false); }}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="text-sm font-medium truncate">
                      {conv.title || 'Untitled'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(conv.updated_at * 1000).toLocaleDateString()}
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 flex-shrink-0"
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" aria-live="polite">
            {messages.length === 0 ? (
              <EmptyState hasFarm={!!activeFarm} />
            ) : (
              messages.map((msg, idx) => (
                <MessageBubble
                  key={idx}
                  message={msg}
                  onScreenshotClick={setSelectedScreenshot}
                />
              ))
            )}
            {loading && (
              <div className="bg-muted p-4 rounded-lg mr-8 border border-border" role="status">
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  <p className="text-sm text-muted-foreground">
                    {includeScreenshot ? 'Capturing screenshot and analyzing...' : 'Thinking...'}
                  </p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="px-4 pb-4 pt-2 border-t border-border/40 flex-shrink-0">
            {canUseMapAnalysis && (
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setIncludeScreenshot(!includeScreenshot)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    includeScreenshot
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent/60 text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <Camera className="h-3 w-3" />
                  Include map screenshot
                </button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex gap-2" aria-label="Chat message">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={activeFarm ? 'Ask about your farm or permaculture...' : 'Ask about permaculture...'}
                disabled={loading}
                className="flex-1"
                aria-label="Type your message"
              />
              <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="Send message">
                <SendIcon className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot preview"
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedScreenshot(null)}
          onKeyDown={(e) => { if (e.key === 'Escape') setSelectedScreenshot(null); }}
        >
          <div className="max-w-4xl max-h-[90vh] overflow-auto bg-card rounded-lg p-4 relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
            <img src={selectedScreenshot} alt="Map Screenshot" className="w-full h-auto rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ hasFarm }: { hasFarm: boolean }) {
  return (
    <div className="text-center text-muted-foreground py-12">
      <SparklesIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
      <p className="text-sm font-medium">
        {hasFarm ? 'Ask about your farm design!' : 'Ask about permaculture!'}
      </p>
      <div className="mt-3 space-y-1.5 text-xs">
        {hasFarm ? (
          <>
            <p>&quot;What native species would work well here?&quot;</p>
            <p>&quot;Design a food forest guild for my climate&quot;</p>
            <p>&quot;How should I manage water on this slope?&quot;</p>
          </>
        ) : (
          <>
            <p>&quot;What are the permaculture zones?&quot;</p>
            <p>&quot;How do I start a food forest?&quot;</p>
            <p>&quot;Best cover crops for clay soil?&quot;</p>
          </>
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onScreenshotClick,
}: {
  message: ChatMessage;
  onScreenshotClick: (url: string) => void;
}) {
  if (message.role === 'user') {
    return (
      <div className="p-4 rounded-lg bg-primary text-primary-foreground ml-8">
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-white dark:bg-slate-800 mr-8 shadow-sm border border-border">
      <div className="prose prose-base max-w-none dark:prose-invert prose-slate prose-headings:font-serif prose-headings:font-semibold prose-p:text-slate-800 dark:prose-p:text-slate-100 prose-p:leading-relaxed prose-li:text-slate-800 dark:prose-li:text-slate-100 prose-strong:text-slate-900 dark:prose-strong:text-slate-50">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {message.content}
        </ReactMarkdown>
      </div>
      {message.generatedImageUrl && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <SparklesIcon className="h-4 w-4" />
            AI-Generated Sketch
          </div>
          <img
            src={message.generatedImageUrl}
            alt="AI-generated sketch"
            className="w-full h-auto rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => onScreenshotClick(message.generatedImageUrl!)}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      {message.screenshots && message.screenshots.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {message.screenshots.map((screenshot, idx) => (
            <Button
              key={idx}
              onClick={() => onScreenshotClick(screenshot)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <ImageIcon className="h-4 w-4" />
              {message.screenshots!.length > 1
                ? `View ${idx === 0 ? 'Primary' : 'Topo'} Map`
                : 'View Map Screenshot'}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export default AIPanel;
