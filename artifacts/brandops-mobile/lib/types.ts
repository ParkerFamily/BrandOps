export type UserRole = "creator" | "brand" | "agency" | "creator_manager";

export type AppUser = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  role: UserRole;
};

