'use client';

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface AIInsightTabProps {
  farmId: string;
  onPostCreated: () => void;
}

interface Conversation {
  id: string;
  created_at: number;
  preview: string;
}

export function AIInsightTab({ farmId, onPostCreated }: AIInsightTabProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [commentary, setCommentary] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadConversations();
  }, [farmId]);

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

  const handleSubmit = async () => {
    if (!selectedConversationId || !commentary.trim() || submitting) return;

    setSubmitting(true);
    try {
      // Get the conversation details
      const conversationRes = await fetch(`/api/conversations/${selectedConversationId}/messages`);
      const conversationData = await conversationRes.json();

      // Get last AI message as excerpt
      const aiMessages = conversationData.messages.filter((m: any) => m.ai_response);
      const lastAiMessage = aiMessages[aiMessages.length - 1];
      const excerpt = lastAiMessage?.ai_response?.substring(0, 300) || '';

      // Create post
      const postRes = await fetch(`/api/farms/${farmId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ai_insight',
          content: commentary.trim(),
          ai_conversation_id: selectedConversationId,
          ai_response_excerpt: excerpt,
        }),
      });

      if (!postRes.ok) throw new Error('Failed to create post');

      setCommentary('');
      setSelectedConversationId('');
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
      <div className="space-y-2">
        <Label>Select Conversation</Label>
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

      <div className="space-y-2">
        <Label>Your Commentary</Label>
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

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={!selectedConversationId || !commentary.trim() || submitting}
      >
        {submitting ? 'Publishing...' : 'Share AI Insight'}
      </Button>
    </div>
  );
}
