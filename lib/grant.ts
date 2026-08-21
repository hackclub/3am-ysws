import type { Address } from "@/lib/address";

export type GrantDetails = {
  firstName: string;
  lastName: string;
  birthday: string;
};

export type GrantProblem = { field: keyof GrantDetails; message: string };

export const MIN_AGE = 13;
const MAX_AGE = 100;

const REQUIRED: [keyof GrantDetails, string][] = [
  ["firstName", "We need your first name, spelled the way it is on your post."],
  ["lastName", "We need your last name."],
  ["birthday", "We need your date of birth."],
];

export function emptyGrant(): GrantDetails {
  return { firstName: "", lastName: "", birthday: "" };
}

export function readGrant(
  source: Partial<Record<keyof GrantDetails, string | null>>,
): GrantDetails {
  const blank = emptyGrant();
  return {
    firstName: source.firstName?.trim() ?? blank.firstName,
    lastName: source.lastName?.trim() ?? blank.lastName,
    birthday: source.birthday?.trim() ?? blank.birthday,
  };
}

export function ageOn(birthday: string, when: Date): number {
  const [year, month, day] = birthday.split("-").map(Number);
  if (!year || !month || !day) return NaN;

  let age = when.getUTCFullYear() - year;
  const nowMonth = when.getUTCMonth() + 1;
  if (nowMonth < month || (nowMonth === month && when.getUTCDate() < day)) age -= 1;
  return age;
}

export function validateGrant(details: GrantDetails, now = new Date()): GrantProblem | null {
  for (const [field, message] of REQUIRED) {
    if (!details[field]) return { field, message };
  }

  const age = ageOn(details.birthday, now);
  if (Number.isNaN(age)) {
    return { field: "birthday", message: "Write it as a date we can read." };
  }
  if (age < MIN_AGE) {
    return { field: "birthday", message: `You have to be at least ${MIN_AGE} to take a grant.` };
  }
  if (age > MAX_AGE) {
    return { field: "birthday", message: "That does not look right. Check the year." };
  }

  return null;
}

export function missingForGrant(
  source: Partial<Record<keyof GrantDetails | keyof Address, string | null>>,
): string[] {
  const missing: string[] = [];

  const problem = validateGrant(readGrant(source));
  if (problem) missing.push(problem.field === "birthday" ? "date of birth" : "your legal name");

  const parcel: [keyof Address, string][] = [
    ["addressLine1", "street address"],
    ["city", "city"],
    ["stateProvince", "state or province"],
    ["postcode", "postcode"],
    ["country", "country"],
  ];
  for (const [field, label] of parcel) {
    if (!source[field]?.trim()) missing.push(label);
  }

  return missing;
}
