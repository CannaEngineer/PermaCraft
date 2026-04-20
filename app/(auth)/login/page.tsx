"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DebugLogEntry {
  timestamp: string;
  step: string;
  status: "pending" | "success" | "error" | "info";
  detail?: string;
}

function DebugPanel({ logs, visible }: { logs: DebugLogEntry[]; visible: boolean }) {
  if (!visible || logs.length === 0) return null;

  const statusIcon = (status: DebugLogEntry["status"]) => {
    switch (status) {
      case "success": return "\u2705";
      case "error": return "\u274C";
      case "pending": return "\u23F3";
      case "info": return "\u2139\uFE0F";
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-border bg-muted/50 overflow-hidden">
      <div className="px-3 py-2 bg-muted border-b border-border">
        <span className="text-xs font-mono font-semibold text-muted-foreground">Login Debug Log</span>
      </div>
      <div className="max-h-64 overflow-y-auto p-2 space-y-1">
        {logs.map((log, i) => (
          <div key={i} className="flex items-start gap-2 text-xs font-mono">
            <span className="shrink-0">{statusIcon(log.status)}</span>
            <span className="text-muted-foreground shrink-0">{log.timestamp}</span>
            <div className="min-w-0">
              <span className="font-medium">{log.step}</span>
              {log.detail && (
                <span className="text-muted-foreground block break-all">{log.detail}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const IS_DEV = process.env.NODE_ENV === "development";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
  const router = useRouter();

  const addLog = useCallback((step: string, status: DebugLogEntry["status"], detail?: string) => {
    const timestamp = new Date().toLocaleTimeString("en-US", { hour12: false, fractionalSecondDigits: 3 });
    setDebugLogs((prev) => [...prev, { timestamp, step, status, detail }]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setDebugLogs([]);

    const debugMode = showDebug;

    if (debugMode) addLog("Starting login", "info", `Email: ${email}`);

    try {
      if (debugMode) addLog("POST /api/auth/sign-in", "pending");

      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (debugMode) {
        addLog(
          "Response received",
          res.ok ? "success" : "error",
          `Status: ${res.status} ${res.statusText}`
        );

        // Log response headers relevant to auth
        const setCookie = res.headers.get("set-cookie");
        addLog("Response headers", "info", `set-cookie present: ${!!setCookie}`);
      }

      if (!res.ok) {
        let errorMessage = "Login failed";
        try {
          const data = await res.json();
          errorMessage = data.error || errorMessage;
          if (debugMode) addLog("Error response body", "error", JSON.stringify(data));
        } catch {
          if (res.status >= 500) {
            errorMessage = "Server error. Please try again later.";
          }
          if (debugMode) addLog("Non-JSON error response", "error", `Status ${res.status}`);
        }
        setError(errorMessage);
        return;
      }

      // Parse success response
      let userData;
      try {
        userData = await res.json();
        if (debugMode) addLog("Login successful", "success", `User: ${userData?.user?.name || userData?.user?.email || "unknown"}`);
      } catch {
        if (debugMode) addLog("Could not parse success response", "error", "Response body was not valid JSON");
      }

      // Check session cookie was set
      if (debugMode) {
        addLog("Checking session", "pending", "Calling /api/auth/debug...");
        try {
          const debugRes = await fetch("/api/auth/debug");
          const debugData = await debugRes.json();
          addLog("Session check", debugData.session ? "success" : "error", JSON.stringify(debugData, null, 2));
        } catch (err: any) {
          addLog("Session check failed", "error", err.message);
        }
      }

      if (debugMode) addLog("Redirecting to /canvas", "pending");

      // If in debug mode, add small delay so user can see logs before redirect
      if (debugMode) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      router.push("/canvas");
      router.refresh();
    } catch (err: any) {
      if (debugMode) addLog("Network/fetch error", "error", err.message);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-3xl font-serif font-bold">
          Welcome back
        </CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/20 border border-destructive/50 text-destructive-foreground p-3 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-input"
            />
          </div>
          {IS_DEV && (
            <div className="flex items-center gap-2">
              <input
                id="debug-toggle"
                type="checkbox"
                checked={showDebug}
                onChange={(e) => setShowDebug(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border"
              />
              <label htmlFor="debug-toggle" className="text-xs text-muted-foreground cursor-pointer select-none">
                Show login diagnostics
              </label>
            </div>
          )}
          <DebugPanel logs={debugLogs} visible={showDebug} />
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            size="lg"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-primary hover:underline font-medium"
            >
              Create one
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
