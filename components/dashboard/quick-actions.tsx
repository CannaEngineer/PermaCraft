import Link from 'next/link';
import { PlusIcon, Users, GraduationCap, Sprout, Share2, Sparkles } from 'lucide-react';

export function QuickActions() {
  const actions = [
    {
      label: 'Create Farm',
      description: 'Start a new design',
      href: '/farm/new',
      icon: PlusIcon,
      color: 'bg-green-500/10 text-green-600 border-green-200',
    },
    {
      label: 'Share Post',
      description: 'Share with community',
      href: '/gallery',
      icon: Share2,
      color: 'bg-blue-500/10 text-blue-600 border-blue-200',
    },
    {
      label: 'Start Learning',
      description: 'Browse lessons',
      href: '/learn',
      icon: GraduationCap,
      color: 'bg-purple-500/10 text-purple-600 border-purple-200',
    },
    {
      label: 'Explore Plants',
      description: 'Find species',
      href: '/plants',
      icon: Sprout,
      color: 'bg-amber-500/10 text-amber-600 border-amber-200',
    },
    {
      label: 'AI Analysis',
      description: 'Get recommendations',
      href: '/dashboard',
      icon: Sparkles,
      color: 'bg-pink-500/10 text-pink-600 border-pink-200',
    },
    {
      label: 'Community',
      description: 'Connect & share',
      href: '/gallery',
      icon: Users,
      color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="group flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:shadow-md transition-all hover:scale-105"
        >
          <div className={`w-12 h-12 rounded-full ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform border`}>
            <action.icon className="w-6 h-6" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm">{action.label}</p>
            <p className="text-xs text-muted-foreground">{action.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
