'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { X, Send, Loader2, MessageCircle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TourChatProps {
  farmSlug: string;
  currentPoiId?: string;
  onClose: () => void;
}

const STARTER_PROMPTS = [
  'What am I looking at?',
  'How does this fit into the permaculture design?',
  'What species are here and why?',
];

export function TourChat({ farmSlug, currentPoiId, onClose }: TourChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const getQueryCount = (): number => {
    if (typeof window === 'undefined') return 0;
    return parseInt(sessionStorage.getItem('tour_ai_queries') || '0', 10);
  };

  const incrementQueryCount = () => {
    if (typeof window === 'undefined') return;
    const count = getQueryCount() + 1;
    sessionStorage.setItem('tour_ai_queries', String(count));
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    // Soft cap at 20 queries
    if (getQueryCount() >= 20) {
      setMessages(prev => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: "You've reached the question limit for this tour session. Feel free to explore on your own — there's so much to discover!" },
      ]);
      return;
    }

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    incrementQueryCount();

    // Track AI query event
    const sessionId = sessionStorage.getItem('tour_session_id');
    const farmId = sessionStorage.getItem('tour_farm_id');
    if (sessionId && farmId) {
      fetch('/api/tour/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          events: [{
            session_id: sessionId,
            farm_id: farmId,
            poi_id: currentPoiId || null,
            event_type: 'ai_query',
            payload: { query_length: text.length },
          }],
        }),
      }).catch(console.error);
    }

    try {
      const response = await fetch('/api/tour/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          farm_slug: farmSlug,
          poi_id: currentPoiId,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('AI unavailable');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                assistantContent += parsed.text;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "I'm having trouble connecting right now. Try again in a moment!" },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, farmSlug, currentPoiId]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-600" />
          <span className="font-semibold">Tour Guide AI</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <MessageCircle className="w-10 h-10 text-green-600 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Ask me anything about what you&apos;re seeing on the farm!
            </p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              {STARTER_PROMPTS.map((prompt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-left justify-start h-auto py-2 text-sm"
                  onClick={() => sendMessage(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <Card className={`max-w-[85%] ${msg.role === 'user' ? 'bg-green-600 text-white' : ''}`}>
              <CardContent className="p-3">
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </CardContent>
            </Card>
          </div>
        ))}
        {isStreaming && messages[messages.length - 1]?.content === '' && (
          <div className="flex justify-start">
            <Card>
              <CardContent className="p-3">
                <Loader2 className="w-4 h-4 animate-spin" />
              </CardContent>
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            disabled={isStreaming}
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1 text-center">
          {getQueryCount()}/20 questions used
        </p>
      </div>
    </div>
  );
}
