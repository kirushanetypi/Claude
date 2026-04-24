import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm flex flex-col gap-7 rounded-[var(--radius-lg)] border border-hairline bg-surface p-6">
        <div className="flex flex-col gap-2">
          <div className="eyebrow text-text-3">ФИНАНСЫ</div>
          <h1 className="text-2xl font-medium tracking-tight">
            С возвращением
          </h1>
          <p className="text-sm text-text-3">
            Введи email и пароль, чтобы продолжить.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
