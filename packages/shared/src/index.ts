export const ROLES = [
  "MANAGER",
  "DOCTOR",
  "RECEPTION",
  "FINANCE",
  "LAB",
  "STOCK"
] as const;

export type Role = (typeof ROLES)[number];

export type UserSafe = {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
};
