import { deleteSession } from "@/lib/auth/session";

export async function POST() {
  try {
    // Delete JWT session cookie
    await deleteSession();

    return Response.json({ success: true });
  } catch (error) {
    console.error("Sign-out error:", error);
    return Response.json({ error: "Sign-out failed" }, { status: 500 });
  }
}
