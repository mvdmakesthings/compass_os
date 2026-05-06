export type Category = "in_progress" | "upcoming";
export type Status = "on_track" | "at_risk" | "blocked" | "complete" | "unknown";

export const CATEGORIES: Category[] = ["in_progress", "upcoming"];
export const STATUSES: Status[] = ["on_track", "at_risk", "blocked", "complete", "unknown"];

export const STATUS_LABELS: Record<Status, string> = {
  on_track: "On track",
  at_risk: "At risk",
  blocked: "Blocked",
  complete: "Complete",
  unknown: "Unknown",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  in_progress: "In Progress / Under Warranty",
  upcoming: "Upcoming Features",
};

export type Team = {
  id: number;
  name: string;
  archived_at: string | null;
  created_at: string;
};

export type Feature = {
  id?: number;
  category: Category;
  position?: number;
  feature_name: string;
  description: string;
  business_value: string;
  target_go_live: string;
  status: Status;
  notes: string;
};

export type DigestSummary = {
  id: number;
  team: Team;
  sprint_number: number;
  year: number;
  digest_date: string;
  feature_count: number;
};

export type Digest = {
  id: number;
  team: Team;
  sprint_number: number;
  year: number;
  digest_date: string;
  header_notes: string;
  footer_notes: string;
  features: (Feature & { id: number; position: number })[];
  created_at: string;
  updated_at: string;
};

export type DigestPayload = {
  team_id: number;
  sprint_number: number;
  year: number;
  digest_date: string;
  header_notes: string;
  footer_notes: string;
  features: Feature[];
};

export type SearchHit = {
  feature: Feature & { id: number; position: number };
  digest: DigestSummary;
  score: number;
};
