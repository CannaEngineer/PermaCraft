import { PublicTopBar } from "@/components/shared/public-top-bar";
import { Leaf } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <PublicTopBar />
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)] pt-14">
        <div className="w-full max-w-md p-8">
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Leaf className="h-5 w-5 text-primary" />
              </div>
              <span className="font-serif text-xl font-bold tracking-tight text-foreground">
                Permaculture.Studio
              </span>
            </div>
          </div>
          {children}
          <p className="text-center text-xs text-muted-foreground/50 mt-6">
            AI-powered permaculture design for regenerative growers
          </p>
        </div>
      </div>
    </div>
  );
}
