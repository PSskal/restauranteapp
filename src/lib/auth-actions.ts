"use server";

import { signIn } from "@/auth";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function signInWithEmail(formData: FormData) {
  const email = formData.get("email") as string;
  await signIn("resend", { email });
}

export async function signInWithProvider(
  provider: string,
  redirectTo?: string
) {
  await signIn(provider, { redirectTo });
}
