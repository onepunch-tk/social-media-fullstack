export const DATABASE_PING = Symbol('DATABASE_PING');

export type DatabasePingResult =
  | { ok: true; latencyMs: number }
  | { ok: false; latencyMs: number; reason: string };

export interface DatabasePingPort {
  ping(): Promise<DatabasePingResult>;
}
