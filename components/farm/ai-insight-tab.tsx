'use client';

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIInsightTabProps {
  farmId: string;
  onPostCreated: () => void;
}

interface Conversation {
  id: string;
  created_at: number;
  preview: string;
}

interface AIMessage {
  id: string;
  user_query: string;
  ai_response: string;
  created_at: number;
}

export function AIInsightTab({ farmId, onPostCreated }: AIInsightTabProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string>('');
  const [commentary, setCommentary] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadConversations();
  }, [farmId]);

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    } else {
      setAiMessages([]);
      setSelectedMessageId('');
    }
  }, [selectedConversationId]);

  const loadConversations = async () => {
    try {
      const res = await fetch(`/api/farms/${farmId}/conversations`);
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      const data = await res.json();
      setAiMessages(data.messages || []);
      // Auto-select the last message
      if (data.messages && data.messages.length > 0) {
        setSelectedMessageId(data.messages[data.messages.length - 1].id);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedConversationId || !selectedMessageId || !commentary.trim() || submitting) return;

    setSubmitting(true);
    try {
      // Get the selected AI message
      const selectedMessage = aiMessages.find((m) => m.id === selectedMessageId);
      if (!selectedMessage) throw new Error('Message not found');

      // Create post with full AI response
      const postRes = await fetch(`/api/farms/${farmId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ai_insight',
          content: commentary.trim(),
          ai_conversation_id: selectedConversationId,
          ai_analysis_id: selectedMessageId,
          ai_response_excerpt: selectedMessage.ai_response, // Full response now
        }),
      });

      if (!postRes.ok) throw new Error('Failed to create post');

      setCommentary('');
      setSelectedConversationId('');
      setSelectedMessageId('');
      setAiMessages([]);
      onPostCreated();
    } catch (error) {
      console.error('Failed to create AI insight post:', error);
      alert('Failed to create AI insight post');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No AI conversations yet. Start chatting with the AI to get insights!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Step 1: Select Conversation */}
      <div className="space-y-2">
        <Label>Step 1: Select Conversation</Label>
        <Select value={selectedConversationId} onValueChange={setSelectedConversationId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a conversation..." />
          </SelectTrigger>
          <SelectContent>
            {conversations.map((conv) => (
              <SelectItem key={conv.id} value={conv.id}>
                {new Date(conv.created_at * 1000).toLocaleDateString()} - {conv.preview}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Step 2: Select AI Response to Share */}
      {selectedConversationId && (
        <div className="space-y-2">
          <Label>Step 2: Select AI Response to Share</Label>
          {loadingMessages ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <RadioGroup value={selectedMessageId} onValueChange={setSelectedMessageId}>
              <div className="space-y-3 max-h-[400px] overflow-y-auto border rounded-lg p-3">
                {aiMessages.map((message) => (
                  <div key={message.id} className="flex items-start gap-3">
                    <RadioGroupItem value={message.id} id={message.id} className="mt-1" />
                    <label htmlFor={message.id} className="flex-1 cursor-pointer">
                      <div className="space-y-2 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                        <p className="text-sm font-medium text-muted-foreground">
                          Question: {message.user_query}
                        </p>
                        <div className="prose prose-sm max-w-none dark:prose-invert line-clamp-4">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.ai_response}
                          </ReactMarkdown>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(message.created_at * 1000).toLocaleString()}
                        </p>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}
        </div>
      )}

      {/* Step 3: Add Commentary */}
      {selectedMessageId && (
        <div className="space-y-2">
          <Label>Step 3: Add Your Commentary</Label>
          <Textarea
            placeholder="Share what you learned or how you're applying this insight..."
            value={commentary}
            onChange={(e) => setCommentary(e.target.value)}
            rows={6}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Explain the context and why this AI insight is valuable
          </p>
        </div>
      )}

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={!selectedConversationId || !selectedMessageId || !commentary.trim() || submitting}
      >
        {submitting ? 'Publishing...' : 'Share AI Insight'}
      </Button>
    </div>
  );
}
