"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SparklesIcon, SendIcon, MessageSquareIcon, PlusIcon, ImageIcon } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AIConversation, AIAnalysis } from "@/lib/db/schema";

interface Message {
  role: "user" | "assistant";
  content: string;
  screenshot?: string | null;
}

interface ChatPanelProps {
  farmId: string;
  onAnalyze: (query: string, conversationId?: string) => Promise<{ response: string; conversationId: string; analysisId: string }>;
}

export function EnhancedChatPanel({ farmId, onAnalyze }: ChatPanelProps) {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [farmId]);

  // Load messages when conversation changes
  useEffect(() => {
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
        if (data.conversations && data.conversations.length > 0 && !currentConversationId) {
          setCurrentConversationId(data.conversations[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        const analyses: AIAnalysis[] = data.messages || [];

        // Convert analyses to message format
        const msgs: Message[] = [];
        analyses.forEach((analysis) => {
          msgs.push({
            role: "user",
            content: analysis.user_query,
          });
          msgs.push({
            role: "assistant",
            content: analysis.ai_response,
            screenshot: analysis.screenshot_data,
          });
        });

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

    // Optimistically add user message
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const result = await onAnalyze(userMessage, currentConversationId || undefined);

      // Update current conversation ID if it was created
      if (!currentConversationId && result.conversationId) {
        setCurrentConversationId(result.conversationId);
        // Reload conversations to show the new one
        await loadConversations();
      }

      // Add AI response (screenshot will be loaded when viewing history)
      setMessages((prev) => [...prev, { role: "assistant", content: result.response }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, analysis failed. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setShowConversations(false);
  };

  const currentConversation = conversations.find(c => c.id === currentConversationId);

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
          </div>
        </div>
      </CardHeader>

      {/* Conversations Sidebar */}
      {showConversations && (
        <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border-x border-b rounded-b-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  conv.id === currentConversationId ? "bg-gray-100 dark:bg-gray-800" : ""
                }`}
              >
                <div className="font-medium text-sm truncate">{conv.title || "Untitled Conversation"}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(conv.updated_at * 1000).toLocaleDateString()}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      <CardContent className="flex-1 flex flex-col min-h-0 p-4">
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <SparklesIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-sm">
                Ask me about your farm design!
              </p>
              <p className="text-xs mt-2">
                Try: "What native species would work well here?"
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground ml-8"
                    : "bg-muted mr-8"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    {msg.screenshot && (
                      <button
                        onClick={() => setSelectedScreenshot(msg.screenshot || null)}
                        className="mt-2 text-xs flex items-center gap-1 text-primary hover:underline"
                      >
                        <ImageIcon className="h-3 w-3" />
                        View Screenshot
                      </button>
                    )}
                  </>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="bg-muted p-3 rounded-lg mr-8">
              <p className="text-sm text-muted-foreground">Analyzing...</p>
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
          <div className="max-w-4xl max-h-[90vh] overflow-auto">
            <img
              src={selectedScreenshot}
              alt="Map Screenshot"
              className="w-full h-auto rounded-lg"
            />
          </div>
        </div>
      )}
    </Card>
  );
}
