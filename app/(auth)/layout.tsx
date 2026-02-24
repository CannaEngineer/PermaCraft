import { PublicTopBar } from "@/components/shared/public-top-bar";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <PublicTopBar />
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)] pt-14">
        <div className="w-full max-w-md p-8">{children}</div>
      </div>
    </div>
  );
}
