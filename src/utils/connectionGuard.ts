const PHONE_PATTERN = /(01[016789]|02|0[3-9]\d)[-.\s]?\d{3,4}[-.\s]?\d{4}/;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const HANDLE_PATTERN = /(?:카톡|카카오톡|인스타|instagram|insta|kakao|톡아이디|아이디)\s*[:@]?\s*[a-zA-Z0-9._]{2,}/i;
const AT_HANDLE_PATTERN = /@[a-zA-Z0-9._]{3,}/;

export const detectContactExposure = (text: string): boolean => {
  if (!text) return false;
  return (
    PHONE_PATTERN.test(text) ||
    EMAIL_PATTERN.test(text) ||
    HANDLE_PATTERN.test(text) ||
    AT_HANDLE_PATTERN.test(text)
  );
};
