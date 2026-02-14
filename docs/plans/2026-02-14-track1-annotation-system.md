# Track 1: Annotation System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Rich Annotations system and Design Layer Toggle to transform map elements into educational content with rationale, media, tags, and organize features into system layers.

**Architecture:** Extend existing database schema with `annotations`, `media_attachments`, `external_links`, and `design_layers` tables. Create API routes under `/api/farms/[id]/annotations` and `/api/farms/[id]/layers`. Build UI components that integrate with existing bottom drawer and map control panel patterns.

**Tech Stack:** Next.js 14 App Router, Turso (libSQL), Tiptap (rich text), browser-image-compression (media), MapLibre GL JS (layer filtering), shadcn/ui components

---

## Prerequisites

- Existing codebase with farms, zones, plantings tables
- Bottom drawer component (`components/map/map-bottom-drawer.tsx`)
- R2 storage configured for media uploads
- MapLibre map instance available in farm-map.tsx

---

## Part 1: Rich Annotations

### Task 1: Database Schema - Annotations Table

**Files:**
- Create: `lib/db/migrations/024_annotations.sql`
- Reference: `lib/db/schema.ts` (add types)

**Step 1: Create migration file**

Create `lib/db/migrations/024_annotations.sql`:

```sql
-- Annotations table
CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  feature_id TEXT NOT NULL,
  feature_type TEXT NOT NULL CHECK(feature_type IN ('zone', 'planting', 'line')),
  design_rationale TEXT NOT NULL,
  rich_notes TEXT,
  tags TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by TEXT NOT NULL,
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_annotations_farm_feature
  ON annotations(farm_id, feature_id, feature_type);
CREATE INDEX IF NOT EXISTS idx_annotations_created
  ON annotations(farm_id, created_at DESC);
```

**Step 2: Run migration**

Run: `turso db shell permaculture-studio < lib/db/migrations/024_annotations.sql`

Expected: "Migration successful" or no errors

**Step 3: Add TypeScript types**

Add to `lib/db/schema.ts`:

```typescript
export interface Annotation {
  id: string;
  farm_id: string;
  feature_id: string;
  feature_type: 'zone' | 'planting' | 'line';
  design_rationale: string;
  rich_notes: string | null;
  tags: string | null; // JSON array as TEXT
  created_at: number;
  updated_at: number;
  created_by: string;
}
```

**Step 4: Commit**

```bash
git add lib/db/migrations/024_annotations.sql lib/db/schema.ts
git commit -m "feat(annotations): add annotations table schema

- Create annotations table with design_rationale field
- Add indexes for farm/feature and creation date
- Add TypeScript interface to schema.ts

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Database Schema - Media Attachments Table

**Files:**
- Create: `lib/db/migrations/025_media_attachments.sql`
- Modify: `lib/db/schema.ts`

**Step 1: Create migration file**

Create `lib/db/migrations/025_media_attachments.sql`:

```sql
CREATE TABLE IF NOT EXISTS media_attachments (
  id TEXT PRIMARY KEY,
  annotation_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('image', 'video')),
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  uploaded_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_media_annotation
  ON media_attachments(annotation_id, display_order);
```

**Step 2: Run migration**

Run: `turso db shell permaculture-studio < lib/db/migrations/025_media_attachments.sql`

**Step 3: Add TypeScript type**

Add to `lib/db/schema.ts`:

```typescript
export interface MediaAttachment {
  id: string;
  annotation_id: string;
  type: 'image' | 'video';
  file_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  display_order: number;
  uploaded_at: number;
}
```

**Step 4: Commit**

```bash
git add lib/db/migrations/025_media_attachments.sql lib/db/schema.ts
git commit -m "feat(annotations): add media_attachments table

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Database Schema - External Links Table

**Files:**
- Create: `lib/db/migrations/026_external_links.sql`
- Modify: `lib/db/schema.ts`

**Step 1: Create migration file**

Create `lib/db/migrations/026_external_links.sql`:

```sql
CREATE TABLE IF NOT EXISTS external_links (
  id TEXT PRIMARY KEY,
  annotation_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_links_annotation
  ON external_links(annotation_id, display_order);
```

**Step 2: Run migration**

Run: `turso db shell permaculture-studio < lib/db/migrations/026_external_links.sql`

**Step 3: Add TypeScript type**

Add to `lib/db/schema.ts`:

```typescript
export interface ExternalLink {
  id: string;
  annotation_id: string;
  url: string;
  title: string;
  description: string | null;
  display_order: number;
}
```

**Step 4: Commit**

```bash
git add lib/db/migrations/026_external_links.sql lib/db/schema.ts
git commit -m "feat(annotations): add external_links table

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4: API Route - Create Annotation

**Files:**
- Create: `app/api/farms/[id]/annotations/route.ts`
- Reference: `lib/db/index.ts` (database client)

**Step 1: Create API route file**

Create `app/api/farms/[id]/annotations/route.ts`:

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

  // Validate required fields
  if (!body.feature_id || !body.feature_type || !body.design_rationale) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Verify farm ownership or collaboration
  const farm = await db.execute({
    sql: 'SELECT user_id FROM farms WHERE id = ?',
    args: [farmId]
  });

  if (farm.rows.length === 0) {
    return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
  }

  if (farm.rows[0].user_id !== session.user.id) {
    // TODO: Check collaboration permissions when Track 3 is implemented
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Create annotation
  const annotationId = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO annotations
          (id, farm_id, feature_id, feature_type, design_rationale, rich_notes, tags, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      annotationId,
      farmId,
      body.feature_id,
      body.feature_type,
      body.design_rationale,
      body.rich_notes || null,
      body.tags ? JSON.stringify(body.tags) : null,
      session.user.id
    ]
  });

  // Retrieve created annotation
  const result = await db.execute({
    sql: 'SELECT * FROM annotations WHERE id = ?',
    args: [annotationId]
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
  const featureType = searchParams.get('feature_type');

  let sql = 'SELECT * FROM annotations WHERE farm_id = ?';
  const args: any[] = [farmId];

  if (featureId) {
    sql += ' AND feature_id = ?';
    args.push(featureId);
  }

  if (featureType) {
    sql += ' AND feature_type = ?';
    args.push(featureType);
  }

  sql += ' ORDER BY created_at DESC';

  const result = await db.execute({ sql, args });

  // Parse tags JSON
  const annotations = result.rows.map(row => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags) : []
  }));

  return NextResponse.json({ annotations });
}
```

**Step 2: Test API route manually**

Run dev server: `npm run dev`

Test POST:
```bash
curl -X POST http://localhost:3000/api/farms/test-farm-id/annotations \
  -H "Content-Type: application/json" \
  -d '{"feature_id":"zone-123","feature_type":"zone","design_rationale":"This is a test"}'
```

Expected: 201 Created with annotation JSON

**Step 3: Commit**

```bash
git add app/api/farms/\[id\]/annotations/route.ts
git commit -m "feat(annotations): add POST and GET annotation endpoints

- Create annotation with validation
- Verify farm ownership
- Support filtering by feature_id and feature_type
- Parse tags JSON on retrieval

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 5: API Route - Update and Delete Annotation

**Files:**
- Create: `app/api/farms/[id]/annotations/[annotationId]/route.ts`

**Step 1: Create update/delete route**

Create `app/api/farms/[id]/annotations/[annotationId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; annotationId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: farmId, annotationId } = params;
  const body = await request.json();

  // Verify annotation exists and user has permission
  const annotation = await db.execute({
    sql: 'SELECT * FROM annotations WHERE id = ? AND farm_id = ?',
    args: [annotationId, farmId]
  });

  if (annotation.rows.length === 0) {
    return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
  }

  // Build update query dynamically
  const updates: string[] = [];
  const args: any[] = [];

  if (body.design_rationale !== undefined) {
    updates.push('design_rationale = ?');
    args.push(body.design_rationale);
  }

  if (body.rich_notes !== undefined) {
    updates.push('rich_notes = ?');
    args.push(body.rich_notes);
  }

  if (body.tags !== undefined) {
    updates.push('tags = ?');
    args.push(JSON.stringify(body.tags));
  }

  updates.push('updated_at = unixepoch()');

  if (updates.length === 1) {
    // Only updated_at, nothing to update
    return NextResponse.json(annotation.rows[0]);
  }

  args.push(annotationId);

  await db.execute({
    sql: `UPDATE annotations SET ${updates.join(', ')} WHERE id = ?`,
    args
  });

  // Retrieve updated annotation
  const result = await db.execute({
    sql: 'SELECT * FROM annotations WHERE id = ?',
    args: [annotationId]
  });

  return NextResponse.json(result.rows[0]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; annotationId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: farmId, annotationId } = params;

  // Delete annotation (CASCADE will handle media_attachments and external_links)
  const result = await db.execute({
    sql: 'DELETE FROM annotations WHERE id = ? AND farm_id = ?',
    args: [annotationId, farmId]
  });

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
```

**Step 2: Commit**

```bash
git add app/api/farms/\[id\]/annotations/\[annotationId\]/route.ts
git commit -m "feat(annotations): add PATCH and DELETE annotation endpoints

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Media Upload - R2 Signed URL Endpoint

**Files:**
- Create: `app/api/annotations/[id]/media/route.ts`
- Reference: `lib/r2/client.ts` (R2 client)

**Step 1: Create media upload route**

Create `app/api/annotations/[id]/media/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const annotationId = params.id;
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const caption = formData.get('caption') as string | null;
  const displayOrder = parseInt(formData.get('display_order') as string || '0');

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Verify annotation exists
  const annotation = await db.execute({
    sql: 'SELECT * FROM annotations WHERE id = ?',
    args: [annotationId]
  });

  if (annotation.rows.length === 0) {
    return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
  }

  // Generate unique file path
  const mediaId = crypto.randomUUID();
  const fileExtension = file.name.split('.').pop();
  const fileName = `${mediaId}.${fileExtension}`;
  const thumbnailName = `${mediaId}_thumb.${fileExtension}`;

  const farmId = annotation.rows[0].farm_id;
  const filePath = `farms/${farmId}/annotations/${annotationId}/${fileName}`;
  const thumbnailPath = `farms/${farmId}/annotations/${annotationId}/${thumbnailName}`;

  // Upload original file to R2
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: filePath,
    Body: fileBuffer,
    ContentType: file.type,
  }));

  const fileUrl = `https://${process.env.R2_PUBLIC_URL}/${filePath}`;

  // TODO: Generate thumbnail (defer to client-side for MVP)
  const thumbnailUrl = null;

  // Create media attachment record
  await db.execute({
    sql: `INSERT INTO media_attachments
          (id, annotation_id, type, file_url, thumbnail_url, caption, display_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      mediaId,
      annotationId,
      file.type.startsWith('video/') ? 'video' : 'image',
      fileUrl,
      thumbnailUrl,
      caption,
      displayOrder
    ]
  });

  // Retrieve created media attachment
  const result = await db.execute({
    sql: 'SELECT * FROM media_attachments WHERE id = ?',
    args: [mediaId]
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

  const annotationId = params.id;

  const result = await db.execute({
    sql: 'SELECT * FROM media_attachments WHERE annotation_id = ? ORDER BY display_order',
    args: [annotationId]
  });

  return NextResponse.json({ media: result.rows });
}
```

**Step 2: Commit**

```bash
git add app/api/annotations/\[id\]/media/route.ts
git commit -m "feat(annotations): add media upload endpoint

- Upload files to R2 storage
- Create media_attachments records
- Support captions and display order

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 7: UI Component - Annotation Panel Shell

**Files:**
- Create: `components/annotations/annotation-panel.tsx`
- Reference: `components/map/map-bottom-drawer.tsx` (existing drawer pattern)

**Step 1: Create annotation panel component**

Create `components/annotations/annotation-panel.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

interface AnnotationPanelProps {
  farmId: string;
  featureId: string;
  featureType: 'zone' | 'planting' | 'line';
  onClose?: () => void;
}

export function AnnotationPanel({
  farmId,
  featureId,
  featureType,
  onClose
}: AnnotationPanelProps) {
  const [annotation, setAnnotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnotation();
  }, [farmId, featureId, featureType]);

  async function loadAnnotation() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/farms/${farmId}/annotations?feature_id=${featureId}&feature_type=${featureType}`
      );
      const data = await response.json();

      if (data.annotations.length > 0) {
        setAnnotation(data.annotations[0]);
      } else {
        // No annotation yet, show create form
        setAnnotation(null);
      }
    } catch (error) {
      console.error('Failed to load annotation:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Feature Details</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        )}
      </div>

      {annotation ? (
        <div className="space-y-4">
          {/* Design Rationale */}
          <div>
            <h4 className="text-sm font-medium mb-2">Why is this here?</h4>
            <p className="text-sm text-muted-foreground">
              {annotation.design_rationale}
            </p>
          </div>

          {/* Rich Notes */}
          {annotation.rich_notes && (
            <div>
              <h4 className="text-sm font-medium mb-2">Notes</h4>
              <div className="text-sm prose prose-sm max-w-none">
                {annotation.rich_notes}
              </div>
            </div>
          )}

          {/* Tags */}
          {annotation.tags && annotation.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {annotation.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* TODO: Media gallery, external links, edit button */}
        </div>
      ) : (
        <div className="text-center p-8">
          <p className="text-sm text-muted-foreground mb-4">
            No details added yet
          </p>
          {/* TODO: Create annotation form */}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/annotations/annotation-panel.tsx
git commit -m "feat(annotations): add annotation panel component shell

- Load annotation for feature
- Display design rationale, notes, tags
- Show loading state

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 8: UI Component - Design Rationale Field

**Files:**
- Create: `components/annotations/design-rationale-field.tsx`

**Step 1: Create design rationale component**

Create `components/annotations/design-rationale-field.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface DesignRationaleFieldProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  required?: boolean;
}

export function DesignRationaleField({
  value,
  onChange,
  maxLength = 500,
  required = true
}: DesignRationaleFieldProps) {
  const charCount = value.length;
  const isNearLimit = charCount > maxLength * 0.8;
  const isOverLimit = charCount > maxLength;

  return (
    <div className="space-y-2">
      <Label htmlFor="design-rationale" className="text-base font-semibold">
        Why is this here? {required && <span className="text-destructive">*</span>}
      </Label>
      <p className="text-sm text-muted-foreground">
        Explain your design decision for this element. This is what makes your design educational.
      </p>
      <Textarea
        id="design-rationale"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="E.g., 'This swale is positioned along the contour line to capture runoff from the roof and slow water infiltration into the nursery bed below.'"
        className="min-h-[120px] text-base"
        required={required}
        maxLength={maxLength}
      />
      <div className="flex justify-end">
        <span
          className={`text-xs ${
            isOverLimit
              ? 'text-destructive font-semibold'
              : isNearLimit
              ? 'text-warning font-medium'
              : 'text-muted-foreground'
          }`}
        >
          {charCount} / {maxLength}
        </span>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/annotations/design-rationale-field.tsx
git commit -m "feat(annotations): add design rationale field component

- Prominent textarea for design rationale
- Character counter with visual feedback
- Required field indication

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 9: UI Component - Rich Text Editor (Tiptap Integration)

**Files:**
- Create: `components/annotations/rich-text-editor.tsx`
- Install: `npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link`

**Step 1: Install Tiptap dependencies**

Run: `npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link`

**Step 2: Create rich text editor component**

Create `components/annotations/rich-text-editor.tsx`:

```typescript
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Bold, Italic, List, ListOrdered, Heading2, Heading3, LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Add detailed notes...'
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline'
        }
      })
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-3 border rounded-md'
      }
    }
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 border-b pb-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-accent' : ''}
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-accent' : ''}
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}
        >
          <Heading2 className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'bg-accent' : ''}
        >
          <Heading3 className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-accent' : ''}
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-accent' : ''}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const url = window.prompt('Enter URL:');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={editor.isActive('link') ? 'bg-accent' : ''}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add components/annotations/rich-text-editor.tsx package.json package-lock.json
git commit -m "feat(annotations): add rich text editor with Tiptap

- Support bold, italic, headings, lists, links
- Markdown-based storage (HTML output)
- Toolbar with formatting controls

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 10: UI Component - Tag Input

**Files:**
- Create: `components/annotations/tag-input.tsx`

**Step 1: Create tag input component**

Create `components/annotations/tag-input.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  farmId: string; // For auto-suggest
}

export function TagInput({ value, onChange, farmId }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Load existing tags for auto-suggest
  useEffect(() => {
    async function loadExistingTags() {
      try {
        const response = await fetch(`/api/farms/${farmId}/annotations`);
        const data = await response.json();

        const allTags = new Set<string>();
        data.annotations.forEach((annotation: any) => {
          if (annotation.tags) {
            annotation.tags.forEach((tag: string) => allTags.add(tag));
          }
        });

        setSuggestions(Array.from(allTags));
      } catch (error) {
        console.error('Failed to load tags:', error);
      }
    }

    loadExistingTags();
  }, [farmId]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim().toLowerCase();

      if (!value.includes(newTag)) {
        onChange([...value, newTag]);
      }

      setInputValue('');
    }
  }

  function removeTag(tagToRemove: string) {
    onChange(value.filter(tag => tag !== tagToRemove));
  }

  const filteredSuggestions = suggestions.filter(
    s => s.includes(inputValue.toLowerCase()) && !value.includes(s)
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map(tag => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a tag and press Enter..."
        className="text-sm"
      />

      {/* Auto-suggest */}
      {inputValue && filteredSuggestions.length > 0 && (
        <div className="border rounded-md p-2 space-y-1">
          <p className="text-xs text-muted-foreground mb-1">Suggestions:</p>
          {filteredSuggestions.slice(0, 5).map(suggestion => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                if (!value.includes(suggestion)) {
                  onChange([...value, suggestion]);
                }
                setInputValue('');
              }}
              className="block w-full text-left px-2 py-1 text-sm hover:bg-accent rounded"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/annotations/tag-input.tsx
git commit -m "feat(annotations): add tag input component

- Multi-select tag creation
- Auto-suggest from existing tags
- Enter key to add tags
- Remove tags with X button

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 11: UI Component - Media Gallery

**Files:**
- Create: `components/annotations/media-gallery.tsx`

**Step 1: Create media gallery component**

Create `components/annotations/media-gallery.tsx`:

```typescript
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, ZoomIn } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

interface MediaGalleryProps {
  media: Array<{
    id: string;
    type: 'image' | 'video';
    file_url: string;
    thumbnail_url: string | null;
    caption: string | null;
  }>;
  onDelete?: (mediaId: string) => void;
  editable?: boolean;
}

export function MediaGallery({
  media,
  onDelete,
  editable = false
}: MediaGalleryProps) {
  if (media.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Media</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {media.map(item => (
          <div key={item.id} className="relative group">
            <Dialog>
              <DialogTrigger asChild>
                <div className="relative aspect-square rounded-lg overflow-hidden cursor-pointer border hover:border-primary transition-colors">
                  {item.type === 'image' ? (
                    <Image
                      src={item.thumbnail_url || item.file_url}
                      alt={item.caption || 'Annotation media'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <video
                      src={item.file_url}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="h-6 w-6 text-white" />
                  </div>
                </div>
              </DialogTrigger>

              <DialogContent className="max-w-4xl">
                {item.type === 'image' ? (
                  <Image
                    src={item.file_url}
                    alt={item.caption || 'Annotation media'}
                    width={1200}
                    height={800}
                    className="w-full h-auto"
                  />
                ) : (
                  <video
                    src={item.file_url}
                    controls
                    className="w-full h-auto"
                  />
                )}

                {item.caption && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {item.caption}
                  </p>
                )}
              </DialogContent>
            </Dialog>

            {/* Delete button */}
            {editable && onDelete && (
              <button
                onClick={() => onDelete(item.id)}
                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Caption */}
            {item.caption && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {item.caption}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/annotations/media-gallery.tsx
git commit -m "feat(annotations): add media gallery component

- Grid layout for images/videos
- Lightbox/zoom on click
- Captions and delete buttons
- Responsive grid

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 12: UI Component - Media Upload Button

**Files:**
- Create: `components/annotations/media-upload-button.tsx`
- Install: `npm install browser-image-compression`

**Step 1: Install browser-image-compression**

Run: `npm install browser-image-compression`

**Step 2: Create media upload component**

Create `components/annotations/media-upload-button.tsx`:

```typescript
'use client';

import { useState, useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import imageCompression from 'browser-image-compression';
import { useToast } from '@/hooks/use-toast';

interface MediaUploadButtonProps {
  annotationId: string;
  onUploadComplete: () => void;
}

export function MediaUploadButton({
  annotationId,
  onUploadComplete
}: MediaUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        await uploadFile(file);
      }

      toast({
        title: 'Upload complete',
        description: `${files.length} file(s) uploaded successfully`
      });

      onUploadComplete();
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function uploadFile(file: File) {
    let processedFile = file;

    // Compress images
    if (file.type.startsWith('image/')) {
      processedFile = await imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 3000,
        useWebWorker: true
      });
    }

    // Upload to API
    const formData = new FormData();
    formData.append('file', processedFile);
    formData.append('display_order', '0'); // TODO: Calculate from existing media

    const response = await fetch(`/api/annotations/${annotationId}/media`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Upload Media
          </>
        )}
      </Button>
    </>
  );
}
```

**Step 3: Commit**

```bash
git add components/annotations/media-upload-button.tsx package.json package-lock.json
git commit -m "feat(annotations): add media upload button

- Client-side image compression
- Multi-file upload support
- Progress indicator
- Toast notifications

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 13: Integration - Add Annotation Panel to Bottom Drawer

**Files:**
- Modify: `components/map/map-bottom-drawer.tsx`
- Modify: `components/map/farm-map.tsx`

**Step 1: Add Details tab to bottom drawer**

Modify `components/map/map-bottom-drawer.tsx`:

```typescript
// Add to imports
import { AnnotationPanel } from '@/components/annotations/annotation-panel';

// Add to tab list
<TabsList className="grid w-full grid-cols-4"> {/* Changed from 3 to 4 */}
  <TabsTrigger value="zones">Zones</TabsTrigger>
  <TabsTrigger value="plantings">Plantings</TabsTrigger>
  <TabsTrigger value="filters">Filters</TabsTrigger>
  <TabsTrigger value="details">Details</TabsTrigger> {/* New tab */}
</TabsList>

// Add to tab content
<TabsContent value="details" className="mt-0">
  {selectedFeature ? (
    <AnnotationPanel
      farmId={farm.id}
      featureId={selectedFeature.id}
      featureType={selectedFeature.type}
      onClose={() => setSelectedFeature(null)}
    />
  ) : (
    <div className="p-8 text-center text-muted-foreground">
      Select a zone, planting, or line to view details
    </div>
  )}
</TabsContent>
```

**Step 2: Add selected feature state**

Add state to track selected feature in `components/map/farm-map.tsx`:

```typescript
const [selectedFeature, setSelectedFeature] = useState<{
  id: string;
  type: 'zone' | 'planting' | 'line';
} | null>(null);

// Add click handler for zones
map.on('click', 'colored-zones-fill', (e) => {
  if (e.features && e.features.length > 0) {
    const feature = e.features[0];
    setSelectedFeature({
      id: feature.properties.id,
      type: 'zone'
    });
    setOpenDrawer('zones'); // Or switch to 'details' tab
  }
});
```

**Step 3: Commit**

```bash
git add components/map/map-bottom-drawer.tsx components/map/farm-map.tsx
git commit -m "feat(annotations): integrate annotation panel into bottom drawer

- Add 'Details' tab to bottom drawer
- Show annotation panel when feature selected
- Wire up feature selection from map clicks

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Part 2: Design Layer Toggle

### Task 14: Database Schema - Design Layers Table

**Files:**
- Create: `lib/db/migrations/027_design_layers.sql`
- Modify: `lib/db/schema.ts`

**Step 1: Create migration file**

Create `lib/db/migrations/027_design_layers.sql`:

```sql
CREATE TABLE IF NOT EXISTS design_layers (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  description TEXT,
  visible INTEGER NOT NULL DEFAULT 1,
  locked INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_layers_farm ON design_layers(farm_id, display_order);
```

**Step 2: Run migration**

Run: `turso db shell permaculture-studio < lib/db/migrations/027_design_layers.sql`

**Step 3: Add TypeScript type**

Add to `lib/db/schema.ts`:

```typescript
export interface DesignLayer {
  id: string;
  farm_id: string;
  name: string;
  color: string | null;
  description: string | null;
  visible: number; // SQLite boolean (0/1)
  locked: number; // SQLite boolean (0/1)
  display_order: number;
  created_at: number;
}
```

**Step 4: Commit**

```bash
git add lib/db/migrations/027_design_layers.sql lib/db/schema.ts
git commit -m "feat(layers): add design_layers table

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 15: Database Schema - Extend Zones and Plantings with Layer IDs

**Files:**
- Create: `lib/db/migrations/028_extend_features_layer_ids.sql`

**Step 1: Create migration file**

Create `lib/db/migrations/028_extend_features_layer_ids.sql`:

```sql
-- Add layer_ids column to zones
ALTER TABLE zones ADD COLUMN layer_ids TEXT;

-- Add layer_ids column to plantings
ALTER TABLE plantings ADD COLUMN layer_ids TEXT;

-- Note: Lines table doesn't exist yet (Track 2), will add when created
```

**Step 2: Run migration**

Run: `turso db shell permaculture-studio < lib/db/migrations/028_extend_features_layer_ids.sql`

**Step 3: Commit**

```bash
git add lib/db/migrations/028_extend_features_layer_ids.sql
git commit -m "feat(layers): extend zones and plantings with layer_ids

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 16: API Route - Layer CRUD

**Files:**
- Create: `app/api/farms/[id]/layers/route.ts`
- Create: `app/api/farms/[id]/layers/[layerId]/route.ts`

**Step 1: Create layers route**

Create `app/api/farms/[id]/layers/route.ts`:

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

  // Verify farm ownership
  const farm = await db.execute({
    sql: 'SELECT user_id FROM farms WHERE id = ?',
    args: [farmId]
  });

  if (farm.rows.length === 0) {
    return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
  }

  if (farm.rows[0].user_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get max display_order
  const maxOrder = await db.execute({
    sql: 'SELECT MAX(display_order) as max_order FROM design_layers WHERE farm_id = ?',
    args: [farmId]
  });

  const nextOrder = (maxOrder.rows[0]?.max_order || 0) + 1;

  // Create layer
  const layerId = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO design_layers
          (id, farm_id, name, color, description, display_order)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      layerId,
      farmId,
      body.name,
      body.color || null,
      body.description || null,
      nextOrder
    ]
  });

  const result = await db.execute({
    sql: 'SELECT * FROM design_layers WHERE id = ?',
    args: [layerId]
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
    sql: 'SELECT * FROM design_layers WHERE farm_id = ? ORDER BY display_order',
    args: [farmId]
  });

  return NextResponse.json({ layers: result.rows });
}
```

**Step 2: Create layer update/delete route**

Create `app/api/farms/[id]/layers/[layerId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; layerId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: farmId, layerId } = params;
  const body = await request.json();

  // Build update query
  const updates: string[] = [];
  const args: any[] = [];

  if (body.name !== undefined) {
    updates.push('name = ?');
    args.push(body.name);
  }

  if (body.color !== undefined) {
    updates.push('color = ?');
    args.push(body.color);
  }

  if (body.description !== undefined) {
    updates.push('description = ?');
    args.push(body.description);
  }

  if (body.visible !== undefined) {
    updates.push('visible = ?');
    args.push(body.visible ? 1 : 0);
  }

  if (body.locked !== undefined) {
    updates.push('locked = ?');
    args.push(body.locked ? 1 : 0);
  }

  if (body.display_order !== undefined) {
    updates.push('display_order = ?');
    args.push(body.display_order);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  args.push(layerId);

  await db.execute({
    sql: `UPDATE design_layers SET ${updates.join(', ')} WHERE id = ?`,
    args
  });

  const result = await db.execute({
    sql: 'SELECT * FROM design_layers WHERE id = ?',
    args: [layerId]
  });

  return NextResponse.json(result.rows[0]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; layerId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: farmId, layerId } = params;

  await db.execute({
    sql: 'DELETE FROM design_layers WHERE id = ? AND farm_id = ?',
    args: [layerId, farmId]
  });

  return NextResponse.json({ success: true });
}
```

**Step 3: Commit**

```bash
git add app/api/farms/\[id\]/layers/route.ts app/api/farms/\[id\]/layers/\[layerId\]/route.ts
git commit -m "feat(layers): add layer CRUD API routes

- POST /api/farms/[id]/layers (create)
- GET /api/farms/[id]/layers (list)
- PATCH /api/farms/[id]/layers/[layerId] (update)
- DELETE /api/farms/[id]/layers/[layerId] (delete)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 17: API Route - Assign Feature to Layers

**Files:**
- Create: `app/api/farms/[id]/zones/[zoneId]/layers/route.ts`
- Create: `app/api/farms/[id]/plantings/[plantingId]/layers/route.ts`

**Step 1: Create zone layer assignment route**

Create `app/api/farms/[id]/zones/[zoneId]/layers/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; zoneId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: farmId, zoneId } = params;
  const body = await request.json();

  if (!Array.isArray(body.layer_ids)) {
    return NextResponse.json(
      { error: 'layer_ids must be an array' },
      { status: 400 }
    );
  }

  await db.execute({
    sql: 'UPDATE zones SET layer_ids = ? WHERE id = ? AND farm_id = ?',
    args: [JSON.stringify(body.layer_ids), zoneId, farmId]
  });

  const result = await db.execute({
    sql: 'SELECT * FROM zones WHERE id = ?',
    args: [zoneId]
  });

  return NextResponse.json(result.rows[0]);
}
```

**Step 2: Create planting layer assignment route**

Create `app/api/farms/[id]/plantings/[plantingId]/layers/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; plantingId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: farmId, plantingId } = params;
  const body = await request.json();

  if (!Array.isArray(body.layer_ids)) {
    return NextResponse.json(
      { error: 'layer_ids must be an array' },
      { status: 400 }
    );
  }

  await db.execute({
    sql: 'UPDATE plantings SET layer_ids = ? WHERE id = ? AND farm_id = ?',
    args: [JSON.stringify(body.layer_ids), plantingId, farmId]
  });

  const result = await db.execute({
    sql: 'SELECT * FROM plantings WHERE id = ?',
    args: [plantingId]
  });

  return NextResponse.json(result.rows[0]);
}
```

**Step 3: Commit**

```bash
git add app/api/farms/\[id\]/zones/\[zoneId\]/layers/route.ts app/api/farms/\[id\]/plantings/\[plantingId\]/layers/route.ts
git commit -m "feat(layers): add layer assignment endpoints for zones and plantings

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 18: UI Component - Layer Panel

**Files:**
- Create: `components/layers/layer-panel.tsx`

**Step 1: Create layer panel component**

Create `components/layers/layer-panel.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LayerItem } from './layer-item';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LayerPanelProps {
  farmId: string;
  onLayerVisibilityChange?: (layerIds: string[]) => void;
}

export function LayerPanel({ farmId, onLayerVisibilityChange }: LayerPanelProps) {
  const [layers, setLayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newLayerName, setNewLayerName] = useState('');
  const [newLayerColor, setNewLayerColor] = useState('#3b82f680');

  useEffect(() => {
    loadLayers();
  }, [farmId]);

  async function loadLayers() {
    setLoading(true);
    try {
      const response = await fetch(`/api/farms/${farmId}/layers`);
      const data = await response.json();
      setLayers(data.layers);

      // Notify parent of visible layers
      if (onLayerVisibilityChange) {
        const visibleIds = data.layers
          .filter((l: any) => l.visible === 1)
          .map((l: any) => l.id);
        onLayerVisibilityChange(visibleIds);
      }
    } catch (error) {
      console.error('Failed to load layers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createLayer() {
    if (!newLayerName.trim()) return;

    try {
      await fetch(`/api/farms/${farmId}/layers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLayerName,
          color: newLayerColor
        })
      });

      setNewLayerName('');
      setNewLayerColor('#3b82f680');
      setCreateDialogOpen(false);
      loadLayers();
    } catch (error) {
      console.error('Failed to create layer:', error);
    }
  }

  async function toggleVisibility(layerId: string) {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    await fetch(`/api/farms/${farmId}/layers/${layerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: layer.visible === 1 ? 0 : 1 })
    });

    loadLayers();
  }

  async function deleteLayer(layerId: string) {
    if (!confirm('Delete this layer? Features will not be deleted, just unassigned.')) {
      return;
    }

    await fetch(`/api/farms/${farmId}/layers/${layerId}`, {
      method: 'DELETE'
    });

    loadLayers();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Design Layers</h3>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Layer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="layer-name">Layer Name</Label>
                <Input
                  id="layer-name"
                  value={newLayerName}
                  onChange={(e) => setNewLayerName(e.target.value)}
                  placeholder="e.g., Water Systems"
                />
              </div>
              <div>
                <Label htmlFor="layer-color">Color (optional)</Label>
                <Input
                  id="layer-color"
                  type="color"
                  value={newLayerColor}
                  onChange={(e) => setNewLayerColor(e.target.value + '80')} // Add alpha
                />
              </div>
              <Button onClick={createLayer} className="w-full">
                Create Layer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-1">
        {layers.map(layer => (
          <LayerItem
            key={layer.id}
            layer={layer}
            onToggleVisibility={() => toggleVisibility(layer.id)}
            onDelete={() => deleteLayer(layer.id)}
          />
        ))}
      </div>

      {layers.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No layers yet. Create one to organize your design.
        </p>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/layers/layer-panel.tsx
git commit -m "feat(layers): add layer panel component

- List all layers
- Create new layers
- Toggle visibility
- Delete layers

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 19: UI Component - Layer Item

**Files:**
- Create: `components/layers/layer-item.tsx`

**Step 1: Create layer item component**

Create `components/layers/layer-item.tsx`:

```typescript
'use client';

import { Eye, EyeOff, Lock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LayerItemProps {
  layer: {
    id: string;
    name: string;
    color: string | null;
    visible: number;
    locked: number;
  };
  onToggleVisibility: () => void;
  onDelete: () => void;
}

export function LayerItem({ layer, onToggleVisibility, onDelete }: LayerItemProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded hover:bg-accent group">
      {/* Visibility toggle */}
      <button
        onClick={onToggleVisibility}
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center hover:bg-background rounded"
      >
        {layer.visible === 1 ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Color swatch */}
      {layer.color && (
        <div
          className="w-4 h-4 rounded-full border border-border flex-shrink-0"
          style={{ backgroundColor: layer.color }}
        />
      )}

      {/* Layer name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{layer.name}</p>
      </div>

      {/* Lock indicator */}
      {layer.locked === 1 && (
        <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      )}

      {/* Delete button (show on hover) */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 flex-shrink-0"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/layers/layer-item.tsx
git commit -m "feat(layers): add layer item component

- Eye icon for visibility toggle
- Color swatch display
- Lock indicator
- Delete button on hover

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 20: Integration - Map Layer Filtering

**Files:**
- Modify: `components/map/farm-map.tsx`

**Step 1: Add layer filtering to map**

Modify `components/map/farm-map.tsx` to filter zones/plantings by visible layers:

```typescript
// Add to state
const [visibleLayerIds, setVisibleLayerIds] = useState<string[]>([]);

// Function to update map filters
function updateLayerFilters(layerIds: string[]) {
  if (!map.current) return;

  setVisibleLayerIds(layerIds);

  // Filter zones by layer
  map.current.setFilter('colored-zones-fill', [
    'any',
    ['==', ['length', ['get', 'layer_ids']], 0], // Show unassigned zones
    ['!', ['has', 'layer_ids']], // Show zones without layer_ids field
    ...layerIds.map(layerId => [
      'in', layerId, ['get', 'layer_ids']
    ])
  ]);

  // Apply same filter to zones stroke layer
  map.current.setFilter('colored-zones-stroke', [
    'any',
    ['==', ['length', ['get', 'layer_ids']], 0],
    ['!', ['has', 'layer_ids']],
    ...layerIds.map(layerId => [
      'in', layerId, ['get', 'layer_ids']
    ])
  ]);

  // TODO: Filter plantings similarly when planting markers are implemented
}
```

**Step 2: Parse layer_ids when loading zones**

Update zone loading to parse layer_ids JSON:

```typescript
const zones = result.rows.map(row => ({
  ...row,
  layer_ids: row.layer_ids ? JSON.parse(row.layer_ids) : []
}));
```

**Step 3: Commit**

```bash
git add components/map/farm-map.tsx
git commit -m "feat(layers): implement map layer filtering

- Filter zones/plantings by visible layers
- Parse layer_ids JSON from database
- Show unassigned features by default

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 21: Integration - Add Layer Panel to Map Controls

**Files:**
- Modify: `components/map/map-controls-sheet.tsx` or create new panel

**Step 1: Add layer panel to map controls**

Add LayerPanel to map controls (map control panel or FAB menu):

```typescript
import { LayerPanel } from '@/components/layers/layer-panel';

// In map controls component
<div className="space-y-4">
  {/* Existing controls */}

  {/* Layer panel */}
  <div className="border-t pt-4">
    <LayerPanel
      farmId={farm.id}
      onLayerVisibilityChange={handleLayerVisibilityChange}
    />
  </div>
</div>
```

**Step 2: Wire up visibility change handler**

Connect LayerPanel visibility changes to map filtering:

```typescript
function handleLayerVisibilityChange(visibleLayerIds: string[]) {
  updateLayerFilters(visibleLayerIds);
}
```

**Step 3: Commit**

```bash
git add components/map/map-controls-sheet.tsx
git commit -m "feat(layers): add layer panel to map controls

- Integrate LayerPanel into map controls
- Wire up visibility changes to map filtering

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 22: Auto-Create Default Layers on Farm Creation

**Files:**
- Modify: `app/api/farms/route.ts` (or wherever farms are created)

**Step 1: Add default layer creation**

Add default layers when farm is created:

```typescript
// After farm creation
const defaultLayers = [
  { name: 'Water Systems', color: '#0ea5e980' },
  { name: 'Plantings', color: '#22c55e80' },
  { name: 'Structures', color: '#ef444480' },
  { name: 'Zones', color: '#eab30880' },
  { name: 'Annotations', color: '#a855f780' },
];

for (let i = 0; i < defaultLayers.length; i++) {
  const { name, color } = defaultLayers[i];
  await db.execute({
    sql: `INSERT INTO design_layers (id, farm_id, name, color, display_order)
          VALUES (?, ?, ?, ?, ?)`,
    args: [crypto.randomUUID(), farmId, name, color, i]
  });
}
```

**Step 2: Commit**

```bash
git add app/api/farms/route.ts
git commit -m "feat(layers): auto-create default layers on farm creation

- Create 5 default layers: Water Systems, Plantings, Structures, Zones, Annotations
- Set display order and colors

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Testing & Validation

### Task 23: Manual Testing Checklist

**Step 1: Test Rich Annotations**

- [ ] Create annotation for a zone with design rationale
- [ ] Edit annotation to add rich notes (bold, italic, lists)
- [ ] Add 3 tags to annotation
- [ ] Upload 2 images to annotation
- [ ] View annotation in bottom drawer Details tab
- [ ] Delete annotation

**Step 2: Test Design Layers**

- [ ] Create new layer "Test Layer"
- [ ] Assign 2 zones to "Test Layer"
- [ ] Toggle layer visibility (zones should hide/show)
- [ ] Create second layer, assign different zones
- [ ] Toggle both layers independently
- [ ] Delete layer (zones remain, just unassigned)

**Step 3: Test Integration**

- [ ] Click zone on map → Details tab opens with annotation
- [ ] Filter zones by layer → only assigned zones visible
- [ ] Create annotation with media → media appears in gallery
- [ ] Tag auto-suggest shows existing tags

**Step 4: Test Edge Cases**

- [ ] Create annotation without tags (should work)
- [ ] Create annotation without media (should work)
- [ ] Create layer without color (should work)
- [ ] Assign zone to multiple layers (should show in all)
- [ ] Delete annotation with media (media should cascade delete)

**Step 5: Document any bugs found**

Create issues in GitHub or note in a separate doc for fixing.

---

## Summary

This implementation plan covers:

✅ **Rich Annotations:**
- Database schema (annotations, media_attachments, external_links)
- API routes (CRUD annotations, upload media)
- UI components (annotation panel, design rationale field, rich text editor, tag input, media gallery, media upload button)
- Integration with bottom drawer

✅ **Design Layer Toggle:**
- Database schema (design_layers, layer_ids on zones/plantings)
- API routes (layer CRUD, layer assignment)
- UI components (layer panel, layer item)
- Map filtering by layer visibility
- Auto-create default layers

**Next Steps:**
1. Execute this plan task-by-task using superpowers:executing-plans
2. Test thoroughly with manual checklist
3. Fix any bugs discovered
4. Move to Track 2 (Drawing & Water System)

---

**Plan Complete!** Ready for execution.
