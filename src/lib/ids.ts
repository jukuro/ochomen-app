import { APP_TODAY } from "./dates";

export function createLocalId(prefix: string) {
  return `${prefix}_${
    globalThis.crypto?.randomUUID?.() ??
    `${APP_TODAY}_${Math.random().toString(36).slice(2)}`
  }`;
}
