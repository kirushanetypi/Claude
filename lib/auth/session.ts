import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";

export type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
  };
}
