export type Team = {
  id: number;
  name: string;
  archived_at: string | null;
  created_at: string;
};

export type EmploymentType = "fte" | "contractor";

export type Person = {
  id: number;
  name: string;
  email: string | null;
  role: string;
  employment_type: EmploymentType | null;
  created_at: string;
};

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "fte", label: "FTE" },
  { value: "contractor", label: "Contractor" },
];

export function formatEmploymentType(t: EmploymentType | null): string {
  if (t === "fte") return "FTE";
  if (t === "contractor") return "Contractor";
  return "—";
}

export function employmentTypeColor(t: EmploymentType | null): string {
  if (t === "fte") return "blue";
  if (t === "contractor") return "orange";
  return "gray";
}

export type Member = {
  id: number;
  person: Person;
  created_at: string;
};

export type TeamDetail = Team & {
  members: Member[];
};
