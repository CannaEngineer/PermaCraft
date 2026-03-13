'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Image, Check, X, BookOpen, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface StoryTabProps {
  farmId: string;
  onDraftCountChange?: (count: number) => void;
}

interface StoryEntry {
  id: string;
  farm_id: string;
  type: string;
  content: string;
  photo_url?: string;
  source_id?: string;
  status: string;
  entry_date: number;
  created_at: number;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  task: { label: 'Task', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  milestone: { label: 'Milestone', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  phase: { label: 'Phase', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  manual: { label: 'Manual', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
};

export function StoryTab({ farmId, onDraftCountChange }: StoryTabProps) {
  const [entries, setEntries] = useState<StoryEntry[]>([]);
  const [drafts, setDrafts] = useState<StoryEntry[]>([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);

  // Write entry form state
  const [writeDate, setWriteDate] = useState(new Date().toISOString().split('T')[0]);
  const [writeContent, setWriteContent] = useState('');
  const [writePhotoFile, setWritePhotoFile] = useState<File | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch(`/api/farms/${farmId}/story-entries`);
      if (!res.ok) return;
      const data = await res.json();
      const all = data.entries || [];
      setDrafts(all.filter((e: StoryEntry) => e.status === 'draft'));
      setEntries(all.filter((e: StoryEntry) => e.status === 'published').sort((a: StoryEntry, b: StoryEntry) => b.entry_date - a.entry_date));
    } catch {
      // Table might not exist yet — return silently
      setDrafts([]);
      setEntries([]);
    }
  }, [farmId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Notify parent of draft count changes
  useEffect(() => {
    onDraftCountChange?.(drafts.length);
  }, [drafts.length, onDraftCountChange]);

  const handleApprove = async (draft: StoryEntry) => {
    if (uploading === draft.id) return;
    try {
      await fetch(`/api/farms/${farmId}/story-entries/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published', content: editingDraftId === draft.id ? editContent : undefined }),
      });
      setEditingDraftId(null);
      fetchEntries();
    } catch {
      // Error handling
    }
  };

  const handleDiscard = async (draftId: string) => {
    try {
      await fetch(`/api/farms/${farmId}/story-entries/${draftId}`, { method: 'DELETE' });
      fetchEntries();
    } catch {
      // Error handling
    }
  };

  const handleAddPhoto = async (draftId: string, file: File) => {
    setUploading(draftId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('farmId', farmId);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        await fetch(`/api/farms/${farmId}/story-entries/${draftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photo_url: data.url }),
        });
        fetchEntries();
      }
    } catch {
      // Upload failed - user can retry
    } finally {
      setUploading(null);
    }
  };

  const handleWriteEntry = async () => {
    if (!writeContent) return;
    const dateEpoch = Math.floor(new Date(writeDate).getTime() / 1000);

    try {
      let photoUrl: string | undefined;
      if (writePhotoFile) {
        const formData = new FormData();
        formData.append('file', writePhotoFile);
        formData.append('farmId', farmId);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          photoUrl = uploadData.url;
        }
      }

      await fetch(`/api/farms/${farmId}/story-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'manual',
          content: writeContent,
          status: 'published',
          entry_date: dateEpoch,
          photo_url: photoUrl,
        }),
      });

      setWriteContent('');
      setWriteDate(new Date().toISOString().split('T')[0]);
      setWritePhotoFile(null);
      setShowWriteForm(false);
      fetchEntries();
    } catch {
      // Error handling
    }
  };

  const formatDate = (epoch: number) => {
    return new Date(epoch * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Draft Queue Banner */}
      {drafts.length > 0 && !reviewMode && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
          <span className="text-sm">
            You have <strong>{drafts.length}</strong> {drafts.length === 1 ? 'entry' : 'entries'} ready to review
          </span>
          <Button size="sm" className="h-7" onClick={() => setReviewMode(true)}>
            Review
          </Button>
        </div>
      )}

      {/* Draft Review Cards */}
      {reviewMode && drafts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Review Drafts</h3>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setReviewMode(false)}>
              Close
            </Button>
          </div>
          {drafts.map(draft => {
            const typeInfo = TYPE_LABELS[draft.type] || TYPE_LABELS.manual;
            const isEditing = editingDraftId === draft.id;

            return (
              <div key={draft.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(draft.entry_date)}</span>
                </div>

                {isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm">{draft.content}</p>
                )}

                {draft.photo_url && (
                  <img src={draft.photo_url} alt="" className="w-full h-32 object-cover rounded-lg" />
                )}

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleApprove(draft)}
                    disabled={uploading === draft.id}
                  >
                    {uploading === draft.id ? (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-1" />
                    ) : (
                      <Check className="h-3 w-3 mr-1" />
                    )}
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleDiscard(draft.id)}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Discard
                  </Button>
                  {!isEditing ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => { setEditingDraftId(draft.id); setEditContent(draft.content); }}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setEditingDraftId(null)}
                    >
                      Cancel Edit
                    </Button>
                  )}
                  {!draft.photo_url && (
                    <label className="cursor-pointer">
                      <Button variant="ghost" size="sm" className="h-7 text-xs pointer-events-none">
                        <Image className="h-3 w-3 mr-1" />
                        Add Photo
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleAddPhoto(draft.id, file);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Write Entry Button / Form */}
      {!showWriteForm ? (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setShowWriteForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Write Entry
        </Button>
      ) : (
        <div className="border rounded-lg p-3 space-y-2">
          <Input type="date" value={writeDate} onChange={e => setWriteDate(e.target.value)} className="text-sm" />
          <textarea
            value={writeContent}
            onChange={e => setWriteContent(e.target.value)}
            placeholder="What happened on the farm today?"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            rows={3}
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Image className="h-4 w-4" />
            {writePhotoFile ? writePhotoFile.name : 'Add photo (optional)'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => setWritePhotoFile(e.target.files?.[0] || null)}
            />
          </label>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowWriteForm(false); setWriteContent(''); setWritePhotoFile(null); }} className="flex-1">Cancel</Button>
            <Button size="sm" onClick={handleWriteEntry} disabled={!writeContent} className="flex-1">Save</Button>
          </div>
        </div>
      )}

      {/* Published Feed */}
      {entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No story entries yet.</p>
          <p className="text-xs mt-1">Complete tasks and milestones to earn your first entries.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => {
            const typeInfo = TYPE_LABELS[entry.type] || TYPE_LABELS.manual;
            return (
              <div key={entry.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(entry.entry_date)}</span>
                </div>
                <p className="text-sm">{entry.content}</p>
                {entry.photo_url && (
                  <img src={entry.photo_url} alt="" className="w-full h-40 object-cover rounded-lg" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
