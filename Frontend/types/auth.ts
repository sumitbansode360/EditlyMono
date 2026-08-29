import { SignupSchemaType } from "@/schemas/auth.schema";

export interface PendingUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export type SignupStep = "signup" | "edit" | "verify";

export interface SignupType {
  mode: SignupStep;
  pendingUser?: PendingUser | null;
  setPendingUser: React.Dispatch<React.SetStateAction<PendingUser | null>>;
  setCurrentStep?: React.Dispatch<React.SetStateAction<SignupStep>>;
  // Prefills the email field — used when arriving via a collaboration
  // invite link (/signup?email=...), so the person doesn't have to retype
  // the address the invite was sent to.
  prefillEmail?: string;
}

export interface AuthResponse {
  message: string;
  user: PendingUser;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_pic: string | null;
}

export interface LoginResponse {
  refresh: string;
  access: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  // Lets profile edits update the cached user (navbar initials, avatar,
  // etc.) immediately without a full page reload / re-login.
  updateUser: (patch: Partial<User>) => void;
}

export interface LoginPayload {
  username: string; // Maps from UI email
  password: string;
}

export interface SignupPayload {
  username: string; // Maps from UI email
  email: string;
  first_name: string;
  last_name: string;
  password: string;
}

export type LoginSchemaType = Pick<SignupSchemaType, "email" | "password">;

export interface ForgotPasswordResponse {
  message: string;
}

export interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  profile_pic?: File | null;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}
