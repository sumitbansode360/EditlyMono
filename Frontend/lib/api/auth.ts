import axios from "axios";
import api from "@/lib/axios";
import {
  AuthResponse,
  LoginPayload,
  SignupPayload,
  LoginResponse,
  ForgotPasswordResponse,
  User,
  UpdateProfilePayload,
  ChangePasswordPayload,
} from "@/types/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const signupUser = async (
  data: SignupPayload,
): Promise<AuthResponse> => {
  try {
    const response = await axios.post(`${API_URL}/api/auth/register/`, data);
    // Store email in temporary cookie for activation resend (expires in 1 hour)
    document.cookie = `temp_reg_email=${response.data.email}; path=/; max-age=3600; SameSite=Lax`;
    return response.data;
  } catch (error: any) {
    const data = error.response?.data;
    const message =
      data?.message || data?.detail || "An error occurred during signup";

    const err = new Error(message) as any;

    // Map Django/DRF field errors to the error object for component-level handling
    if (data && typeof data === "object") {
      if (data.email)
        err.email = Array.isArray(data.email) ? data.email[0] : data.email;
      if (data.username)
        err.username = Array.isArray(data.username)
          ? data.username[0]
          : data.username;
    }

    throw err;
  }
};

export const resendActivation = async (
  email: string,
): Promise<AuthResponse> => {
  try {
    const response = await axios.post(
      `${API_URL}/api/auth/resend-activation-email/`,
      { email },
    );
    return response.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      "Failed to resend activation email";
    const err = new Error(message) as any;
    err.status = error.response?.status;
    throw err;
  }
};

export const activateUser = async (
  uid: string,
  token: string,
): Promise<any> => {
  try {
    const response = await axios.get(
      `${API_URL}/api/auth/activate/${uid}/${token}/`,
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
        error.response?.data?.detail ||
        "Failed to activate account",
    );
  }
};

export async function updatePendingUser(id: string, payload: SignupPayload) {
  const response = await axios.patch(
    `${API_URL}/api/auth/update-pending-user/${id}/`,
    payload,
  );

  return response.data;
}

export const forgotPassword = async (
  email: string,
): Promise<ForgotPasswordResponse> => {
  try {
    const response = await axios.post(`${API_URL}/api/auth/forgot-password/`, {
      email,
    });

    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
        error.response?.data?.detail ||
        "Failed to send password reset email",
    );
  }
};

export const resetPassword = async (
  uid: string,
  token: string,
  payload: {
    new_password: string;
    confirm_password: string;
  },
): Promise<{ message: string }> => {
  try {
    const response = await axios.post(
      `${API_URL}/api/auth/reset-password/${uid}/${token}/`,
      payload,
    );

    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to reset password",
    );
  }
};

/**
 * Fetches the current authenticated user's profile.
 * Uses the authenticated `api` client (not the public `axios` instance
 * used above) since /me/ requires a bearer token.
 */
export const getMe = async (): Promise<User> => {
  try {
    const response = await api.get<User>("/api/auth/me/");
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
        error.response?.data?.detail ||
        "Failed to load your profile",
    );
  }
};

/**
 * Updates the current user's name and/or profile picture.
 * Sends multipart/form-data only when a picture is included — a plain
 * JSON PATCH otherwise, so a name-only edit doesn't pay the multipart cost.
 */
export const updateProfile = async (
  payload: UpdateProfilePayload,
): Promise<User> => {
  try {
    if (payload.profile_pic) {
      const formData = new FormData();
      if (payload.first_name !== undefined) formData.append("first_name", payload.first_name);
      if (payload.last_name !== undefined) formData.append("last_name", payload.last_name);
      formData.append("profile_pic", payload.profile_pic);

      const response = await api.patch<User>("/api/auth/me/", formData);
      return response.data;
    }

    const { profile_pic, ...rest } = payload;
    const response = await api.patch<User>("/api/auth/me/", rest);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
        error.response?.data?.detail ||
        "Failed to update your profile",
    );
  }
};

export const changePassword = async (
  payload: ChangePasswordPayload,
): Promise<{ message: string }> => {
  try {
    const response = await api.post<{ message: string }>(
      "/api/auth/change-password/",
      payload,
    );
    return response.data;
  } catch (error: any) {
    const data = error.response?.data;
    const message = data?.message || data?.detail || "Failed to change password";
    const err = new Error(message) as any;

    // Surface field-level validation errors (e.g. confirm_password
    // mismatch, weak new_password) the same way signupUser() does.
    if (data && typeof data === "object") {
      if (data.confirm_password) err.confirm_password = Array.isArray(data.confirm_password) ? data.confirm_password[0] : data.confirm_password;
      if (data.new_password) err.new_password = Array.isArray(data.new_password) ? data.new_password[0] : data.new_password;
    }

    throw err;
  }
};
