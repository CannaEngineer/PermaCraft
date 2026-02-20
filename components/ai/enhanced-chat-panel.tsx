"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SparklesIcon,
  SendIcon,
  MessageSquareIcon,
  PlusIcon,
  ImageIcon,
  X,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAIChat, type AnalyzeResult } from "@/hooks/use-ai-chat";

interface ChatPanelProps {
  farmId: string;
  initialConversationId?: string;
  initialMessage?: string;
  forceNewConversation?: boolean;
  onClose?: () => void;
  onAnalyze: (
    query: string,
    conversationId?: string
  ) => Promise<AnalyzeResult>;
}

export function EnhancedChatPanel({ farmId, initialConversationId, initialMessage, forceNewConversation, onClose, onAnalyze }: ChatPanelProps) {
  const {
    conversations,
    messages,
    loading,
    currentConversationId,
    submitMessage,
    startNewConversation: hookStartNew,
    selectConversation: hookSelect,
    deleteConversation: hookDelete,
  } = useAIChat({
    farmId,
    initialConversationId,
    initialMessage,
    forceNewConversation,
    onAnalyze,
  });

  const [input, setInput] = useState("");
  const [showConversations, setShowConversations] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput("");
    // Always use map analysis in the EnhancedChatPanel (legacy overlay behavior)
    submitMessage(userMessage, true);
  };

  const handleSelectConversation = (id: string) => {
    hookSelect(id);
    setShowConversations(false);
  };

  const handleStartNew = () => {
    hookStartNew();
    setShowConversations(false);
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation? This cannot be undone.")) return;
    hookDelete(conversationId);
  };

  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );

  return (
    <Card className="h-full flex flex-col relative">
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-primary" />
            {currentConversation?.title || "AI Permaculture Assistant"}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowConversations(!showConversations)}
              variant="outline"
              size="sm"
              className="text-xs"
              aria-label="View conversations"
            >
              <MessageSquareIcon className="h-3 w-3 mr-1" />
              {conversations.length}
            </Button>
            <Button
              onClick={handleStartNew}
              variant="outline"
              size="sm"
              className="text-xs"
              aria-label="New conversation"
            >
              <PlusIcon className="h-3 w-3 mr-1" />
              New
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close chat"
              onClick={() => {
                if (onClose) {
                  onClose();
                } else {
                  const event = new CustomEvent("close-chat");
                  window.dispatchEvent(event);
                }
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Conversations Sidebar */}
      <div
        role="navigation"
        aria-label="Conversation history"
        className={`absolute top-0 left-0 h-full w-full bg-card z-50 transform transition-transform duration-300 ease-in-out ${
          showConversations ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowConversations(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No conversations yet
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`w-full text-left px-4 py-3 border-b hover:bg-accent transition-colors flex items-center justify-between group ${
                conv.id === currentConversationId ? "bg-accent" : ""
              }`}
            >
              <button
                onClick={() => handleSelectConversation(conv.id)}
                className="flex-1 text-left"
              >
                <div className="font-medium text-sm truncate">
                  {conv.title || "Untitled Conversation"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(conv.updated_at * 1000).toLocaleDateString()}
                </div>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                onClick={(e) => handleDeleteConversation(conv.id, e)}
                aria-label="Delete conversation"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))
        )}
      </div>

      <CardContent className="flex-1 flex flex-col min-h-0 p-4">
        <div className="flex-1 overflow-y-auto mb-4 space-y-4" aria-live="polite">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <SparklesIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-sm">Ask me about your farm design!</p>
              <p className="text-xs mt-2">
                Try: &quot;What native species would work well here?&quot;
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground ml-8"
                    : "bg-white dark:bg-slate-800 mr-8 shadow-sm border border-border"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <>
                    <div className="prose prose-base max-w-none dark:prose-invert prose-slate prose-headings:font-serif prose-headings:font-semibold prose-p:text-slate-800 dark:prose-p:text-slate-100 prose-p:leading-relaxed prose-li:text-slate-800 dark:prose-li:text-slate-100 prose-strong:text-slate-900 dark:prose-strong:text-slate-50">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    {msg.generatedImageUrl && (
                      <div className="mt-4 border-t border-border pt-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <SparklesIcon className="h-4 w-4" />
                          AI-Generated Sketch
                        </div>
                        <img
                          src={msg.generatedImageUrl}
                          alt="AI-generated sketch"
                          className="w-full h-auto rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedScreenshot(msg.generatedImageUrl!)}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    {msg.screenshots && msg.screenshots.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {msg.screenshots.map((screenshot, sIdx) => (
                          <Button
                            key={sIdx}
                            onClick={() => setSelectedScreenshot(screenshot)}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <ImageIcon className="h-4 w-4" />
                            {msg.screenshots!.length > 1
                              ? `View ${sIdx === 0 ? 'Primary' : 'Topo'} Map`
                              : 'View Map Screenshot'}
                          </Button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="bg-muted p-4 rounded-lg mr-8 border border-border" role="status" aria-live="polite">
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                <p className="text-sm text-muted-foreground">
                  Capturing screenshot and analyzing with AI vision...
                </p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 flex-shrink-0" aria-label="Chat message">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your design..."
            disabled={loading}
            className="flex-1"
            aria-label="Ask about your design"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="Send message">
            <SendIcon className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>

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
            <img
              src={selectedScreenshot}
              alt="Map Screenshot"
              className="w-full h-auto rounded-lg"
              onError={() => {
                if (!selectedScreenshot?.startsWith('data:')) {
                  setSelectedScreenshot(null);
                }
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
