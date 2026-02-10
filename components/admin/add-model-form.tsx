'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface AddModelFormProps {
  onSuccess: () => void;
}

export function AddModelForm({ onSuccess }: AddModelFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    model_id: '',
    category: 'text' as 'text' | 'vision' | 'image_generation' | 'image_prompt',
    cost_description: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add model');
      }

      toast.success('Model added successfully!');
      setOpen(false);
      setFormData({
        name: '',
        provider: '',
        model_id: '',
        category: 'text',
        cost_description: '',
        description: '',
      });
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add model');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Model
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add AI Model</DialogTitle>
          <DialogDescription>
            Add a new AI model to the catalog. You can then select it in the settings.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Model Name</Label>
            <Input
              id="name"
              placeholder="e.g., GPT-4 Turbo"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="provider">Provider</Label>
            <Input
              id="provider"
              placeholder="e.g., OpenAI, Anthropic, Google"
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="model_id">Model ID (OpenRouter)</Label>
            <Input
              id="model_id"
              placeholder="e.g., openai/gpt-4-turbo"
              value={formData.model_id}
              onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              The exact model identifier used in OpenRouter API calls
            </p>
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value: any) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text Generation</SelectItem>
                <SelectItem value="vision">Vision/Image Analysis</SelectItem>
                <SelectItem value="image_generation">Image Generation</SelectItem>
                <SelectItem value="image_prompt">Image Prompt Creation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="cost_description">Cost Description (optional)</Label>
            <Input
              id="cost_description"
              placeholder="e.g., $0.01 per 1k tokens or Free"
              value={formData.cost_description}
              onChange={(e) => setFormData({ ...formData, cost_description: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of when to use this model"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Model'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
