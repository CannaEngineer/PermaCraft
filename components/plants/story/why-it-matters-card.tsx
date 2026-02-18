'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STORY_TYPOGRAPHY } from '@/lib/design/plant-story-tokens';
import type { Species, SpeciesContent } from '@/lib/db/schema';

interface WhyItMattersCardProps {
  content: SpeciesContent;
  species: Species;
}

export function WhyItMattersCard({ content, species }: WhyItMattersCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-6 h-6 text-amber-600" />
          <span className={STORY_TYPOGRAPHY.label}>Ecological Story</span>
        </div>
        <h2 className={STORY_TYPOGRAPHY.cardTitle}>
          Why {species.common_name} Matters
        </h2>
      </div>

      {content.narrative_summary && (
        <p className={`${STORY_TYPOGRAPHY.body} text-muted-foreground`}>
          {content.narrative_summary}
        </p>
      )}

      {content.narrative_full && (
        <>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content.narrative_full}
                  </ReactMarkdown>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDown className={`w-4 h-4 mr-2 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? 'Show less' : 'Read the full story'}
          </Button>
        </>
      )}
    </div>
  );
}
