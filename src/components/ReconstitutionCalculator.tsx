import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ReconstitutionCalculator() {
  const [vialMg, setVialMg] = useState("10");
  const [waterMl, setWaterMl] = useState("2");
  const [doseMcg, setDoseMcg] = useState("250");

  const mg = Number(vialMg);
  const ml = Number(waterMl);
  const dose = Number(doseMcg);
  const valid = mg > 0 && ml > 0;

  const mgPerMl = valid ? mg / ml : 0;
  const mcgPerUnit = mgPerMl * 10; // 1 insulin unit = 0.01 mL
  const unitsForDose = valid && dose > 0 ? dose / mcgPerUnit : 0;
  const dosesPerVial = valid && dose > 0 ? (mg * 1000) / dose : 0;

  return (
    <div className="rounded-xl border border-border bg-card/80 p-6">
      <h3 className="text-lg font-extrabold uppercase text-foreground">
        Reconstitution calculator
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Vial size (mg)</Label>
          <Input
            type="number"
            min={0}
            step="any"
            value={vialMg}
            onChange={(e) => setVialMg(e.target.value)}
          />
        </div>
        <div>
          <Label>Bacteriostatic water (mL)</Label>
          <Input
            type="number"
            min={0}
            step="any"
            value={waterMl}
            onChange={(e) => setWaterMl(e.target.value)}
          />
        </div>
        <div>
          <Label>Desired dose (mcg)</Label>
          <Input
            type="number"
            min={0}
            step="any"
            value={doseMcg}
            onChange={(e) => setDoseMcg(e.target.value)}
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
              {dose > 0 ? `${unitsForDose.toFixed(1)} units (${(unitsForDose / 100).toFixed(3)} mL)` : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Doses per vial</dt>
            <dd className="font-extrabold text-accent">
              {dose > 0 ? dosesPerVial.toFixed(1) : "—"}
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
