import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listAccounts } from "@/lib/db/accounts";
import { onboardingAction } from "@/lib/actions/onboarding";

export default async function OnboardingPage() {
  const user = await requireUser();
  const existing = await listAccounts(db, user.id);
  if (existing.length > 0) redirect("/");

  return (
    <main className="flex flex-col min-h-full max-w-2xl mx-auto w-full pb-24">
      <header className="px-6 pt-[max(env(safe-area-inset-top),24px)] pb-4">
        <div className="eyebrow text-text-3 mb-2">НАСТРОЙКА ·‎ ШАГ 1 ИЗ 1</div>
        <h1 className="text-2xl font-medium tracking-tight mb-2">
          Привет, {user.name ?? "друг"}.
        </h1>
        <p className="text-sm text-text-2 max-w-md">
          Давай соберём твои счета. Значения Т-Банка предзаполнены — правь, если
          отличается. Всё можно будет изменить позже в настройках.
        </p>
      </header>

      <form action={onboardingAction} className="flex flex-col gap-6 px-4">
        {/* DEBIT */}
        <Card>
          <div className="eyebrow text-text-3 mb-3">ДЕБЕТ</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="debitName">Название</Label>
              <Input id="debitName" name="debitName" defaultValue="Дебет Т-Банк" />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="debitBalance">Текущий баланс, ₽</Label>
              <Input
                id="debitBalance"
                name="debitBalance"
                type="number"
                step="0.01"
                required
                placeholder="0"
              />
            </div>
          </div>
        </Card>

        {/* CREDIT CARD */}
        <Card>
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              name="ccEnabled"
              defaultChecked
              className="size-4 accent-primary"
            />
            <span className="eyebrow text-text-3">КРЕДИТКА Т-БАНК</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="ccName">Название</Label>
              <Input id="ccName" name="ccName" defaultValue="Кредитка Т-Банк" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ccBalance">Текущий долг, ₽</Label>
              <Input
                id="ccBalance"
                name="ccBalance"
                type="number"
                step="0.01"
                defaultValue="26500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ccLimit">Лимит, ₽</Label>
              <Input
                id="ccLimit"
                name="ccLimit"
                type="number"
                step="0.01"
                defaultValue="100000"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ccStatementDebt">Выписка (долг 26-го), ₽</Label>
              <Input
                id="ccStatementDebt"
                name="ccStatementDebt"
                type="number"
                step="0.01"
                defaultValue="26500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ccPaidAfter">Погашено после выписки, ₽</Label>
              <Input
                id="ccPaidAfter"
                name="ccPaidAfter"
                type="number"
                step="0.01"
                defaultValue="0"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ccStatementDay">День выписки</Label>
              <Input
                id="ccStatementDay"
                name="ccStatementDay"
                type="number"
                defaultValue="26"
                min="1"
                max="28"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ccPaymentDueDay">Дедлайн</Label>
              <Input
                id="ccPaymentDueDay"
                name="ccPaymentDueDay"
                type="number"
                defaultValue="19"
                min="1"
                max="28"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="ccAnnualRate">Ставка (десятичная дробь)</Label>
              <Input
                id="ccAnnualRate"
                name="ccAnnualRate"
                defaultValue="0.599"
                placeholder="0.599 = 59.9%"
              />
            </div>
          </div>
        </Card>

        {/* LOAN */}
        <Card>
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              name="loanEnabled"
              defaultChecked
              className="size-4 accent-primary"
            />
            <span className="eyebrow text-text-3">КРЕДИТ Т-БАНК</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="loanName">Название</Label>
              <Input id="loanName" name="loanName" defaultValue="Кредит Т-Банк" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loanBalance">Остаток, ₽</Label>
              <Input
                id="loanBalance"
                name="loanBalance"
                type="number"
                step="0.01"
                defaultValue="340150"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loanPrincipal">Изначальная сумма, ₽</Label>
              <Input
                id="loanPrincipal"
                name="loanPrincipal"
                type="number"
                step="0.01"
                defaultValue="350000"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loanAnnualRate">Ставка</Label>
              <Input
                id="loanAnnualRate"
                name="loanAnnualRate"
                defaultValue="0.365"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loanPayment">Ежемес. платёж, ₽</Label>
              <Input
                id="loanPayment"
                name="loanPayment"
                type="number"
                step="0.01"
                defaultValue="12840"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loanStart">Дата выдачи</Label>
              <Input
                id="loanStart"
                name="loanStart"
                type="date"
                defaultValue="2026-03-15"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loanPaymentDay">День платежа</Label>
              <Input
                id="loanPaymentDay"
                name="loanPaymentDay"
                type="number"
                defaultValue="1"
                min="1"
                max="28"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loanOrigTerm">Срок, мес.</Label>
              <Input
                id="loanOrigTerm"
                name="loanOrigTerm"
                type="number"
                defaultValue="59"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loanRemTerm">Осталось, мес.</Label>
              <Input
                id="loanRemTerm"
                name="loanRemTerm"
                type="number"
                defaultValue="58"
              />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-sm text-text-2 cursor-pointer mt-1">
              <input
                type="checkbox"
                name="loanPaidThisMonth"
                defaultChecked
                className="size-4 accent-primary"
              />
              Платёж этого месяца уже совершён
            </label>
          </div>
        </Card>

        {/* RECURRING EVENTS */}
        <Card>
          <div className="eyebrow text-text-3 mb-3">РЕГУЛЯРНЫЕ СОБЫТИЯ</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="salaryAmount">Зарплата, ₽</Label>
              <Input
                id="salaryAmount"
                name="salaryAmount"
                type="number"
                step="0.01"
                defaultValue="46000"
                placeholder="0 чтобы пропустить"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="salaryDay">День</Label>
              <Input
                id="salaryDay"
                name="salaryDay"
                type="number"
                defaultValue="5"
                min="1"
                max="28"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rentAmount">Квартира, ₽</Label>
              <Input
                id="rentAmount"
                name="rentAmount"
                type="number"
                step="0.01"
                defaultValue="67000"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rentDay">День</Label>
              <Input
                id="rentDay"
                name="rentDay"
                type="number"
                placeholder="1-28"
                min="1"
                max="28"
              />
            </div>
          </div>
          <p className="text-xs text-text-3 mt-3">
            Платёж по кредиту создастся автоматически по настройкам кредита выше.
          </p>
        </Card>

        <Button type="submit" size="lg" full>
          Создать счета и начать
        </Button>
      </form>
    </main>
  );
}
