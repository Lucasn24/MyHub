import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { Credentials } from "google-auth-library";

const TOKENS_DIR = path.join(process.cwd(), ".data");
const TOKENS_PATH = path.join(TOKENS_DIR, "google-tokens.json");

export function loadTokens(): Credentials | null {
  if (!existsSync(TOKENS_PATH)) return null;
  return JSON.parse(readFileSync(TOKENS_PATH, "utf-8"));
}

export function saveTokens(tokens: Credentials): void {
  if (!existsSync(TOKENS_DIR)) mkdirSync(TOKENS_DIR, { recursive: true });
  writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2), "utf-8");
}

export function hasTokens(): boolean {
  return existsSync(TOKENS_PATH);
}
