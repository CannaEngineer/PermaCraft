import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default async function AdminTourLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  // Allow farm owners and admins
  const admin = await isAdmin();
  if (!admin) {
    // Check if user owns any farms
    const farmResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM farms WHERE user_id = ?',
      args: [session.user.id],
    });
    if (Number((farmResult.rows[0] as any)?.count) === 0) {
      redirect('/dashboard');
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">PermaTour Management</h1>
        <p className="text-muted-foreground text-sm">
          Configure self-guided tours for your farm visitors
        </p>
      </div>

      <nav className="flex gap-2 mb-6 border-b pb-3">
        <Link href="/admin/tour">
          <Button variant="ghost" size="sm">Overview</Button>
        </Link>
        <Link href="/admin/tour/pois">
          <Button variant="ghost" size="sm">Points of Interest</Button>
        </Link>
        <Link href="/admin/tour/routes">
          <Button variant="ghost" size="sm">Routes</Button>
        </Link>
        <Link href="/admin/tour/analytics">
          <Button variant="ghost" size="sm">Analytics</Button>
        </Link>
      </nav>

      {children}
    </div>
  );
}
