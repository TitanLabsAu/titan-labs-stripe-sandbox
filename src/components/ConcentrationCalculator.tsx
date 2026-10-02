import { useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CALENDAR_PREFILL_KEY } from "@/lib/member-calendar";
import { CalendarPlus, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { calculate, round, type AmountUnit } from "@/lib/reconstitution";
import { cn } from "@/lib/utils";

type Mode = "mg" | "iu";

const DEFAULTS: Record<
  Mode,
  { strength: string; diluent: string; amount: string; amountUnit: AmountUnit }
> = {
  mg: { strength: "10", diluent: "2", amount: "250", amountUnit: "mcg" },
  iu: { strength: "100", diluent: "1", amount: "10", amountUnit: "iu" },
};

const SYRINGES = [
  { ml: 0.3, label: "0.3 mL · 30 units" },
  { ml: 0.5, label: "0.5 mL · 50 units" },
  { ml: 1, label: "1 mL · 100 units" },
];

const DILUENT_CHIPS = ["1", "2", "3", "5"];

function NumberField({
  label,
  suffix,
  value,
  onChange,
  min,
  max,
  step,
  hint,
}: {
  label: string;
  suffix: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
  step: number;
  hint?: string;
}) {
  const id = useId();
  const n = Number(value);
  const sliderValue = Number.isFinite(n)
    ? Math.min(Math.max(n, min), max)
    : min;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {hint ? (
          <span className="text-[0.65rem] text-muted-foreground">{hint}</span>
        ) : null}
      </div>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-14 font-mono"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold uppercase text-muted-foreground">
          {suffix}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[sliderValue]}
        onValueChange={([v]) => onChange(String(Number((v ?? 0).toFixed(4))))}
        aria-label={`${label} slider`}
      />
    </div>
  );
}

/** U-100 scale drawing — a measurement aid only. */
function SyringeScale({
  units,
  capacityUnits,
}: {
  units: number;
  capacityUnits: number;
}) {
  const W = 560;
  const H = 96;
  const x0 = 60;
  const x1 = 490;
  const barrelW = x1 - x0;
  const fill = Math.max(0, Math.min(units, capacityUnits));
  const fillW = (fill / capacityUnits) * barrelW;
  // On a real syringe, liquid sits against the needle/tip. The plunger face
  // moves left as volume increases, so the highlighted liquid grows from the tip backwards.
  const liquidX = x1 - fillW;
  const majorEvery = capacityUnits <= 30 ? 5 : 10;
  const ticks = [];
  for (let u = 0; u <= capacityUnits; u += capacityUnits <= 50 ? 1 : 2) {
    const x = x1 - (u / capacityUnits) * barrelW;
    const major = u % majorEvery === 0;
    ticks.push(
      <g key={u}>
        <line
          x1={x}
          x2={x}
          y1={28}
          y2={major ? 50 : 40}
          className="stroke-foreground"
          strokeWidth={major ? 1.4 : 0.7}
        />
        {major ? (
          <text
            x={x}
            y={66}
            textAnchor="middle"
            className="fill-muted-foreground font-mono"
            fontSize={10}
          >
            {u}
          </text>
        ) : null}
      </g>,
    );
  }
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Scale reading ${round(fill, 1)} of ${capacityUnits} units`}
    >
      {/* plunger rod and fixed barrel */}
      <rect
        x={10}
        y={40}
        width={Math.max(0, liquidX - 18)}
        height={8}
        className="fill-muted"
      />
      {/* barrel */}
      <rect
        x={x0}
        y={22}
        width={barrelW}
        height={44}
        rx={3}
        className="fill-background stroke-foreground"
        strokeWidth={1.4}
      />
      {/* liquid occupies the needle end of the barrel */}
      <rect
        x={liquidX}
        y={23}
        width={fillW}
        height={42}
        className="fill-primary/30"
      />
      {/* moving plunger face marks the selected scale reading */}
      <rect
        x={liquidX - 4}
        y={22}
        width={8}
        height={44}
        className="fill-foreground/70"
      />
      {fillW > 0 ? (
        <line
          x1={liquidX}
          x2={liquidX}
          y1={18}
          y2={70}
          className="stroke-accent"
          strokeWidth={2.5}
        />
      ) : null}
      {ticks}
      {/* tip */}
      <polygon
        points={`${x1},34 ${x1 + 22},40 ${x1 + 22},48 ${x1},54`}
        className="fill-muted stroke-foreground"
        strokeWidth={1}
      />
      <line
        x1={x1 + 22}
        x2={W - 6}
        y1={44}
        y2={44}
        className="stroke-muted-foreground"
        strokeWidth={1.2}
      />
      <text
        x={x0}
        y={88}
        className="fill-muted-foreground font-mono"
        fontSize={10}
      >
        U-100 SCALE · UNITS FROM NEEDLE END
      </text>
    </svg>
  );
}

export function ConcentrationCalculator() {
  const [mode, setMode] = useState<Mode>("mg");
  const [strength, setStrength] = useState(DEFAULTS.mg.strength);
  const [diluent, setDiluent] = useState(DEFAULTS.mg.diluent);
  const [amount, setAmount] = useState(DEFAULTS.mg.amount);
  const [amountUnit, setAmountUnit] = useState<AmountUnit>(
    DEFAULTS.mg.amountUnit,
  );
  const [syringeMl, setSyringeMl] = useState(1);

  const reset = (m: Mode) => {
    setMode(m);
    setStrength(DEFAULTS[m].strength);
    setDiluent(DEFAULTS[m].diluent);
    setAmount(DEFAULTS[m].amount);
    setAmountUnit(DEFAULTS[m].amountUnit);
  };

  const strengthUnit = mode === "iu" ? "IU" : "mg";
  const amountLabel =
    amountUnit === "mcg" ? "mcg" : amountUnit === "iu" ? "IU" : "mg";
  const result = calculate({
    strength: Number(strength),
    diluentMl: Number(diluent),
    amount: Number(amount),
    amountUnit,
    syringeMl,
  });

  const amountMax = amountUnit === "mcg" ? 5000 : mode === "iu" ? 100 : 20;
  const amountStep = amountUnit === "mcg" ? 10 : mode === "iu" ? 0.5 : 0.05;

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
      <section className="rounded-xl border border-border border-l-2 border-l-primary bg-card p-5 sm:p-6 lg:col-span-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-extrabold uppercase text-foreground">
            Inputs
          </h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => reset(mode)}
            aria-label="Reset inputs"
          >
            <RotateCcw /> Reset
          </Button>
        </div>

        <div className="mt-4">
          <p className="technical-label text-muted-foreground">
            Vial is labelled in
          </p>
          <div
            className="mt-2 grid grid-cols-2 border border-border"
            role="group"
            aria-label="Vial unit"
          >
            {(["mg", "iu"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => reset(m)}
                className={cn(
                  "py-2 text-xs font-bold uppercase transition-colors",
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-foreground hover:bg-muted",
                )}
              >
                {m === "mg" ? "Milligrams (mg)" : "International units (IU)"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-5">
          <NumberField
            label="Vial strength"
            suffix={strengthUnit}
            value={strength}
            onChange={setStrength}
            min={0}
            max={mode === "iu" ? 200 : 100}
            step={mode === "iu" ? 1 : 0.5}
            hint="total content of the vial"
          />
          <div>
            <NumberField
              label="Diluent volume"
              suffix="mL"
              value={diluent}
              onChange={setDiluent}
              min={0}
              max={10}
              step={0.1}
              hint="liquid added to the vial"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DILUENT_CHIPS.map((c) => (
                <Button
                  key={c}
                  size="sm"
                  variant={
                    Number(diluent) === Number(c) ? "default" : "outline"
                  }
                  onClick={() => setDiluent(c)}
                >
                  {c} mL
                </Button>
              ))}
            </div>
          </div>
          <div>
            <NumberField
              label="Target amount"
              suffix={amountLabel}
              value={amount}
              onChange={setAmount}
              min={0}
              max={amountMax}
              step={amountStep}
              hint="amount per measurement"
            />
            {mode === "mg" ? (
              <div
                className="mt-2 grid grid-cols-2 border border-border"
                role="group"
                aria-label="Target amount unit"
              >
                {(["mcg", "mg"] as AmountUnit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    aria-pressed={amountUnit === u}
                    onClick={() => {
                      if (u === amountUnit) return;
                      const n = Number(amount);
                      if (Number.isFinite(n))
                        setAmount(round(u === "mg" ? n / 1000 : n * 1000, 4));
                      setAmountUnit(u);
                    }}
                    className={cn(
                      "py-1.5 text-xs font-bold uppercase",
                      amountUnit === u
                        ? "bg-accent text-accent-foreground"
                        : "bg-background text-foreground hover:bg-muted",
                    )}
                  >
                    {u}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Syringe scale (U-100)</Label>
            <div
              className="grid grid-cols-3 border border-border"
              role="group"
              aria-label="Syringe capacity"
            >
              {SYRINGES.map((s) => (
                <button
                  key={s.ml}
                  type="button"
                  aria-pressed={syringeMl === s.ml}
                  onClick={() => setSyringeMl(s.ml)}
                  className={cn(
                    "px-1 py-2 text-[0.65rem] font-bold uppercase sm:text-xs",
                    syringeMl === s.ml
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground hover:bg-muted",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 lg:col-span-7">
        {result.ok && !result.exceedsVial && !result.exceedsSyringe ? (
          <Button asChild variant="outline" className="mb-5 w-full">
            <Link
              to="/calendar"
              onClick={() => {
                try {
                  sessionStorage.setItem(
                    CALENDAR_PREFILL_KEY,
                    JSON.stringify({
                      product_name: "Calculator entry",
                      dose_label: `${amount} ${amountUnit.toUpperCase()} · ${round(result.units, 1)} U-100 scale units · ${round(result.volumeMl, 3)} mL`,
                    }),
                  );
                } catch {
                  /* Storage may be disabled. */
                }
              }}
            >
              <CalendarPlus className="h-4 w-4" />
              Add result to My Calendar
            </Link>
          </Button>
        ) : null}
        {result.ok ? (
          <>
            <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <p className="technical-label text-muted-foreground">
                Scale reading
              </p>
              <div className="mt-3">
                <SyringeScale
                  units={result.units}
                  capacityUnits={syringeMl * 100}
                />
              </div>
              {result.exceedsSyringe ? (
                <p className="mt-3 flex items-start gap-2 text-xs font-bold text-accent">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  The calculated volume ({round(result.volumeMl, 3)} mL) is
                  larger than the selected {syringeMl} mL scale.
                </p>
              ) : null}
              {result.exceedsVial ? (
                <p className="mt-2 flex items-start gap-2 text-xs font-bold text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  The target amount is more than the whole vial contains.
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ResultCard
                label="Concentration"
                note={`strength ÷ diluent`}
                value={`${round(result.concentration, 3)} ${strengthUnit}/mL`}
                sub={
                  amountUnit === "mcg"
                    ? `${round(result.concentrationInAmountUnit, 1)} mcg/mL`
                    : undefined
                }
              />
              <ResultCard
                label="Volume for target amount"
                note="target ÷ concentration"
                value={`${round(result.volumeMl, 3)} mL`}
                highlight
              />
              <ResultCard
                label="U-100 scale units"
                note="1 mL = 100 units"
                value={`${round(result.units, 1)} units`}
                highlight
              />
              <ResultCard
                label="Measurements per vial"
                note="strength ÷ target"
                value={round(result.measurementsPerVial, 2)}
                sub={`${round(result.amountPerUnit, 3)} ${amountLabel} per unit`}
              />
            </div>

            <div className="rounded-xl border border-primary/20 bg-background/45 p-4 font-mono text-xs leading-6 text-muted-foreground">
              {strength} {strengthUnit} ÷ {diluent} mL ={" "}
              {round(result.concentration, 3)} {strengthUnit}/mL · {amount}{" "}
              {amountLabel} ÷ {round(result.concentrationInAmountUnit, 3)}{" "}
              {amountLabel}/mL = {round(result.volumeMl, 3)} mL (
              {round(result.units, 1)} units)
            </div>
          </>
        ) : (
          <div
            className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground"
            role="status"
          >
            {result.reason}
          </div>
        )}
        <p className="text-xs leading-5 text-muted-foreground">
          A neutral mathematical tool for laboratory concentration and volume
          calculations. The scale drawing is a measurement aid only. Results are
          not instructions or recommendations for use. Research use only.
        </p>
      </section>
    </div>
  );
}

function ResultCard({
  label,
  note,
  value,
  sub,
  highlight,
}: {
  label: string;
  note: string;
  value: string;
  sub?: string | undefined;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4",
        highlight && "border-l-2 border-l-accent",
      )}
    >
      <p className="technical-label text-muted-foreground">{label}</p>
      <p className="text-[0.65rem] text-muted-foreground">{note}</p>
      <p
        className={cn(
          "mt-2 font-display text-2xl font-extrabold",
          highlight ? "text-accent" : "text-foreground",
        )}
      >
        {value}
      </p>
      {sub ? (
        <p className="mt-1 font-mono text-xs text-muted-foreground">{sub}</p>
      ) : null}
    </div>
  );
}

