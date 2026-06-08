export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN"
}

export enum OrgRole {
  OWNER = "OWNER",
  MEMBER = "MEMBER"
}

export enum SubscriptionPlan {
  FREE = "FREE",
  PRO_299 = "PRO_299",
  PRO_599 = "PRO_599",
  PRO_999 = "PRO_999"
}

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  CANCELED = "CANCELED",
  PAST_DUE = "PAST_DUE"
}

export enum AIToolType {
  CONTENT_GEN = "CONTENT_GEN",
  CHATBOT = "CHATBOT",
  CODE_REVIEW = "CODE_REVIEW",
  NOTE_SUMMARIZER = "NOTE_SUMMARIZER",
  IMAGE_GEN = "IMAGE_GEN",
  RESUME_ANALYZER = "RESUME_ANALYZER"
}

export interface UserContext {
  id: string;
  email: string;
  role: UserRole;
  organizationIds: string[];
}

export interface APIResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}
