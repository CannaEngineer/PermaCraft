"use client";

import { useState } from "react";
import Link from "next/link";
import { useImmersiveMapUI } from "@/contexts/immersive-map-ui-context";
import { Button } from "@/components/ui/button";
import { SaveIcon, MessageSquare, Target, ChevronDown, ChevronUp, Download, ShoppingBag, Menu, User, LayoutDashboard, ArrowLeft, X } from "lucide-react";
import type { Farm } from "@/lib/db/schema";
import { motion, AnimatePresence } from "framer-motion";
import { FarmSettingsButton } from "@/components/farm/farm-settings-button";

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
}

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
}: CollapsibleHeaderProps) {
  const { headerCollapsed, setHeaderCollapsed } = useImmersiveMapUI();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
    {/* Mobile navigation menu */}
    <AnimatePresence>
      {mobileMenuOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 left-0 w-72 bg-background/95 backdrop-blur-xl border-r border-border shadow-2xl z-[70] md:hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-sm">Farm Menu</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-3 space-y-1">
              <Link href="/dashboard" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors">
                <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Dashboard</span>
              </Link>
              <Link href={`/profile/${farm.user_id}`} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">My Profile</span>
              </Link>
              <button onClick={() => { onOpenGoals(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors">
                <Target className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Farm Goals</span>
                {goalsCount > 0 && (
                  <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">{goalsCount}</span>
                )}
              </button>
              <Link href={`/farm/${farm.id}/shop`} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors">
                <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{isShopEnabled ? 'Manage Shop' : 'Open a Shop'}</span>
              </Link>
              <button onClick={() => { onExport(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors">
                <Download className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Export</span>
              </button>
              <button onClick={() => { onSave(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors">
                <SaveIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{saving ? 'Saving...' : hasUnsavedChanges ? 'Save Now' : 'Saved'}</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    <motion.header
      initial={false}
      animate={{
        height: headerCollapsed ? 48 : 120,
        paddingTop: headerCollapsed ? 8 : 16,
        paddingBottom: headerCollapsed ? 8 : 12,
      }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50"
      style={{ willChange: 'height' }}
    >
      <div className="px-3 sm:px-6 h-full flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Farm Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className="flex-shrink-0 h-8 w-8 md:hidden"
            >
              <Menu className="h-4 w-4" />
            </Button>
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

                <Link href={`/farm/${farm.id}/shop`}>
                  <Button variant="ghost" size="sm">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    {isShopEnabled ? 'Manage Shop' : 'Open a Shop'}
                  </Button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Export Button - Desktop only */}
          <Button
            variant="outline"
            size={headerCollapsed ? "icon" : "default"}
            onClick={onExport}
            className="hidden md:flex"
          >
            <Download className={headerCollapsed ? "h-4 w-4" : "h-4 w-4 sm:mr-2"} />
            {!headerCollapsed && <span className="hidden sm:inline">Export</span>}
          </Button>

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
    </>
  );
}
