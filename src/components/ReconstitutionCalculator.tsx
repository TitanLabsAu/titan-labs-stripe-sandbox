import { useState } from "react";\nimport { useNavigate } from "@tanstack/react-router";\nimport { CalendarPlus } from "lucide-react";\nimport { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  title?: string;
  vialMg?: number | null;
  waterMl?: number | null;
  doseMg?: number | null;
  readOnly?: boolean;
  /** Called whenever the numbers change (used by the admin product editor). */
  onChange?: (v: { vialMg: string; waterMl: string; doseMg: string }) => void;
};

export function ReconstitutionCalculator({ title, vialMg, waterMl, doseMg, readOnly = false, onChange }: Props) {\n  const navigate = useNavigate();
  const [vial, setVial] = useState(vialMg != null ? String(vialMg) : "10");
  const [water, setWater] = useState(waterMl != null ? String(waterMl) : "2");
  const [dose, setDose] = useState(doseMg != null ? String(doseMg) : "0.25");

  const update = (patch: Partial<{ vial: string; water: string; dose: string }>) => {
    const next = { vial, water, dose, ...patch };
    setVial(next.vial);
    setWater(next.water);
    setDose(next.dose);
    onChange?.({ vialMg: next.vial, waterMl: next.water, doseMg: next.dose });
  };

  const mg = Number(vial);
  const ml = Number(water);
  const doseNum = Number(dose);
  const valid = mg > 0 && ml > 0;

  const mgPerMl = valid ? mg / ml : 0;
  const mgPerUnit = mgPerMl / 100; // 1 insulin unit = 0.01 mL
  const unitsForDose = valid && doseNum > 0 ? doseNum / mgPerUnit : 0;
  const dosesPerVial = valid && doseNum > 0 ? mg / doseNum : 0;

  return (
    <div className="industrial-panel border-l-2 border-l-primary p-6">
      <h3 className="font-display text-lg font-extrabold uppercase text-foreground">
        {title ?? "Recommended Reconstitution"}
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Vial size (mg)</Label>
          <Input
            type="number"
            min={0}
            step="any"
            value={vial}
            readOnly={readOnly}
            aria-readonly={readOnly}
            className={readOnly ? "cursor-default bg-muted" : undefined}
            onChange={(e) => update({ vial: e.target.value })}
          />
        </div>
        <div>
          <Label>Mixing Water (mL)</Label>
          <Input
            type="number"
            min={0}
            step="any"
            value={water}
            readOnly={readOnly}
            aria-readonly={readOnly}
            className={readOnly ? "cursor-default bg-muted" : undefined}
            onChange={(e) => update({ water: e.target.value })}
          />
        </div>
        <div>
          <Label>Desired Dose (mg)</Label>
          <Input
            type="number"
            min={0}
            step="any"
            value={dose}
            readOnly={readOnly}
            aria-readonly={readOnly}
            className={readOnly ? "cursor-default bg-muted" : undefined}
            onChange={(e) => update({ dose: e.target.value })}
          />
        </div>
      </div>

      {valid ? (
        <dl className="mt-5 grid gap-3 border-t border-border pt-5 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Concentration</dt>
            <dd className="font-extrabold text-accent">
              {mgPerMl.toFixed(2)} mg/mL ({mgPerUnit.toFixed(3)} mg per unit)
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Draw for your dose</dt>
            <dd className="font-extrabold text-accent">
              {doseNum > 0
                ? `${unitsForDose.toFixed(1)} units (${(unitsForDose / 100).toFixed(3)} mL)`
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Doses per vial</dt>
            <dd className="font-extrabold text-accent">
              {doseNum > 0 ? dosesPerVial.toFixed(1) : "—"}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">
          Enter a vial size and water volume to see the result.
        </p>
      )}

      {!readOnly && valid && doseNum > 0 ? (\n        <Button type="button" variant="outline" className="mt-5 w-full font-bold uppercase" onClick={() => { localStorage.setItem("titan_calendar_prefill", JSON.stringify({ product_name: "Calculator entry", dose_label: dose + "mg · " + unitsForDose.toFixed(1) + " units" })); navigate({ to: "/calendar" }); }}>\n          <CalendarPlus className="h-4 w-4" /> Add result to My Calendar\n        </Button>\n      ) : null}\n\n      <p className="mt-4 text-xs text-muted-foreground">
        Units shown are for a standard 100-unit insulin syringe (1 mL). Research use only.
      </p>
    </div>
  );
}
