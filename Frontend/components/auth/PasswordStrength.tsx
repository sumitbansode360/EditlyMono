"use client";

import { CheckCircle2, Circle } from "lucide-react";

import { calculatePasswordStrength } from "@/lib/utils/password-strength";

type Props = {
  password: string;
};

export function PasswordStrength({ password }: Props) {
  const { score, strength, validations } = calculatePasswordStrength(password);

  const width = `${(score / 5) * 100}%`;

  const getColor = () => {
    switch (strength) {
      case "Weak":
        return "bg-red-500";

      case "Fair":
        return "bg-yellow-500";

      case "Good":
        return "bg-blue-500";

      case "Strong":
        return "bg-green-500";

      default:
        return "bg-muted";
    }
  };

  const rules = [
    {
      label: "8+ chars",
      valid: validations.minLength,
    },
    {
      label: "Uppercase",
      valid: validations.uppercase,
    },
    {
      label: "Lowercase",
      valid: validations.lowercase,
    },
    {
      label: "Number",
      valid: validations.number,
    },
    {
      label: "Special char",
      valid: validations.specialChar,
    },
  ];

  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      {/* TOP */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          Password strength
        </p>

        <span className="text-xs font-semibold">
          {password ? strength : "-"}
        </span>
      </div>

      {/* BAR */}
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full transition-all duration-300 ${getColor()}`}
          style={{
            width: password ? width : "0%",
          }}
        />
      </div>

      {/* RULES */}
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        {rules.map((rule) => (
          <div key={rule.label} className="flex items-center gap-1.5">
            {rule.valid ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-muted-foreground/60" />
            )}

            <span
              className={`text-[11px] ${
                rule.valid ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {rule.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
