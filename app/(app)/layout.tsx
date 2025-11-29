import { requireAuth } from "@/lib/auth/session";
import { Sidebar } from "@/components/shared/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  return (
    <div className="h-screen flex">
      <div className="w-64 flex-shrink-0">
        <Sidebar userName={session.user.name || session.user.email} />
      </div>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
