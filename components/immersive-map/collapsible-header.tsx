"use client";

import { useImmersiveMapUI } from "@/contexts/immersive-map-ui-context";
import { Button } from "@/components/ui/button";
import { SaveIcon, MessageSquare, Target, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import type { Farm } from "@/lib/db/schema";
import { motion, AnimatePresence } from "framer-motion";
import { FarmSettingsButton } from "@/components/farm/farm-settings-button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useRouter } from "next/navigation";

interface CollapsibleHeaderProps {
  farm: Farm;
  hasUnsavedChanges: boolean;
  saving: boolean;
  goalsCount: number;
  isPublic: boolean;
  onSave: () => void;
  onOpenChat: () => void;
  onOpenGoals: () => void;
  onDeleteClick: () => void;
}

export function CollapsibleHeader({
  farm,
  hasUnsavedChanges,
  saving,
  goalsCount,
  isPublic,
  onSave,
  onOpenChat,
  onOpenGoals,
  onDeleteClick,
}: CollapsibleHeaderProps) {
  const { headerCollapsed, setHeaderCollapsed } = useImmersiveMapUI();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const router = useRouter();

  return (
    <motion.header
      initial={false}
      animate={{
        height: headerCollapsed ? (isMobile ? 0 : 48) : (isMobile ? 56 : 120),
        paddingTop: headerCollapsed ? 0 : (isMobile ? 8 : 16),
        paddingBottom: headerCollapsed ? 0 : (isMobile ? 8 : 12),
      }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50"
      style={{ willChange: 'height' }}
    >
      <div className="px-4 sm:px-6 h-full flex items-center justify-between gap-4">
        {/* Left: Farm Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            {/* Back button - mobile only */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/dashboard')}
                className="flex-shrink-0 h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <motion.h1
              animate={{
                fontSize: headerCollapsed ? '1.125rem' : '1.875rem',
              }}
              transition={{ duration: 0.25 }}
              className="font-serif font-bold text-foreground truncate"
            >
              {farm.name}
            </motion.h1>

            {/* Status Badges (desktop only) */}
            <AnimatePresence>
              {!headerCollapsed && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="hidden sm:flex items-center gap-2"
                >
                  {hasUnsavedChanges && !saving && (
                    <span className="text-xs bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800 font-medium">
                      Unsaved
                    </span>
                  )}
                  {saving && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800 font-medium animate-pulse">
                      Saving...
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toggle button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHeaderCollapsed(!headerCollapsed)}
              className="flex-shrink-0 h-8 w-8"
            >
              {headerCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Description (only when expanded) */}
          <AnimatePresence>
            {!headerCollapsed && farm.description && (
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-muted-foreground line-clamp-1 mt-1"
              >
                {farm.description}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Expanded actions */}
          <AnimatePresence>
            {!headerCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="hidden md:flex items-center gap-2"
              >
                <Button
                  onClick={onSave}
                  disabled={saving}
                  variant={hasUnsavedChanges ? "default" : "outline"}
                  size="sm"
                >
                  <SaveIcon className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : hasUnsavedChanges ? "Save Now" : "Saved"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenGoals}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Goals
                  {goalsCount > 0 && (
                    <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {goalsCount}
                    </span>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Always visible: AI Chat */}
          <Button
            variant="default"
            size={headerCollapsed ? "icon" : "default"}
            onClick={onOpenChat}
          >
            <MessageSquare className={headerCollapsed ? "h-4 w-4" : "h-4 w-4 sm:mr-2"} />
            {!headerCollapsed && <span className="hidden sm:inline">AI Assistant</span>}
          </Button>

          {/* Settings */}
          <FarmSettingsButton
            farmId={farm.id}
            initialIsPublic={isPublic}
            onDeleteClick={onDeleteClick}
          />
        </div>
      </div>
    </motion.header>
  );
}
