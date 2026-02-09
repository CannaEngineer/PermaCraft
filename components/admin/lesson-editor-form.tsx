'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface LessonEditorFormProps {
  lesson: {
    id: string;
    title: string;
    slug: string;
    description: string;
    difficulty: string;
    estimated_minutes: number;
    xp_reward: number;
    topic_id: string;
    content: {
      core_content: string;
      quiz: any[];
      source_attribution?: string;
      license?: string;
    };
  };
  topics: Array<{ id: string; name: string; slug: string }>;
}

export function LessonEditorForm({ lesson, topics }: LessonEditorFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: lesson.title,
    description: lesson.description,
    difficulty: lesson.difficulty,
    estimated_minutes: lesson.estimated_minutes,
    xp_reward: lesson.xp_reward,
    topic_id: lesson.topic_id,
    core_content: lesson.content.core_content,
    source_attribution: lesson.content.source_attribution || '',
    license: lesson.content.license || 'CC BY-NC-SA',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/content/lessons/${lesson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          content: {
            core_content: formData.core_content,
            quiz: lesson.content.quiz, // Keep existing quiz for now
            source_attribution: formData.source_attribution,
            license: formData.license,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to save');

      router.push('/admin/content/library');
      router.refresh();
    } catch (error) {
      alert('Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/content/library">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Library
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Edit Lesson</h1>
            <p className="text-muted-foreground">{lesson.title}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="basics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="basics">Basics</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="quiz">Quiz</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        {/* Basics Tab */}
        <TabsContent value="basics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="topic">Topic</Label>
                  <Select
                    value={formData.topic_id}
                    onValueChange={(value) => setFormData({ ...formData, topic_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>
                          {topic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.estimated_minutes}
                    onChange={(e) =>
                      setFormData({ ...formData, estimated_minutes: parseInt(e.target.value) })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="xp">XP Reward</Label>
                  <Input
                    id="xp"
                    type="number"
                    value={formData.xp_reward}
                    onChange={(e) =>
                      setFormData({ ...formData, xp_reward: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Lesson Content</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.core_content}
                onChange={(e) => setFormData({ ...formData, core_content: e.target.value })}
                rows={20}
                className="font-mono text-sm"
                placeholder="Markdown content..."
              />
              <p className="text-sm text-muted-foreground mt-2">
                Use Markdown formatting. The content will be rendered with proper styling.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quiz Tab */}
        <TabsContent value="quiz">
          <Card>
            <CardHeader>
              <CardTitle>Quiz Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lesson.content.quiz.map((q: any, i: number) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <p className="font-medium mb-2">
                      {i + 1}. {q.question}
                    </p>
                    <ul className="space-y-1 text-sm">
                      {q.options.map((opt: string, j: number) => (
                        <li
                          key={j}
                          className={j === q.correct ? 'text-green-600 font-medium' : ''}
                        >
                          {j === q.correct ? '✓ ' : '  '}
                          {opt}
                        </li>
                      ))}
                    </ul>
                    {q.explanation && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Explanation: {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Quiz editing coming soon. For now, questions are preserved from generation.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metadata Tab */}
        <TabsContent value="metadata">
          <Card>
            <CardHeader>
              <CardTitle>Metadata & Attribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="source">Source Attribution</Label>
                <Textarea
                  id="source"
                  value={formData.source_attribution}
                  onChange={(e) =>
                    setFormData({ ...formData, source_attribution: e.target.value })
                  }
                  rows={3}
                  placeholder="Based on permaculture principles from Mollison, Holmgren..."
                />
              </div>

              <div>
                <Label htmlFor="license">License</Label>
                <Input
                  id="license"
                  value={formData.license}
                  onChange={(e) => setFormData({ ...formData, license: e.target.value })}
                />
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <strong>Slug:</strong> {lesson.slug}
                </p>
                <p>
                  <strong>Lesson ID:</strong> {lesson.id}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
