export type Status = "on_track" | "at_risk" | "blocked" | "complete" | "unknown";

export const STATUSES: Status[] = ["on_track", "at_risk", "blocked", "complete", "unknown"];

export const STATUS_LABELS: Record<Status, string> = {
  on_track: "On track",
  at_risk: "At risk",
  blocked: "Blocked",
  complete: "Complete",
  unknown: "Unknown",
};

export type Team = {
  id: number;
  name: string;
  archived_at: string | null;
  created_at: string;
};

export type JiraStatusCategory = "new" | "indeterminate" | "done" | string;

export type Feature = {
  id: number;
  team_id: number;
  name: string;
  description: string;
  business_value: string;
  jira_link: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  jira_issue_key: string | null;
  jira_status: string | null;
  jira_status_category: JiraStatusCategory | null;
  jira_summary: string | null;
  jira_description: string | null;
  jira_acceptance_criteria: string | null;
  jira_target_end: string | null;
  jira_capitalizable: string | null;
  jira_synced_at: string | null;
  jira_sync_error: string | null;
  jira_sync_error_at: string | null;
  jira_sync_failed: boolean;
};

export type FeaturePayload = {
  name: string;
  description: string;
  business_value: string;
  jira_link: string;
};

export type DigestUpdate = {
  id: number;
  feature: Feature;
  position: number;
  status: Status;
  target_go_live: string;
  notes: string;
};

export type DigestUpdatePayload = {
  feature_id: number;
  status: Status;
  target_go_live: string;
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
  updates: DigestUpdate[];
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
  updates: DigestUpdatePayload[];
};

export type LatestUpdateRef = {
  digest_id: number;
  sprint_number: number;
  year: number;
  digest_date: string;
  notes: string;
  status: Status;
  target_go_live: string;
};

export type SearchHit = {
  feature: Feature;
  team: Team;
  latest_update: LatestUpdateRef | null;
  score: number;
};
