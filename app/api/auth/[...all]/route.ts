import { auth } from "@/lib/auth";

// Better Auth uses a single handler for all methods and paths
export const GET = auth.handler;
export const POST = auth.handler;
