import { unstable_rethrow } from "next/navigation";

export const OFFLINE = "Couldn't reach the server — check your connection and try again.";

/**
 * Wraps a server action used with useActionState. If the request itself fails
 * (offline, server unreachable), the form shows an error instead of the whole
 * page crashing. Redirects and other Next.js signals still pass through.
 */
export function withNetworkError<S>(
  action: (state: S, formData: FormData) => Promise<S>,
  onError: (state: S, formData: FormData) => S,
) {
  return async (state: S, formData: FormData): Promise<S> => {
    try {
      return await action(state, formData);
    } catch (e) {
      unstable_rethrow(e);
      console.error(e);
      return onError(state, formData);
    }
  };
}
