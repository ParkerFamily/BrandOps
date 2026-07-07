import { Redirect, useLocalSearchParams } from "expo-router";

/** Legacy deep links → submission detail (creators) or review tab (brands). */
export default function ReviewRedirect() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const submissionId = typeof id === "string" ? id.trim() : "";
  if (submissionId) {
    return <Redirect href={`/submission/${submissionId}` as never} />;
  }
  return <Redirect href="/(tabs)/upload" />;
}
