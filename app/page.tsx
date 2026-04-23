import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Финансы</h1>
      <p className="text-muted-foreground">
        Bootstrap проверка · Next 16 · Tailwind v4 · shadcn/ui
      </p>
      <Button>Проверка</Button>
    </main>
  );
}
