/** Parse fetch response as JSON; surface HTML/error pages as readable messages. */
export async function readJsonResponse<T = Record<string, unknown>>(
  res: Response
): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    if (text.trimStart().startsWith("<")) {
      if (res.status === 401 || res.status === 403) {
        throw new Error("Session expired. Please log in again.");
      }
      throw new Error(
        "Server returned an unexpected response. Try a smaller file (under 4MB) or log in again."
      );
    }
    throw new Error("Could not read server response.");
  }
}
