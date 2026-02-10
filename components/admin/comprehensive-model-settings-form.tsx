'use client';

import { useState, useEffect } from 'react';
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
import { Save, RotateCcw, Zap, MessageSquare, MapPin, Image, FileText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  model_id: string;
  category: string;
  cost_description: string;
  description: string;
}

interface ComprehensiveModelSettingsFormProps {
  currentSettings: {
    // Blog Generation
    blogTextModel: string;
    blogImagePromptModel: string;
    blogImageGenerationModel: string;

    // Lesson Generation
    lessonGenerationModel: string;

    // AI Tutor
    aiTutorModel: string;

    // Map Analysis
    mapAnalysisVisionModel: string;
    mapAnalysisFallbackModel: string;

    // Sketch Generation
    sketchInstructionModel: string;
    sketchImageModel: string;

    // Practice & Personalization
    practiceFeedbackModel: string;
    lessonPersonalizationModel: string;
  };
}

export function ComprehensiveModelSettingsForm({ currentSettings }: ComprehensiveModelSettingsFormProps) {
  const router = useRouter();
  const [settings, setSettings] = useState(currentSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  // Load available models from database
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await fetch('/api/admin/ai-models');
        if (!response.ok) throw new Error('Failed to load models');
        const data = await response.json();
        setModels(data.models);
      } catch (error: any) {
        toast.error('Failed to load model catalog');
        console.error(error);
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadModels();
  }, []);

  // Filter models by category
  const getModelsByCategory = (category: string) => {
    return models
      .filter((m) => m.category === category)
      .map((m) => ({
        value: m.model_id,
        label: `${m.name} (${m.provider})`,
        cost: m.cost_description || 'Unknown',
      }));
  };

  const TEXT_MODELS = getModelsByCategory('text');
  const VISION_MODELS = getModelsByCategory('vision');
  const IMAGE_PROMPT_MODELS = getModelsByCategory('image_prompt');
  const IMAGE_GENERATION_MODELS = getModelsByCategory('image_generation');

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/admin/model-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
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

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(currentSettings);

  if (isLoadingModels) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading model catalog...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Blog Generation Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Blog Generation</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Text Generation</CardTitle>
              <CardDescription>Creates blog post content</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.blogTextModel}
                onValueChange={(value) => setSettings({ ...settings, blogTextModel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEXT_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Image Prompts</CardTitle>
              <CardDescription>Generates image descriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.blogImagePromptModel}
                onValueChange={(value) => setSettings({ ...settings, blogImagePromptModel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_PROMPT_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Image Generation</CardTitle>
              <CardDescription>Creates cover images</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.blogImageGenerationModel}
                onValueChange={(value) => setSettings({ ...settings, blogImageGenerationModel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_GENERATION_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Educational Content Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Educational Content</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lesson Generation</CardTitle>
              <CardDescription>Creates structured lessons</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.lessonGenerationModel}
                onValueChange={(value) => setSettings({ ...settings, lessonGenerationModel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEXT_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lesson Personalization</CardTitle>
              <CardDescription>Adapts content to users</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.lessonPersonalizationModel}
                onValueChange={(value) => setSettings({ ...settings, lessonPersonalizationModel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEXT_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Practice Feedback</CardTitle>
              <CardDescription>Evaluates student work</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.practiceFeedbackModel}
                onValueChange={(value) => setSettings({ ...settings, practiceFeedbackModel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEXT_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Interactive Features Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Interactive Features</h3>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Tutor (Conversational)</CardTitle>
            <CardDescription>Answers student questions in real-time</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={settings.aiTutorModel}
              onValueChange={(value) => setSettings({ ...settings, aiTutorModel: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEXT_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Map Analysis Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Map Analysis & Design</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vision Analysis (Primary)</CardTitle>
              <CardDescription>Analyzes map screenshots</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.mapAnalysisVisionModel}
                onValueChange={(value) => setSettings({ ...settings, mapAnalysisVisionModel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISION_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vision Fallback</CardTitle>
              <CardDescription>Used if primary fails</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.mapAnalysisFallbackModel}
                onValueChange={(value) => setSettings({ ...settings, mapAnalysisFallbackModel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISION_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sketch Generation Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Image className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Sketch & Visual Generation</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Drawing Instructions</CardTitle>
              <CardDescription>Creates sketch prompts</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.sketchInstructionModel}
                onValueChange={(value) => setSettings({ ...settings, sketchInstructionModel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEXT_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sketch Generation</CardTitle>
              <CardDescription>Generates annotated maps</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.sketchImageModel}
                onValueChange={(value) => setSettings({ ...settings, sketchImageModel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_GENERATION_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button variant="outline" onClick={handleReset} disabled={!hasChanges || isSaving}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <div className="flex items-center gap-4">
          {hasChanges && (
            <p className="text-sm text-muted-foreground">
              You have unsaved changes
            </p>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || isSaving} size="lg">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save All Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
