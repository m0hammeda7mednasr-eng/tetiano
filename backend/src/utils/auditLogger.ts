import { supabase } from "../config/supabase";
import { logger } from "./logger";

type JsonRecord = Record<string, unknown>;

interface AuditLogInput {
  userId?: string | null;
  action: string;
  tableName: string;
  recordId?: string | null;
  before?: unknown;
  after?: unknown;
  meta?: JsonRecord;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value?: string | null): value is string {
  return !!value && UUID_RE.test(value);
}

function toPlainObject(input: unknown): JsonRecord | null {
  if (!input || typeof input !== "object") return null;
  return JSON.parse(JSON.stringify(input)) as JsonRecord;
}

function collectChangedFields(
  beforeObj: JsonRecord | null,
  afterObj: JsonRecord | null,
): string[] {
  if (!beforeObj && !afterObj) return [];
  const keys = new Set<string>([
    ...Object.keys(beforeObj || {}),
    ...Object.keys(afterObj || {}),
  ]);
  const changed: string[] = [];
  for (const key of keys) {
    const beforeValue = (beforeObj || {})[key];
    const afterValue = (afterObj || {})[key];
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changed.push(key);
    }
  }
  return changed;
}

export async function logAuditEvent(input: AuditLogInput): Promise<void> {
  try {
    const beforeObj = toPlainObject(input.before);
    const afterObj = toPlainObject(input.after);
    const changedFields = collectChangedFields(beforeObj, afterObj);
    const safeRecordId = isUuid(input.recordId) ? input.recordId : null;

    const payload = {
      user_id: input.userId || null,
      action: input.action,
      table_name: input.tableName,
      record_id: safeRecordId,
      changes: {
        before: beforeObj,
        after: afterObj,
        changed_fields: changedFields,
        meta: {
          ...(input.meta || {}),
          raw_record_id: input.recordId || null,
        },
      },
    };

    const { error } = await supabase.from("audit_logs").insert(payload);
    if (error) {
      logger.warn("Audit log insert failed", {
        action: input.action,
        tableName: input.tableName,
        error: error.message,
      });
    }
  } catch (error: any) {
    logger.warn("Audit logger failed", {
      action: input.action,
      tableName: input.tableName,
      error: error?.message || "unknown",
    });
  }
}
