export const mapNaverGender = (gender: string | null): "female" | "male" | null => {
  if (gender === "F") return "female";
  if (gender === "M") return "male";
  return null;
};
