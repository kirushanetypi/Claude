import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Финансы</h1>
          <p className="text-sm text-muted-foreground">Вход в аккаунт</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
