import { getSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import AppLayoutClient from "./app-layout-client";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const adminStatus = session ? await isAdmin() : false;

  return (
    <AppLayoutClient
      userName={session?.user.name || session?.user.email || null}
      isAuthenticated={!!session}
      isAdmin={adminStatus}
    >
      {children}
    </AppLayoutClient>
  );
}
