import { db } from '@/lib/db';

/**
 * Queues a draft Story entry from a completed task note.
 * Fetches task name from the tasks table, then inserts a story_entries row.
 */
export async function queueTaskNote(taskId: string, note: string, farmId: string): Promise<void> {
  const taskResult = await db.execute({
    sql: 'SELECT title FROM tasks WHERE id = ?',
    args: [taskId],
  });
  const taskName = taskResult.rows[0]?.title as string || 'Unknown task';

  const id = crypto.randomUUID();
  const entryDate = Date.now() / 1000 | 0;
  const content = `Completed task: ${taskName}. ${note}`;

  await db.execute({
    sql: `INSERT INTO story_entries (id, farm_id, type, content, source_id, status, entry_date)
          VALUES (?, ?, 'task', ?, ?, 'draft', ?)`,
    args: [id, farmId, content, `task:${taskId}`, entryDate],
  });
}

/**
 * Queues a draft Story entry when a crop plan milestone date is reached.
 * Fetches crop plan name from the crop_plans table.
 */
export async function queueMilestone(cropPlanId: string, farmId: string): Promise<void> {
  const planResult = await db.execute({
    sql: 'SELECT name FROM crop_plans WHERE id = ?',
    args: [cropPlanId],
  });
  const planName = planResult.rows[0]?.name as string || 'Unknown crop plan';

  const id = crypto.randomUUID();
  const entryDate = Date.now() / 1000 | 0;
  const content = `Planting milestone reached: ${planName} — Planting Window.`;

  await db.execute({
    sql: `INSERT INTO story_entries (id, farm_id, type, content, source_id, status, entry_date)
          VALUES (?, ?, 'milestone', ?, ?, 'draft', ?)`,
    args: [id, farmId, content, `crop_plan:${cropPlanId}`, entryDate],
  });
}

/**
 * Queues a draft Story entry when the Time Machine advances to a new phase.
 * phaseName is passed directly as a parameter.
 */
export async function queuePhaseTransition(phaseName: string, farmId: string): Promise<void> {
  const id = crypto.randomUUID();
  const entryDate = Date.now() / 1000 | 0;
  const content = `Entered phase: ${phaseName}.`;

  await db.execute({
    sql: `INSERT INTO story_entries (id, farm_id, type, content, source_id, status, entry_date)
          VALUES (?, ?, 'phase', ?, ?, 'draft', ?)`,
    args: [id, farmId, content, `phase:${phaseName}`, entryDate],
  });
}
