// Canonical conversion factor: 1 kg = 2.205 lbs
export const KG_TO_LBS = 2.205;

export const kgToLbs = (kg: number): number => kg * KG_TO_LBS;

export const lbsToKg = (lbs: number): number => lbs / KG_TO_LBS;
