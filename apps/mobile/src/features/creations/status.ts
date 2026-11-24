import type { PillBadgeVariant } from "@/components/ui/pill-badge";

export interface CreationStatusBadgeInfo {
  variant: PillBadgeVariant;
  label: string;
}

export function getCreationStatusBadge(status?: string): CreationStatusBadgeInfo {
  const normalized = status?.toLowerCase();
  if (normalized === "queued" || normalized === "rendering") {
    return { variant: "rendering", label: "Rendering" };
  }
  if (normalized === "ready") {
    return { variant: "ready", label: "Ready" };
  }
  if (normalized === "failed") {
    return { variant: "failed", label: "Failed" };
  }
  if (normalized === "submission_uncertain") {
    return { variant: "rendering", label: "Export recovery" };
  }
  return { variant: "draft", label: "Draft" };
}

export function isSubmissionUncertain(status?: string): boolean {
  return status?.toLowerCase() === "submission_uncertain";
}
