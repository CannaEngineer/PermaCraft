import {
  LayoutDashboard,
  Compass,
  Leaf,
  GraduationCap,
  Map,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  /** When inside canvas, this maps to a canvas section instead of a route */
  canvasSection?: string;
}

/**
 * Returns the unified navigation items, context-aware based on current route.
 *
 * - On /dashboard: primary item is "Farm" → /canvas
 * - On /canvas: primary item is "Dashboard" → /dashboard
 * - Remaining items are consistent everywhere
 */
export function getNavItems(pathname: string): NavItem[] {
  const isCanvas = pathname === '/canvas' || pathname.startsWith('/canvas/');

  const primaryItem: NavItem = isCanvas
    ? { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' }
    : { id: 'farm', label: 'Farm', icon: Map, href: '/canvas' };

  return [
    primaryItem,
    { id: 'discover', label: 'Discover', icon: Compass, href: '/gallery', canvasSection: 'explore' },
    { id: 'plants', label: 'Plants', icon: Leaf, href: '/plants', canvasSection: 'plants' },
    { id: 'learn', label: 'Learn', icon: GraduationCap, href: '/learn', canvasSection: 'learn' },
  ];
}

/**
 * Determine if a route is active, supporting nested routes.
 * Special case: /learn does NOT match /learn/blog (Blog has its own entry).
 */
export function isRouteActive(pathname: string, href: string): boolean {
  if (href === '/learn' && pathname.startsWith('/learn/blog')) return false;
  return pathname === href || pathname.startsWith(href + '/');
}
