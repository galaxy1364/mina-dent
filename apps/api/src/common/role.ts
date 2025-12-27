export const Role = {
  MANAGER: "MANAGER",
  DOCTOR: "DOCTOR",
  RECEPTION: "RECEPTION",
  FINANCE: "FINANCE",
  LAB: "LAB",
  STOCK: "STOCK",
} as const;

export type Role = (typeof Role)[keyof typeof Role];
