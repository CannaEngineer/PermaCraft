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
import type { AIConversation, AIAnalysis } from "@/lib/db/schema";

interface Message {
  role: "user" | "assistant";
  content: string;
  screenshots?: string[] | null;
}

interface ChatPanelProps {
  farmId: string;
  onAnalyze: (
    query: string,
    conversationId?: string
  ) => Promise<{
    response: string;
    conversationId: string;
    analysisId: string;
    screenshot: string;
  }>;
}

export function EnhancedChatPanel({ farmId, onAnalyze }: ChatPanelProps) {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(
    null
  );
  const isSubmittingRef = useRef(false);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [farmId]);

  // Load messages when conversation changes
  useEffect(() => {
    // Don't reload messages if we're in the middle of submitting a message
    // (to prevent duplicates from optimistic updates + database reload)
    if (isSubmittingRef.current) {
      console.log("[Chat] Skipping loadMessages - currently submitting");
      return;
    }

    if (currentConversationId) {
      loadMessages(currentConversationId);
    } else {
      setMessages([]);
    }
  }, [currentConversationId]);

  const loadConversations = async () => {
    try {
      const res = await fetch(`/api/farms/${farmId}/conversations`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);

        // Auto-select most recent conversation if exists
        if (
          data.conversations &&
          data.conversations.length > 0 &&
          !currentConversationId
        ) {
          setCurrentConversationId(data.conversations[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      console.log("[Chat] loadMessages called for:", conversationId);
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        const analyses: AIAnalysis[] = data.messages || [];

        console.log("[Chat] Loaded analyses count:", analyses.length);

        // Convert analyses to message format
        const msgs: Message[] = [];
        analyses.forEach((analysis) => {
          msgs.push({
            role: "user",
            content: analysis.user_query,
          });

          // Parse screenshot_data - it could be a single URL or JSON array
          let screenshots: string[] | null = null;
          if (analysis.screenshot_data) {
            try {
              // Try to parse as JSON array
              const parsed = JSON.parse(analysis.screenshot_data);
              screenshots = Array.isArray(parsed) ? parsed : [parsed];
            } catch {
              // If parsing fails, it's a single URL string
              screenshots = [analysis.screenshot_data];
            }
          }

          msgs.push({
            role: "assistant",
            content: analysis.ai_response,
            screenshots: screenshots,
          });
        });

        console.log("[Chat] Setting messages, total count:", msgs.length);
        setMessages(msgs);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setShowConversations(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");

    console.log("[Chat] handleSubmit called with:", userMessage);

    // Set flag to prevent useEffect from loading messages from DB
    isSubmittingRef.current = true;

    // Optimistically add user message
    setMessages((prev) => {
      console.log("[Chat] Adding user message, current count:", prev.length);
      return [...prev, { role: "user", content: userMessage }];
    });
    setLoading(true);

    try {
      console.log("[Chat] Calling onAnalyze...");
      const result = await onAnalyze(
        userMessage,
        currentConversationId || undefined
      );

      console.log("[Chat] onAnalyze returned:", {
        hasResponse: !!result.response,
        responseLength: result.response.length,
        conversationId: result.conversationId,
      });

      // Update current conversation ID if it was created
      if (!currentConversationId && result.conversationId) {
        console.log("[Chat] New conversation created, setting ID:", result.conversationId);
        setCurrentConversationId(result.conversationId);
        // Reload conversations list (but don't trigger loadMessages, we already have the messages)
        // We reload in the background without waiting to update the conversations sidebar
        loadConversations().catch(err => console.error("Failed to reload conversations:", err));
      }

      // Add AI response with screenshot (convert single screenshot to array for consistency)
      setMessages((prev) => {
        console.log("[Chat] Adding AI response, current count:", prev.length);
        return [
          ...prev,
          { role: "assistant", content: result.response, screenshots: result.screenshot ? [result.screenshot] : null },
        ];
      });
    } catch (error) {
      console.error("[Chat] Error in handleSubmit:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, analysis failed. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      // Clear the flag after a brief delay to allow state updates to settle
      setTimeout(() => {
        isSubmittingRef.current = false;
        console.log("[Chat] Submit complete, re-enabling loadMessages");
      }, 100);
    }
  };

  const selectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setShowConversations(false);
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the conversation

    if (!confirm("Delete this conversation? This cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete conversation");
      }

      // Remove from local state
      setConversations(prev => prev.filter(c => c.id !== conversationId));

      // If we deleted the current conversation, clear it
      if (conversationId === currentConversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      alert("Failed to delete conversation");
    }
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
            >
              <MessageSquareIcon className="h-3 w-3 mr-1" />
              {conversations.length}
            </Button>
            <Button
              onClick={startNewConversation}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <PlusIcon className="h-3 w-3 mr-1" />
              New
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => {
                const event = new CustomEvent("close-chat");
                window.dispatchEvent(event);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Conversations Sidebar */}
      <div
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
                onClick={() => selectConversation(conv.id)}
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
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))
        )}
      </div>

      <CardContent className="flex-1 flex flex-col min-h-0 p-4">
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <SparklesIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-sm">Ask me about your farm design!</p>
              <p className="text-xs mt-2">
                Try: "What native species would work well here?"
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
                    {msg.screenshots && msg.screenshots.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {msg.screenshots.map((screenshot, idx) => (
                          <Button
                            key={idx}
                            onClick={() => setSelectedScreenshot(screenshot)}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <ImageIcon className="h-4 w-4" />
                            {msg.screenshots!.length > 1
                              ? `View ${idx === 0 ? 'Primary' : 'Topo'} Map`
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
            <div className="bg-muted p-4 rounded-lg mr-8 border border-border">
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                <p className="text-sm text-muted-foreground">
                  Capturing screenshot and analyzing with AI vision...
                </p>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 flex-shrink-0">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your design..."
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            <SendIcon className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="max-w-4xl max-h-[90vh] overflow-auto bg-card rounded-lg p-4">
            <img
              src={selectedScreenshot}
              alt="Map Screenshot"
              className="w-full h-auto rounded-lg"
              onError={(e) => {
                // If R2 URL fails to load, show helpful message
                const target = e.target as HTMLImageElement;
                if (!selectedScreenshot.startsWith('data:')) {
                  console.error("Failed to load screenshot from R2:", selectedScreenshot);
                  target.style.display = 'none';
                  const errorDiv = document.createElement('div');
                  errorDiv.className = 'text-center p-8 text-muted-foreground';
                  errorDiv.innerHTML = `
                    <p class="text-lg font-semibold mb-2">Screenshot not available</p>
                    <p class="text-sm">R2 storage is not configured for public access.</p>
                    <p class="text-xs mt-2">See scripts/setup-r2-cors.md for setup instructions.</p>
                  `;
                  target.parentElement?.appendChild(errorDiv);
                }
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
