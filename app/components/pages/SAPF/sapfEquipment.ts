export const EQUIPMENT_SUPPORT_FIELDS = [
  {
    supportLabel: "Sound System",
    defaultName: "Sound System",
    quantityField: "soundSystemQty",
  },
  {
    supportLabel: "Microphone",
    defaultName: "Microphone",
    quantityField: "microphoneQty",
  },
  {
    supportLabel: "LCD Projector",
    defaultName: "LCD Projector",
    quantityField: "lcdProjectorQty",
  },
  {
    supportLabel: "One Long Table",
    defaultName: "Long Table",
    quantityField: "longTableQty",
  },
  {
    supportLabel: "Chairs",
    defaultName: "Chairs",
    quantityField: "chairsQty",
  },
] as const;

export const EQUIPMENT_SUPPORT_LABELS = EQUIPMENT_SUPPORT_FIELDS.map(
  (item) => item.supportLabel,
);

export function equipmentFieldForSupportLabel(label: string) {
  return EQUIPMENT_SUPPORT_FIELDS.find((item) => item.supportLabel === label);
}

export function parseEquipmentQuantity(value: unknown) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function equipmentStatusLabel(status?: string | null) {
  if (status === "PROVIDED") return "Provided";
  if (status === "RETURN_REQUESTED") return "Return requested";
  if (status === "RETURNED") return "Returned";
  return "Requested";
}
