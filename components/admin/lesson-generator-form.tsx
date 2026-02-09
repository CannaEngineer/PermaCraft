'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface Topic {
  id: string;
  name: string;
  slug: string;
}

interface LessonGeneratorFormProps {
  topics: Topic[];
}

export function LessonGeneratorForm({ topics }: LessonGeneratorFormProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    topic_id: '',
    title: '',
    difficulty: 'beginner',
    estimated_minutes: 15,
    learning_objectives: '',
    key_concepts: '',
    quiz_count: 2,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const response = await fetch('/api/admin/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Generation failed');
      }

      const data = await response.json();
      toast.success('Lesson generated successfully!');
      router.push(`/admin/content/generations/${data.generation_id}`);
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate lesson');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Topic Selection */}
      <div className="space-y-2">
        <Label htmlFor="topic_id">Topic *</Label>
        <Select
          value={formData.topic_id}
          onValueChange={(value) => setFormData({ ...formData, topic_id: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a topic" />
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

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Lesson Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Zone 3 Design Principles"
          required
        />
      </div>

      {/* Difficulty and Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="difficulty">Difficulty *</Label>
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

        <div className="space-y-2">
          <Label htmlFor="estimated_minutes">Duration (minutes) *</Label>
          <Select
            value={formData.estimated_minutes.toString()}
            onValueChange={(value) => setFormData({ ...formData, estimated_minutes: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 minutes</SelectItem>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="20">20 minutes</SelectItem>
              <SelectItem value="25">25 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Learning Objectives */}
      <div className="space-y-2">
        <Label htmlFor="learning_objectives">Learning Objectives *</Label>
        <Textarea
          id="learning_objectives"
          value={formData.learning_objectives}
          onChange={(e) => setFormData({ ...formData, learning_objectives: e.target.value })}
          placeholder="What should students learn from this lesson? (separate with commas or line breaks)"
          rows={3}
          required
        />
        <p className="text-xs text-muted-foreground">
          Example: Understand Zone 3 characteristics, Select appropriate plants for Zone 3, Plan maintenance schedules
        </p>
      </div>

      {/* Key Concepts */}
      <div className="space-y-2">
        <Label htmlFor="key_concepts">Key Concepts to Cover *</Label>
        <Textarea
          id="key_concepts"
          value={formData.key_concepts}
          onChange={(e) => setFormData({ ...formData, key_concepts: e.target.value })}
          placeholder="Main ideas and topics to include (separate with commas or line breaks)"
          rows={3}
          required
        />
        <p className="text-xs text-muted-foreground">
          Example: Zone 3 definition, Access patterns, Plant selection criteria, Maintenance frequency, Example designs
        </p>
      </div>

      {/* Quiz Count */}
      <div className="space-y-2">
        <Label htmlFor="quiz_count">Number of Quiz Questions *</Label>
        <Select
          value={formData.quiz_count.toString()}
          onValueChange={(value) => setFormData({ ...formData, quiz_count: parseInt(value) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">No quiz</SelectItem>
            <SelectItem value="1">1 question</SelectItem>
            <SelectItem value="2">2 questions</SelectItem>
            <SelectItem value="3">3 questions</SelectItem>
            <SelectItem value="4">4 questions</SelectItem>
            <SelectItem value="5">5 questions</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Submit Button */}
      <Button type="submit" disabled={isGenerating} className="w-full" size="lg">
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Generating Lesson...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5 mr-2" />
            Generate Lesson with AI
          </>
        )}
      </Button>

      {isGenerating && (
        <p className="text-sm text-center text-muted-foreground">
          This may take 15-30 seconds. Please wait...
        </p>
      )}
    </form>
  );
}
