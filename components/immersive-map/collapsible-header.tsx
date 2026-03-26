"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useImmersiveMapUI } from "@/contexts/immersive-map-ui-context";
import { Button } from "@/components/ui/button";
import { SaveIcon, MessageSquare, Target, ChevronDown, ChevronUp, Download, ShoppingBag, Menu, User, LayoutDashboard, X, CheckSquare, CalendarDays, BarChart3, BookOpen, Info, Play, Pause } from "lucide-react";
import type { Farm } from "@/lib/db/schema";
import { motion, AnimatePresence } from "framer-motion";
import { FarmSettingsButton } from "@/components/farm/farm-settings-button";
import { TimelinePlaybackBar } from "@/components/time-machine/timeline-playback-bar";

interface Planting {
  id: string;
  common_name: string;
  scientific_name: string;
  layer: string;
  planted_year: number;
  years_to_maturity: number;
  mature_height_ft: number;
}

interface CollapsibleHeaderProps {
  farm: Farm;
  hasUnsavedChanges: boolean;
  saving: boolean;
  goalsCount: number;
  isPublic: boolean;
  isShopEnabled?: number;
  onSave: () => void;
  onOpenChat: () => void;
  onOpenGoals: () => void;
  onDeleteClick: () => void;
  onExport: () => void;
  onOpenJournalEntry?: () => void;
  onOpenFarmInfo?: () => void;
  /** Time machine props */
  plantings?: Planting[];
  currentYear?: number;
  onYearChange?: (year: number) => void;
}

/**
 * Simplified Collapsible Header.
 *
 * Changes from previous version:
 *   - Slide-out menu items grouped into 3 clear sections with labels:
 *     "Navigate", "Farm Design", and "Manage"
 *   - Removed duplicate Save button from slide-out (it's always in the header)
 *   - Added Escape key to close the slide-out menu
 *   - Auto-close menu after clicking any item (already existed, now consistent)
 *   - Clearer visual hierarchy with section headings
 */
export function CollapsibleHeader({
  farm,
  hasUnsavedChanges,
  saving,
  goalsCount,
  isPublic,
  isShopEnabled,
  onSave,
  onOpenChat,
  onOpenGoals,
  onDeleteClick,
  onExport,
  onOpenJournalEntry,
  onOpenFarmInfo,
  plantings,
  currentYear,
  onYearChange,
}: CollapsibleHeaderProps) {
  const { headerCollapsed, setHeaderCollapsed } = useImmersiveMapUI();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMenuHint, setShowMenuHint] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const thisYear = new Date().getFullYear();
  const isProjecting = currentYear !== undefined && currentYear !== thisYear;

  // Show a brief pulse on the menu button when the header first collapses
  useEffect(() => {
    if (headerCollapsed) {
      setShowMenuHint(true);
      const timer = setTimeout(() => setShowMenuHint(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [headerCollapsed]);

  // Close slide-out menu with Escape key
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Helper to create a menu action button with consistent styling
  const MenuAction = ({ icon: Icon, label, onClick }: { icon: typeof Target; label: string; onClick: () => void }) => (
    <button onClick={() => { onClick(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="text-sm">{label}</span>
    </button>
  );

  // Helper to create a menu link with consistent styling
  const MenuLink = ({ icon: Icon, label, href, badge }: { icon: typeof Target; label: string; href: string; badge?: number }) => (
    <Link href={href} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="text-sm flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 min-w-[1.25rem] px-1 flex items-center justify-center">{badge}</span>
      )}
    </Link>
  );

  return (
    <>
    {/* Slide-out menu — grouped into clear sections */}
    <AnimatePresence>
      {mobileMenuOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 left-0 w-72 bg-background/95 backdrop-blur-xl border-r border-border shadow-2xl z-[70]"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-sm">{farm.name}</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-64px)]">

              {/* Section: Navigate */}
              <div>
                <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Navigate</p>
                <MenuLink icon={LayoutDashboard} label="Dashboard" href="/dashboard" />
                <MenuLink icon={User} label="My Profile" href={`/profile/${farm.user_id}`} />
              </div>

              {/* Section: Farm Design */}
              <div>
                <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Farm Design</p>
                <MenuAction icon={Target} label="Goals" onClick={onOpenGoals} />
                {onOpenFarmInfo && (
                  <MenuAction icon={Info} label="Farm Info" onClick={onOpenFarmInfo} />
                )}
                {onOpenJournalEntry && (
                  <MenuAction icon={BookOpen} label="Journal Entry" onClick={onOpenJournalEntry} />
                )}
                <MenuAction icon={Download} label="Export" onClick={onExport} />
              </div>

              {/* Section: Manage */}
              <div>
                <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Manage</p>
                <MenuLink icon={CheckSquare} label="Tasks" href={`/farm/${farm.id}/tasks`} />
                <MenuLink icon={CalendarDays} label="Crop Plans" href={`/farm/${farm.id}/plan`} />
                <MenuLink icon={BarChart3} label="Reports" href={`/farm/${farm.id}/reports`} />
                <MenuLink icon={ShoppingBag} label={isShopEnabled ? 'Manage Shop' : 'Open a Shop'} href={`/farm/${farm.id}/shop`} />
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    <motion.header
      initial={false}
      animate={{
        height: headerCollapsed ? 48 : 96,
        paddingTop: headerCollapsed ? 8 : 12,
        paddingBottom: headerCollapsed ? 8 : 8,
      }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50"
      style={{ willChange: 'height' }}
    >
      <div className="px-3 sm:px-6 h-full flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Farm Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Menu button — opens slide-out with all non-map actions */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className={`flex-shrink-0 h-9 w-9 ${showMenuHint ? 'animate-pulse ring-2 ring-primary/50 rounded-lg' : ''}`}
              aria-label="Open farm menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <motion.h1
              animate={{
                fontSize: headerCollapsed ? '1.125rem' : '1.5rem',
              }}
              transition={{ duration: 0.25 }}
              className="font-serif font-bold text-foreground truncate"
            >
              {farm.name}
            </motion.h1>

            {/* Time Machine play button */}
            {onYearChange && (
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 gap-1.5 px-2 flex-shrink-0 ${isProjecting ? 'text-primary' : ''}`}
                onClick={() => setTimelineOpen(!timelineOpen)}
                aria-label={timelineOpen ? 'Close time machine' : 'Open time machine'}
              >
                {timelineOpen ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {isProjecting && (
                  <span className="text-xs font-semibold tabular-nums">{currentYear}</span>
                )}
              </Button>
            )}

            {/* Status Badges */}
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
                className="text-sm text-muted-foreground line-clamp-1 mt-0.5 ml-12"
              >
                {farm.description}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Essential actions only */}
        <div className="flex items-center gap-2">
          {/* Save + Goals — only when expanded, desktop only */}
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
            {!headerCollapsed && <span className="hidden sm:inline">AI Chat</span>}
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

    {/* Timeline playback bar — slides down from header */}
    <AnimatePresence>
      {timelineOpen && plantings && currentYear !== undefined && onYearChange && (
        <TimelinePlaybackBar
          plantings={plantings}
          currentYear={currentYear}
          onYearChange={onYearChange}
          onClose={() => setTimelineOpen(false)}
        />
      )}
    </AnimatePresence>
    </>
  );
}
