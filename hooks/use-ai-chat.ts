'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AIConversation, AIAnalysis } from '@/lib/db/schema';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  screenshots?: string[] | null;
  generatedImageUrl?: string | null;
}

export interface AnalyzeResult {
  response: string;
  conversationId: string;
  analysisId: string;
  screenshot?: string;
  generatedImageUrl?: string | null;
}

interface UseAIChatOptions {
  farmId?: string | null;
  initialConversationId?: string;
  initialMessage?: string;
  forceNewConversation?: boolean;
  /** Called for map analysis (with screenshots). If not provided, uses text-only /api/ai/chat. */
  onAnalyze?: (query: string, conversationId?: string) => Promise<AnalyzeResult>;
}

export function useAIChat({
  farmId,
  initialConversationId,
  initialMessage,
  forceNewConversation,
  onAnalyze,
}: UseAIChatOptions) {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const hasAutoSentRef = useRef(false);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      // If we have a farmId, load farm-specific conversations
      // Otherwise load all user conversations
      const url = farmId
        ? `/api/farms/${farmId}/conversations`
        : '/api/user/ai-conversations';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, [farmId]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        const analyses: AIAnalysis[] = data.messages || [];
        const msgs: ChatMessage[] = [];

        analyses.forEach((analysis) => {
          msgs.push({ role: 'user', content: analysis.user_query });

          let screenshots: string[] | null = null;
          if (analysis.screenshot_data) {
            try {
              const parsed = JSON.parse(analysis.screenshot_data);
              screenshots = Array.isArray(parsed) ? parsed : [parsed];
            } catch {
              screenshots = [analysis.screenshot_data];
            }
          }

          msgs.push({
            role: 'assistant',
            content: analysis.ai_response,
            screenshots,
            generatedImageUrl: analysis.generated_image_url,
          });
        });

        setMessages(msgs);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, []);

  // Load conversations on mount / farmId change
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Handle initial conversation or force new
  useEffect(() => {
    if (forceNewConversation) {
      setCurrentConversationId(null);
      setMessages([]);
      hasAutoSentRef.current = false;
    } else if (initialConversationId) {
      setCurrentConversationId(initialConversationId);
    }
  }, [initialConversationId, forceNewConversation]);

  // Load messages when conversation changes
  useEffect(() => {
    if (isSubmittingRef.current) return;
    if (currentConversationId) {
      loadMessages(currentConversationId);
    } else {
      setMessages([]);
    }
  }, [currentConversationId, loadMessages]);

  // Submit a message
  const submitMessage = useCallback(async (message: string, useMapAnalysis = false) => {
    if (!message.trim() || loading) return;
    const userMessage = message.trim();
    isSubmittingRef.current = true;

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      let result: { response: string; conversationId: string; screenshot?: string; generatedImageUrl?: string | null };

      if (useMapAnalysis && onAnalyze) {
        // Map analysis path — captures screenshot
        result = await onAnalyze(userMessage, currentConversationId || undefined);
      } else {
        // Text-only chat path
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: userMessage,
            conversationId: currentConversationId || undefined,
            farmId: farmId || undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(err.error || 'Chat request failed');
        }

        result = await res.json();
      }

      // Update conversation ID if new
      if (!currentConversationId && result.conversationId) {
        setCurrentConversationId(result.conversationId);
        loadConversations().catch(() => {});
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: result.response,
          screenshots: result.screenshot ? [result.screenshot] : null,
          generatedImageUrl: result.generatedImageUrl || null,
        },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => { isSubmittingRef.current = false; }, 500);
    }
  }, [loading, currentConversationId, farmId, onAnalyze, loadConversations]);

  // Auto-send initial message
  useEffect(() => {
    if (initialMessage && !hasAutoSentRef.current && !loading) {
      hasAutoSentRef.current = true;
      setTimeout(() => submitMessage(initialMessage), 300);
    }
  }, [initialMessage, loading, submitMessage]);

  const startNewConversation = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
  }, []);

  const selectConversation = useCallback((conversationId: string) => {
    setCurrentConversationId(conversationId);
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (conversationId === currentConversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  }, [currentConversationId]);

  return {
    conversations,
    messages,
    loading,
    currentConversationId,
    submitMessage,
    startNewConversation,
    selectConversation,
    deleteConversation,
    loadConversations,
  };
}
