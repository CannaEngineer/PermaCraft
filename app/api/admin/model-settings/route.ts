import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { clearModelSettingsCache } from '@/lib/ai/model-settings';
import { z } from 'zod';

const settingsSchema = z.object({
  // Blog Generation
  blogTextModel: z.string().min(1),
  blogImagePromptModel: z.string().min(1),
  blogImageGenerationModel: z.string().min(1),

  // Lesson Generation
  lessonGenerationModel: z.string().min(1),

  // AI Tutor
  aiTutorModel: z.string().min(1),

  // Map Analysis
  mapAnalysisVisionModel: z.string().min(1),
  mapAnalysisFallbackModel: z.string().min(1),

  // Sketch Generation
  sketchInstructionModel: z.string().min(1),
  sketchImageModel: z.string().min(1),

  // Practice & Personalization
  practiceFeedbackModel: z.string().min(1),
  lessonPersonalizationModel: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    // Verify admin user
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userResult = await db.execute({
      sql: 'SELECT is_admin FROM users WHERE id = ?',
      args: [session.user.id],
    });

    if (userResult.rows.length === 0 || !(userResult.rows[0] as any).is_admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = settingsSchema.parse(body);

    // Update settings
    await db.execute({
      sql: `
        INSERT INTO model_settings (
          id,
          blog_text_model,
          blog_image_prompt_model,
          blog_image_generation_model,
          lesson_generation_model,
          ai_tutor_model,
          map_analysis_vision_model,
          map_analysis_fallback_model,
          sketch_instruction_model,
          sketch_image_model,
          practice_feedback_model,
          lesson_personalization_model,
          updated_at,
          updated_by
        )
        VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), ?)
        ON CONFLICT(id) DO UPDATE SET
          blog_text_model = excluded.blog_text_model,
          blog_image_prompt_model = excluded.blog_image_prompt_model,
          blog_image_generation_model = excluded.blog_image_generation_model,
          lesson_generation_model = excluded.lesson_generation_model,
          ai_tutor_model = excluded.ai_tutor_model,
          map_analysis_vision_model = excluded.map_analysis_vision_model,
          map_analysis_fallback_model = excluded.map_analysis_fallback_model,
          sketch_instruction_model = excluded.sketch_instruction_model,
          sketch_image_model = excluded.sketch_image_model,
          practice_feedback_model = excluded.practice_feedback_model,
          lesson_personalization_model = excluded.lesson_personalization_model,
          updated_at = excluded.updated_at,
          updated_by = excluded.updated_by
      `,
      args: [
        data.blogTextModel,
        data.blogImagePromptModel,
        data.blogImageGenerationModel,
        data.lessonGenerationModel,
        data.aiTutorModel,
        data.mapAnalysisVisionModel,
        data.mapAnalysisFallbackModel,
        data.sketchInstructionModel,
        data.sketchImageModel,
        data.practiceFeedbackModel,
        data.lessonPersonalizationModel,
        session.user.id,
      ],
    });

    // Clear the cache so new settings are loaded immediately
    clearModelSettingsCache();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save model settings error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save settings' },
      { status: 500 }
    );
  }
}
