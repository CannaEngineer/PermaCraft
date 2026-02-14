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
