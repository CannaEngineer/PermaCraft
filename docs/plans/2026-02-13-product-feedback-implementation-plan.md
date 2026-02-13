# Product Feedback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement comprehensive UX improvements across map workspace, mobile experience, and content density based on product feedback from UI/UX, Frontend, Content Strategy, and Product Management teams.

**Architecture:** Phased incremental rollout with 3 phases: (1) Map & Drawing UX improvements including toolbar relocation and FAB expansion, (2) Mobile experience enhancements with avatar menu redesign, theme system expansion, dashboard FAB, and journal feature, (3) Content optimization with compact species cards and feed truncation.

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS, Framer Motion, Turso (libSQL), shadcn/ui components

**Design Reference:** `docs/plans/2026-02-13-product-feedback-implementation.md`

---

## Phase 1: Map & Drawing UX (Days 1-3)

### Task 1: Relocate Drawing Toolbar to Left Side

**Files:**
- Modify: `components/immersive-map/drawing-toolbar.tsx:42`

**Step 1: Update toolbar positioning**

Change the fixed positioning from right to left:

```tsx
// Line 42: Update className
className="fixed left-4 top-1/2 -translate-y-1/2 z-30 glass-panel rounded-2xl p-2 flex flex-col gap-2 w-16"
```

**Step 2: Update animation direction**

Change the motion animation to slide in from left:

```tsx
// Lines 37-41: Update motion.div props
<motion.div
  initial={{ x: -100, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  exit={{ x: -100, opacity: 0 }}
  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
  className="fixed left-4 top-1/2 -translate-y-1/2 z-30 glass-panel rounded-2xl p-2 flex flex-col gap-2 w-16"
>
```

**Step 3: Test toolbar appears on left**

Run: `npm run dev`
Navigate to: `http://localhost:3000/farm/[id]` (any farm)
Action: Click "Add Zone" or enter drawing mode
Expected: Toolbar slides in from LEFT side, positioned at left edge

**Step 4: Verify mobile unchanged**

Test on mobile viewport (Chrome DevTools, 375px width)
Expected: Toolbar still appears at BOTTOM (horizontal layout)

**Step 5: Commit**

```bash
git add components/immersive-map/drawing-toolbar.tsx
git commit -m "fix(map): relocate drawing toolbar to left side

- Move toolbar from right-4 to left-4
- Update animation to slide in from left
- Eliminates occlusion with map info bar
- Mobile behavior unchanged (bottom toolbar)
"
```

---

### Task 2: Create MapFAB Component

**Files:**
- Create: `components/immersive-map/map-fab.tsx`

**Step 1: Create component file with imports**

```tsx
'use client';

import { FAB, FABAction } from '@/components/ui/fab';
import { Square, MapPin, MessageSquare, Upload } from 'lucide-react';
import { useImmersiveMapUI } from '@/contexts/immersive-map-ui-context';
import { useState } from 'react';

interface MapFABProps {
  onCreatePost: () => void;
  onUploadPhoto: () => void;
  onDropPin: () => void;
}

export function MapFAB({ onCreatePost, onUploadPhoto, onDropPin }: MapFABProps) {
  const { enterDrawingMode } = useImmersiveMapUI();

  const actions: FABAction[] = [
    {
      icon: <Square className="h-5 w-5" />,
      label: 'Draw Shape',
      onClick: enterDrawingMode,
      color: 'bg-blue-600 text-white'
    },
    {
      icon: <MapPin className="h-5 w-5" />,
      label: 'Drop Pin',
      onClick: onDropPin,
      color: 'bg-green-600 text-white'
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      label: 'Create Post',
      onClick: onCreatePost,
      color: 'bg-purple-600 text-white'
    },
    {
      icon: <Upload className="h-5 w-5" />,
      label: 'Upload Photo',
      onClick: onUploadPhoto,
      color: 'bg-orange-600 text-white'
    }
  ];

  return (
    <FAB
      actions={actions}
      ariaLabel="Map actions"
      className="md:bottom-24 md:right-8"
    />
  );
}
```

**Step 2: Test component compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add components/immersive-map/map-fab.tsx
git commit -m "feat(map): add MapFAB component with speed dial

- 4 actions: Draw Shape, Drop Pin, Create Post, Upload Photo
- Uses existing FAB component with speed dial support
- Integrates with ImmersiveMapUIContext
"
```

---

### Task 3: Integrate MapFAB into Immersive Map Editor

**Files:**
- Modify: `components/immersive-map/immersive-map-editor.tsx`

**Step 1: Add import**

Add to imports section (around line 6):

```tsx
import { MapFAB } from './map-fab';
```

**Step 2: Add state for dialogs**

Add state after existing useState hooks (around line 50):

```tsx
const [postDialogOpen, setPostDialogOpen] = useState(false);
const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
```

**Step 3: Add handler functions**

Add before return statement (around line 200):

```tsx
const handleCreatePost = () => {
  setPostDialogOpen(true);
};

const handleUploadPhoto = () => {
  // Open native file picker
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = async (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (!files) return;

    // TODO: Upload to R2 and create post
    console.log('Upload files:', files);
    setUploadDialogOpen(true);
  };
  input.click();
};

const handleDropPin = () => {
  openDrawer('species-picker', 'medium');
};
```

**Step 4: Add MapFAB to render**

Add before closing div, after other UI components (around line 450):

```tsx
{/* Map FAB */}
<MapFAB
  onCreatePost={handleCreatePost}
  onUploadPhoto={handleUploadPhoto}
  onDropPin={handleDropPin}
/>
```

**Step 5: Test FAB appears and expands**

Run: `npm run dev`
Navigate to: `http://localhost:3000/farm/[id]`
Expected:
- FAB appears in bottom-right
- Click FAB → 4 actions fan out
- "Draw Shape" → enters drawing mode
- "Drop Pin" → opens bottom drawer (species picker)
- "Create Post" → opens post dialog (or logs to console)
- "Upload Photo" → opens file picker

**Step 6: Commit**

```bash
git add components/immersive-map/immersive-map-editor.tsx
git commit -m "feat(map): integrate MapFAB into immersive editor

- Add MapFAB component to render tree
- Wire up action handlers (post, upload, pin)
- Position in bottom-right corner
"
```

---

## Phase 2: Mobile Experience (Days 4-8)

### Task 4: Add Neon Theme CSS Variables

**Files:**
- Modify: `app/globals.css`

**Step 1: Add Neon theme variables**

Add after existing theme definitions (around line 100):

```css
[data-theme='neon'] {
  /* Primary Colors */
  --primary: 280 100% 70%;              /* Electric purple */
  --primary-foreground: 0 0% 100%;

  --secondary: 180 100% 70%;            /* Cyan */
  --secondary-foreground: 0 0% 100%;

  --accent: 330 100% 70%;               /* Hot pink */
  --accent-foreground: 0 0% 100%;

  /* Backgrounds */
  --background: 240 10% 8%;             /* Dark purple-tinted */
  --foreground: 280 100% 95%;           /* Light with purple tint */
  --card: 240 10% 12%;
  --card-foreground: 280 100% 95%;
  --popover: 240 10% 10%;
  --popover-foreground: 280 100% 95%;

  /* Borders */
  --border: 280 70% 40%;                /* Neon purple borders */
  --input: 280 70% 40%;
  --ring: 280 100% 70%;

  /* Muted */
  --muted: 240 10% 15%;
  --muted-foreground: 280 50% 70%;

  /* Destructive */
  --destructive: 0 100% 60%;
  --destructive-foreground: 0 0% 100%;

  /* Effects */
  --neon-glow: 0 0 10px hsl(280 100% 70%);
  --neon-glow-strong: 0 0 20px hsl(280 100% 70%);
}

/* Glow effects on interactive elements */
[data-theme='neon'] button:hover {
  box-shadow: var(--neon-glow);
}

[data-theme='neon'] .neon-accent {
  box-shadow: var(--neon-glow-strong);
  animation: neon-pulse 2s ease-in-out infinite;
}

@keyframes neon-pulse {
  0%, 100% { box-shadow: var(--neon-glow); }
  50% { box-shadow: var(--neon-glow-strong); }
}
```

**Step 2: Test Neon theme compiles**

Run: `npm run build`
Expected: No CSS errors

**Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(theme): add Neon theme with cyberpunk aesthetic

- High-saturation purple, cyan, hot pink
- Dark purple-tinted background
- Neon glow effects on interactive elements
- Pulsing animation for accents
"
```

---

### Task 5: Add True Dark Theme CSS Variables

**Files:**
- Modify: `app/globals.css`

**Step 1: Add True Dark theme variables**

Add after Neon theme (around line 150):

```css
[data-theme='true-dark'] {
  /* Pure black for OLED power savings */
  --background: 0 0% 0%;                /* #000000 */
  --foreground: 0 0% 95%;               /* Near white */

  --card: 0 0% 3%;                      /* Near black */
  --card-foreground: 0 0% 95%;
  --popover: 0 0% 5%;
  --popover-foreground: 0 0% 95%;

  /* Monochrome primary */
  --primary: 0 0% 100%;                 /* Pure white */
  --primary-foreground: 0 0% 0%;        /* Black text on white */

  /* Subtle grays */
  --secondary: 0 0% 15%;
  --secondary-foreground: 0 0% 95%;

  --muted: 0 0% 8%;
  --muted-foreground: 0 0% 60%;

  --accent: 0 0% 20%;
  --accent-foreground: 0 0% 95%;

  /* Borders */
  --border: 0 0% 15%;                   /* Subtle gray borders */
  --input: 0 0% 20%;
  --ring: 0 0% 50%;

  /* Destructive (red for warnings) */
  --destructive: 0 80% 50%;
  --destructive-foreground: 0 0% 100%;

  /* High contrast mode */
  --radius: 0.5rem;
}

/* Remove all gradients, use solid colors */
[data-theme='true-dark'] * {
  background-image: none !important;
}
```

**Step 2: Test True Dark theme compiles**

Run: `npm run build`
Expected: No CSS errors

**Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(theme): add True Dark theme for OLED displays

- Pure black (#000) backgrounds
- High contrast (WCAG AAA)
- Monochrome palette + red for destructive
- No gradients (solid colors only)
- OLED power savings
"
```

---

### Task 6: Update ThemeProvider to Support 4 Themes

**Files:**
- Modify: `components/theme/ThemeProvider.tsx`

**Step 1: Update Theme type**

Find the Theme type definition (around line 5) and update:

```tsx
type Theme = 'modern' | 'windows-xp' | 'neon' | 'true-dark';
type Mode = 'light' | 'dark';
```

**Step 2: Update ThemeContext interface**

Update the interface (around line 10):

```tsx
interface ThemeContextValue {
  theme: Theme;
  mode: Mode;
  setTheme: (theme: Theme) => void;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
}
```

**Step 3: Update ThemeProvider implementation**

Update the provider (around line 30):

```tsx
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('modern');
  const [mode, setModeState] = useState<Mode>('light');

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
  };

  const setMode = (newMode: Mode) => {
    setModeState(newMode);
    document.documentElement.classList.toggle('dark', newMode === 'dark');
    if (typeof window !== 'undefined') {
      localStorage.setItem('mode', newMode);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };

  // Initialize from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme || 'modern';
      const savedMode = localStorage.getItem('mode') as Mode || 'light';
      setTheme(savedTheme);
      setMode(savedMode);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, mode, setTheme, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

**Step 4: Test theme switching**

Run: `npm run dev`
Open browser console:
```javascript
// Test theme switching
localStorage.setItem('theme', 'neon');
location.reload(); // Should show neon theme

localStorage.setItem('theme', 'true-dark');
location.reload(); // Should show true dark theme
```

**Step 5: Commit**

```bash
git add components/theme/ThemeProvider.tsx
git commit -m "feat(theme): update ThemeProvider to support 4 themes

- Add neon and true-dark to Theme type
- Support light/dark mode per theme
- Persist theme and mode to localStorage
- Initialize from localStorage on mount
"
```

---

### Task 7: Create Farm Journal Database Migration

**Files:**
- Create: `migrations/002_farm_journal.sql`

**Step 1: Create migration file**

```sql
-- Farm Journal Entries Table
CREATE TABLE IF NOT EXISTS farm_journal_entries (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  entry_date INTEGER NOT NULL,          -- User-specified date (can backdate)
  title TEXT,                           -- Optional short title
  content TEXT NOT NULL,                -- Rich text content
  media_urls TEXT,                      -- JSON array of photo URLs
  weather TEXT,                         -- Optional weather notes
  tags TEXT,                            -- JSON array: ['planting', 'harvest', etc.]
  is_shared_to_community INTEGER DEFAULT 0,  -- Optional public sharing
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_journal_farm_date
  ON farm_journal_entries(farm_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_journal_author
  ON farm_journal_entries(author_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_journal_shared
  ON farm_journal_entries(is_shared_to_community, created_at DESC);
```

**Step 2: Run migration**

```bash
turso db shell permaculture-studio < migrations/002_farm_journal.sql
```

Expected output: `CREATE TABLE` success messages

**Step 3: Verify tables created**

```bash
turso db shell permaculture-studio
```

Run in shell:
```sql
.tables
SELECT * FROM farm_journal_entries LIMIT 1;
```

Expected: Table exists, empty result (no rows yet)

**Step 4: Commit**

```bash
git add migrations/002_farm_journal.sql
git commit -m "feat(journal): add farm journal database schema

- Create farm_journal_entries table
- Support backdating entries
- Optional community sharing
- Indexes for farm and author queries
"
```

---

### Task 8: Create Journal Entry Form Component

**Files:**
- Create: `components/farm/journal-entry-form.tsx`

**Step 1: Create component with imports and interface**

```tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';

interface JournalEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmId?: string;
}

const AVAILABLE_TAGS = [
  'planting',
  'harvest',
  'observation',
  'pest',
  'maintenance',
  'weather',
  'wildlife',
  'other'
];
```

**Step 2: Add component implementation**

```tsx
export function JournalEntryForm({ open, onOpenChange, farmId }: JournalEntryFormProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [weather, setWeather] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [shareToComm, setShareToComm] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleTag = (tag: string) => {
    setTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!content.trim() || !farmId) return;

    setSaving(true);

    try {
      const entry = {
        id: crypto.randomUUID(),
        farm_id: farmId,
        entry_date: Math.floor(date.getTime() / 1000),
        title: title.trim() || null,
        content: content.trim(),
        media_urls: null, // TODO: Handle file uploads
        weather: weather.trim() || null,
        tags: JSON.stringify(tags),
        is_shared_to_community: shareToComm ? 1 : 0
      };

      const response = await fetch('/api/journal/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });

      if (!response.ok) throw new Error('Failed to save entry');

      // Reset form
      setTitle('');
      setContent('');
      setWeather('');
      setTags([]);
      setShareToComm(false);
      setDate(new Date());

      onOpenChange(false);

      // TODO: Show success toast
      console.log('Journal entry saved');
    } catch (error) {
      console.error('Failed to save journal entry:', error);
      // TODO: Show error toast
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Farm Observation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date */}
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={format(date, 'yyyy-MM-dd')}
              onChange={(e) => setDate(new Date(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., First tomato harvest"
              maxLength={100}
            />
          </div>

          {/* Content */}
          <div>
            <Label htmlFor="content">What happened? *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe what you observed, did, or learned today..."
              rows={6}
              required
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {content.length} characters
            </p>
          </div>

          {/* Weather */}
          <div>
            <Label htmlFor="weather">Weather (optional)</Label>
            <Input
              id="weather"
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              placeholder="e.g., Sunny, 72°F, light breeze"
            />
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {AVAILABLE_TAGS.map(tag => (
                <Badge
                  key={tag}
                  variant={tags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Share to Community */}
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
            <Checkbox
              id="share"
              checked={shareToComm}
              onCheckedChange={(checked) => setShareToComm(checked === true)}
            />
            <Label htmlFor="share" className="cursor-pointer text-sm">
              Share this entry with the community
            </Label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || saving}
          >
            {saving ? 'Saving...' : 'Save Entry'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 3: Test component compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add components/farm/journal-entry-form.tsx
git commit -m "feat(journal): create journal entry form component

- Date picker with backdate support
- Title, content, weather, tags fields
- Optional community sharing
- Client-side validation
"
```

---

### Task 9: Create Journal API Route

**Files:**
- Create: `app/api/journal/entries/route.ts`

**Step 1: Create API route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({
      headers: headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      id,
      farm_id,
      entry_date,
      title,
      content,
      media_urls,
      weather,
      tags,
      is_shared_to_community
    } = body;

    // Validate required fields
    if (!farm_id || !content || entry_date === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: farm_id, content, entry_date' },
        { status: 400 }
      );
    }

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
      args: [farm_id, session.user.id]
    });

    if (farmResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Farm not found or access denied' },
        { status: 403 }
      );
    }

    // Insert journal entry
    const entryId = id || crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO farm_journal_entries
        (id, farm_id, author_id, entry_date, title, content, media_urls, weather, tags, is_shared_to_community)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        entryId,
        farm_id,
        session.user.id,
        entry_date,
        title,
        content,
        media_urls,
        weather,
        tags,
        is_shared_to_community || 0
      ]
    });

    // If shared to community, create public post
    if (is_shared_to_community === 1) {
      await db.execute({
        sql: `INSERT INTO farm_posts
          (id, farm_id, author_id, post_type, content, media_urls, is_published, journal_entry_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          crypto.randomUUID(),
          farm_id,
          session.user.id,
          'journal_entry',
          content,
          media_urls,
          1,
          entryId
        ]
      });
    }

    return NextResponse.json({
      success: true,
      id: entryId
    });

  } catch (error) {
    console.error('Journal entry creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create journal entry' },
      { status: 500 }
    );
  }
}
```

**Step 2: Test API route compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 3: Test API manually**

Run: `npm run dev`

Use curl or Postman:
```bash
curl -X POST http://localhost:3000/api/journal/entries \
  -H "Content-Type: application/json" \
  -d '{
    "farm_id": "test-farm-id",
    "entry_date": 1707868800,
    "title": "Test Entry",
    "content": "This is a test journal entry.",
    "tags": "[\"observation\"]",
    "is_shared_to_community": 0
  }'
```

Expected: 401 (Unauthorized) if not logged in, or success if authenticated

**Step 4: Commit**

```bash
git add app/api/journal/entries/route.ts
git commit -m "feat(journal): add journal entries API route

- POST endpoint for creating journal entries
- Authentication and farm ownership validation
- Auto-create public post if shared to community
- Returns entry ID on success
"
```

---

### Task 10: Create Dashboard FAB Component

**Files:**
- Create: `components/dashboard/dashboard-fab.tsx`

**Step 1: Create component**

```tsx
'use client';

import { FAB, FABAction } from '@/components/ui/fab';
import { MapIcon, MessageSquare, Upload, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { JournalEntryForm } from '@/components/farm/journal-entry-form';

export function DashboardFAB() {
  const router = useRouter();
  const [journalDialogOpen, setJournalDialogOpen] = useState(false);
  const [selectedFarmId, setSelectedFarmId] = useState<string | undefined>();

  const handleQuickPost = () => {
    // TODO: Open create post dialog
    console.log('Quick post clicked');
  };

  const handleUploadImage = () => {
    // Open native file picker
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;

      // TODO: Upload to R2 and create post
      console.log('Upload files:', files);
    };
    input.click();
  };

  const handleLogObservation = () => {
    // TODO: Get user's farms and let them select one
    // For now, just open dialog
    setJournalDialogOpen(true);
  };

  const actions: FABAction[] = [
    {
      icon: <MapIcon className="h-5 w-5" />,
      label: 'Create Farm',
      onClick: () => router.push('/farm/new'),
      color: 'bg-green-600 text-white'
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      label: 'Quick Post',
      onClick: handleQuickPost,
      color: 'bg-blue-600 text-white'
    },
    {
      icon: <Upload className="h-5 w-5" />,
      label: 'Upload Image',
      onClick: handleUploadImage,
      color: 'bg-purple-600 text-white'
    },
    {
      icon: <BookOpen className="h-5 w-5" />,
      label: 'Log Observation',
      onClick: handleLogObservation,
      color: 'bg-orange-600 text-white'
    }
  ];

  return (
    <>
      <FAB
        actions={actions}
        ariaLabel="Quick actions"
        className="md:bottom-24 md:right-8"
      />

      <JournalEntryForm
        open={journalDialogOpen}
        onOpenChange={setJournalDialogOpen}
        farmId={selectedFarmId}
      />
    </>
  );
}
```

**Step 2: Test component compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add components/dashboard/dashboard-fab.tsx
git commit -m "feat(dashboard): add dashboard FAB with 4 actions

- Create Farm, Quick Post, Upload Image, Log Observation
- Integrates with JournalEntryForm
- Positioned in bottom-right corner
"
```

---

### Task 11: Integrate Dashboard FAB into Dashboard Page

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

**Step 1: Add import**

Add to imports (around line 10):

```tsx
import { DashboardFAB } from '@/components/dashboard/dashboard-fab';
```

**Step 2: Add FAB to render**

Inside the `<DashboardClient>` wrapper, add before closing tag (around line 305):

```tsx
      {/* Dashboard FAB */}
      <DashboardFAB />
    </DashboardClient>
```

**Step 3: Test FAB appears on dashboard**

Run: `npm run dev`
Navigate to: `http://localhost:3000/dashboard`
Expected:
- FAB appears in bottom-right
- Click FAB → 4 actions fan out
- "Log Observation" → opens journal form
- Other actions trigger handlers

**Step 4: Commit**

```bash
git add app/(app)/dashboard/page.tsx
git commit -m "feat(dashboard): integrate dashboard FAB

- Add DashboardFAB to dashboard page
- Replace top-right 'New Farm' button with multi-action FAB
"
```

---

### Task 12: Update Desktop Playlist to Expanded by Default

**Files:**
- Modify: `components/audio/AudioPlayer.tsx`

**Step 1: Update default expanded state**

Find the `isDesktopExpanded` state (around line 27) and update:

```tsx
const [isDesktopExpanded, setIsDesktopExpanded] = useState(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('music-playlist-expanded');
    return saved === null ? true : saved === 'true'; // Default true
  }
  return true;
});
```

**Step 2: Save preference when toggled**

Update the toggle handler (around line 50):

```tsx
const togglePlaylistExpanded = () => {
  const newState = !isDesktopExpanded;
  setIsDesktopExpanded(newState);
  if (typeof window !== 'undefined') {
    localStorage.setItem('music-playlist-expanded', String(newState));
  }
};
```

**Step 3: Update button onClick**

Update the minimize button (around line 52):

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={togglePlaylistExpanded}
  className="h-6 text-gray-400 hover:text-white hover:bg-gray-700"
>
  {isDesktopExpanded ? <Minimize2 className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
</Button>
```

**Step 4: Test playlist expanded by default**

Run: `npm run dev`
Navigate to any page with sidebar (desktop view)
Expected:
- Playlist section visible by default
- Current track highlighted
- Click minimize → playlist collapses
- Refresh page → playlist remains in user's preferred state

**Step 5: Commit**

```bash
git add components/audio/AudioPlayer.tsx
git commit -m "feat(music): make desktop playlist expanded by default

- Default state: expanded (true)
- Remember user preference in localStorage
- Auto-scroll to current track (existing behavior)
"
```

---

## Phase 3: Content & Community (Days 9-11)

### Task 13: Create ExpandableText Component

**Files:**
- Create: `components/shared/expandable-text.tsx`

**Step 1: Create component with full implementation**

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpandableTextProps {
  text: string;
  maxLength?: number;
  className?: string;
  expandLabel?: string;
  collapseLabel?: string;
  showCollapseButton?: boolean;
  preserveFormatting?: boolean;
}

export function ExpandableText({
  text,
  maxLength = 500,
  className = '',
  expandLabel = 'Dive Deeper',
  collapseLabel = 'Show Less',
  showCollapseButton = true,
  preserveFormatting = true
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't truncate if text is shorter than maxLength
  const shouldTruncate = text.length > maxLength;

  // Truncate at word boundary, not mid-word
  const truncateAtWord = (str: string, max: number) => {
    if (str.length <= max) return str;
    const truncated = str.slice(0, max);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
  };

  const displayText = isExpanded ? text : truncateAtWord(text, maxLength);

  if (!shouldTruncate) {
    return (
      <div className={cn(preserveFormatting && 'whitespace-pre-wrap', className)}>
        {text}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className={cn(preserveFormatting && 'whitespace-pre-wrap')}>
        {displayText}
        {!isExpanded && '...'}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-2 h-8 text-primary hover:text-primary/80 hover:bg-primary/10"
        aria-label={isExpanded ? 'Collapse text' : 'Expand text'}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <>
            {showCollapseButton && (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                {collapseLabel}
              </>
            )}
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4 mr-1" />
            {expandLabel}
          </>
        )}
      </Button>
    </div>
  );
}
```

**Step 2: Test component compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 3: Test component manually**

Create test page `app/test-expandable/page.tsx`:

```tsx
import { ExpandableText } from '@/components/shared/expandable-text';

export default function TestPage() {
  const longText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(20);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">ExpandableText Test</h1>
      <ExpandableText text={longText} maxLength={200} />
    </div>
  );
}
```

Run: `npm run dev`
Navigate to: `http://localhost:3000/test-expandable`
Expected:
- Text truncated at ~200 chars
- "Dive Deeper" button appears
- Click → text expands fully
- "Show Less" button appears
- Click → text collapses

Delete test page after verification.

**Step 4: Commit**

```bash
git add components/shared/expandable-text.tsx
git commit -m "feat(ui): create ExpandableText component

- Truncates text at word boundaries
- Configurable max length (default 500)
- Customizable expand/collapse labels
- Preserves whitespace formatting
- ARIA-compliant (accessible)
"
```

---

### Task 14: Compact Species Card Redesign

**Files:**
- Modify: `components/species/species-card.tsx`

**Step 1: Remove emoji icon and reduce header height**

Update header section (lines 48-70):

```tsx
{/* Header - COMPACT: no emoji, reduced height */}
<div className={`h-16 relative ${layerColorClass} border-b`}>
  {/* Remove gradient overlay */}
  {/* Remove large emoji icon */}

  <div className="absolute top-2 right-2">
    {species.is_native === 1 ? (
      <Badge className="bg-green-600 hover:bg-green-700 text-xs px-2 py-0.5">
        Native  {/* NO EMOJI */}
      </Badge>
    ) : (
      <Badge variant="secondary" className="text-xs px-2 py-0.5">
        Naturalized
      </Badge>
    )}
  </div>
</div>
```

**Step 2: Reduce card header padding**

Update CardHeader (lines 72-81):

```tsx
<CardHeader className="pb-2 pt-2">  {/* Reduced from pb-3 pt-4 */}
  <div className="space-y-0.5">      {/* Reduced from space-y-1 */}
    <h3 className="font-bold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
      {species.common_name}
    </h3>
    <p className="text-xs text-muted-foreground italic line-clamp-1">
      {species.scientific_name}
    </p>
  </div>
</CardHeader>
```

**Step 3: Reduce content spacing**

Update CardContent (line 83):

```tsx
<CardContent className="space-y-2 py-3">  {/* Reduced from space-y-3 */}
```

**Step 4: Tighten badge gaps**

Update gap values throughout content:

```tsx
{/* Layer Badge */}
<div className="flex items-center gap-2">
  <Badge variant="outline" className={`text-xs capitalize h-5 ${layerColorClass}`}>
    <Layers className="w-3 h-3 mr-1" />
    {species.layer}
  </Badge>
</div>

{/* Info Grid */}
<div className="grid grid-cols-2 gap-1.5 text-xs">  {/* Reduced from gap-2 */}
  {/* ... existing content ... */}
</div>

{/* Regions */}
{regions.length > 0 && (
  <div className="flex flex-wrap gap-1">  {/* Reduced from gap-2 */}
    {regions.map((region: string) => (
      <Badge key={region} variant="outline" className="text-xs px-1.5 py-0 bg-muted/50">
        {region}
      </Badge>
    ))}
  </div>
)}

{/* Functions */}
{functions.length > 0 && (
  <div className="pt-1.5 border-t">  {/* Reduced from pt-2 */}
    <div className="flex flex-wrap gap-1">  {/* Reduced from gap-2 */}
      {functions.map((fn: string) => (
        <Badge
          key={fn}
          variant="secondary"
          className="text-xs px-1.5 py-0 bg-primary/5 text-primary border-primary/20"
        >
          {fn.replace(/_/g, ' ')}
        </Badge>
      ))}
    </div>
  </div>
)}
```

**Step 5: Remove "Tap to learn more" hint**

Delete lines 154-158 (the hint text section)

**Step 6: Test compact design**

Run: `npm run dev`
Navigate to: `http://localhost:3000/plants`
Expected:
- Cards are shorter (~280px vs ~380px)
- No emoji icons
- All information still visible and readable
- Layer colors preserved
- Hover effects work

**Step 7: Commit**

```bash
git add components/species/species-card.tsx
git commit -m "feat(species): compact species card redesign

- Remove decorative emojis (keep layer color system)
- Reduce header height: 96px -> 64px
- Tighten spacing: gaps reduced by 25-50%
- Remove 'Tap to learn more' hint
- Total height reduction: 26% (380px -> 280px)
- All critical info preserved
"
```

---

### Task 15: Integrate ExpandableText into Gallery Feed

**Files:**
- Modify: Feed post rendering components (likely in `components/feed/` directory)

**Step 1: Find feed post components**

Run: `npm run dev`

Search for post content rendering:

```bash
grep -r "post.content" components/feed/ app/
```

Identify the component that renders post content (likely `FeedPostCard` or similar)

**Step 2: Add ExpandableText import**

Add to imports:

```tsx
import { ExpandableText } from '@/components/shared/expandable-text';
```

**Step 3: Replace direct text rendering with ExpandableText**

Find instances like:

```tsx
<div className="text-sm">{post.content}</div>
```

Replace with:

```tsx
<ExpandableText
  text={post.content || ''}
  maxLength={500}
  expandLabel="Dive Deeper"
  className="text-sm text-foreground leading-relaxed"
/>
```

**Step 4: Handle different post types**

For photo posts (if captions exist):

```tsx
{post.type === 'photo' && post.content && (
  <ExpandableText
    text={post.content}
    maxLength={500}
    className="mt-3 text-sm"
  />
)}
```

For AI insights (longer threshold):

```tsx
{post.type === 'ai_insight' && (
  <ExpandableText
    text={post.ai_response_excerpt || post.content || ''}
    maxLength={800}
    expandLabel="Read Full Analysis"
    className="text-sm bg-muted/30 p-3 rounded-lg border-l-2 border-primary"
  />
)}
```

**Step 5: Test feed truncation**

Run: `npm run dev`
Navigate to: `http://localhost:3000/gallery`
Expected:
- Posts longer than 500 chars show "Dive Deeper" button
- Click → text expands inline
- "Show Less" button appears
- Click → text collapses
- Short posts (<500 chars) show full text, no button

**Step 6: Commit**

```bash
git add components/feed/[modified-files].tsx
git commit -m "feat(feed): integrate ExpandableText for post truncation

- Truncate posts at 500 characters
- 'Dive Deeper' CTA for expansion
- Inline expansion (no modal)
- Different thresholds for AI insights (800 chars)
"
```

---

### Task 16: Integrate ExpandableText into Dashboard Feed

**Files:**
- Modify: `components/dashboard/recent-community-posts.tsx`
- Modify: `components/dashboard/farm-activity-feed.tsx`

**Step 1: Update recent community posts**

Add import to `recent-community-posts.tsx`:

```tsx
import { ExpandableText } from '@/components/shared/expandable-text';
```

Find post content rendering and replace:

```tsx
{/* Before */}
<p className="text-sm">{post.content}</p>

{/* After */}
<ExpandableText
  text={post.content}
  maxLength={300}  {/* Shorter for dashboard widgets */}
  expandLabel="Read More"
  className="text-sm"
/>
```

**Step 2: Update farm activity feed**

Add import to `farm-activity-feed.tsx`:

```tsx
import { ExpandableText } from '@/components/shared/expandable-text';
```

Replace activity content:

```tsx
{/* Before */}
<p className="text-sm">{activity.content}</p>

{/* After */}
<ExpandableText
  text={activity.content}
  maxLength={200}  {/* Very short for activity feed */}
  expandLabel="More"
  showCollapseButton={false}  {/* Expand-only */}
  className="text-sm"
/>
```

**Step 3: Test dashboard feeds**

Run: `npm run dev`
Navigate to: `http://localhost:3000/dashboard`
Expected:
- Recent community posts truncated at 300 chars
- Activity feed truncated at 200 chars
- Expand buttons work
- Layout stays clean and organized

**Step 4: Commit**

```bash
git add components/dashboard/recent-community-posts.tsx components/dashboard/farm-activity-feed.tsx
git commit -m "feat(dashboard): add truncation to dashboard feeds

- Recent posts truncated at 300 chars
- Activity feed truncated at 200 chars (expand-only)
- Consistent ExpandableText usage across app
"
```

---

## Testing & Verification

### Manual Testing Checklist

**Phase 1: Map & Drawing UX**
- [ ] Drawing toolbar appears on LEFT side
- [ ] Toolbar slides in from left (smooth animation)
- [ ] Map FAB appears in bottom-right
- [ ] FAB expands to show 4 actions
- [ ] "Draw Shape" enters drawing mode
- [ ] "Drop Pin" opens species picker
- [ ] "Create Post" opens post dialog
- [ ] "Upload Photo" opens file picker
- [ ] Mobile: toolbar at bottom (horizontal)
- [ ] Mobile: FAB above bottom nav

**Phase 2: Mobile Experience**
- [ ] Neon theme applies correctly (purple glow)
- [ ] True Dark theme applies correctly (OLED black)
- [ ] Theme persists after page reload
- [ ] Dark mode toggle works per theme
- [ ] Journal entry form opens
- [ ] Journal entry saves to database
- [ ] Journal entry with "share to community" creates post
- [ ] Dashboard FAB shows 4 actions
- [ ] "Log Observation" opens journal form
- [ ] Desktop playlist expanded by default
- [ ] Minimize playlist → remembered on reload

**Phase 3: Content & Community**
- [ ] Species cards are more compact (shorter)
- [ ] No emoji icons in species cards
- [ ] Layer colors still visible and correct
- [ ] All species info readable
- [ ] Gallery posts truncated at 500 chars
- [ ] "Dive Deeper" button appears for long posts
- [ ] Click → text expands inline
- [ ] "Show Less" button works
- [ ] Dashboard feeds truncated (300/200 chars)
- [ ] AI insights truncated at 800 chars

### Accessibility Testing

- [ ] All FAB actions have proper aria-labels
- [ ] Keyboard navigation works (Tab, Enter/Space)
- [ ] Screen reader announces expanded/collapsed state
- [ ] Focus visible on all interactive elements
- [ ] Color contrast meets WCAG AA (test all 4 themes)

### Browser Testing

**Desktop:**
- [ ] Chrome (Windows/macOS)
- [ ] Firefox (Windows/macOS)
- [ ] Safari (macOS)
- [ ] Edge (Windows)

**Mobile:**
- [ ] Safari (iOS 14+)
- [ ] Chrome (Android 10+)

### Performance Testing

- [ ] Page load time < 2.5s (LCP)
- [ ] No layout shift when expanding text (CLS < 0.1)
- [ ] FAB animations smooth (60fps)
- [ ] Theme switching instant (< 100ms)
- [ ] Journal form opens quickly (< 200ms)

---

## Rollout Strategy

### Phase 1 Rollout

**Feature Flag:**
```env
NEXT_PUBLIC_ENABLE_MAP_FAB=true
```

**Deployment:**
1. Deploy to staging
2. Test all flows
3. Enable for 10% of production users
4. Monitor metrics for 24 hours
5. Roll out to 100% if metrics positive

**Metrics to Monitor:**
- Drawing mode activation rate
- FAB interaction rate
- Post creation from map
- Error rates (Sentry)

### Phase 2 Rollout

**Gradual Rollout:**
1. Deploy themes (low risk, immediate)
2. Deploy journal feature to beta users
3. Monitor journal usage for 3 days
4. Deploy avatar menu changes to 20% of users
5. Increase to 50%, then 100% over 5 days

**Metrics to Monitor:**
- Theme adoption rate (Neon/True Dark)
- Journal entries per user per week
- Music player engagement on mobile
- Support requests about UI changes

### Phase 3 Rollout

**A/B Testing:**
1. Deploy ExpandableText to 50% of users
2. Compare metrics:
   - Time on feed
   - Scroll depth
   - "Dive Deeper" click rate
3. Deploy species card redesign to 50%
4. Compare:
   - Click-through rate
   - Bounce rate
   - Time on page
5. Roll out winning variants to 100%

---

## Rollback Plan

If critical issues arise:

### Phase 1 Rollback
```bash
# Revert toolbar position
git revert [commit-hash]
git push

# Disable FAB via feature flag
NEXT_PUBLIC_ENABLE_MAP_FAB=false
```

### Phase 2 Rollback
```bash
# Revert theme changes
git revert [commit-hash-range]

# Disable journal feature
# Comment out DashboardFAB and JournalEntryForm imports
```

### Phase 3 Rollback
```bash
# Revert ExpandableText integration
git revert [commit-hash]

# Revert species card changes
git revert [commit-hash]
```

---

## Post-Launch Tasks

### Week 1: Monitoring

**Daily:**
- [ ] Check error rates (Sentry)
- [ ] Monitor feature adoption
- [ ] Review user feedback
- [ ] Hot-fix critical bugs

**End of Week:**
- [ ] Analyze engagement metrics
- [ ] Survey users (in-app)
- [ ] Plan iteration based on feedback

### Week 2-4: Iteration

- [ ] Implement quick wins from feedback
- [ ] Optimize performance bottlenecks
- [ ] Refine UI based on usage patterns
- [ ] Plan Phase 4 (research blog engine)

### Documentation

- [ ] Update README with new features
- [ ] Document new components in Storybook (if applicable)
- [ ] Update API documentation
- [ ] Create user guides/tutorials

---

## Success Criteria

**Phase 1:**
- ✅ Drawing mode activation rate +25%
- ✅ FAB interaction rate > 30% of map sessions
- ✅ Post creation from map +15%
- ✅ Zero occlusion complaints

**Phase 2:**
- ✅ Neon/True Dark adoption > 20% within 2 weeks
- ✅ Journal entries: 2-3 per user per week
- ✅ Mobile music engagement +40%
- ✅ Dashboard FAB usage > 50% of sessions

**Phase 3:**
- ✅ "Dive Deeper" click rate > 15%
- ✅ Species catalog: 4-5 cards visible per viewport (from 3-4)
- ✅ Time on feed +10%
- ✅ No increase in bounce rate

---

## Notes for Implementation

**DRY (Don't Repeat Yourself):**
- `ExpandableText` component reused across feed, dashboard, journal
- FAB component reused for map and dashboard
- Theme variables reused across all themes

**YAGNI (You Aren't Gonna Need It):**
- Journal MVP: No PDF export, calendar view, or reminders (deferred to v2)
- No draggable FAB (not requested)
- No theme preview swatches (nice-to-have, not MVP)

**TDD (Test-Driven Development):**
- Write tests for critical paths (journal save, theme switching)
- Manual testing checklist provided
- Integration tests for API routes

**Frequent Commits:**
- Each task ends with a commit
- Small, atomic commits with clear messages
- Easy to rollback individual changes

---

## Plan Complete

This implementation plan provides step-by-step instructions for all 3 phases (11 days of work) with exact file paths, code examples, testing procedures, and commit messages. Each task is broken into 2-5 minute steps following TDD principles.

**Reference Design:** `docs/plans/2026-02-13-product-feedback-implementation.md`

**Total Tasks:** 16 major tasks (broken into 80+ steps)
**Estimated Time:** 11 development days
**Risk Level:** Low (incremental rollout, feature flags)
