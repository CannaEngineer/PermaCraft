'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface ModelSettingsFormProps {
  currentSettings: {
    textModel: string;
    imagePromptModel: string;
    imageGenerationModel: string;
  };
}

// Available models by category
const TEXT_MODELS = [
  { value: 'x-ai/grok-4.1-fast', label: 'Grok 4.1 Fast (Recommended - Cheap)', cost: '$0.002' },
  { value: 'x-ai/grok-2-1212', label: 'Grok 2', cost: '$0.01' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (Premium)', cost: '$0.20' },
  { value: 'openai/gpt-4o', label: 'GPT-4o', cost: '$0.15' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', cost: '$0.02' },
  { value: 'meta-llama/llama-3.2-90b-vision-instruct:free', label: 'Llama 3.2 90B (Free)', cost: 'Free' },
];

const IMAGE_PROMPT_MODELS = [
  { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Recommended)', cost: '$0.001' },
  { value: 'x-ai/grok-4.1-fast', label: 'Grok 4.1 Fast', cost: '$0.002' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', cost: '$0.02' },
];

const IMAGE_GENERATION_MODELS = [
  { value: 'openai/dall-e-3', label: 'DALL-E 3 (Reliable)', cost: '$0.04' },
  { value: 'black-forest-labs/flux-1.1-pro', label: 'FLUX 1.1 Pro', cost: '$0.04' },
  { value: 'stability-ai/stable-diffusion-xl-1024-v1-0', label: 'Stable Diffusion XL', cost: '$0.003' },
  { value: 'google/gemini-2.5-flash-image', label: 'Gemini Flash Image (Experimental)', cost: '$0.002' },
];

export function ModelSettingsForm({ currentSettings }: ModelSettingsFormProps) {
  const router = useRouter();
  const [settings, setSettings] = useState(currentSettings);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/admin/model-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textModel: settings.textModel,
          imagePromptModel: settings.imagePromptModel,
          imageGenerationModel: settings.imageGenerationModel,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      toast.success('Model settings saved successfully!');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(currentSettings);
    toast.info('Reset to current saved settings');
  };

  const hasChanges =
    settings.textModel !== currentSettings.textModel ||
    settings.imagePromptModel !== currentSettings.imagePromptModel ||
    settings.imageGenerationModel !== currentSettings.imageGenerationModel;

  // Calculate estimated cost per post
  const getModelCost = (modelValue: string, models: typeof TEXT_MODELS) => {
    const model = models.find(m => m.value === modelValue);
    return model?.cost || 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Text Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Text Generation Model</CardTitle>
          <CardDescription>
            Used for blog content, topic discovery, and text-based AI tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Model</Label>
            <Select
              value={settings.textModel}
              onValueChange={(value) => setSettings({ ...settings, textModel: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEXT_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label} - {model.cost}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            <strong>Current:</strong> {settings.textModel}
            <br />
            <strong>Cost per post:</strong> {getModelCost(settings.textModel, TEXT_MODELS)}
          </div>
        </CardContent>
      </Card>

      {/* Image Prompt Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Image Prompt Model</CardTitle>
          <CardDescription>
            Creates detailed prompts for image generation (faster/cheaper models work fine)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Model</Label>
            <Select
              value={settings.imagePromptModel}
              onValueChange={(value) =>
                setSettings({ ...settings, imagePromptModel: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_PROMPT_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label} - {model.cost}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            <strong>Current:</strong> {settings.imagePromptModel}
            <br />
            <strong>Cost per post:</strong>{' '}
            {getModelCost(settings.imagePromptModel, IMAGE_PROMPT_MODELS)}
          </div>
        </CardContent>
      </Card>

      {/* Image Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Image Generation Model</CardTitle>
          <CardDescription>
            Generates cover images for blog posts (quality vs cost trade-off)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Model</Label>
            <Select
              value={settings.imageGenerationModel}
              onValueChange={(value) =>
                setSettings({ ...settings, imageGenerationModel: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_GENERATION_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label} - {model.cost}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            <strong>Current:</strong> {settings.imageGenerationModel}
            <br />
            <strong>Cost per post:</strong>{' '}
            {getModelCost(settings.imageGenerationModel, IMAGE_GENERATION_MODELS)}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleReset} disabled={!hasChanges || isSaving}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {hasChanges && (
        <div className="text-sm text-muted-foreground text-center">
          You have unsaved changes
        </div>
      )}
    </div>
  );
}
