import { z } from "zod";

export const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(30),
  last_name: z.string().min(1, "Last name is required").max(30),
});

export type ProfileSchemaType = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type ChangePasswordSchemaType = z.infer<typeof changePasswordSchema>;
