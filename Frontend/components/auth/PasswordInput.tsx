"use client";

import { Eye, EyeOff } from "lucide-react";

import { useState } from "react";

import { Input } from "@/components/ui/input";

type Props = {
  placeholder: string;
  register: any;
};

export function PasswordInput({ placeholder, register }: Props) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        className="h-12 rounded-xl pr-12"
        {...register}
      />

      <button
        type="button"
        onClick={() => setShow((prev) => !prev)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
