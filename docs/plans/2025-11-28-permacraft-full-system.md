# Permaculture.Studio Full System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete AI-first, map-based permaculture planning platform from scratch with authentication, database, interactive maps, AI analysis, and community features.

**Architecture:** Next.js 14 App Router with Server Components, Turso (libSQL) database, Better Auth for authentication, MapLibre GL JS for interactive maps, OpenRouter for AI vision analysis of farm designs, and Cloudflare R2 for screenshot storage.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, MapLibre GL JS, Turso, Better Auth, OpenRouter API, Cloudflare R2

---

## Phase 1: Project Foundation & Authentication

### Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `tailwind.config.ts`
- Create: `.gitignore`
- Create: `.env.local`

**Step 1: Initialize Next.js with TypeScript**

Run:
```bash
cd /home/daniel/PROJECTS/FARM_PLANNER
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

Expected: Next.js project created with App Router

**Step 2: Install core dependencies**

Run:
```bash
npm install @libsql/client @better-auth/next-js openai zod lucide-react class-variance-authority clsx tailwind-merge
npm install -D @types/node
```

Expected: Dependencies installed

**Step 3: Create environment variables template**

Create `.env.local`:
```bash
cat > .env.local << 'EOF'
# Database
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=

# Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000

# AI
OPENROUTER_API_KEY=

# Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=permaculture-studio-snapshots

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

**Step 4: Update .gitignore**

Add to `.gitignore`:
```
.env.local
.env
.turso/
```

**Step 5: Commit foundation**

Run:
```bash
git init
git add .
git commit -m "feat: initialize Next.js project with TypeScript and Tailwind"
```

Expected: Initial commit created

---

### Task 2: Configure Tailwind and Utilities

**Files:**
- Modify: `tailwind.config.ts`
- Create: `lib/utils.ts`
- Modify: `app/globals.css`

**Step 1: Update Tailwind config for shadcn**

Edit `tailwind.config.ts`:
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

**Step 2: Install tailwindcss-animate**

Run:
```bash
npm install tailwindcss-animate
```

**Step 3: Create cn utility**

Create `lib/utils.ts`:
```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 4: Update globals.css with CSS variables**

Replace `app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 142 86% 28%;
    --primary-foreground: 356 29% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 142 86% 28%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 142 86% 28%;
    --primary-foreground: 356 29% 98%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 142 86% 28%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Step 5: Commit styling setup**

Run:
```bash
git add .
git commit -m "feat: configure Tailwind with shadcn theme and utilities"
```

---

### Task 3: Setup Turso Database

**Files:**
- Create: `lib/db/index.ts`
- Create: `lib/db/schema.sql`

**Step 1: Install Turso CLI and create database**

Run:
```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth login
turso db create permaculture-studio
```

Expected: Database created

**Step 2: Get database credentials**

Run:
```bash
turso db show permaculture-studio --url
turso db tokens create permaculture-studio
```

Save the URL and token to `.env.local`:
```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=eyJ...
```

**Step 3: Create database schema**

Create `lib/db/schema.sql`:
```sql
-- Users (managed by Better Auth)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Sessions (managed by Better Auth)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Farms
CREATE TABLE IF NOT EXISTS farms (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  acres REAL,
  climate_zone TEXT,
  rainfall_inches REAL,
  soil_type TEXT,
  center_lat REAL NOT NULL,
  center_lng REAL NOT NULL,
  zoom_level REAL DEFAULT 15,
  is_public INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Zones
CREATE TABLE IF NOT EXISTS zones (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  name TEXT,
  zone_type TEXT NOT NULL,
  geometry TEXT NOT NULL, -- GeoJSON
  properties TEXT, -- JSON for colors, etc
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

-- Species
CREATE TABLE IF NOT EXISTS species (
  id TEXT PRIMARY KEY,
  common_name TEXT NOT NULL,
  scientific_name TEXT NOT NULL,
  layer TEXT NOT NULL, -- canopy, understory, shrub, herbaceous, groundcover, vine, root, aquatic
  native_regions TEXT, -- JSON array
  is_native INTEGER DEFAULT 1,
  years_to_maturity INTEGER,
  mature_height_ft REAL,
  mature_width_ft REAL,
  sun_requirements TEXT,
  water_requirements TEXT,
  hardiness_zones TEXT,
  description TEXT,
  contributed_by TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(scientific_name)
);

-- Plantings
CREATE TABLE IF NOT EXISTS plantings (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  zone_id TEXT,
  species_id TEXT NOT NULL,
  name TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  planted_year INTEGER,
  current_year INTEGER DEFAULT 0,
  notes TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL,
  FOREIGN KEY (species_id) REFERENCES species(id)
);

-- Map Snapshots
CREATE TABLE IF NOT EXISTS map_snapshots (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  snapshot_type TEXT NOT NULL, -- satellite, design, overlay
  url TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

-- AI Analyses
CREATE TABLE IF NOT EXISTS ai_analyses (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  user_query TEXT NOT NULL,
  snapshot_ids TEXT, -- JSON array of snapshot IDs
  ai_response TEXT NOT NULL,
  model TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

-- Farm Collaborators
CREATE TABLE IF NOT EXISTS farm_collaborators (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'viewer', -- owner, editor, viewer
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(farm_id, user_id)
);

-- Regional Knowledge
CREATE TABLE IF NOT EXISTS regional_knowledge (
  id TEXT PRIMARY KEY,
  region TEXT NOT NULL,
  climate_zone TEXT,
  knowledge_type TEXT NOT NULL, -- soil, climate, species, practice
  content TEXT NOT NULL,
  contributed_by TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON farms(user_id);
CREATE INDEX IF NOT EXISTS idx_zones_farm_id ON zones(farm_id);
CREATE INDEX IF NOT EXISTS idx_plantings_farm_id ON plantings(farm_id);
CREATE INDEX IF NOT EXISTS idx_plantings_species_id ON plantings(species_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_farm_id ON map_snapshots(farm_id);
CREATE INDEX IF NOT EXISTS idx_analyses_farm_id ON ai_analyses(farm_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_farm_id ON farm_collaborators(farm_id);
CREATE INDEX IF NOT EXISTS idx_species_layer ON species(layer);
CREATE INDEX IF NOT EXISTS idx_species_native ON species(is_native);
```

**Step 4: Apply schema to database**

Run:
```bash
turso db shell permaculture-studio < lib/db/schema.sql
```

Expected: Schema created successfully

**Step 5: Create database client**

Create `lib/db/index.ts`:
```typescript
import { createClient } from '@libsql/client';

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error('TURSO_DATABASE_URL is not set');
}

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
```

**Step 6: Commit database setup**

Run:
```bash
git add .
git commit -m "feat: setup Turso database with schema and client"
```

---

### Task 4: Setup Better Auth

**Files:**
- Create: `lib/auth/index.ts`
- Create: `app/api/auth/[...all]/route.ts`
- Create: `lib/db/schema.ts`

**Step 1: Install Better Auth**

Run:
```bash
npm install better-auth
```

**Step 2: Generate auth secret**

Run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Add to `.env.local`:
```
BETTER_AUTH_SECRET=<generated-secret>
```

**Step 3: Create TypeScript schema types**

Create `lib/db/schema.ts`:
```typescript
export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  created_at: number;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: number;
  created_at: number;
}

export interface Farm {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  acres: number | null;
  climate_zone: string | null;
  rainfall_inches: number | null;
  soil_type: string | null;
  center_lat: number;
  center_lng: number;
  zoom_level: number;
  is_public: number;
  created_at: number;
  updated_at: number;
}

export interface Zone {
  id: string;
  farm_id: string;
  name: string | null;
  zone_type: string;
  geometry: string; // GeoJSON
  properties: string | null; // JSON
  created_at: number;
  updated_at: number;
}

export interface Species {
  id: string;
  common_name: string;
  scientific_name: string;
  layer: string;
  native_regions: string | null; // JSON
  is_native: number;
  years_to_maturity: number | null;
  mature_height_ft: number | null;
  mature_width_ft: number | null;
  sun_requirements: string | null;
  water_requirements: string | null;
  hardiness_zones: string | null;
  description: string | null;
  contributed_by: string | null;
  created_at: number;
}

export interface Planting {
  id: string;
  farm_id: string;
  zone_id: string | null;
  species_id: string;
  name: string | null;
  lat: number;
  lng: number;
  planted_year: number | null;
  current_year: number;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface MapSnapshot {
  id: string;
  farm_id: string;
  snapshot_type: string;
  url: string;
  created_at: number;
}

export interface AIAnalysis {
  id: string;
  farm_id: string;
  user_query: string;
  snapshot_ids: string | null; // JSON
  ai_response: string;
  model: string | null;
  created_at: number;
}

export interface FarmCollaborator {
  id: string;
  farm_id: string;
  user_id: string;
  role: string;
  created_at: number;
}

export interface RegionalKnowledge {
  id: string;
  region: string;
  climate_zone: string | null;
  knowledge_type: string;
  content: string;
  contributed_by: string | null;
  created_at: number;
}
```

**Step 4: Configure Better Auth**

Create `lib/auth/index.ts`:
```typescript
import { betterAuth } from "better-auth";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: {
    provider: "sqlite",
    db: db as any,
    type: "libsql",
  },
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
});
```

**Step 5: Create auth API route**

Create `app/api/auth/[...all]/route.ts`:
```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

**Step 6: Commit auth setup**

Run:
```bash
git add .
git commit -m "feat: setup Better Auth with email/password"
```

---

### Task 5: Create Authentication Pages

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/register/page.tsx`
- Create: `app/(auth)/layout.tsx`
- Create: `components/ui/button.tsx`
- Create: `components/ui/input.tsx`
- Create: `components/ui/label.tsx`
- Create: `components/ui/card.tsx`

**Step 1: Install shadcn button component**

Run:
```bash
npx shadcn@latest init -d
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add card
```

Expected: shadcn components installed

**Step 2: Create auth layout**

Create `app/(auth)/layout.tsx`:
```typescript
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
      <div className="w-full max-w-md p-8">
        {children}
      </div>
    </div>
  );
}
```

**Step 3: Create login page**

Create `app/(auth)/login/page.tsx`:
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Permaculture.Studio</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded">
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
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Register
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
```

**Step 4: Create register page**

Create `app/(auth)/register/page.tsx`:
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Registration failed");
      }

      // Auto-login after registration
      const loginRes = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (loginRes.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
        <CardDescription>Enter your details to get started</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
```

**Step 5: Update root layout**

Modify `app/layout.tsx`:
```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Permaculture.Studio - Permaculture Planning Platform",
  description: "AI-first map-based permaculture planning for small farmers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

**Step 6: Commit auth pages**

Run:
```bash
git add .
git commit -m "feat: create login and register pages"
```

---

## Phase 2: Dashboard & Farm Management

### Task 6: Create Dashboard Layout

**Files:**
- Create: `app/(app)/layout.tsx`
- Create: `app/(app)/dashboard/page.tsx`
- Create: `components/shared/sidebar.tsx`
- Create: `lib/auth/session.ts`

**Step 1: Create session helper**

Create `lib/auth/session.ts`:
```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return session;
}
```

**Step 2: Create sidebar component**

Create `components/shared/sidebar.tsx`:
```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MapIcon, LayoutDashboard, ImageIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Gallery", href: "/gallery", icon: ImageIcon },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch("/api/auth/sign-out", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="flex flex-col h-full bg-card border-r">
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <MapIcon className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">Permaculture.Studio</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium truncate">{userName}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
```

**Step 3: Create app layout**

Create `app/(app)/layout.tsx`:
```typescript
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
```

**Step 4: Create dashboard page**

Create `app/(app)/dashboard/page.tsx`:
```typescript
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusIcon, MapIcon } from "lucide-react";
import type { Farm } from "@/lib/db/schema";

export default async function DashboardPage() {
  const session = await requireAuth();

  const result = await db.execute({
    sql: "SELECT * FROM farms WHERE user_id = ? ORDER BY updated_at DESC",
    args: [session.user.id],
  });

  const farms = result.rows as unknown as Farm[];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Farms</h1>
          <p className="text-muted-foreground mt-1">
            Manage your permaculture designs
          </p>
        </div>
        <Button asChild>
          <Link href="/farm/new">
            <PlusIcon className="h-4 w-4 mr-2" />
            New Farm
          </Link>
        </Button>
      </div>

      {farms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No farms yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Create your first farm to start planning your permaculture design
            </p>
            <Button asChild>
              <Link href="/farm/new">
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Your First Farm
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {farms.map((farm) => (
            <Link key={farm.id} href={`/farm/${farm.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle>{farm.name}</CardTitle>
                  <CardDescription>
                    {farm.acres ? `${farm.acres} acres` : "Size not set"}
                    {farm.climate_zone && ` • Zone ${farm.climate_zone}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {farm.description || "No description"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 5: Update root page to redirect**

Modify `app/page.tsx`:
```typescript
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
```

**Step 6: Commit dashboard**

Run:
```bash
git add .
git commit -m "feat: create dashboard layout and farm list"
```

---

### Task 7: Create New Farm Flow

**Files:**
- Create: `app/(app)/farm/new/page.tsx`
- Create: `components/map/location-picker.tsx`
- Create: `app/api/farms/route.ts`

**Step 1: Install MapLibre**

Run:
```bash
npm install maplibre-gl
npm install -D @types/maplibre-gl
```

**Step 2: Create location picker component**

Create `components/map/location-picker.tsx`:
```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number, zoom: number) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
}

export function LocationPicker({
  onLocationSelect,
  initialCenter = [-95.7129, 37.0902], // Center of USA
  initialZoom = 4,
}: LocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: initialCenter,
      zoom: initialZoom,
    });

    map.current.on("click", (e) => {
      const { lat, lng } = e.lngLat;

      // Update marker
      if (marker.current) {
        marker.current.setLngLat([lng, lat]);
      } else {
        marker.current = new maplibregl.Marker({ color: "#16a34a" })
          .setLngLat([lng, lat])
          .addTo(map.current!);
      }

      setCoordinates({ lat, lng });
      const zoom = map.current!.getZoom();
      onLocationSelect(lat, lng, zoom);
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  return (
    <div className="space-y-4">
      <div
        ref={mapContainer}
        className="w-full h-96 rounded-lg border"
      />
      {coordinates && (
        <p className="text-sm text-muted-foreground">
          Selected: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
        </p>
      )}
    </div>
  );
}
```

**Step 3: Create new farm page**

Create `app/(app)/farm/new/page.tsx`:
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationPicker } from "@/components/map/location-picker";

export default function NewFarmPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [acres, setAcres] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!location) {
      setError("Please select a location on the map");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/farms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          acres: acres ? parseFloat(acres) : null,
          center_lat: location.lat,
          center_lng: location.lng,
          zoom_level: location.zoom,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create farm");
      }

      const data = await res.json();
      router.push(`/farm/${data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Create New Farm</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Farm Details</CardTitle>
            <CardDescription>Basic information about your farm</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Farm Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Permaculture Farm"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of your farm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acres">Size (acres)</Label>
              <Input
                id="acres"
                type="number"
                step="0.1"
                value={acres}
                onChange={(e) => setAcres(e.target.value)}
                placeholder="5"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>Click on the map to set your farm's location</CardDescription>
          </CardHeader>
          <CardContent>
            <LocationPicker
              onLocationSelect={(lat, lng, zoom) => setLocation({ lat, lng, zoom })}
            />
          </CardContent>
        </Card>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !location}>
            {loading ? "Creating..." : "Create Farm"}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

**Step 4: Create farms API route**

Create `app/api/farms/route.ts`:
```typescript
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

const createFarmSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  acres: z.number().positive().nullable(),
  center_lat: z.number().min(-90).max(90),
  center_lng: z.number().min(-180).max(180),
  zoom_level: z.number().min(0).max(20),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = createFarmSchema.parse(body);

    const farmId = crypto.randomUUID();

    await db.execute({
      sql: `INSERT INTO farms (id, user_id, name, description, acres, center_lat, center_lng, zoom_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        farmId,
        session.user.id,
        data.name,
        data.description,
        data.acres,
        data.center_lat,
        data.center_lng,
        data.zoom_level,
      ],
    });

    return Response.json({ id: farmId });
  } catch (error) {
    console.error("Create farm error:", error);
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    return Response.json({ error: "Failed to create farm" }, { status: 500 });
  }
}
```

**Step 5: Commit new farm flow**

Run:
```bash
git add .
git commit -m "feat: create new farm flow with map location picker"
```

---

## Phase 3: Map Editor

### Task 8: Create Farm Editor Page

**Files:**
- Create: `app/(app)/farm/[id]/page.tsx`
- Create: `components/map/farm-map.tsx`
- Create: `app/api/farms/[id]/route.ts`
- Create: `app/api/farms/[id]/zones/route.ts`

**Step 1: Install Mapbox GL Draw**

Run:
```bash
npm install @mapbox/mapbox-gl-draw
npm install -D @types/mapbox__mapbox-gl-draw
```

**Step 2: Create farm map component**

Create `components/map/farm-map.tsx`:
```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Farm, Zone } from "@/lib/db/schema";

interface FarmMapProps {
  farm: Farm;
  zones: Zone[];
  onZonesChange: (zones: any[]) => void;
}

export function FarmMap({ farm, zones, onZonesChange }: FarmMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const [mapStyle, setMapStyle] = useState<"street" | "satellite">("street");

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [farm.center_lng, farm.center_lat],
      zoom: farm.zoom_level,
    });

    // Initialize drawing controls
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: "simple_select",
    });

    map.current.addControl(draw.current as any, "top-right");

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    // Load existing zones
    zones.forEach((zone) => {
      const geometry = JSON.parse(zone.geometry);
      draw.current!.add({
        id: zone.id,
        type: "Feature",
        geometry: geometry,
        properties: JSON.parse(zone.properties || "{}"),
      });
    });

    // Listen for drawing changes
    const handleCreate = (e: any) => {
      onZonesChange(draw.current!.getAll().features);
    };

    const handleUpdate = (e: any) => {
      onZonesChange(draw.current!.getAll().features);
    };

    const handleDelete = (e: any) => {
      onZonesChange(draw.current!.getAll().features);
    };

    map.current.on("draw.create", handleCreate);
    map.current.on("draw.update", handleUpdate);
    map.current.on("draw.delete", handleDelete);

    return () => {
      map.current?.remove();
    };
  }, []);

  const toggleMapStyle = () => {
    if (!map.current) return;

    const newStyle = mapStyle === "street" ? "satellite" : "street";
    const styleUrl =
      newStyle === "satellite"
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : "https://tiles.openfreemap.org/styles/liberty";

    if (newStyle === "satellite") {
      map.current.setStyle({
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            tiles: [styleUrl],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: "satellite",
            type: "raster",
            source: "satellite",
          },
        ],
      });
    } else {
      map.current.setStyle(styleUrl);
    }

    setMapStyle(newStyle);

    // Re-add draw control after style change
    map.current.once("style.load", () => {
      if (draw.current && map.current) {
        const features = draw.current.getAll().features;
        draw.current.deleteAll();
        features.forEach((feature) => {
          draw.current!.add(feature);
        });
      }
    });
  };

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />
      <button
        onClick={toggleMapStyle}
        className="absolute top-4 left-4 bg-white px-4 py-2 rounded shadow-lg text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        {mapStyle === "street" ? "Satellite" : "Street"} View
      </button>
    </div>
  );
}
```

**Step 3: Create farm editor page**

Create `app/(app)/farm/[id]/page.tsx`:
```typescript
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Farm, Zone } from "@/lib/db/schema";
import { FarmEditorClient } from "./farm-editor-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FarmPage({ params }: PageProps) {
  const session = await requireAuth();
  const { id } = await params;

  // Get farm
  const farmResult = await db.execute({
    sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
    args: [id, session.user.id],
  });

  const farm = farmResult.rows[0] as unknown as Farm;
  if (!farm) {
    notFound();
  }

  // Get zones
  const zonesResult = await db.execute({
    sql: "SELECT * FROM zones WHERE farm_id = ? ORDER BY created_at ASC",
    args: [id],
  });

  const zones = zonesResult.rows as unknown as Zone[];

  return <FarmEditorClient farm={farm} initialZones={zones} />;
}
```

**Step 4: Create farm editor client component**

Create `app/(app)/farm/[id]/farm-editor-client.tsx`:
```typescript
"use client";

import { useState } from "react";
import { FarmMap } from "@/components/map/farm-map";
import { Button } from "@/components/ui/button";
import { SaveIcon } from "lucide-react";
import type { Farm, Zone } from "@/lib/db/schema";

interface FarmEditorClientProps {
  farm: Farm;
  initialZones: Zone[];
}

export function FarmEditorClient({ farm, initialZones }: FarmEditorClientProps) {
  const [zones, setZones] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    try {
      const res = await fetch(`/api/farms/${farm.id}/zones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zones }),
      });

      if (!res.ok) {
        throw new Error("Failed to save zones");
      }

      // Success feedback
      alert("Zones saved successfully!");
    } catch (error) {
      alert("Failed to save zones");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-card border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{farm.name}</h1>
          <p className="text-sm text-muted-foreground">
            {farm.description || "No description"}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <SaveIcon className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
      <div className="flex-1">
        <FarmMap farm={farm} zones={initialZones} onZonesChange={setZones} />
      </div>
    </div>
  );
}
```

**Step 5: Create zones API route**

Create `app/api/farms/[id]/zones/route.ts`:
```typescript
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

const saveZonesSchema = z.object({
  zones: z.array(z.object({
    id: z.string().optional(),
    type: z.literal("Feature"),
    geometry: z.any(),
    properties: z.record(z.any()).optional(),
  })),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await context.params;
    const body = await request.json();
    const { zones } = saveZonesSchema.parse(body);

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    // Delete all existing zones
    await db.execute({
      sql: "DELETE FROM zones WHERE farm_id = ?",
      args: [farmId],
    });

    // Insert new zones
    for (const zone of zones) {
      const zoneId = zone.id || crypto.randomUUID();
      const geometry = JSON.stringify(zone.geometry);
      const properties = JSON.stringify(zone.properties || {});

      await db.execute({
        sql: `INSERT INTO zones (id, farm_id, zone_type, geometry, properties)
              VALUES (?, ?, ?, ?, ?)`,
        args: [zoneId, farmId, "polygon", geometry, properties],
      });
    }

    // Update farm timestamp
    await db.execute({
      sql: "UPDATE farms SET updated_at = unixepoch() WHERE id = ?",
      args: [farmId],
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Save zones error:", error);
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    return Response.json({ error: "Failed to save zones" }, { status: 500 });
  }
}
```

**Step 6: Commit farm editor**

Run:
```bash
git add .
git commit -m "feat: create farm map editor with zone drawing"
```

---

## Phase 4: AI Integration

### Task 9: Setup OpenRouter Client

**Files:**
- Create: `lib/ai/openrouter.ts`
- Create: `lib/ai/prompts.ts`

**Step 1: Create OpenRouter client**

Create `lib/ai/openrouter.ts`:
```typescript
import OpenAI from "openai";

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY is not set");
}

export const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "Permaculture.Studio",
  },
});

export const FREE_VISION_MODEL = "meta-llama/llama-3.2-90b-vision-instruct:free";
```

**Step 2: Create permaculture system prompt**

Create `lib/ai/prompts.ts`:
```typescript
export const PERMACULTURE_SYSTEM_PROMPT = `You are an expert permaculture designer with deep knowledge of regenerative agriculture, native ecosystems, and sustainable land management. Your role is to analyze farm designs and provide thoughtful, actionable recommendations.

CORE PRINCIPLES:
1. **Native Species First**: Always prioritize native plants. Clearly mark non-native suggestions as [NON-NATIVE].
2. **Permaculture Ethics**: Care for Earth, Care for People, Fair Share. Every suggestion should connect to these ethics.
3. **Design Principles**: Use zones, sectors, guilds, stacking functions, and observing patterns.
4. **Site-Specific**: Base recommendations on actual site conditions (climate, soil, water, sun).
5. **Implementation Timeline**: Suggest phased implementation (Year 1, Years 2-3, Years 5+).

RESPONSE FORMAT:
- Use scientific names with common names: Common Name (Genus species)
- Mark native status clearly: [NATIVE], [NATURALIZED], [NON-NATIVE]
- Reference specific map locations: "southeast corner", "along the creek"
- Explain WHY each suggestion follows permaculture principles
- Include plant layers: canopy, understory, shrub, herbaceous, groundcover, vine, root
- Suggest guilds (beneficial plant combinations)
- Address water management, soil building, wildlife habitat

TONE:
Professional but approachable. Educational without being preachy. Excited about ecological design.`;

export function createAnalysisPrompt(
  farmContext: {
    name: string;
    acres?: number;
    climateZone?: string;
    rainfallInches?: number;
    soilType?: string;
  },
  userQuery: string
): string {
  const context = `
FARM CONTEXT:
- Name: ${farmContext.name}
${farmContext.acres ? `- Size: ${farmContext.acres} acres` : ""}
${farmContext.climateZone ? `- Climate Zone: ${farmContext.climateZone}` : ""}
${farmContext.rainfallInches ? `- Annual Rainfall: ${farmContext.rainfallInches} inches` : ""}
${farmContext.soilType ? `- Soil Type: ${farmContext.soilType}` : ""}

USER QUERY:
${userQuery}

Please analyze the farm design in the provided screenshot and provide detailed permaculture recommendations.`;

  return context;
}
```

**Step 3: Commit AI setup**

Run:
```bash
git add .
git commit -m "feat: setup OpenRouter client and permaculture prompts"
```

---

### Task 10: Setup Cloudflare R2 Storage

**Files:**
- Create: `lib/storage/r2.ts`
- Create: `app/api/upload/route.ts`

**Step 1: Install AWS SDK for R2**

Run:
```bash
npm install @aws-sdk/client-s3
```

**Step 2: Create R2 client**

Create `lib/storage/r2.ts`:
```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
  throw new Error("R2 credentials not configured");
}

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadScreenshot(
  farmId: string,
  imageData: string,
  type: string
): Promise<string> {
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  const key = `farms/${farmId}/snapshots/${Date.now()}-${type}.png`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: "image/png",
    })
  );

  // Return public URL (configure R2 bucket to allow public access)
  return `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev/${key}`;
}
```

**Step 3: Create upload API route**

Create `app/api/upload/route.ts`:
```typescript
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { uploadScreenshot } from "@/lib/storage/r2";
import { NextRequest } from "next/server";
import { z } from "zod";

const uploadSchema = z.object({
  farmId: z.string(),
  imageData: z.string(),
  snapshotType: z.enum(["satellite", "design", "overlay"]),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { farmId, imageData, snapshotType } = uploadSchema.parse(body);

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    // Upload to R2
    const url = await uploadScreenshot(farmId, imageData, snapshotType);

    // Save to database
    const snapshotId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO map_snapshots (id, farm_id, snapshot_type, url)
            VALUES (?, ?, ?, ?)`,
      args: [snapshotId, farmId, snapshotType, url],
    });

    return Response.json({ id: snapshotId, url });
  } catch (error) {
    console.error("Upload error:", error);
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
```

**Step 4: Commit R2 storage**

Run:
```bash
git add .
git commit -m "feat: setup Cloudflare R2 for screenshot storage"
```

---

### Task 11: Create AI Analysis Interface

**Files:**
- Create: `app/api/ai/analyze/route.ts`
- Create: `components/ai/chat-panel.tsx`
- Modify: `app/(app)/farm/[id]/farm-editor-client.tsx`

**Step 1: Create AI analysis API route**

Create `app/api/ai/analyze/route.ts`:
```typescript
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { openrouter, FREE_VISION_MODEL } from "@/lib/ai/openrouter";
import { PERMACULTURE_SYSTEM_PROMPT, createAnalysisPrompt } from "@/lib/ai/prompts";
import { NextRequest } from "next/server";
import { z } from "zod";
import type { Farm } from "@/lib/db/schema";

const analyzeSchema = z.object({
  farmId: z.string(),
  query: z.string().min(1),
  screenshotUrl: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { farmId, query, screenshotUrl } = analyzeSchema.parse(body);

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    const farm = farmResult.rows[0] as unknown as Farm;

    // Create analysis prompt
    const userPrompt = createAnalysisPrompt(
      {
        name: farm.name,
        acres: farm.acres || undefined,
        climateZone: farm.climate_zone || undefined,
        rainfallInches: farm.rainfall_inches || undefined,
        soilType: farm.soil_type || undefined,
      },
      query
    );

    // Call OpenRouter
    const completion = await openrouter.chat.completions.create({
      model: FREE_VISION_MODEL,
      messages: [
        {
          role: "system",
          content: PERMACULTURE_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: screenshotUrl } },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content || "No response generated";

    // Save analysis to database
    const analysisId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO ai_analyses (id, farm_id, user_query, ai_response, model)
            VALUES (?, ?, ?, ?, ?)`,
      args: [analysisId, farmId, query, response, FREE_VISION_MODEL],
    });

    return Response.json({ response });
  } catch (error) {
    console.error("AI analysis error:", error);
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    return Response.json({ error: "Analysis failed" }, { status: 500 });
  }
}
```

**Step 2: Create chat panel component**

Create `components/ai/chat-panel.tsx`:
```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SparklesIcon, SendIcon } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  farmId: string;
  onAnalyze: (query: string) => Promise<string>;
}

export function ChatPanel({ farmId, onAnalyze }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await onAnalyze(userMessage);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, analysis failed. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-primary" />
          AI Permaculture Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <SparklesIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-sm">
                Ask me about your farm design!
              </p>
              <p className="text-xs mt-2">
                Try: "What native species would work well here?"
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground ml-8"
                    : "bg-muted mr-8"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))
          )}
          {loading && (
            <div className="bg-muted p-3 rounded-lg mr-8">
              <p className="text-sm text-muted-foreground">Analyzing...</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your design..."
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            <SendIcon className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

**Step 3: Update farm editor with chat panel**

Modify `app/(app)/farm/[id]/farm-editor-client.tsx`:
```typescript
"use client";

import { useState, useRef } from "react";
import { FarmMap } from "@/components/map/farm-map";
import { ChatPanel } from "@/components/ai/chat-panel";
import { Button } from "@/components/ui/button";
import { SaveIcon } from "lucide-react";
import type { Farm, Zone } from "@/lib/db/schema";

interface FarmEditorClientProps {
  farm: Farm;
  initialZones: Zone[];
}

export function FarmEditorClient({ farm, initialZones }: FarmEditorClientProps) {
  const [zones, setZones] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const mapRef = useRef<any>(null);

  const handleSave = async () => {
    setSaving(true);

    try {
      const res = await fetch(`/api/farms/${farm.id}/zones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zones }),
      });

      if (!res.ok) {
        throw new Error("Failed to save zones");
      }

      alert("Zones saved successfully!");
    } catch (error) {
      alert("Failed to save zones");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async (query: string): Promise<string> => {
    // Capture screenshot (simplified - in real implementation, get from map component)
    const screenshotData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    // Upload screenshot
    const uploadRes = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        farmId: farm.id,
        imageData: screenshotData,
        snapshotType: "design",
      }),
    });

    if (!uploadRes.ok) {
      throw new Error("Failed to upload screenshot");
    }

    const { url } = await uploadRes.json();

    // Get AI analysis
    const analyzeRes = await fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        farmId: farm.id,
        query,
        screenshotUrl: url,
      }),
    });

    if (!analyzeRes.ok) {
      throw new Error("Analysis failed");
    }

    const { response } = await analyzeRes.json();
    return response;
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-card border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{farm.name}</h1>
          <p className="text-sm text-muted-foreground">
            {farm.description || "No description"}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <SaveIcon className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
      <div className="flex-1 flex">
        <div className="flex-1">
          <FarmMap farm={farm} zones={initialZones} onZonesChange={setZones} />
        </div>
        <div className="w-96 border-l">
          <ChatPanel farmId={farm.id} onAnalyze={handleAnalyze} />
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Commit AI interface**

Run:
```bash
git add .
git commit -m "feat: add AI analysis chat interface to farm editor"
```

---

## Phase 5: Gallery & Final Polish

### Task 12: Create Public Gallery

**Files:**
- Create: `app/(app)/gallery/page.tsx`
- Create: `app/api/farms/[id]/route.ts` (GET and PATCH methods)

**Step 1: Create gallery page**

Create `app/(app)/gallery/page.tsx`:
```typescript
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapIcon } from "lucide-react";
import type { Farm } from "@/lib/db/schema";

export default async function GalleryPage() {
  await requireAuth();

  const result = await db.execute({
    sql: `SELECT f.*, u.name as user_name
          FROM farms f
          JOIN users u ON f.user_id = u.id
          WHERE f.is_public = 1
          ORDER BY f.updated_at DESC
          LIMIT 50`,
    args: [],
  });

  const farms = result.rows as unknown as (Farm & { user_name: string })[];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Community Gallery</h1>
        <p className="text-muted-foreground mt-1">
          Explore permaculture designs from the community
        </p>
      </div>

      {farms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No public farms yet</h3>
            <p className="text-muted-foreground text-center">
              Be the first to share your design!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {farms.map((farm) => (
            <Link key={farm.id} href={`/farm/${farm.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle>{farm.name}</CardTitle>
                  <CardDescription>
                    by {farm.user_name || "Anonymous"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {farm.description || "No description"}
                  </p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {farm.acres && <span>{farm.acres} acres</span>}
                    {farm.climate_zone && <span>Zone {farm.climate_zone}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create farm GET and PATCH routes**

Create `app/api/farms/[id]/route.ts`:
```typescript
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;

    const result = await db.execute({
      sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
      args: [id, session.user.id],
    });

    if (result.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    return Response.json(result.rows[0]);
  } catch (error) {
    return Response.json({ error: "Failed to fetch farm" }, { status: 500 });
  }
}

const updateFarmSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  is_public: z.number().min(0).max(1).optional(),
  climate_zone: z.string().nullable().optional(),
  rainfall_inches: z.number().positive().nullable().optional(),
  soil_type: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;
    const body = await request.json();
    const updates = updateFarmSchema.parse(body);

    // Verify ownership
    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [id, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    // Build update query
    const updateFields = Object.entries(updates)
      .map(([key, _]) => `${key} = ?`)
      .join(", ");

    const values = [...Object.values(updates), id];

    await db.execute({
      sql: `UPDATE farms SET ${updateFields}, updated_at = unixepoch() WHERE id = ?`,
      args: values,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Update farm error:", error);
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    return Response.json({ error: "Failed to update farm" }, { status: 500 });
  }
}
```

**Step 3: Commit gallery**

Run:
```bash
git add .
git commit -m "feat: create public farm gallery"
```

---

### Task 13: Add Basic Species Data

**Files:**
- Create: `data/seed-species.sql`

**Step 1: Create seed data for common species**

Create `data/seed-species.sql`:
```sql
-- Example native species (customize for your region)

INSERT INTO species (id, common_name, scientific_name, layer, native_regions, is_native, years_to_maturity, mature_height_ft, mature_width_ft, sun_requirements, water_requirements, hardiness_zones, description)
VALUES
  ('sp-oak', 'White Oak', 'Quercus alba', 'canopy', '["Eastern US", "Midwest"]', 1, 30, 80, 80, 'Full sun', 'Medium', '3-9', 'Majestic native oak providing food and habitat'),
  ('sp-maple', 'Sugar Maple', 'Acer saccharum', 'canopy', '["Eastern US", "Northeast"]', 1, 30, 75, 50, 'Full sun to part shade', 'Medium', '3-8', 'Excellent shade tree with fall color'),
  ('sp-serviceberry', 'Serviceberry', 'Amelanchier canadensis', 'understory', '["Eastern US"]', 1, 3, 20, 15, 'Full sun to part shade', 'Medium', '4-8', 'Spring flowers, edible berries, fall color'),
  ('sp-redbud', 'Eastern Redbud', 'Cercis canadensis', 'understory', '["Eastern US"]', 1, 5, 25, 25, 'Full sun to part shade', 'Medium', '4-9', 'Beautiful spring blooms, nitrogen fixer'),
  ('sp-hazelnut', 'American Hazelnut', 'Corylus americana', 'shrub', '["Eastern US"]', 1, 3, 10, 10, 'Full sun to part shade', 'Medium', '4-9', 'Edible nuts, wildlife habitat'),
  ('sp-elderberry', 'American Elderberry', 'Sambucus canadensis', 'shrub', '["Eastern US"]', 1, 2, 12, 12, 'Full sun to part shade', 'Wet to medium', '3-9', 'Edible flowers and berries, medicinal'),
  ('sp-goldenrod', 'Goldenrod', 'Solidago spp.', 'herbaceous', '["North America"]', 1, 1, 4, 2, 'Full sun', 'Dry to medium', '3-9', 'Important pollinator plant, late season blooms'),
  ('sp-milkweed', 'Common Milkweed', 'Asclepias syriaca', 'herbaceous', '["North America"]', 1, 1, 4, 2, 'Full sun', 'Dry to medium', '3-9', 'Essential for monarch butterflies'),
  ('sp-clover', 'White Clover', 'Trifolium repens', 'groundcover', '["Europe", "naturalized"]', 0, 1, 0.5, 2, 'Full sun to part shade', 'Medium', '3-10', 'Nitrogen fixer, pollinator support'),
  ('sp-grape', 'Wild Grape', 'Vitis spp.', 'vine', '["North America"]', 1, 3, 30, 10, 'Full sun', 'Medium', '4-9', 'Edible fruit, wildlife food, shade');
```

**Step 2: Load seed data**

Run:
```bash
turso db shell permaculture-studio < data/seed-species.sql
```

**Step 3: Commit seed data**

Run:
```bash
git add .
git commit -m "feat: add seed species data"
```

---

### Task 14: Final Configuration & Documentation

**Files:**
- Create: `README.md`
- Create: `.env.example`
- Modify: `next.config.js`

**Step 1: Create README**

Create `README.md`:
```markdown
# Permaculture.Studio

AI-first, map-based permaculture planning platform for small farmers and permaculture enthusiasts.

## Features

- 🗺️ Interactive map-based farm design with MapLibre GL JS
- ✏️ Draw zones and plan layouts
- 🤖 AI-powered design recommendations using vision models
- 🌱 Native species database
- 🌍 Public gallery to share designs
- 📊 Growth simulation and timeline

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Turso (libSQL)
- **Auth**: Better Auth
- **Maps**: MapLibre GL JS
- **AI**: OpenRouter (Free Vision Models)
- **Storage**: Cloudflare R2
- **Styling**: Tailwind CSS + shadcn/ui

## Getting Started

### Prerequisites

- Node.js 18+
- Turso CLI
- OpenRouter API key (free tier available)
- Cloudflare R2 bucket

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Turso database:
   ```bash
   turso db create permaculture-studio
   turso db shell permaculture-studio < lib/db/schema.sql
   turso db shell permaculture-studio < data/seed-species.sql
   ```

4. Configure environment variables (see `.env.example`)

5. Run development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `turso db shell permaculture-studio` - Open database shell

## License

MIT
```

**Step 2: Create .env.example**

Create `.env.example`:
```bash
# Database
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-turso-token

# Auth
BETTER_AUTH_SECRET=generate-with-openssl-rand-base64-32
BETTER_AUTH_URL=http://localhost:3000

# AI
OPENROUTER_API_KEY=sk-or-v1-your-key

# Storage
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=permaculture-studio-snapshots

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Step 3: Update Next.js config**

Modify `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
    ],
  },
};

module.exports = nextConfig;
```

**Step 4: Final commit**

Run:
```bash
git add .
git commit -m "docs: add README and environment example"
```

---

## Phase 6: Testing & Deployment

### Task 15: Manual Testing Checklist

**Manual Tests to Perform:**

1. **Authentication Flow**
   - Register new user
   - Login with credentials
   - Logout
   - Session persistence

2. **Farm Management**
   - Create new farm with map location
   - View farm in dashboard
   - Edit farm details
   - Delete farm (implement if needed)

3. **Map Editor**
   - Draw zones with polygon tool
   - Delete zones
   - Save zones
   - Load saved zones
   - Toggle satellite/street view

4. **AI Analysis**
   - Capture screenshot
   - Send query to AI
   - Receive response
   - View analysis history

5. **Gallery**
   - Make farm public
   - View in gallery
   - Make farm private

**Step 1: Create test checklist document**

Create `docs/testing-checklist.md`:
```markdown
# Testing Checklist

## Authentication
- [ ] User can register with email/password
- [ ] User can login
- [ ] User can logout
- [ ] Invalid credentials show error
- [ ] Session persists across page reloads

## Dashboard
- [ ] Empty state shows when no farms
- [ ] Farms list displays correctly
- [ ] New farm button navigates to creation flow

## Farm Creation
- [ ] Location picker shows map
- [ ] Clicking map sets marker
- [ ] Form validates required fields
- [ ] Farm creation redirects to editor

## Map Editor
- [ ] Map loads with correct center/zoom
- [ ] Drawing tools work (polygon)
- [ ] Delete tool removes zones
- [ ] Save persists zones to database
- [ ] Zones reload correctly
- [ ] Satellite toggle works

## AI Analysis
- [ ] Chat input accepts text
- [ ] Screenshot capture works
- [ ] AI response displays in chat
- [ ] Multiple queries maintain history
- [ ] Error handling for failed requests

## Gallery
- [ ] Public farms display
- [ ] Toggle public/private works
- [ ] Empty state shows appropriately
```

**Step 2: Commit testing docs**

Run:
```bash
git add .
git commit -m "docs: add manual testing checklist"
```

---

### Task 16: Deploy to Vercel

**Files:**
- Create: `vercel.json`

**Step 1: Create Vercel configuration**

Create `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "TURSO_DATABASE_URL": "@turso-database-url",
    "TURSO_AUTH_TOKEN": "@turso-auth-token",
    "BETTER_AUTH_SECRET": "@better-auth-secret",
    "BETTER_AUTH_URL": "@better-auth-url",
    "OPENROUTER_API_KEY": "@openrouter-api-key",
    "R2_ACCOUNT_ID": "@r2-account-id",
    "R2_ACCESS_KEY_ID": "@r2-access-key-id",
    "R2_SECRET_ACCESS_KEY": "@r2-secret-access-key",
    "R2_BUCKET_NAME": "@r2-bucket-name",
    "NEXT_PUBLIC_APP_URL": "@next-public-app-url"
  }
}
```

**Step 2: Install Vercel CLI**

Run:
```bash
npm install -g vercel
```

**Step 3: Login to Vercel**

Run:
```bash
vercel login
```

**Step 4: Deploy to Vercel**

Run:
```bash
vercel
```

Follow prompts to:
- Link to existing project or create new
- Set environment variables
- Deploy

**Step 5: Add environment variables in Vercel dashboard**

Go to Vercel dashboard → Project → Settings → Environment Variables

Add all variables from `.env.local`

**Step 6: Production deployment**

Run:
```bash
vercel --prod
```

**Step 7: Commit Vercel config**

Run:
```bash
git add .
git commit -m "deploy: add Vercel configuration"
```

---

## Plan Complete

This plan provides a complete implementation roadmap for Permaculture.Studio from zero to production deployment.

**Implementation Summary:**

1. **Phase 1**: Project foundation, authentication (Tasks 1-5)
2. **Phase 2**: Dashboard and farm management (Tasks 6-7)
3. **Phase 3**: Interactive map editor (Task 8)
4. **Phase 4**: AI integration and analysis (Tasks 9-11)
5. **Phase 5**: Gallery and polish (Tasks 12-14)
6. **Phase 6**: Testing and deployment (Tasks 15-16)

**Total Tasks**: 16 major tasks with 80+ individual steps

**Estimated Timeline**: Each task contains bite-sized 2-5 minute steps following TDD principles.

---

**Plan saved to:** `docs/plans/2025-11-28-permacraft-full-system.md`

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach would you like?**
