# Track 3: Collaboration & Presentation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Comments system for collaborative feedback, Phasing for timeline planning, and Export functionality for professional deliverables.

**Architecture:** Extend farms with `farm_collaborators` for permissions, create `comments` table with threaded replies, `phases` table for implementation timelines, and export utilities for PDF/PNG snapshots with customizable styles.

**Tech Stack:** Tiptap (rich text comments), PDFKit (PDF generation), MapLibre GL JS (snapshot capture), Sharp (image processing), Turso (database)

---

## Prerequisites

- Track 1 completed (design layers for phase assignment)
- Track 2 completed (lines, water features for phasing)
- MapLibre map instance available
- Existing zone/planting/line data models

---

## Part 1: Comments System

### Task 1: Database Schema - Comments

**Files:**
- Create: `lib/db/migrations/032_comments.sql`
- Modify: `lib/db/schema.ts`

**Step 1: Create migration file**

Create `lib/db/migrations/032_comments.sql`:

```sql
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  feature_id TEXT,
  feature_type TEXT CHECK(feature_type IN ('zone', 'planting', 'line', 'general')),
  content TEXT NOT NULL,
  parent_comment_id TEXT,
  resolved INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_farm ON comments(farm_id);
CREATE INDEX IF NOT EXISTS idx_comments_feature ON comments(feature_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_resolved ON comments(resolved);

-- feature_id can be null for general farm comments
-- parent_comment_id enables threaded replies
```

**Step 2: Run migration**

Run: `turso db shell permaculture-studio < lib/db/migrations/032_comments.sql`

**Step 3: Add TypeScript types**

Add to `lib/db/schema.ts`:

```typescript
export interface Comment {
  id: string;
  farm_id: string;
  user_id: string;
  feature_id: string | null;
  feature_type: 'zone' | 'planting' | 'line' | 'general';
  content: string; // HTML from Tiptap
  parent_comment_id: string | null;
  resolved: number; // SQLite boolean
  created_at: number;
  updated_at: number;
}
```

**Step 4: Commit**

```bash
git add lib/db/migrations/032_comments.sql lib/db/schema.ts
git commit -m "feat(comments): add comments table schema

- Threaded comments with parent_comment_id
- Feature-specific or general farm comments
- Resolved flag for feedback tracking
- Tiptap HTML content storage

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Database Schema - Farm Collaborators

**Files:**
- Create: `lib/db/migrations/033_farm_collaborators.sql`
- Modify: `lib/db/schema.ts`

**Step 1: Create migration file**

Create `lib/db/migrations/033_farm_collaborators.sql`:

```sql
CREATE TABLE IF NOT EXISTS farm_collaborators (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('owner', 'editor', 'commenter', 'viewer')),
  invited_by TEXT NOT NULL,
  invited_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (invited_by) REFERENCES users(id),
  UNIQUE(farm_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collaborators_farm ON farm_collaborators(farm_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user ON farm_collaborators(user_id);

-- Roles:
-- owner: full control (delete farm, manage collaborators)
-- editor: edit zones, plantings, lines
-- commenter: view + add comments
-- viewer: read-only access
```

**Step 2: Run migration**

Run: `turso db shell permaculture-studio < lib/db/migrations/033_farm_collaborators.sql`

**Step 3: Add TypeScript types**

Add to `lib/db/schema.ts`:

```typescript
export interface FarmCollaborator {
  id: string;
  farm_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'commenter' | 'viewer';
  invited_by: string;
  invited_at: number;
}
```

**Step 4: Commit**

```bash
git add lib/db/migrations/033_farm_collaborators.sql lib/db/schema.ts
git commit -m "feat(collaboration): add farm collaborators schema

- Role-based permissions (owner, editor, commenter, viewer)
- Invitation tracking
- Unique constraint per user per farm

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3: API Route - Comments CRUD

**Files:**
- Create: `app/api/farms/[id]/comments/route.ts`
- Create: `app/api/farms/[id]/comments/[commentId]/route.ts`

**Step 1: Create comments route**

Create `app/api/farms/[id]/comments/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const farmId = params.id;
  const body = await request.json();

  if (!body.content) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Check collaborator permissions (must be commenter or above)
  const collaborator = await db.execute({
    sql: `SELECT role FROM farm_collaborators
          WHERE farm_id = ? AND user_id = ?`,
    args: [farmId, session.user.id]
  });

  if (collaborator.rows.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Create comment
  const commentId = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO comments
          (id, farm_id, user_id, feature_id, feature_type, content, parent_comment_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      commentId,
      farmId,
      session.user.id,
      body.feature_id || null,
      body.feature_type || 'general',
      body.content,
      body.parent_comment_id || null
    ]
  });

  const result = await db.execute({
    sql: 'SELECT * FROM comments WHERE id = ?',
    args: [commentId]
  });

  return NextResponse.json(result.rows[0], { status: 201 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const farmId = params.id;
  const { searchParams } = new URL(request.url);
  const featureId = searchParams.get('feature_id');
  const includeResolved = searchParams.get('include_resolved') === 'true';

  let sql = `SELECT c.*, u.name as user_name, u.email as user_email
             FROM comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.farm_id = ?`;
  const args: any[] = [farmId];

  if (featureId) {
    sql += ' AND c.feature_id = ?';
    args.push(featureId);
  }

  if (!includeResolved) {
    sql += ' AND c.resolved = 0';
  }

  sql += ' ORDER BY c.created_at ASC';

  const result = await db.execute({ sql, args });

  return NextResponse.json({ comments: result.rows });
}
```

**Step 2: Create comment update/delete route**

Create `app/api/farms/[id]/comments/[commentId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { commentId } = params;
  const body = await request.json();

  const updates: string[] = [];
  const args: any[] = [];

  if (body.content !== undefined) {
    updates.push('content = ?');
    args.push(body.content);
  }

  if (body.resolved !== undefined) {
    updates.push('resolved = ?');
    args.push(body.resolved ? 1 : 0);
  }

  updates.push('updated_at = unixepoch()');

  if (updates.length === 1) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  args.push(commentId);

  await db.execute({
    sql: `UPDATE comments SET ${updates.join(', ')} WHERE id = ?`,
    args
  });

  const result = await db.execute({
    sql: 'SELECT * FROM comments WHERE id = ?',
    args: [commentId]
  });

  return NextResponse.json(result.rows[0]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { commentId } = params;

  // Check ownership
  const comment = await db.execute({
    sql: 'SELECT user_id FROM comments WHERE id = ?',
    args: [commentId]
  });

  if (comment.rows.length === 0) {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  }

  if (comment.rows[0].user_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.execute({
    sql: 'DELETE FROM comments WHERE id = ?',
    args: [commentId]
  });

  return NextResponse.json({ success: true });
}
```

**Step 3: Commit**

```bash
git add app/api/farms/\[id\]/comments/route.ts app/api/farms/\[id\]/comments/\[commentId\]/route.ts
git commit -m "feat(comments): add comment CRUD API routes

- POST /api/farms/[id]/comments (create with permission check)
- GET /api/farms/[id]/comments (list with user info)
- PATCH /api/farms/[id]/comments/[commentId] (update)
- DELETE /api/farms/[id]/comments/[commentId] (delete with ownership check)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Rich Text Comment Editor Component

**Files:**
- Create: `components/comments/comment-editor.tsx`
- Install: `npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder`

**Step 1: Create comment editor**

Create `components/comments/comment-editor.tsx`:

```typescript
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered } from 'lucide-react';

interface CommentEditorProps {
  placeholder?: string;
  onSubmit: (html: string) => void;
  onCancel?: () => void;
  initialContent?: string;
}

export function CommentEditor({
  placeholder = 'Add a comment...',
  onSubmit,
  onCancel,
  initialContent = ''
}: CommentEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder })
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[80px] p-3'
      }
    }
  });

  function handleSubmit() {
    if (!editor) return;

    const html = editor.getHTML();
    if (html === '<p></p>') return; // Empty

    onSubmit(html);
    editor.commands.clearContent();
  }

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-md">
      <div className="flex items-center gap-1 border-b p-2 bg-muted/50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-muted' : ''}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-muted' : ''}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-muted' : ''}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-muted' : ''}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      <EditorContent editor={editor} />

      <div className="flex gap-2 p-2 border-t">
        <Button onClick={handleSubmit} size="sm">
          Comment
        </Button>
        {onCancel && (
          <Button onClick={onCancel} variant="outline" size="sm">
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Install Tiptap**

Run: `npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder`

**Step 3: Commit**

```bash
git add components/comments/comment-editor.tsx package.json
git commit -m "feat(comments): add rich text comment editor

- Tiptap editor integration
- Bold, italic, list formatting
- Toolbar with formatting buttons
- Submit and cancel actions

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Comment Thread Component

**Files:**
- Create: `components/comments/comment-thread.tsx`
- Create: `components/comments/comment-item.tsx`

**Step 1: Create comment item**

Create `components/comments/comment-item.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CommentEditor } from './comment-editor';
import { MessageSquare, Check, Trash2, Reply } from 'lucide-react';

interface CommentItemProps {
  comment: any;
  currentUserId: string;
  onReply: (parentId: string, content: string) => void;
  onResolve: (commentId: string) => void;
  onDelete: (commentId: string) => void;
}

export function CommentItem({
  comment,
  currentUserId,
  onReply,
  onResolve,
  onDelete
}: CommentItemProps) {
  const [showReplyEditor, setShowReplyEditor] = useState(false);

  const isOwner = comment.user_id === currentUserId;
  const createdAt = new Date(comment.created_at * 1000);

  function handleReply(html: string) {
    onReply(comment.id, html);
    setShowReplyEditor(false);
  }

  return (
    <div className="border-l-2 border-muted pl-4 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{comment.user_name || comment.user_email}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </span>
            {comment.resolved === 1 && (
              <Badge variant="secondary" className="text-xs">
                <Check className="h-3 w-3 mr-1" />
                Resolved
              </Badge>
            )}
          </div>

          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: comment.content }}
          />
        </div>

        <div className="flex gap-1">
          {!comment.resolved && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onResolve(comment.id)}
              title="Mark as resolved"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}

          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(comment.id)}
              title="Delete comment"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      <div className="mt-2">
        {!showReplyEditor ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplyEditor(true)}
          >
            <Reply className="h-4 w-4 mr-1" />
            Reply
          </Button>
        ) : (
          <CommentEditor
            placeholder="Write a reply..."
            onSubmit={handleReply}
            onCancel={() => setShowReplyEditor(false)}
          />
        )}
      </div>
    </div>
  );
}
```

**Step 2: Create comment thread**

Create `components/comments/comment-thread.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CommentEditor } from './comment-editor';
import { CommentItem } from './comment-item';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare } from 'lucide-react';

interface CommentThreadProps {
  farmId: string;
  currentUserId: string;
  featureId?: string | null;
  featureType?: 'zone' | 'planting' | 'line' | 'general';
}

export function CommentThread({
  farmId,
  currentUserId,
  featureId = null,
  featureType = 'general'
}: CommentThreadProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadComments();
  }, [farmId, featureId]);

  async function loadComments() {
    try {
      const params = new URLSearchParams();
      if (featureId) {
        params.append('feature_id', featureId);
      }

      const response = await fetch(`/api/farms/${farmId}/comments?${params}`);
      const data = await response.json();

      // Build comment tree
      const commentTree = buildCommentTree(data.comments);
      setComments(commentTree);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  }

  function buildCommentTree(flatComments: any[]): any[] {
    const map = new Map();
    const roots: any[] = [];

    flatComments.forEach(comment => {
      map.set(comment.id, { ...comment, replies: [] });
    });

    flatComments.forEach(comment => {
      if (comment.parent_comment_id) {
        const parent = map.get(comment.parent_comment_id);
        if (parent) {
          parent.replies.push(map.get(comment.id));
        }
      } else {
        roots.push(map.get(comment.id));
      }
    });

    return roots;
  }

  async function handleAddComment(html: string) {
    try {
      const response = await fetch(`/api/farms/${farmId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: html,
          feature_id: featureId,
          feature_type: featureType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      toast({ title: 'Comment added' });
      loadComments();
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast({ title: 'Failed to add comment', variant: 'destructive' });
    }
  }

  async function handleReply(parentId: string, html: string) {
    try {
      const response = await fetch(`/api/farms/${farmId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: html,
          feature_id: featureId,
          feature_type: featureType,
          parent_comment_id: parentId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add reply');
      }

      toast({ title: 'Reply added' });
      loadComments();
    } catch (error) {
      console.error('Failed to add reply:', error);
      toast({ title: 'Failed to add reply', variant: 'destructive' });
    }
  }

  async function handleResolve(commentId: string) {
    try {
      await fetch(`/api/farms/${farmId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true })
      });

      toast({ title: 'Comment resolved' });
      loadComments();
    } catch (error) {
      console.error('Failed to resolve comment:', error);
      toast({ title: 'Failed to resolve comment', variant: 'destructive' });
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm('Delete this comment?')) return;

    try {
      await fetch(`/api/farms/${farmId}/comments/${commentId}`, {
        method: 'DELETE'
      });

      toast({ title: 'Comment deleted' });
      loadComments();
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast({ title: 'Failed to delete comment', variant: 'destructive' });
    }
  }

  function renderCommentTree(comment: any, depth: number = 0) {
    return (
      <div key={comment.id} className={depth > 0 ? 'ml-6 mt-2' : ''}>
        <CommentItem
          comment={comment}
          currentUserId={currentUserId}
          onReply={handleReply}
          onResolve={handleResolve}
          onDelete={handleDelete}
        />
        {comment.replies?.map((reply: any) => renderCommentTree(reply, depth + 1))}
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading comments...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments
        </CardTitle>
        <CardDescription>
          {featureId ? 'Feature-specific discussion' : 'General farm discussion'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CommentEditor onSubmit={handleAddComment} />

        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No comments yet. Start the conversation!
            </div>
          ) : (
            comments.map(comment => renderCommentTree(comment))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 3: Install date-fns**

Run: `npm install date-fns`

**Step 4: Commit**

```bash
git add components/comments/comment-thread.tsx components/comments/comment-item.tsx package.json
git commit -m "feat(comments): add comment thread components

- Nested comment tree rendering
- Reply to comments
- Resolve/delete actions
- Real-time timestamp display

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Part 2: Phasing System

### Task 6: Database Schema - Phases

**Files:**
- Create: `lib/db/migrations/034_phases.sql`
- Modify: `lib/db/schema.ts`

**Step 1: Create migration file**

Create `lib/db/migrations/034_phases.sql`:

```sql
CREATE TABLE IF NOT EXISTS phases (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date INTEGER,
  end_date INTEGER,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_phases_farm ON phases(farm_id);
CREATE INDEX IF NOT EXISTS idx_phases_order ON phases(display_order);

-- Add phase_id to zones, plantings, and lines
ALTER TABLE zones ADD COLUMN phase_id TEXT;
ALTER TABLE plantings ADD COLUMN phase_id TEXT;
ALTER TABLE lines ADD COLUMN phase_id TEXT;

-- Example phases:
-- "Year 1: Infrastructure" (paths, ponds, fences)
-- "Year 2: Windbreaks & Guilds" (perimeter trees, first guilds)
-- "Year 3: Annual Production" (gardens, annual crops)
```

**Step 2: Run migration**

Run: `turso db shell permaculture-studio < lib/db/migrations/034_phases.sql`

**Step 3: Add TypeScript types**

Add to `lib/db/schema.ts`:

```typescript
export interface Phase {
  id: string;
  farm_id: string;
  name: string;
  description: string | null;
  start_date: number | null; // Unix timestamp
  end_date: number | null;
  color: string; // Hex color
  display_order: number;
  created_at: number;
  updated_at: number;
}
```

**Step 4: Commit**

```bash
git add lib/db/migrations/034_phases.sql lib/db/schema.ts
git commit -m "feat(phasing): add phases table schema

- Phase metadata (name, dates, color, order)
- Add phase_id to zones, plantings, lines
- Support for implementation timeline planning

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 7: API Route - Phases CRUD

**Files:**
- Create: `app/api/farms/[id]/phases/route.ts`
- Create: `app/api/farms/[id]/phases/[phaseId]/route.ts`

**Step 1: Create phases route**

Create `app/api/farms/[id]/phases/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const farmId = params.id;
  const body = await request.json();

  if (!body.name) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Get next display order
  const maxOrder = await db.execute({
    sql: 'SELECT MAX(display_order) as max_order FROM phases WHERE farm_id = ?',
    args: [farmId]
  });

  const nextOrder = (maxOrder.rows[0]?.max_order || 0) + 1;

  const phaseId = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO phases
          (id, farm_id, name, description, start_date, end_date, color, display_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      phaseId,
      farmId,
      body.name,
      body.description || null,
      body.start_date || null,
      body.end_date || null,
      body.color || '#3b82f6',
      nextOrder
    ]
  });

  const result = await db.execute({
    sql: 'SELECT * FROM phases WHERE id = ?',
    args: [phaseId]
  });

  return NextResponse.json(result.rows[0], { status: 201 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const farmId = params.id;

  const result = await db.execute({
    sql: 'SELECT * FROM phases WHERE farm_id = ? ORDER BY display_order ASC',
    args: [farmId]
  });

  return NextResponse.json({ phases: result.rows });
}
```

**Step 2: Create phase update/delete route**

Create `app/api/farms/[id]/phases/[phaseId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; phaseId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { phaseId } = params;
  const body = await request.json();

  const updates: string[] = [];
  const args: any[] = [];

  if (body.name !== undefined) {
    updates.push('name = ?');
    args.push(body.name);
  }

  if (body.description !== undefined) {
    updates.push('description = ?');
    args.push(body.description);
  }

  if (body.start_date !== undefined) {
    updates.push('start_date = ?');
    args.push(body.start_date);
  }

  if (body.end_date !== undefined) {
    updates.push('end_date = ?');
    args.push(body.end_date);
  }

  if (body.color !== undefined) {
    updates.push('color = ?');
    args.push(body.color);
  }

  if (body.display_order !== undefined) {
    updates.push('display_order = ?');
    args.push(body.display_order);
  }

  updates.push('updated_at = unixepoch()');

  if (updates.length === 1) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  args.push(phaseId);

  await db.execute({
    sql: `UPDATE phases SET ${updates.join(', ')} WHERE id = ?`,
    args
  });

  const result = await db.execute({
    sql: 'SELECT * FROM phases WHERE id = ?',
    args: [phaseId]
  });

  return NextResponse.json(result.rows[0]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; phaseId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { phaseId } = params;

  // Unassign features from this phase
  await db.execute({
    sql: 'UPDATE zones SET phase_id = NULL WHERE phase_id = ?',
    args: [phaseId]
  });

  await db.execute({
    sql: 'UPDATE plantings SET phase_id = NULL WHERE phase_id = ?',
    args: [phaseId]
  });

  await db.execute({
    sql: 'UPDATE lines SET phase_id = NULL WHERE phase_id = ?',
    args: [phaseId]
  });

  await db.execute({
    sql: 'DELETE FROM phases WHERE id = ?',
    args: [phaseId]
  });

  return NextResponse.json({ success: true });
}
```

**Step 3: Commit**

```bash
git add app/api/farms/\[id\]/phases/route.ts app/api/farms/\[id\]/phases/\[phaseId\]/route.ts
git commit -m "feat(phasing): add phase CRUD API routes

- POST /api/farms/[id]/phases (create with auto-ordering)
- GET /api/farms/[id]/phases (list in display order)
- PATCH /api/farms/[id]/phases/[phaseId] (update)
- DELETE /api/farms/[id]/phases/[phaseId] (delete + unassign features)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 8: Phase Manager Component

**Files:**
- Create: `components/phasing/phase-manager.tsx`
- Create: `components/phasing/phase-form.tsx`

**Step 1: Create phase form**

Create `components/phasing/phase-form.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface PhaseFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function PhaseForm({ initialData, onSubmit, onCancel }: PhaseFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [startDate, setStartDate] = useState(
    initialData?.start_date
      ? new Date(initialData.start_date * 1000).toISOString().split('T')[0]
      : ''
  );
  const [endDate, setEndDate] = useState(
    initialData?.end_date
      ? new Date(initialData.end_date * 1000).toISOString().split('T')[0]
      : ''
  );
  const [color, setColor] = useState(initialData?.color || '#3b82f6');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    onSubmit({
      name,
      description: description || null,
      start_date: startDate ? Math.floor(new Date(startDate).getTime() / 1000) : null,
      end_date: endDate ? Math.floor(new Date(endDate).getTime() / 1000) : null,
      color
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="phase-name">Phase Name *</Label>
        <Input
          id="phase-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Year 1: Infrastructure"
          required
        />
      </div>

      <div>
        <Label htmlFor="phase-description">Description (optional)</Label>
        <Textarea
          id="phase-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what will be implemented in this phase..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start-date">Start Date (optional)</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="end-date">End Date (optional)</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="phase-color">Color</Label>
        <div className="flex gap-2 items-center">
          <Input
            id="phase-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-20 h-10"
          />
          <span className="text-sm text-muted-foreground">{color}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          {initialData ? 'Update Phase' : 'Create Phase'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
```

**Step 2: Create phase manager**

Create `components/phasing/phase-manager.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PhaseForm } from './phase-form';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { format } from 'date-fns';

interface PhaseManagerProps {
  farmId: string;
}

export function PhaseManager({ farmId }: PhaseManagerProps) {
  const [phases, setPhases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPhase, setEditingPhase] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPhases();
  }, [farmId]);

  async function loadPhases() {
    try {
      const response = await fetch(`/api/farms/${farmId}/phases`);
      const data = await response.json();
      setPhases(data.phases);
    } catch (error) {
      console.error('Failed to load phases:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOrUpdate(formData: any) {
    try {
      const url = editingPhase
        ? `/api/farms/${farmId}/phases/${editingPhase.id}`
        : `/api/farms/${farmId}/phases`;

      const method = editingPhase ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save phase');
      }

      toast({ title: editingPhase ? 'Phase updated' : 'Phase created' });
      setShowForm(false);
      setEditingPhase(null);
      loadPhases();
    } catch (error) {
      console.error('Failed to save phase:', error);
      toast({ title: 'Failed to save phase', variant: 'destructive' });
    }
  }

  async function handleDelete(phaseId: string) {
    if (!confirm('Delete this phase? Features will be unassigned.')) return;

    try {
      await fetch(`/api/farms/${farmId}/phases/${phaseId}`, {
        method: 'DELETE'
      });

      toast({ title: 'Phase deleted' });
      loadPhases();
    } catch (error) {
      console.error('Failed to delete phase:', error);
      toast({ title: 'Failed to delete phase', variant: 'destructive' });
    }
  }

  function handleEdit(phase: any) {
    setEditingPhase(phase);
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditingPhase(null);
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading phases...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Implementation Phases
        </CardTitle>
        <CardDescription>
          Organize design elements by implementation timeline
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showForm ? (
          <>
            <Button onClick={() => setShowForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Phase
            </Button>

            <div className="space-y-3">
              {phases.map(phase => (
                <div
                  key={phase.id}
                  className="border rounded-md p-3 flex items-start gap-3"
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-1 cursor-move" />

                  <div
                    className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                    style={{ backgroundColor: phase.color }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{phase.name}</div>
                    {phase.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {phase.description}
                      </div>
                    )}
                    {(phase.start_date || phase.end_date) && (
                      <div className="text-xs text-muted-foreground mt-2">
                        {phase.start_date && format(new Date(phase.start_date * 1000), 'MMM yyyy')}
                        {phase.start_date && phase.end_date && ' - '}
                        {phase.end_date && format(new Date(phase.end_date * 1000), 'MMM yyyy')}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(phase)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(phase.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              {phases.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No phases yet. Create phases to organize your implementation timeline.
                </div>
              )}
            </div>
          </>
        ) : (
          <PhaseForm
            initialData={editingPhase}
            onSubmit={handleCreateOrUpdate}
            onCancel={handleCancel}
          />
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 3: Commit**

```bash
git add components/phasing/phase-manager.tsx components/phasing/phase-form.tsx
git commit -m "feat(phasing): add phase manager components

- Create/edit/delete phases
- Drag handle for reordering (UI only)
- Color picker and date inputs
- Phase list with visual indicators

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Part 3: Export System

### Task 9: Map Snapshot Capture Utility

**Files:**
- Create: `lib/export/snapshot.ts`

**Step 1: Create snapshot utility**

Create `lib/export/snapshot.ts`:

```typescript
import maplibregl from 'maplibre-gl';

export interface SnapshotOptions {
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg';
  quality?: number; // 0-1 for JPEG
  includeUI?: boolean;
}

/**
 * Capture map snapshot as data URL
 */
export async function captureMapSnapshot(
  map: maplibregl.Map,
  options: SnapshotOptions = {}
): Promise<string> {
  const {
    width = 1920,
    height = 1080,
    format = 'png',
    quality = 0.95,
    includeUI = false
  } = options;

  // Wait for map to be idle
  await new Promise(resolve => {
    if (map.loaded()) {
      resolve(null);
    } else {
      map.once('idle', () => resolve(null));
    }
  });

  const canvas = map.getCanvas();

  if (includeUI) {
    // Capture entire map container with UI overlays
    // (More complex - requires html2canvas or similar)
    return canvas.toDataURL(`image/${format}`, quality);
  } else {
    // Capture just the map canvas
    return canvas.toDataURL(`image/${format}`, quality);
  }
}

/**
 * Download snapshot as file
 */
export function downloadSnapshot(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

/**
 * Convert data URL to Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}
```

**Step 2: Commit**

```bash
git add lib/export/snapshot.ts
git commit -m "feat(export): add map snapshot capture utility

- Capture map canvas as data URL
- PNG/JPEG format support
- Download snapshot helper
- Data URL to Blob conversion

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 10: PDF Export Utility

**Files:**
- Create: `lib/export/pdf-generator.ts`
- Install: `npm install pdfkit`

**Step 1: Create PDF generator**

Create `lib/export/pdf-generator.ts`:

```typescript
import PDFDocument from 'pdfkit';

export interface PDFExportOptions {
  farmName: string;
  mapImageDataUrl: string;
  includeZones?: boolean;
  includePlantings?: boolean;
  includePhases?: boolean;
  zones?: any[];
  plantings?: any[];
  phases?: any[];
}

/**
 * Generate PDF farm plan
 */
export async function generateFarmPlanPDF(
  options: PDFExportOptions
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const chunks: Uint8Array[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {
      const blob = new Blob(chunks, { type: 'application/pdf' });
      resolve(blob);
    });
    doc.on('error', reject);

    // Title page
    doc.fontSize(24).text(options.farmName, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Farm Plan - ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Map image
    if (options.mapImageDataUrl) {
      const imageData = Buffer.from(
        options.mapImageDataUrl.split(',')[1],
        'base64'
      );

      doc.image(imageData, {
        fit: [500, 400],
        align: 'center'
      });
    }

    doc.addPage();

    // Zones section
    if (options.includeZones && options.zones && options.zones.length > 0) {
      doc.fontSize(18).text('Zones', { underline: true });
      doc.moveDown();

      options.zones.forEach(zone => {
        doc.fontSize(14).text(zone.label || `Zone (${zone.zone_type})`);
        doc.fontSize(10).text(`Type: ${zone.zone_type}`);
        if (zone.description) {
          doc.fontSize(10).text(`Description: ${zone.description}`);
        }
        doc.moveDown();
      });

      doc.addPage();
    }

    // Plantings section
    if (options.includePlantings && options.plantings && options.plantings.length > 0) {
      doc.fontSize(18).text('Plantings', { underline: true });
      doc.moveDown();

      options.plantings.forEach(planting => {
        doc.fontSize(14).text(planting.label || 'Unnamed Planting');
        doc.fontSize(10).text(`Species: ${planting.species_name || 'Unknown'}`);
        doc.fontSize(10).text(`Layer: ${planting.layer}`);
        doc.moveDown();
      });

      doc.addPage();
    }

    // Phases section
    if (options.includePhases && options.phases && options.phases.length > 0) {
      doc.fontSize(18).text('Implementation Phases', { underline: true });
      doc.moveDown();

      options.phases.forEach(phase => {
        doc.fontSize(14).text(phase.name);
        if (phase.description) {
          doc.fontSize(10).text(phase.description);
        }
        if (phase.start_date || phase.end_date) {
          const startDate = phase.start_date
            ? new Date(phase.start_date * 1000).toLocaleDateString()
            : '?';
          const endDate = phase.end_date
            ? new Date(phase.end_date * 1000).toLocaleDateString()
            : '?';
          doc.fontSize(10).text(`Timeline: ${startDate} - ${endDate}`);
        }
        doc.moveDown();
      });
    }

    doc.end();
  });
}
```

**Step 2: Install PDFKit**

Run: `npm install pdfkit @types/pdfkit`

**Step 3: Commit**

```bash
git add lib/export/pdf-generator.ts package.json
git commit -m "feat(export): add PDF generation utility

- PDFKit-based farm plan export
- Include map image, zones, plantings, phases
- Formatted sections with headings
- Letter size with margins

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 11: Export Panel Component

**Files:**
- Create: `components/export/export-panel.tsx`

**Step 1: Create export panel**

Create `components/export/export-panel.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Download, FileImage, FileText } from 'lucide-react';
import { captureMapSnapshot, downloadSnapshot } from '@/lib/export/snapshot';
import { generateFarmPlanPDF } from '@/lib/export/pdf-generator';
import maplibregl from 'maplibre-gl';

interface ExportPanelProps {
  farmId: string;
  farmName: string;
  mapInstance: maplibregl.Map | null;
}

export function ExportPanel({ farmId, farmName, mapInstance }: ExportPanelProps) {
  const [includeZones, setIncludeZones] = useState(true);
  const [includePlantings, setIncludePlantings] = useState(true);
  const [includePhases, setIncludePhases] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  async function handleExportPNG() {
    if (!mapInstance) {
      toast({ title: 'Map not ready', variant: 'destructive' });
      return;
    }

    setExporting(true);

    try {
      const dataUrl = await captureMapSnapshot(mapInstance, {
        format: 'png',
        width: 1920,
        height: 1080
      });

      const filename = `${farmName.replace(/\s+/g, '-')}-${Date.now()}.png`;
      downloadSnapshot(dataUrl, filename);

      toast({ title: 'Map exported as PNG' });
    } catch (error) {
      console.error('Failed to export PNG:', error);
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPDF() {
    if (!mapInstance) {
      toast({ title: 'Map not ready', variant: 'destructive' });
      return;
    }

    setExporting(true);

    try {
      // Capture map
      const mapImageDataUrl = await captureMapSnapshot(mapInstance, {
        format: 'jpeg',
        quality: 0.9
      });

      // Load data
      const [zonesData, plantingsData, phasesData] = await Promise.all([
        includeZones ? fetch(`/api/farms/${farmId}/zones`).then(r => r.json()) : null,
        includePlantings ? fetch(`/api/farms/${farmId}/plantings`).then(r => r.json()) : null,
        includePhases ? fetch(`/api/farms/${farmId}/phases`).then(r => r.json()) : null
      ]);

      // Generate PDF
      const pdfBlob = await generateFarmPlanPDF({
        farmName,
        mapImageDataUrl,
        includeZones,
        includePlantings,
        includePhases,
        zones: zonesData?.zones || [],
        plantings: plantingsData?.plantings || [],
        phases: phasesData?.phases || []
      });

      // Download
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${farmName.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Farm plan exported as PDF' });
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Farm Plan
        </CardTitle>
        <CardDescription>
          Download professional farm plan documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 border-b pb-4">
          <Label>Include in PDF:</Label>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-zones"
              checked={includeZones}
              onCheckedChange={(checked) => setIncludeZones(checked as boolean)}
            />
            <Label htmlFor="include-zones" className="cursor-pointer">
              Zones list
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-plantings"
              checked={includePlantings}
              onCheckedChange={(checked) => setIncludePlantings(checked as boolean)}
            />
            <Label htmlFor="include-plantings" className="cursor-pointer">
              Plantings list
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-phases"
              checked={includePhases}
              onCheckedChange={(checked) => setIncludePhases(checked as boolean)}
            />
            <Label htmlFor="include-phases" className="cursor-pointer">
              Implementation phases
            </Label>
          </div>
        </div>

        <Button
          onClick={handleExportPNG}
          disabled={exporting}
          className="w-full"
          variant="outline"
        >
          <FileImage className="h-4 w-4 mr-2" />
          Export Map as PNG
        </Button>

        <Button
          onClick={handleExportPDF}
          disabled={exporting}
          className="w-full"
        >
          <FileText className="h-4 w-4 mr-2" />
          {exporting ? 'Exporting...' : 'Export Farm Plan as PDF'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add components/export/export-panel.tsx
git commit -m "feat(export): add export panel component

- PNG map export
- PDF farm plan export with options
- Include/exclude zones, plantings, phases
- Download progress feedback

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Integration & Testing

### Task 12: Integrate Comments with Map Features

**Files:**
- Modify: `components/map/farm-map.tsx`

**Step 1: Add comment panel trigger on feature click**

Update `components/map/farm-map.tsx` to show comments:

```typescript
// Add state for selected feature
const [selectedFeature, setSelectedFeature] = useState<{
  id: string;
  type: 'zone' | 'planting' | 'line';
} | null>(null);

// Add click handler for features
map.current.on('click', (e) => {
  const features = map.current!.queryRenderedFeatures(e.point);

  if (features.length > 0) {
    const feature = features[0];

    if (feature.layer.id.startsWith('zones')) {
      setSelectedFeature({ id: feature.properties.id, type: 'zone' });
    } else if (feature.layer.id.startsWith('plantings')) {
      setSelectedFeature({ id: feature.properties.id, type: 'planting' });
    } else if (feature.layer.id.startsWith('design-lines')) {
      setSelectedFeature({ id: feature.properties.id, type: 'line' });
    }
  }
});

// Render comment thread in side panel or drawer
{selectedFeature && (
  <CommentThread
    farmId={farm.id}
    currentUserId={session.user.id}
    featureId={selectedFeature.id}
    featureType={selectedFeature.type}
  />
)}
```

**Step 2: Commit**

```bash
git add components/map/farm-map.tsx
git commit -m "feat(comments): integrate comments with map feature clicks

- Click zone/planting/line to view comments
- Display feature-specific comment thread
- Highlight selected feature

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 13: Manual Testing Checklist

**Files:**
- Create: `docs/testing/track3-testing-checklist.md`

**Step 1: Create testing checklist**

Create `docs/testing/track3-testing-checklist.md`:

```markdown
# Track 3: Collaboration & Presentation - Testing Checklist

## Part 1: Comments System

### Comment Creation
- [ ] Can add general farm comment
- [ ] Can add feature-specific comment (zone, planting, line)
- [ ] Rich text formatting works (bold, italic, lists)
- [ ] Comment appears immediately after posting
- [ ] Comment saved to database
- [ ] User name/email displays on comment

### Comment Replies
- [ ] Click "Reply" shows reply editor
- [ ] Can submit reply
- [ ] Reply appears nested under parent
- [ ] Can reply to replies (multi-level threading)
- [ ] Reply count displays on parent comment (if implemented)

### Comment Management
- [ ] Can mark comment as resolved
- [ ] Resolved badge appears on comment
- [ ] Can delete own comments
- [ ] Cannot delete other users' comments
- [ ] Deleting comment also deletes replies
- [ ] Comment timestamps display correctly ("5 minutes ago", etc.)

### Collaborator Permissions
- [ ] Owner can add comments
- [ ] Editor can add comments
- [ ] Commenter can add comments
- [ ] Viewer can view but not add comments
- [ ] Unauthorized users get 403 error

### Feature Integration
- [ ] Click zone on map shows zone comments
- [ ] Click planting on map shows planting comments
- [ ] Click line on map shows line comments
- [ ] Comment panel updates when switching features
- [ ] General comments accessible from farm settings

## Part 2: Phasing System

### Phase Creation
- [ ] Can create new phase
- [ ] Can set phase name (required)
- [ ] Can set phase description (optional)
- [ ] Can set start date (optional)
- [ ] Can set end date (optional)
- [ ] Can choose phase color
- [ ] Phase appears in phase list immediately

### Phase Management
- [ ] Can edit existing phase
- [ ] Can delete phase
- [ ] Deleting phase unassigns features
- [ ] Phases display in correct order
- [ ] Can reorder phases (if drag-drop implemented)
- [ ] Phase color displays correctly

### Feature Assignment
- [ ] Can assign zone to phase
- [ ] Can assign planting to phase
- [ ] Can assign line to phase
- [ ] Can unassign feature from phase
- [ ] Feature displays phase indicator (color dot, badge)
- [ ] Filter by phase works on map (if implemented)

### Phase Timeline
- [ ] Start/end dates display correctly
- [ ] Date format readable (e.g., "Jan 2024")
- [ ] Phases sorted by start date (if implemented)
- [ ] Visual timeline representation (if implemented)

## Part 3: Export System

### PNG Export
- [ ] "Export as PNG" button works
- [ ] Map captures at 1920x1080
- [ ] PNG file downloads
- [ ] Filename includes farm name and timestamp
- [ ] Image quality good (no blur, artifacts)
- [ ] All visible layers included
- [ ] Annotations/labels visible (if implemented)

### PDF Export
- [ ] "Export as PDF" button works
- [ ] PDF includes map image
- [ ] PDF includes zones list (if checked)
- [ ] PDF includes plantings list (if checked)
- [ ] PDF includes phases list (if checked)
- [ ] PDF formatted correctly (margins, headings)
- [ ] PDF filename includes farm name and timestamp
- [ ] PDF opens in viewer correctly

### Export Options
- [ ] Can toggle zones inclusion
- [ ] Can toggle plantings inclusion
- [ ] Can toggle phases inclusion
- [ ] Unchecked sections excluded from PDF
- [ ] Export progress indicator shows during generation
- [ ] Export success toast appears

### Export Quality
- [ ] Map image in PDF clear and legible
- [ ] Text in PDF readable
- [ ] Zone/planting/phase data accurate
- [ ] PDF file size reasonable (<5MB for typical farm)
- [ ] PDF compatible with Adobe Reader, Preview, Chrome

## Integration Tests

### Comments + Features
- [ ] Comments persist across page refreshes
- [ ] Comments load when clicking different features
- [ ] Resolved comments hidden by default
- [ ] Can show resolved comments (if implemented)
- [ ] Comment count badge on features (if implemented)

### Phases + Map
- [ ] Phase colors display on assigned features
- [ ] Phase filter works (show only Phase 1, etc.)
- [ ] Unassigned features still visible
- [ ] Phase legend displays (if implemented)
- [ ] Timeline slider filters by phase (if implemented)

### Export + All Features
- [ ] PDF includes phased features correctly
- [ ] PDF shows phase assignments
- [ ] PDF export works with custom imagery layers
- [ ] PNG export captures water features
- [ ] Export works with design layer filtering

## Performance Tests
- [ ] Loading 50+ comments performs smoothly
- [ ] Nested replies (5+ levels) render correctly
- [ ] 10+ phases display without lag
- [ ] PDF generation completes in <10 seconds
- [ ] PNG export immediate (<2 seconds)

## Error Handling
- [ ] Empty comment submission blocked
- [ ] Invalid phase dates show error
- [ ] Export failure shows clear error message
- [ ] Permission denied shows proper message
- [ ] Network error gracefully handled

## Browser Compatibility
- [ ] All features work in Chrome
- [ ] All features work in Firefox
- [ ] All features work in Safari
- [ ] All features work in Edge
- [ ] Mobile browser support (if applicable)

---

**Tester Notes:**

**Environment:**
- URL: http://localhost:3000/farm/[id]
- Test Farm ID: _______________
- Browser: _______________
- Date: _______________

**Issues Found:**
(Record any bugs, unexpected behavior, or UX issues here)
```

**Step 2: Commit**

```bash
git add docs/testing/track3-testing-checklist.md
git commit -m "docs(testing): add Track 3 manual testing checklist

- Comments system tests
- Phasing system tests
- Export system tests
- Integration and performance tests

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Plan Complete

This completes the Track 3: Collaboration & Presentation implementation plan with 13 detailed tasks covering:

**Part 1: Comments System (Tasks 1-5)**
- Comments database schema
- Farm collaborators permissions
- API routes for CRUD
- Rich text comment editor (Tiptap)
- Threaded comment components

**Part 2: Phasing System (Tasks 6-8)**
- Phases database schema
- API routes for CRUD
- Phase manager component
- Phase form with dates and colors

**Part 3: Export System (Tasks 9-11)**
- Map snapshot capture utility
- PDF generation (PDFKit)
- Export panel with options

**Integration & Testing (Tasks 12-13)**
- Comments integration with map
- Manual testing checklist

Total: 13 tasks, each following TDD pattern (test → implementation → commit)
