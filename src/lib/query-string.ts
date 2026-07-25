export type QueryValue = string | number | boolean | null | undefined;

export function buildQueryString(
  values: object,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values) as Array<[string, QueryValue]>) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}
