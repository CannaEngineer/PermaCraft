import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

const handler = async (req: NextRequest) => {
  console.log(`[AUTH] Request received for: ${req.method} ${req.url}`);

  try {
    const response = await auth.handler(req);
    console.log(`[AUTH] Response status: ${response.status}`);
    return response;
  } catch (error) {
    console.error('[AUTH] Handler error:', error);
    console.error('[AUTH] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
};

// Better Auth uses a single handler for all methods and paths
export const GET = handler;
export const POST = handler;
