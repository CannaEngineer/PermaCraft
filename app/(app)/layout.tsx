import { getSession } from "@/lib/auth/session";
import AppLayoutClient from "./app-layout-client";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <AppLayoutClient
      userName={session?.user.name || session?.user.email || null}
      isAuthenticated={!!session}
    >
      {children}
    </AppLayoutClient>
  );
}
