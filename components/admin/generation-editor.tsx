'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import ReactMarkdown from 'react-markdown';
import { CheckCircle, Loader2, Eye, Edit, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface GenerationEditorProps {
  generation: any;
}

export function GenerationEditor({ generation }: GenerationEditorProps) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const initialContent = generation.edited_output || generation.raw_output;
  const [editedContent, setEditedContent] = useState(initialContent.core_content);
  const [editedQuiz, setEditedQuiz] = useState(JSON.stringify(initialContent.quiz, null, 2));

  const handleSaveEdits = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/content/generations/${generation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edited_output: {
            ...initialContent,
            core_content: editedContent,
            quiz: JSON.parse(editedQuiz),
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to save edits');

      toast.success('Edits saved successfully');
      setEditMode(false);
    } catch (error) {
      toast.error('Failed to save edits');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const response = await fetch(`/api/admin/content/publish/${generation.id}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to publish');
      }

      toast.success('Lesson published successfully!');
      router.push('/admin/content');
    } catch (error: any) {
      toast.error(error.message || 'Failed to publish lesson');
      console.error(error);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this generation? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/content/generations/${generation.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      toast.success('Generation deleted');
      router.push('/admin/content');
    } catch (error) {
      toast.error('Failed to delete generation');
      console.error(error);
    }
  };

  const currentContent = editMode ? editedContent : initialContent.core_content;
  const currentQuiz = editMode ? JSON.parse(editedQuiz) : initialContent.quiz;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{generation.title}</CardTitle>
              <CardDescription className="mt-2">
                {generation.topic_name} • {generation.difficulty} • {generation.estimated_minutes} min • {generation.xp_reward} XP
              </CardDescription>
            </div>
            <Badge variant={generation.status === 'published' ? 'default' : 'secondary'}>
              {generation.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button onClick={() => setEditMode(!editMode)} variant="outline">
              {editMode ? <Eye className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
              {editMode ? 'Preview Mode' : 'Edit Mode'}
            </Button>

            {editMode && (
              <Button onClick={handleSaveEdits} disabled={isSaving} variant="outline">
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Edits
              </Button>
            )}

            <Button onClick={handlePublish} disabled={isPublishing || generation.status === 'published'}>
              {isPublishing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Publish Lesson
                </>
              )}
            </Button>

            <Button onClick={handleDelete} variant="destructive" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="quiz">Quiz ({currentQuiz?.length || 0})</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Lesson Content</CardTitle>
              <CardDescription>
                {editMode ? 'Edit the markdown content below' : 'Preview of the lesson content'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editMode ? (
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={25}
                  className="font-mono text-sm"
                />
              ) : (
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <ReactMarkdown>{currentContent}</ReactMarkdown>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quiz Tab */}
        <TabsContent value="quiz">
          <Card>
            <CardHeader>
              <CardTitle>Quiz Questions</CardTitle>
              <CardDescription>
                {editMode ? 'Edit quiz questions in JSON format' : 'Preview of quiz questions'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editMode ? (
                <Textarea
                  value={editedQuiz}
                  onChange={(e) => setEditedQuiz(e.target.value)}
                  rows={20}
                  className="font-mono text-sm"
                />
              ) : (
                <div className="space-y-6">
                  {currentQuiz && currentQuiz.length > 0 ? (
                    currentQuiz.map((q: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <div className="font-semibold mb-3">Question {idx + 1}: {q.question}</div>
                        <div className="space-y-2 mb-3">
                          {q.options.map((opt: string, optIdx: number) => (
                            <div
                              key={optIdx}
                              className={`p-2 rounded ${
                                optIdx === q.correct ? 'bg-green-100 dark:bg-green-900/30 font-medium' : 'bg-muted'
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}. {opt}
                            </div>
                          ))}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <strong>Explanation:</strong> {q.explanation}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No quiz questions</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metadata Tab */}
        <TabsContent value="metadata">
          <Card>
            <CardHeader>
              <CardTitle>Generation Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Learning Objectives</Label>
                <div className="text-sm text-muted-foreground mt-1">
                  {generation.input_prompt.learning_objectives}
                </div>
              </div>
              <Separator />
              <div>
                <Label>Key Concepts</Label>
                <div className="text-sm text-muted-foreground mt-1">
                  {generation.input_prompt.key_concepts}
                </div>
              </div>
              <Separator />
              <div>
                <Label>Source Attribution</Label>
                <div className="text-sm text-muted-foreground mt-1">
                  {initialContent.source_attribution}
                </div>
              </div>
              <Separator />
              <div>
                <Label>License</Label>
                <div className="text-sm text-muted-foreground mt-1">
                  {initialContent.license}
                </div>
              </div>
              <Separator />
              <div>
                <Label>Suggested Images</Label>
                <div className="space-y-2 mt-1">
                  {initialContent.images?.map((img: any, idx: number) => (
                    <div key={idx} className="text-sm text-muted-foreground border-l-2 pl-3">
                      {img.description}
                    </div>
                  )) || <p className="text-sm text-muted-foreground">No images suggested</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
