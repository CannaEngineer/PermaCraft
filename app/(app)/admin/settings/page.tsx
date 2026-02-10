import { requireAdmin } from '@/lib/auth/admin';
import { getModelSettings } from '@/lib/ai/model-settings';
import { ComprehensiveModelSettingsForm } from '@/components/admin/comprehensive-model-settings-form';
import { ModelCatalog } from '@/components/admin/model-catalog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Settings, Zap, Info } from 'lucide-react';

export default async function AdminSettingsPage() {
  await requireAdmin();

  // Get current model settings
  const settings = await getModelSettings();

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">AI Model Configuration</h1>
          <p className="text-muted-foreground">
            Fine-tune AI models for each task to optimize cost and quality
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Segmented Model Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Why different models for different tasks?</strong> Each AI task has unique requirements.
            Blog generation needs creativity, map analysis needs vision capabilities, and the AI tutor
            needs fast conversational responses.
          </p>
          <p>
            <strong>Cost Optimization:</strong> Use cheaper models like Grok for text generation and save
            premium models for tasks that truly need them. Free vision models work great for map analysis.
          </p>
          <p>
            <strong>Quality Tuning:</strong> Test different models to find the sweet spot between cost and
            quality for each use case. Changes take effect immediately.
          </p>
        </CardContent>
      </Card>

      {/* Model Catalog Management */}
      <ModelCatalog />

      <Separator className="my-8" />

      {/* Active Model Configuration */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Active Model Configuration</h2>
        <p className="text-muted-foreground mb-6">
          Select which models to use for each task from your catalog above.
        </p>
        <ComprehensiveModelSettingsForm
          currentSettings={{
            blogTextModel: settings.blog_text_model,
            blogImagePromptModel: settings.blog_image_prompt_model,
            blogImageGenerationModel: settings.blog_image_generation_model,
            lessonGenerationModel: settings.lesson_generation_model,
            aiTutorModel: settings.ai_tutor_model,
            mapAnalysisVisionModel: settings.map_analysis_vision_model,
            mapAnalysisFallbackModel: settings.map_analysis_fallback_model,
            sketchInstructionModel: settings.sketch_instruction_model,
            sketchImageModel: settings.sketch_image_model,
            practiceFeedbackModel: settings.practice_feedback_model,
            lessonPersonalizationModel: settings.lesson_personalization_model,
          }}
        />
      </div>
    </div>
  );
}
