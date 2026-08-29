export type PasswordStrength =
  | "Weak"
  | "Fair"
  | "Good"
  | "Strong";

export function calculatePasswordStrength(
  password: string = ""
) {
  const validations = {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    specialChar: /[^A-Za-z0-9]/.test(
      password
    ),
  };

  let score = 0;

  Object.values(validations).forEach((item) => {
    if (item) {
      score += 1;
    }
  });

  let strength: PasswordStrength = "Weak";

  if (score >= 5) {
    strength = "Strong";
  } else if (score >= 4) {
    strength = "Good";
  } else if (score >= 3) {
    strength = "Fair";
  }

  return {
    score,
    strength,
    validations,
  };
}