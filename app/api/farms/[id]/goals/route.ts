import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

// Schema for validating goal data
const goalSchema = z.object({
  goal_category: z.string().min(1),
  description: z.string().min(1),
  priority: z.number().min(1).max(5).default(3),
  targets: z.array(z.string()).optional().default([]),
  timeline: z.enum(["short", "medium", "long"]).default("medium"),
});

const createGoalsSchema = z.object({
  goals: z.array(goalSchema),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await params;

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    // Fetch goals for the farm
    const goalsResult = await db.execute({
      sql: "SELECT * FROM farmer_goals WHERE farm_id = ? ORDER BY priority DESC, created_at ASC",
      args: [farmId],
    });

    const goals = goalsResult.rows.map((row: any) => ({
      id: row.id,
      farm_id: row.farm_id,
      goal_category: row.goal_category,
      description: row.description,
      priority: row.priority,
      targets: row.targets ? JSON.parse(row.targets) : [],
      timeline: row.timeline,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return Response.json({ goals });
  } catch (error) {
    console.error("Error fetching goals:", error);
    return Response.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await params;
    const body = await request.json();

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    // Validate input
    const validatedData = createGoalsSchema.parse(body);

    // Insert goals into database
    const insertedGoals = [];
    
    for (const goal of validatedData.goals) {
      const goalId = crypto.randomUUID();
      
      await db.execute({
        sql: `INSERT INTO farmer_goals 
              (id, farm_id, goal_category, description, priority, targets, timeline, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
        args: [
          goalId,
          farmId,
          goal.goal_category,
          goal.description,
          goal.priority,
          JSON.stringify(goal.targets),
          goal.timeline
        ]
      });
      
      insertedGoals.push({
        id: goalId,
        farm_id: farmId,
        goal_category: goal.goal_category,
        description: goal.description,
        priority: goal.priority,
        targets: goal.targets,
        timeline: goal.timeline,
      });
    }

    return Response.json({ goals: insertedGoals });
  } catch (error) {
    console.error("Error creating goals:", error);
    
    if (error instanceof z.ZodError) {
      return Response.json({ 
        error: "Invalid input", 
        details: error.errors 
      }, { status: 400 });
    }
    
    return Response.json({ error: "Failed to create goals" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string, goalId: string }> }) {
  try {
    const session = await requireAuth();
    const { id: farmId, goalId } = await params;
    const body = await request.json();

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    // Validate input
    const validatedData = goalSchema.parse(body);

    // Update goal in database
    await db.execute({
      sql: `UPDATE farmer_goals 
            SET goal_category = ?, description = ?, priority = ?, targets = ?, timeline = ?, updated_at = unixepoch()
            WHERE id = ? AND farm_id = ?`,
      args: [
        validatedData.goal_category,
        validatedData.description,
        validatedData.priority,
        JSON.stringify(validatedData.targets),
        validatedData.timeline,
        goalId,
        farmId
      ]
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error updating goal:", error);
    
    if (error instanceof z.ZodError) {
      return Response.json({ 
        error: "Invalid input", 
        details: error.errors 
      }, { status: 400 });
    }
    
    return Response.json({ error: "Failed to update goal" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string, goalId: string }> }) {
  try {
    const session = await requireAuth();
    const { id: farmId, goalId } = await params;

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    // Delete goal from database
    await db.execute({
      sql: "DELETE FROM farmer_goals WHERE id = ? AND farm_id = ?",
      args: [goalId, farmId]
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting goal:", error);
    return Response.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}