"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth/config";

export type LoginState = { error?: string } | null;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      remember: formData.get("remember") === "true" ? "true" : "false",
      redirectTo: "/",
    });
    return null;
  } catch (err) {
    if (err instanceof AuthError) {
      if (err.type === "CredentialsSignin") {
        return { error: "Неверный email или пароль" };
      }
      return { error: "Ошибка входа" };
    }
    throw err;
  }
}
