import { auth } from "@/auth";
import { errorResponse } from "@/lib/api-response";

/**
 * Verify that the request comes from an authenticated backoffice user.
 * Returns the session if valid, or a 401 response if not.
 */
export async function requireSession() {
  const session = await auth();

  if (!session?.user) {
    return { session: null, error: errorResponse("Unauthorized", 401) };
  }

  return { session, error: null };
}
