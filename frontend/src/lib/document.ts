export type DocumentKind = "CPF" | "CNPJ";

export type SignupRole = "USER" | "COMPANY";

export function normalizeDocumentInput(value: string): string {
  return value.replace(/\D+/gu, "");
}

export function documentKindForRole(role: SignupRole): DocumentKind {
  return role === "COMPANY" ? "CNPJ" : "CPF";
}

export function documentLabel(kind: DocumentKind): string {
  return kind;
}

export function documentPlaceholder(kind: DocumentKind): string {
  return kind === "CNPJ" ? "00.000.000/0000-00" : "000.000.000-00";
}

export function documentExample(kind: DocumentKind): string {
  return kind === "CNPJ" ? "Ex: 11222333000181" : "Ex: 52998224725";
}

export function validateDocument(kind: DocumentKind, value: string): string | null {
  const normalized = normalizeDocumentInput(value);

  if (!normalized) {
    return null;
  }

  if (kind === "CPF") {
    if (normalized.length !== 11 || isRepeatedDigits(normalized) || !isValidCpf(normalized)) {
      return "Informe um CPF valido.";
    }
    return null;
  }

  if (normalized.length !== 14 || isRepeatedDigits(normalized) || !isValidCnpj(normalized)) {
    return "Informe um CNPJ valido.";
  }
  return null;
}

function isRepeatedDigits(value: string): boolean {
  return /^(\d)\1+$/u.test(value);
}

function isValidCpf(cpf: string): boolean {
  const firstDigit = calculateCpfCheckDigit(cpf.slice(0, 9), 10);
  const secondDigit = calculateCpfCheckDigit(`${cpf.slice(0, 9)}${firstDigit}`, 11);
  return cpf === `${cpf.slice(0, 9)}${firstDigit}${secondDigit}`;
}

function calculateCpfCheckDigit(base: string, weight: number): number {
  let total = 0;
  for (const digit of base) {
    total += Number(digit) * weight;
    weight -= 1;
  }
  const remainder = total % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function isValidCnpj(cnpj: string): boolean {
  const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const secondWeights = [6, ...firstWeights];
  const firstDigit = calculateCnpjCheckDigit(cnpj.slice(0, 12), firstWeights);
  const secondDigit = calculateCnpjCheckDigit(`${cnpj.slice(0, 12)}${firstDigit}`, secondWeights);
  return cnpj === `${cnpj.slice(0, 12)}${firstDigit}${secondDigit}`;
}

function calculateCnpjCheckDigit(base: string, weights: number[]): number {
  let total = 0;
  for (let index = 0; index < weights.length; index += 1) {
    total += Number(base[index]) * weights[index];
  }
  const remainder = total % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}
