import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  title?: string;
  vialMg?: number | null;
  waterMl?: number | null;
  doseMcg?: number | null;
  /** Called whenever the numbers change (used by the admin product editor). */
  onChange?: (v: { vialMg: string; waterMl: string; doseMcg: string }) => void;
};

export function ReconstitutionCalculator({ title, vialMg, waterMl, doseMcg, onChange }: Props) {
  const [vial, setVial] = useState(vialMg != null ? String(vialMg) : "10");
  const [water, setWater] = useState(waterMl != null ? String(waterMl) : "2");
  const [dose, setDose] = useState(doseMcg != null ? String(doseMcg) : "250");

  const update = (patch: Partial<{ vial: string; water: string; dose: string }>) => {
    const next = { vial, water, dose, ...patch };
    setVial(next.vial);
    setWater(next.water);
    setDose(next.dose);
    onChange?.({ vialMg: next.vial, waterMl: next.water, doseMcg: next.dose });
  };

  const mg = Number(vial);
  const ml = Number(water);
  const doseNum = Number(dose);
  const valid = mg > 0 && ml > 0;

  const mgPerMl = valid ? mg / ml : 0;
  const mcgPerUnit = mgPerMl * 10; // 1 insulin unit = 0.01 mL
  const unitsForDose = valid && doseNum > 0 ? doseNum / mcgPerUnit : 0;
  const dosesPerVial = valid && doseNum > 0 ? (mg * 1000) / doseNum : 0;

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
            onChange={(e) => update({ vial: e.target.value })}
          />
        </div>
        <div>
          <Label>Bacteriostatic water (mL)</Label>
          <Input
            type="number"
            min={0}
            step="any"
            value={water}
            onChange={(e) => update({ water: e.target.value })}
          />
        </div>
        <div>
          <Label>Desired dose (mcg)</Label>
          <Input
            type="number"
            min={0}
            step="any"
            value={dose}
            onChange={(e) => update({ dose: e.target.value })}
          />
        </div>
      </div>

      {valid ? (
        <dl className="mt-5 grid gap-3 border-t border-border pt-5 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Concentration</dt>
            <dd className="font-extrabold text-accent">
              {mgPerMl.toFixed(2)} mg/mL ({Math.round(mcgPerUnit)} mcg per unit)
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

      <p className="mt-4 text-xs text-muted-foreground">
        Units shown are for a standard 100-unit insulin syringe (1 mL). Research use only.
      </p>
    </div>
  );
}
