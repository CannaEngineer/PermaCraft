# Social Feed Phase 3 - Content Creation & Discovery

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to create posts (text/photo/AI insights), make farms public, and discover content from other users in a global feed.

**Architecture:** Floating Action Button (FAB) on farm page opens creation modal with 3 tabs. Farm settings include public/private toggle. Gallery page transforms from farm cards to unified social feed showing all public farms' posts.

**Tech Stack:** Next.js 14, React Server Components + Client Components, shadcn/ui Dialog, Tabs, existing upload API, existing database schema

---

## User Flows

**Content Creation (Farm Owner):**
1. Click FAB (+) button on farm page
2. Choose: Text Post | Photo Post | AI Insight
3. Fill in content → Publish
4. Post appears in farm feed immediately

**Making Farm Public:**
1. Farm settings page
2. Toggle "Make this farm public"
3. Save → Farm appears in global gallery

**Content Discovery (Any User):**
1. Visit /gallery
2. See infinite scroll feed of ALL posts from public farms
3. Can react, comment, visit farm

---

## Task 1: Add Farm Public/Private Toggle

**Files:**
- Modify: `app/(app)/farm/[id]/page.tsx`
- Create: `components/farm/farm-settings-button.tsx`
- Create: `components/farm/farm-settings-dialog.tsx`
- Modify: `lib/db/schema.ts` (confirm `is_public` field exists)

**Step 1: Verify database schema**

Check that `farms` table has `is_public` field:

```sql
-- Should already exist from earlier migrations
SELECT is_public FROM farms LIMIT 1;
```

**Step 2: Create farm settings button component**

Create `components/farm/farm-settings-button.tsx`:

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { SettingsIcon } from 'lucide-react';
import { useState } from 'react';
import { FarmSettingsDialog } from './farm-settings-dialog';

interface FarmSettingsButtonProps {
  farmId: string;
  initialIsPublic: boolean;
}

export function FarmSettingsButton({ farmId, initialIsPublic }: FarmSettingsButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <SettingsIcon className="h-4 w-4 mr-2" />
        Settings
      </Button>
      <FarmSettingsDialog
        open={open}
        onOpenChange={setOpen}
        farmId={farmId}
        initialIsPublic={initialIsPublic}
      />
    </>
  );
}
```

**Step 3: Create farm settings dialog**

Create `components/farm/farm-settings-dialog.tsx`:

```typescript
'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface FarmSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmId: string;
  initialIsPublic: boolean;
}

export function FarmSettingsDialog({
  open,
  onOpenChange,
  farmId,
  initialIsPublic,
}: FarmSettingsDialogProps) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/farms/${farmId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: isPublic ? 1 : 0 }),
      });

      if (!res.ok) throw new Error('Failed to update settings');

      router.refresh();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Farm Settings</DialogTitle>
          <DialogDescription>
            Control who can see your farm and posts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Public Farm</Label>
              <p className="text-sm text-muted-foreground">
                Allow anyone to view your farm and posts in the gallery
              </p>
            </div>
            <Button
              variant={isPublic ? "default" : "outline"}
              size="sm"
              onClick={() => setIsPublic(!isPublic)}
            >
              {isPublic ? 'Public' : 'Private'}
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 4: Add PATCH endpoint for farm settings**

Modify `app/api/farms/[id]/route.ts` (add PATCH handler):

```typescript
// Add this export to existing route.ts
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const farmId = params.id;

    // Verify ownership
    const farmResult = await db.execute({
      sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json(
        { error: "Farm not found or you don't have permission" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { is_public } = body;

    await db.execute({
      sql: "UPDATE farms SET is_public = ?, updated_at = unixepoch() WHERE id = ?",
      args: [is_public, farmId],
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Farm update error:", error);
    return Response.json(
      { error: "Failed to update farm" },
      { status: 500 }
    );
  }
}
```

**Step 5: Add settings button to farm page header**

Modify `app/(app)/farm/[id]/farm-editor-client.tsx`, add to header buttons:

```typescript
// Add import at top
import { FarmSettingsButton } from '@/components/farm/farm-settings-button';

// Add prop to FarmEditorClientProps
interface FarmEditorClientProps {
  farm: Farm;
  initialZones: Zone[];
  isOwner: boolean;
  // Add this:
  initialIsPublic: boolean;
}

// In the component, add to the header buttons section (after Save button, before Delete):
{isOwner && (
  <FarmSettingsButton
    farmId={farm.id}
    initialIsPublic={initialIsPublic}
  />
)}
```

**Step 6: Pass is_public from server component**

Modify `app/(app)/farm/[id]/page.tsx`:

```typescript
// In the return statement, add initialIsPublic prop:
<FarmEditorClient
  farm={farm}
  initialZones={zones}
  isOwner={isOwner}
  initialIsPublic={!!farm.is_public}
/>
```

**Step 7: Commit**

```bash
git add components/farm/ app/api/farms/[id]/route.ts app/(app)/farm/[id]/
git commit -m "feat: add farm public/private toggle in settings"
```

---

## Task 2: Create Floating Action Button (FAB)

**Files:**
- Create: `components/farm/create-post-fab.tsx`
- Modify: `app/(app)/farm/[id]/farm-editor-client.tsx`

**Step 1: Create FAB component**

Create `components/farm/create-post-fab.tsx`:

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { CreatePostDialog } from './create-post-dialog';

interface CreatePostFABProps {
  farmId: string;
  onPostCreated: () => void;
}

export function CreatePostFAB({ farmId, onPostCreated }: CreatePostFABProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
        onClick={() => setOpen(true)}
      >
        <PlusIcon className="h-6 w-6" />
      </Button>
      <CreatePostDialog
        open={open}
        onOpenChange={setOpen}
        farmId={farmId}
        onPostCreated={() => {
          onPostCreated();
          setOpen(false);
        }}
      />
    </>
  );
}
```

**Step 2: Add FAB to farm editor**

Modify `app/(app)/farm/[id]/farm-editor-client.tsx`:

```typescript
// Add import
import { CreatePostFAB } from '@/components/farm/create-post-fab';

// Add state for post refresh
const [postRefreshKey, setPostRefreshKey] = useState(0);

// In the return JSX, add before closing </div>:
{isOwner && (
  <CreatePostFAB
    farmId={farm.id}
    onPostCreated={() => setPostRefreshKey((k) => k + 1)}
  />
)}
```

**Step 3: Commit**

```bash
git add components/farm/create-post-fab.tsx app/(app)/farm/[id]/farm-editor-client.tsx
git commit -m "feat: add floating action button for post creation"
```

---

## Task 3: Create Post Dialog with Tabs

**Files:**
- Create: `components/farm/create-post-dialog.tsx`
- Create: `components/farm/text-post-tab.tsx`
- Create: `components/farm/photo-post-tab.tsx`
- Create: `components/farm/ai-insight-tab.tsx`

**Step 1: Install Tabs component if needed**

```bash
npx shadcn@latest add tabs
```

**Step 2: Create main dialog with tabs**

Create `components/farm/create-post-dialog.tsx`:

```typescript
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TextPostTab } from './text-post-tab';
import { PhotoPostTab } from './photo-post-tab';
import { AIInsightTab } from './ai-insight-tab';
import { FileTextIcon, ImageIcon, SparklesIcon } from 'lucide-react';

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmId: string;
  onPostCreated: () => void;
}

export function CreatePostDialog({
  open,
  onOpenChange,
  farmId,
  onPostCreated,
}: CreatePostDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text">
              <FileTextIcon className="w-4 h-4 mr-2" />
              Text
            </TabsTrigger>
            <TabsTrigger value="photo">
              <ImageIcon className="w-4 h-4 mr-2" />
              Photo
            </TabsTrigger>
            <TabsTrigger value="ai">
              <SparklesIcon className="w-4 h-4 mr-2" />
              AI Insight
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text">
            <TextPostTab farmId={farmId} onPostCreated={onPostCreated} />
          </TabsContent>

          <TabsContent value="photo">
            <PhotoPostTab farmId={farmId} onPostCreated={onPostCreated} />
          </TabsContent>

          <TabsContent value="ai">
            <AIInsightTab farmId={farmId} onPostCreated={onPostCreated} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 3: Commit**

```bash
git add components/farm/create-post-dialog.tsx
git commit -m "feat: add create post dialog with tabs"
```

---

## Task 4: Implement Text Post Tab

**Files:**
- Create: `components/farm/text-post-tab.tsx`

**Step 1: Create text post tab**

Create `components/farm/text-post-tab.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface TextPostTabProps {
  farmId: string;
  onPostCreated: () => void;
}

export function TextPostTab({ farmId, onPostCreated }: TextPostTabProps) {
  const [content, setContent] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/farms/${farmId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text',
          content: content.trim(),
          hashtags: hashtags
            .split(',')
            .map((h) => h.trim().replace(/^#/, ''))
            .filter(Boolean),
        }),
      });

      if (!res.ok) throw new Error('Failed to create post');

      setContent('');
      setHashtags('');
      onPostCreated();
    } catch (error) {
      console.error('Failed to create post:', error);
      alert('Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>What's happening on your farm?</Label>
        <Textarea
          placeholder="Share an update, observation, or story..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label>Hashtags (optional)</Label>
        <Input
          placeholder="permaculture, gardening, composting"
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated tags (# symbols are optional)
        </p>
      </div>

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={!content.trim() || submitting}
      >
        {submitting ? 'Publishing...' : 'Publish Post'}
      </Button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/farm/text-post-tab.tsx
git commit -m "feat: add text post creation tab"
```

---

## Task 5: Implement Photo Post Tab

**Files:**
- Create: `components/farm/photo-post-tab.tsx`

**Step 1: Create photo post tab with upload**

Create `components/farm/photo-post-tab.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ImageIcon, Loader2 } from 'lucide-react';

interface PhotoPostTabProps {
  farmId: string;
  onPostCreated: () => void;
}

export function PhotoPostTab({ farmId, onPostCreated }: PhotoPostTabProps) {
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!imageFile || uploading) return;

    setUploading(true);
    try {
      // Step 1: Upload photo to R2
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);

      const imageData = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
      });

      const uploadRes = await fetch('/api/upload/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId,
          imageData,
        }),
      });

      if (!uploadRes.ok) throw new Error('Failed to upload photo');

      const { url } = await uploadRes.json();

      // Step 2: Create post with photo URL
      const postRes = await fetch(`/api/farms/${farmId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'photo',
          content: caption.trim() || null,
          media_urls: [url],
          hashtags: hashtags
            .split(',')
            .map((h) => h.trim().replace(/^#/, ''))
            .filter(Boolean),
        }),
      });

      if (!postRes.ok) throw new Error('Failed to create post');

      // Reset form
      setCaption('');
      setHashtags('');
      setImageFile(null);
      setPreviewUrl(null);
      onPostCreated();
    } catch (error) {
      console.error('Failed to create photo post:', error);
      alert('Failed to create photo post');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 pt-4">
      {/* Photo upload */}
      <div className="space-y-2">
        <Label>Photo</Label>
        {!previewUrl ? (
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent">
            <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Click to upload photo
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        ) : (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-64 object-cover rounded-lg"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => {
                setImageFile(null);
                setPreviewUrl(null);
              }}
            >
              Remove
            </Button>
          </div>
        )}
      </div>

      {/* Caption */}
      <div className="space-y-2">
        <Label>Caption (optional)</Label>
        <Textarea
          placeholder="Describe your photo..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Hashtags */}
      <div className="space-y-2">
        <Label>Hashtags (optional)</Label>
        <Input
          placeholder="permaculture, gardening"
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
        />
      </div>

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={!imageFile || uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          'Publish Photo'
        )}
      </Button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/farm/photo-post-tab.tsx
git commit -m "feat: add photo post creation with upload"
```

---

## Task 6: Implement AI Insight Tab

**Files:**
- Create: `components/farm/ai-insight-tab.tsx`
- Create: `app/api/farms/[id]/conversations/route.ts` (GET conversations list)

**Step 1: Create API to list farm conversations**

Create `app/api/farms/[id]/conversations/route.ts`:

```typescript
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const farmId = params.id;

    // Get conversations for this farm
    const result = await db.execute({
      sql: `SELECT id, created_at
            FROM ai_conversations
            WHERE farm_id = ?
            ORDER BY created_at DESC
            LIMIT 50`,
      args: [farmId],
    });

    // Get first message from each conversation for preview
    const conversations = await Promise.all(
      result.rows.map(async (conv: any) => {
        const messagesResult = await db.execute({
          sql: `SELECT content FROM conversation_messages
                WHERE conversation_id = ?
                ORDER BY created_at ASC
                LIMIT 1`,
          args: [conv.id],
        });

        const firstMessage = messagesResult.rows[0] as any;

        return {
          id: conv.id,
          created_at: conv.created_at,
          preview: firstMessage?.content?.substring(0, 100) || 'No messages',
        };
      })
    );

    return Response.json({ conversations });
  } catch (error) {
    console.error("Get conversations error:", error);
    return Response.json(
      { error: "Failed to get conversations" },
      { status: 500 }
    );
  }
}
```

**Step 2: Create AI insight tab**

Create `components/farm/ai-insight-tab.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface AIInsightTabProps {
  farmId: string;
  onPostCreated: () => void;
}

interface Conversation {
  id: string;
  created_at: number;
  preview: string;
}

export function AIInsightTab({ farmId, onPostCreated }: AIInsightTabProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [commentary, setCommentary] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadConversations();
  }, [farmId]);

  const loadConversations = async () => {
    try {
      const res = await fetch(`/api/farms/${farmId}/conversations`);
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedConversationId || !commentary.trim() || submitting) return;

    setSubmitting(true);
    try {
      // Get the conversation details
      const conversationRes = await fetch(`/api/conversations/${selectedConversationId}`);
      const conversationData = await conversationRes.json();

      // Get last AI message as excerpt
      const aiMessages = conversationData.messages.filter((m: any) => m.role === 'assistant');
      const lastAiMessage = aiMessages[aiMessages.length - 1];
      const excerpt = lastAiMessage?.content?.substring(0, 300) || '';

      // Create post
      const postRes = await fetch(`/api/farms/${farmId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ai_insight',
          content: commentary.trim(),
          ai_conversation_id: selectedConversationId,
          ai_response_excerpt: excerpt,
        }),
      });

      if (!postRes.ok) throw new Error('Failed to create post');

      setCommentary('');
      setSelectedConversationId('');
      onPostCreated();
    } catch (error) {
      console.error('Failed to create AI insight post:', error);
      alert('Failed to create AI insight post');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No AI conversations yet. Start chatting with the AI to get insights!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Select Conversation</Label>
        <Select value={selectedConversationId} onValueChange={setSelectedConversationId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a conversation..." />
          </SelectTrigger>
          <SelectContent>
            {conversations.map((conv) => (
              <SelectItem key={conv.id} value={conv.id}>
                {new Date(conv.created_at * 1000).toLocaleDateString()} - {conv.preview}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Your Commentary</Label>
        <Textarea
          placeholder="Share what you learned or how you're applying this insight..."
          value={commentary}
          onChange={(e) => setCommentary(e.target.value)}
          rows={6}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Explain the context and why this AI insight is valuable
        </p>
      </div>

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={!selectedConversationId || !commentary.trim() || submitting}
      >
        {submitting ? 'Publishing...' : 'Share AI Insight'}
      </Button>
    </div>
  );
}
```

**Step 3: Install Select component if needed**

```bash
npx shadcn@latest add select
```

**Step 4: Commit**

```bash
git add components/farm/ai-insight-tab.tsx app/api/farms/[id]/conversations/route.ts
git commit -m "feat: add AI insight sharing with conversation picker"
```

---

## Task 7: Transform Gallery to Global Feed

**Files:**
- Modify: `app/(app)/gallery/page.tsx`
- Create: `app/api/feed/global/route.ts`

**Step 1: Create global feed API**

Create `app/api/feed/global/route.ts`:

```typescript
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

/**
 * Global Feed API
 *
 * Returns posts from ALL public farms, ordered by recency.
 * Includes farm name/description for context.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const args: any[] = [session.user.id];
    let sql = `
      SELECT p.*,
             u.name as author_name,
             u.image as author_image,
             f.name as farm_name,
             f.description as farm_description,
             (SELECT reaction_type FROM post_reactions
              WHERE post_id = p.id AND user_id = ?) as user_reaction
      FROM farm_posts p
      JOIN users u ON p.author_id = u.id
      JOIN farms f ON p.farm_id = f.id
      WHERE f.is_public = 1 AND p.is_published = 1
    `;

    // Cursor pagination
    if (cursor) {
      const cursorResult = await db.execute({
        sql: "SELECT created_at FROM farm_posts WHERE id = ?",
        args: [cursor],
      });
      if (cursorResult.rows.length > 0) {
        sql += ` AND p.created_at < ?`;
        args.push((cursorResult.rows[0] as any).created_at);
      }
    }

    sql += ` ORDER BY p.created_at DESC LIMIT ?`;
    args.push(limit + 1);

    const postsResult = await db.execute({ sql, args });
    const hasMore = postsResult.rows.length > limit;
    const posts = postsResult.rows.slice(0, limit);

    const formattedPosts = posts.map((post: any) => ({
      id: post.id,
      farm_id: post.farm_id,
      farm_name: post.farm_name,
      farm_description: post.farm_description,
      type: post.post_type,
      content: post.content,
      media_urls: post.media_urls ? JSON.parse(post.media_urls) : null,
      tagged_zones: post.tagged_zones ? JSON.parse(post.tagged_zones) : null,
      hashtags: post.hashtags ? JSON.parse(post.hashtags) : null,
      author: {
        id: post.author_id,
        name: post.author_name,
        image: post.author_image,
      },
      reaction_count: post.reaction_count,
      comment_count: post.comment_count,
      view_count: post.view_count,
      created_at: post.created_at,
      user_reaction: post.user_reaction,
    }));

    return Response.json({
      posts: formattedPosts,
      next_cursor: hasMore ? formattedPosts[formattedPosts.length - 1].id : null,
      has_more: hasMore,
    });
  } catch (error) {
    console.error("Global feed error:", error);
    return Response.json(
      { error: "Failed to load global feed" },
      { status: 500 }
    );
  }
}
```

**Step 2: Redesign gallery page to use global feed**

Modify `app/(app)/gallery/page.tsx`:

```typescript
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { GlobalFeedClient } from "@/components/feed/global-feed-client";

export default async function GalleryPage() {
  const session = await requireAuth();

  // Fetch initial global feed
  const feedResult = await db.execute({
    sql: `SELECT p.*,
                 u.name as author_name,
                 u.image as author_image,
                 f.name as farm_name,
                 f.description as farm_description,
                 (SELECT reaction_type FROM post_reactions
                  WHERE post_id = p.id AND user_id = ?) as user_reaction
          FROM farm_posts p
          JOIN users u ON p.author_id = u.id
          JOIN farms f ON p.farm_id = f.id
          WHERE f.is_public = 1 AND p.is_published = 1
          ORDER BY p.created_at DESC
          LIMIT 21`,
    args: [session.user.id],
  });

  const posts = feedResult.rows.map((post: any) => ({
    id: post.id,
    farm_id: post.farm_id,
    farm_name: post.farm_name,
    farm_description: post.farm_description,
    type: post.post_type,
    content: post.content,
    media_urls: post.media_urls ? JSON.parse(post.media_urls) : null,
    tagged_zones: post.tagged_zones ? JSON.parse(post.tagged_zones) : null,
    hashtags: post.hashtags ? JSON.parse(post.hashtags) : null,
    author: {
      id: post.author_id,
      name: post.author_name,
      image: post.author_image,
    },
    reaction_count: post.reaction_count,
    comment_count: post.comment_count,
    view_count: post.view_count,
    created_at: post.created_at,
    user_reaction: post.user_reaction,
  }));

  const initialFeedData = {
    posts: posts.slice(0, 20),
    next_cursor: posts.length === 21 ? posts[19].id : null,
    has_more: posts.length === 21,
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Community Gallery</h1>
          <p className="text-muted-foreground mt-2">
            Discover farms and permaculture designs from the community
          </p>
        </div>

        <GlobalFeedClient initialData={initialFeedData} />
      </div>
    </div>
  );
}
```

**Step 3: Create global feed client component**

Create `components/feed/global-feed-client.tsx`:

```typescript
'use client';

import { useState, useCallback } from 'react';
import { PostCard } from './post-card';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Post {
  id: string;
  farm_id: string;
  farm_name: string;
  farm_description: string | null;
  type: 'text' | 'photo' | 'ai_insight';
  content: string | null;
  media_urls: string[] | null;
  tagged_zones: string[] | null;
  hashtags: string[] | null;
  author: {
    id: string;
    name: string;
    image: string | null;
  };
  reaction_count: number;
  comment_count: number;
  view_count: number;
  created_at: number;
  user_reaction: string | null;
}

interface FeedData {
  posts: Post[];
  next_cursor: string | null;
  has_more: boolean;
}

interface GlobalFeedClientProps {
  initialData: FeedData;
}

export function GlobalFeedClient({ initialData }: GlobalFeedClientProps) {
  const [posts, setPosts] = useState<Post[]>(initialData.posts);
  const [cursor, setCursor] = useState<string | null>(initialData.next_cursor);
  const [hasMore, setHasMore] = useState(initialData.has_more);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/feed/global?cursor=${cursor}&limit=20`);
      const data: FeedData = await res.json();

      setPosts((prev) => [...prev, ...data.posts]);
      setCursor(data.next_cursor);
      setHasMore(data.has_more);
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, hasMore]);

  const { ref } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    loading,
  });

  const handlePostUpdate = useCallback((updatedPost: Post) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
    );
  }, []);

  return (
    <div className="space-y-4">
      {posts.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">No posts yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Be the first to share your farm!
          </p>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <div key={post.id} className="space-y-2">
              {/* Farm context header */}
              <Link href={`/farm/${post.farm_id}`}>
                <Button variant="ghost" className="w-full justify-start">
                  <div className="text-left">
                    <p className="font-semibold">{post.farm_name}</p>
                    {post.farm_description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {post.farm_description}
                      </p>
                    )}
                  </div>
                </Button>
              </Link>

              {/* Post card */}
              <PostCard post={post} onUpdate={handlePostUpdate} />
            </div>
          ))}

          {/* Infinite scroll trigger */}
          <div ref={ref} className="h-20 flex items-center justify-center">
            {loading && (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            )}
            {!hasMore && posts.length > 0 && (
              <p className="text-sm text-muted-foreground">No more posts</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add app/api/feed/global/route.ts app/(app)/gallery/page.tsx components/feed/global-feed-client.tsx
git commit -m "feat: transform gallery into global community feed"
```

---

## Task 8: Add Refresh on Post Creation

**Files:**
- Modify: `app/(app)/farm/[id]/page.tsx`
- Modify: `app/(app)/farm/[id]/farm-editor-client.tsx`

**Step 1: Make farm page support refresh key**

Modify `app/(app)/farm/[id]/page.tsx` to accept searchParams:

```typescript
interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ refresh?: string }>;
}

export default async function FarmPage({ params, searchParams }: PageProps) {
  const session = await requireAuth();
  const { id } = await params;
  const { refresh } = await searchParams;

  // ... rest of existing code stays the same
}
```

**Step 2: Update farm editor to refresh page on post creation**

Modify `app/(app)/farm/[id]/farm-editor-client.tsx`:

```typescript
import { useRouter } from 'next/navigation';

// In component:
const router = useRouter();

// Update FAB callback:
{isOwner && (
  <CreatePostFAB
    farmId={farm.id}
    onPostCreated={() => {
      router.refresh(); // Refresh server component data
    }}
  />
)}
```

**Step 3: Commit**

```bash
git add app/(app)/farm/[id]/page.tsx app/(app)/farm/[id]/farm-editor-client.tsx
git commit -m "feat: refresh feed after post creation"
```

---

## Task 9: Final Build Verification

**Step 1: Run full build**

```bash
npm run build
```

Expected: `✓ Compiled successfully`

**Step 2: Verify all API routes**

```bash
npm run build 2>&1 | grep "ƒ /api" | sort
```

Should show:
- `/api/feed/global`
- `/api/farms/[id]/conversations`
- All existing routes

**Step 3: Manual test checklist**

Start dev server and test:

```bash
npm run dev
```

- [ ] Visit farm page → see FAB (+) button bottom right
- [ ] Click FAB → see modal with 3 tabs
- [ ] **Text tab**: Write post → publish → see in feed below
- [ ] **Photo tab**: Upload image → add caption → publish → see in feed
- [ ] **AI Insight tab**: Select conversation → write commentary → publish
- [ ] Click farm settings → toggle public → save
- [ ] Visit /gallery → see posts from all public farms
- [ ] In gallery: Click farm name → navigate to that farm
- [ ] In gallery: React to post → count updates
- [ ] In gallery: Comment on post → shows in thread

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(phase3): complete content creation and global discovery

Content Creation:
- Floating Action Button (FAB) for post creation
- Create post dialog with 3 tabs: Text/Photo/AI Insight
- Photo upload with caption and preview
- AI insight sharing from conversation history
- Farm public/private toggle in settings

Discovery:
- Gallery transformed to global community feed
- Shows posts from all public farms with context
- Click farm name to visit farm page
- Full interaction (react, comment, share)

Manual testing:
- ✓ Text post creation
- ✓ Photo upload and post
- ✓ AI insight sharing
- ✓ Farm visibility toggle
- ✓ Global feed display
- ✓ Gallery navigation

All features working as expected."
```

---

## Verification Commands

```bash
# TypeScript check
npm run build

# File structure verification
ls -la components/farm/
ls -la app/api/feed/

# Database schema check (optional)
turso db shell permaculture-studio
SELECT is_public, COUNT(*) FROM farms GROUP BY is_public;
SELECT post_type, COUNT(*) FROM farm_posts GROUP BY post_type;
```

---

## Next Steps (Phase 4 Ideas)

After Phase 3 is complete:

1. **Notifications** - Bell icon with unread count
2. **Search & Filters** - Search posts by hashtag, filter by type
3. **User Profiles** - `/user/[id]` page showing their farms and posts
4. **Farm Analytics** - View counts, engagement metrics
5. **Moderation** - Flag/report system for community content

Choose based on user feedback and priorities.
