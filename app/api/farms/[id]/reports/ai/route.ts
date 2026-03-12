/**
 * AI Farm Report Generation API Route
 *
 * POST /api/farms/[id]/reports/ai
 *
 * Uses MiniMax M2.5 to generate comprehensive, structured farm reports
 * including planting schedules, cost estimates, maintenance calendars,
 * and implementation plans.
 *
 * M2.5 is chosen for this task because of its strengths in:
 * - Structured document generation (Excel/Word-like output)
 * - Planning optimization and task sequencing
 * - Token-efficient output with high accuracy
 */

import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { openrouter } from '@/lib/ai/openrouter';
import {
  FARM_REPORT_SYSTEM_PROMPT,
  IMPLEMENTATION_PLAN_SYSTEM_PROMPT,
  createReportGenerationPrompt,
  createImplementationPlanPrompt,
} from '@/lib/ai/report-prompts';
import { safeJsonParse } from '@/lib/ai/json-utils';
import { checkRateLimit, rateLimitHeaders } from '@/lib/ai/rate-limit';
import { getFarmReportModel, getFarmPlanningModel } from '@/lib/ai/model-settings';
import { NextRequest } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Reports can take longer than standard analysis

const reportRequestSchema = z.object({
  reportType: z.enum(['comprehensive', 'implementation_plan']),
  reportFocus: z.string().max(500).optional(),
});

/**
 * Fallback models if MiniMax M2.5 is unavailable.
 * Ordered by suitability for structured document generation.
 */
const REPORT_FALLBACK_MODELS = [
  'google/gemini-2.5-flash-lite',
  'x-ai/grok-4.1-fast',
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await params;

    // Rate limit: 5 reports per hour (reports are expensive)
    const rateCheck = checkRateLimit(session.user.id, 'farm-report', 5);
    if (!rateCheck.allowed) {
      return Response.json(
        { error: 'Rate limit exceeded. Please wait before generating another report.' },
        { status: 429, headers: rateLimitHeaders(rateCheck) }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = reportRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { reportType, reportFocus } = parsed.data;

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: 'SELECT * FROM farms WHERE id = ? AND user_id = ?',
      args: [farmId, session.user.id],
    });
    if (farmResult.rows.length === 0) {
      return Response.json({ error: 'Farm not found' }, { status: 404 });
    }
    const farm = farmResult.rows[0] as any;

    // Fetch all farm data in parallel
    const [zonesResult, plantingsResult, goalsResult, harvestResult] = await Promise.all([
      db.execute({
        sql: 'SELECT name, zone_type, properties FROM zones WHERE farm_id = ?',
        args: [farmId],
      }),
      db.execute({
        sql: `SELECT p.planted_year, s.common_name, s.scientific_name, s.layer,
              s.is_native, s.permaculture_functions
              FROM plantings p
              JOIN species s ON p.species_id = s.id
              WHERE p.farm_id = ?`,
        args: [farmId],
      }),
      db.execute({
        sql: `SELECT goal_category, description, priority, target_date
              FROM farmer_goals WHERE farm_id = ? AND status = 'active'`,
        args: [farmId],
      }),
      db.execute({
        sql: `SELECT strftime('%Y-%m', harvest_date, 'unixepoch') as month,
              SUM(quantity) as total_quantity, unit, COUNT(*) as harvest_count
              FROM harvest_logs WHERE farm_id = ?
              GROUP BY month, unit ORDER BY month DESC LIMIT 24`,
        args: [farmId],
      }),
    ]);

    const zones = zonesResult.rows as any[];
    const plantings = plantingsResult.rows as any[];
    const goals = goalsResult.rows as any[];
    const harvests = harvestResult.rows as any[];

    // Build prompt based on report type
    let systemPrompt: string;
    let userPrompt: string;

    if (reportType === 'implementation_plan') {
      systemPrompt = IMPLEMENTATION_PLAN_SYSTEM_PROMPT;
      userPrompt = createImplementationPlanPrompt(farm, zones, plantings, goals, reportFocus);
    } else {
      systemPrompt = FARM_REPORT_SYSTEM_PROMPT;
      userPrompt = createReportGenerationPrompt(
        farm,
        zones,
        plantings,
        goals,
        harvests.length > 0 ? harvests : undefined,
        reportFocus
      );
    }

    // Get the configured model (defaults to minimax/minimax-m2.5)
    const primaryModel = reportType === 'implementation_plan'
      ? await getFarmPlanningModel()
      : await getFarmReportModel();

    // Try primary model, then fallbacks
    const modelsToTry = [primaryModel, ...REPORT_FALLBACK_MODELS];
    let response: any = null;
    let modelUsed: string = primaryModel;

    for (const model of modelsToTry) {
      try {
        response = await openrouter.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3, // Low temperature for structured, consistent output
          max_tokens: 8000,
        });
        modelUsed = model;
        break;
      } catch (error: any) {
        const status = error?.status || error?.response?.status;
        if (status === 429 || status === 503 || status === 502) {
          console.warn(`Model ${model} unavailable (${status}), trying next fallback...`);
          continue;
        }
        throw error;
      }
    }

    if (!response?.choices?.[0]?.message?.content) {
      return Response.json(
        { error: 'All models failed to generate report. Please try again later.' },
        { status: 503 }
      );
    }

    const rawContent = response.choices[0].message.content;

    // Parse the JSON response
    const reportData = safeJsonParse(rawContent, null);

    if (!reportData) {
      // If JSON parsing fails, return the raw text as a fallback
      return Response.json({
        reportType,
        model: modelUsed,
        data: null,
        rawContent,
        parseError: true,
        message: 'Report generated but could not be parsed as structured data. Raw content included.',
      });
    }

    // Store the report in the database
    const reportId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO ai_analyses (id, farm_id, user_query, ai_response, model, created_at)
            VALUES (?, ?, ?, ?, ?, unixepoch())`,
      args: [
        reportId,
        farmId,
        `[AI Report: ${reportType}] ${reportFocus || 'Full farm report'}`,
        rawContent,
        modelUsed,
      ],
    });

    return Response.json({
      reportId,
      reportType,
      model: modelUsed,
      data: reportData,
    });
  } catch (error: any) {
    console.error('Farm report generation failed:', error);
    return Response.json(
      { error: 'Failed to generate report', detail: error?.message },
      { status: 500 }
    );
  }
}
