export type LastNameFlag = {
  code: "missing" | "placeholder" | "digits" | "initials" | "same_as_first";
  message: string;
};

const PLACEHOLDERS = new Set([
  "na", "n/a", "n.a", "none", "null", "nil", "no", "nope", "nothing",
  "lastname", "last name", "surname", "unknown", "x", "xx", "xxx", "test", "idk",
]);
const LETTER = /\p{L}/u;
const VOWEL = /[aeiouyAEIOUY]/;

export function lastNameFlag(firstName: string | null | undefined, lastName: string | null | undefined): LastNameFlag | null {
  const last = lastName?.trim() ?? "";
  const first = firstName?.trim() ?? "";
  if (!last) return { code: "missing", message: "There is no last name on file." };
  if (!LETTER.test(last) || PLACEHOLDERS.has(last.toLowerCase().replace(/\.$/, ""))) {
    return { code: "placeholder", message: `"${last}" is a placeholder, not a legal last name.` };
  }
  if (/\d/.test(last)) return { code: "digits", message: `"${last}" has numbers in it.` };
  const words = last.split(/[\s.]+/).filter(Boolean);
  const allInitials = words.every((word) => [...word].length === 1);
  const shoutedInitials = [...last].length <= 3 && last === last.toUpperCase() && !VOWEL.test(last) && /^\p{Lu}+$/u.test(last);
  if (allInitials || shoutedInitials) {
    return { code: "initials", message: `"${last}" looks like initials. Initials are not accepted as a last name.` };
  }
  if (first && first.toLowerCase() === last.toLowerCase()) {
    return { code: "same_as_first", message: `The last name repeats the first name "${first}".` };
  }
  return null;
}
