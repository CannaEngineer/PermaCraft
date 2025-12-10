import { db } from "@/lib/db";
import { FarmerGoal } from "@/lib/db/schema";

/**
 * Gets farmer goals formatted for AI context
 * 
 * @param farmId - The ID of the farm to get goals for
 * @returns Formatted string containing goals information for AI prompts
 */
export const getGoalsForAIContext = async (farmId: string): Promise<string> => {
  try {
    const goalsResult = await db.execute({
      sql: `SELECT goal_category, description, priority, targets, timeline 
            FROM farmer_goals 
            WHERE farm_id = ? AND status = 'active'
            ORDER BY priority DESC, created_at ASC`,
      args: [farmId],
    });

    const goals = goalsResult.rows as unknown as FarmerGoal[];

    if (goals.length === 0) {
      return 'No specific goals defined yet. The farmer has not set any specific objectives.';
    }

    const goalsList = goals.map(goal => {
      const priorityMap: Record<number, string> = {
        1: 'lowest',
        2: 'low',
        3: 'medium',
        4: 'high',
        5: 'highest'
      };
      const priorityText = priorityMap[goal.priority] || 'medium';

      const timelineText = {
        'short': 'short-term (1 year)',
        'medium': 'medium-term (2-3 years)', 
        'long': 'long-term (4+ years)'
      }[goal.timeline as keyof { short: string; medium: string; long: string }] || goal.timeline;

      let goalText = `  - ${goal.description} (${goal.goal_category}, ${priorityText} priority, ${timelineText})`;
      
      if (goal.targets) {
        try {
          const targets = JSON.parse(goal.targets as string);
          if (Array.isArray(targets) && targets.length > 0) {
            goalText += ` - Targets: ${targets.join(', ')}`;
          }
        } catch (e) {
          console.error("Failed to parse targets for goal:", goal.id);
        }
      }
      
      return goalText;
    }).join('\n');

    return `
FARMER GOALS (${goals.length} total):
${goalsList}

When making recommendations, prioritize suggestions that help achieve these specific goals, 
especially those with higher priority ratings. Align your suggestions with the appropriate 
timeline horizons (short, medium, or long-term).
    `.trim();
  } catch (error) {
    console.error("Error fetching goals for AI context:", error);
    return 'Error retrieving farmer goals. Proceed with general permaculture recommendations.';
  }
};