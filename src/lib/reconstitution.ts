/** Neutral reconstitution / concentration maths. U-100 scale: 100 units = 1 mL. */

export type AmountUnit = "mg" | "mcg" | "iu";

export type ReconInput = {
  /** Total active content of the vial (mg, or IU in IU mode). */
  strength: number;
  /** Diluent volume added to the vial, in mL. */
  diluentMl: number;
  /** Target amount per measurement. */
  amount: number;
  /** Unit of the target amount. "mcg" means strength is in mg. */
  amountUnit: AmountUnit;
  /** Syringe capacity in mL (U-100 scale). */
  syringeMl: number;
};

export type ReconResult =
  | { ok: false; reason: string }
  | {
      ok: true;
      /** Concentration in strength units per mL (mg/mL or IU/mL). */
      concentration: number;
      /** Concentration in amount units per mL (e.g. mcg/mL when amount is mcg). */
      concentrationInAmountUnit: number;
      /** Volume containing the target amount, in mL. */
      volumeMl: number;
      /** Same volume on a U-100 scale. */
      units: number;
      /** Number of full target amounts contained in the vial. */
      measurementsPerVial: number;
      /** Amount contained in one U-100 unit (amount units). */
      amountPerUnit: number;
      exceedsSyringe: boolean;
      exceedsVial: boolean;
    };

const finite = (n: number) => Number.isFinite(n);

export function calculate(input: ReconInput): ReconResult {
  const { strength, diluentMl, amount, amountUnit, syringeMl } = input;
  if (![strength, diluentMl, amount, syringeMl].every(finite)) return { ok: false, reason: "Enter numbers only." };
  if (strength <= 0) return { ok: false, reason: "Vial strength must be greater than zero." };
  if (diluentMl <= 0) return { ok: false, reason: "Diluent volume must be greater than zero." };
  if (amount <= 0) return { ok: false, reason: "Target amount must be greater than zero." };

  // Convert the target amount into the same unit as the vial strength.
  const amountInStrengthUnit = amountUnit === "mcg" ? amount / 1000 : amount;
  const factor = amountUnit === "mcg" ? 1000 : 1;

  const concentration = strength / diluentMl;
  const volumeMl = amountInStrengthUnit / concentration;
  const units = volumeMl * 100;
  const measurementsPerVial = strength / amountInStrengthUnit;
  const amountPerUnit = (concentration * factor) / 100;

  return {
    ok: true,
    concentration,
    concentrationInAmountUnit: concentration * factor,
    volumeMl,
    units,
    measurementsPerVial,
    amountPerUnit,
    exceedsSyringe: syringeMl > 0 && volumeMl > syringeMl + 1e-9,
    exceedsVial: volumeMl > diluentMl + 1e-9,
  };
}

export function round(value: number, digits: number) {
  const p = Math.pow(10, digits);
  return (Math.round(value * p) / p).toString();
}
