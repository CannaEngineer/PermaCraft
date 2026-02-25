import {
  LayoutDashboard,
  Users,
  Store,
  GraduationCap,
  BookOpen,
  Leaf,
} from 'lucide-react';

export const mainNavItems = [
  { name: 'Canvas', href: '/canvas', icon: LayoutDashboard, requiresAuth: true },
  { name: 'Community', href: '/gallery', icon: Users, requiresAuth: false },
  { name: 'Shop', href: '/shops', icon: Store, requiresAuth: false },
  { name: 'Learn', href: '/learn', icon: GraduationCap, requiresAuth: false },
  { name: 'Blog', href: '/learn/blog', icon: BookOpen, requiresAuth: false },
  { name: 'Plants', href: '/plants', icon: Leaf, requiresAuth: false },
];

/**
 * Determine if a route is active, supporting nested routes.
 * Special case: /learn does NOT match /learn/blog (Blog has its own entry).
 */
export function isRouteActive(pathname: string, href: string): boolean {
  if (href === '/learn' && pathname.startsWith('/learn/blog')) return false;
  return pathname === href || pathname.startsWith(href + '/');
}
