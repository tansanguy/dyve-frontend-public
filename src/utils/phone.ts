export const normalizeKoreanMobileNumber = (value: string | null | undefined) => {
  const raw = String(value ?? "").trim();
  if (!/^[+0-9 ()-]+$/.test(raw)) return "";
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("82") ? `0${digits.slice(2)}` : digits;
};

export const isValidKoreanMobileNumber = (value: string | null | undefined) =>
  /^010\d{8}$/.test(normalizeKoreanMobileNumber(value));
