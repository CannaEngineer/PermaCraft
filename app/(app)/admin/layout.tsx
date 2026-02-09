import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth/admin';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isAdmin();

  if (!admin) {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-muted-foreground">
          Content management and system administration
        </p>
      </div>

      <Tabs defaultValue="content" className="mb-6">
        <TabsList>
          <Link href="/admin/content">
            <TabsTrigger value="content">Content Studio</TabsTrigger>
          </Link>
          <Link href="/admin/users">
            <TabsTrigger value="users">Users</TabsTrigger>
          </Link>
          <Link href="/admin/analytics">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </Link>
        </TabsList>
      </Tabs>

      {children}
    </div>
  );
}
