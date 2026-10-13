import { hash, verify } from "@node-rs/argon2";

const options = {
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

export function hashPassword(password: string) {
  return hash(password, options);
}

export function verifyPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password, options);
}

let dummyHash: Promise<string> | undefined;

// Verifies against a throwaway hash when there is no user, so response time does not reveal whether an account exists.
export async function verifyPasswordOrDummy(passwordHash: string | undefined, password: string) {
  if (passwordHash) return verifyPassword(passwordHash, password);
  dummyHash ??= hashPassword("timing-equalizer");
  await verifyPassword(await dummyHash, password);
  return false;
}
