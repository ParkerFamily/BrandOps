/** True only while waiting for the first realtime payload and nothing to show yet. */
export function showEmptyLoading(loading: boolean, count: number): boolean {
  return loading && count === 0;
}
