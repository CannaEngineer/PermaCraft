"use client";

import { useImmersiveMapUI } from "@/contexts/immersive-map-ui-context";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnhancedChatPanel } from "@/components/ai/enhanced-chat-panel";
import { useEffect } from "react";

interface ChatOverlayProps {
  farmId: string;
  onAnalyze: (query: string, conversationId?: string) => Promise<any>;
  initialConversationId?: string;
  initialMessage?: string;
  forceNewConversation?: boolean;
}

export function ChatOverlay({
  farmId,
  onAnalyze,
  initialConversationId,
  initialMessage,
  forceNewConversation,
}: ChatOverlayProps) {
  const { chatOpen, setChatOpen } = useImmersiveMapUI();

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && chatOpen) {
        setChatOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chatOpen, setChatOpen]);

  return (
    <AnimatePresence>
      {chatOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setChatOpen(false)}
            className="fixed inset-0 glass-backdrop z-50"
          />

          {/* Chat Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 bottom-0 w-full md:w-[400px] z-50 bg-background/95 backdrop-blur-2xl border-l border-border/40 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/40">
              <h2 className="text-lg font-semibold">AI Assistant</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setChatOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Chat Content */}
            <div className="flex-1 overflow-hidden">
              <EnhancedChatPanel
                farmId={farmId}
                initialConversationId={initialConversationId}
                initialMessage={initialMessage}
                forceNewConversation={forceNewConversation}
                onClose={() => setChatOpen(false)}
                onAnalyze={onAnalyze}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
