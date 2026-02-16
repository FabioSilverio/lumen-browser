import { app } from "electron";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type PermissionRuleDecision = "allow" | "block";
export type PermissionDecisionLog =
  | "allow_once"
  | "allow_always"
  | "block_once"
  | "block_always"
  | "rule_allow"
  | "rule_block";

export interface PermissionEvent {
  id: string;
  timestamp: number;
  origin: string;
  permission: string;
  decision: PermissionDecisionLog;
}

export interface PermissionRule {
  key: string;
  origin: string;
  permission: string;
  decision: PermissionRuleDecision;
  updatedAt: number;
}

interface PermissionStoreShape {
  events: PermissionEvent[];
  rules: PermissionRule[];
}

const EMPTY: PermissionStoreShape = {
  events: [],
  rules: []
};

const MAX_EVENTS = 2000;

function normalizeOrigin(urlLike: string): string {
  try {
    return new URL(urlLike).origin;
  } catch {
    return urlLike;
  }
}

function ruleKey(origin: string, permission: string): string {
  return `${origin}::${permission}`;
}

export class PermissionAuditStore {
  private readonly path = join(app.getPath("userData"), "permission-audit.json");

  private read(): PermissionStoreShape {
    if (!existsSync(this.path)) {
      return EMPTY;
    }

    try {
      const raw = JSON.parse(readFileSync(this.path, "utf-8")) as Partial<PermissionStoreShape>;
      return {
        events: Array.isArray(raw.events) ? raw.events : [],
        rules: Array.isArray(raw.rules) ? raw.rules : []
      };
    } catch {
      return EMPTY;
    }
  }

  private write(value: PermissionStoreShape): void {
    const folder = dirname(this.path);
    if (!existsSync(folder)) {
      mkdirSync(folder, { recursive: true });
    }

    writeFileSync(this.path, JSON.stringify(value, null, 2), "utf-8");
  }

  getAudit(): PermissionStoreShape {
    const payload = this.read();
    return {
      events: [...payload.events].sort((a, b) => b.timestamp - a.timestamp),
      rules: [...payload.rules].sort((a, b) => b.updatedAt - a.updatedAt)
    };
  }

  getRule(origin: string, permission: string): PermissionRule | undefined {
    const normalized = normalizeOrigin(origin);
    const key = ruleKey(normalized, permission);
    return this.read().rules.find((rule) => rule.key === key);
  }

  setRule(origin: string, permission: string, decision: PermissionRuleDecision): PermissionRule[] {
    const normalized = normalizeOrigin(origin);
    const key = ruleKey(normalized, permission);
    const now = Date.now();
    const payload = this.read();

    const nextRules = payload.rules.some((rule) => rule.key === key)
      ? payload.rules.map((rule) =>
        rule.key === key ? { ...rule, decision, updatedAt: now } : rule
      )
      : [
        ...payload.rules,
        { key, origin: normalized, permission, decision, updatedAt: now }
      ];

    this.write({ ...payload, rules: nextRules });
    return [...nextRules].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  removeRule(key: string): PermissionRule[] {
    const payload = this.read();
    const nextRules = payload.rules.filter((rule) => rule.key !== key);
    this.write({ ...payload, rules: nextRules });
    return [...nextRules].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  record(origin: string, permission: string, decision: PermissionDecisionLog): PermissionEvent[] {
    const normalized = normalizeOrigin(origin);
    const payload = this.read();
    const nextEvents: PermissionEvent[] = [
      {
        id: randomUUID(),
        timestamp: Date.now(),
        origin: normalized,
        permission,
        decision
      },
      ...payload.events
    ].slice(0, MAX_EVENTS);

    this.write({ ...payload, events: nextEvents });
    return nextEvents;
  }

  clearEvents(): PermissionEvent[] {
    const payload = this.read();
    this.write({ ...payload, events: [] });
    return [];
  }
}
