export type Address = {
  fullName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postcode: string;
  country: string;
};

export type AddressProblem = { field: keyof Address; message: string };

const REQUIRED: [keyof Address, string][] = [
  ["fullName", "We need a name for the parcel."],
  ["addressLine1", "We need a street and number."],
  ["city", "We need a city."],
  ["postcode", "We need a postcode."],
  ["country", "We need a country."],
];

export function emptyAddress(): Address {
  return {
    fullName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    stateProvince: "",
    postcode: "",
    country: "",
  };
}

export function readAddress(source: Partial<Record<keyof Address, string | null>>): Address {
  const blank = emptyAddress();
  return {
    fullName: source.fullName?.trim() ?? blank.fullName,
    addressLine1: source.addressLine1?.trim() ?? blank.addressLine1,
    addressLine2: source.addressLine2?.trim() ?? blank.addressLine2,
    city: source.city?.trim() ?? blank.city,
    stateProvince: source.stateProvince?.trim() ?? blank.stateProvince,
    postcode: source.postcode?.trim() ?? blank.postcode,
    country: source.country?.trim() ?? blank.country,
  };
}

export function validateAddress(address: Address): AddressProblem | null {
  for (const [field, message] of REQUIRED) {
    if (!address[field]?.trim()) return { field, message };
  }
  return null;
}

export function hasAddress(source: Partial<Record<keyof Address, string | null>>): boolean {
  return validateAddress(readAddress(source)) === null;
}
