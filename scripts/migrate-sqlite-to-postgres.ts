import "dotenv/config";
import Database from "better-sqlite3";
import fs from "fs";
import { Pool } from "pg";

const SOURCE_PATH = process.argv[2] || "dev.db";
const FORCE = process.argv.includes("--force");
const TARGET_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!TARGET_URL) {
  throw new Error(
    "DIRECT_URL or DATABASE_URL is required to migrate data into Postgres.",
  );
}

if (!fs.existsSync(SOURCE_PATH)) {
  throw new Error(`SQLite source file not found: ${SOURCE_PATH}`);
}

const tableOrder = [
  "user",
  "account",
  "session",
  "verification",
  "approver_position_user",
  "system_settings",
  "event_space",
  "amenity",
  "event_space_image",
  "venue_block",
  "venue_block_schedule",
  "sapf_request",
  "sapf_request_schedule",
  "sapf_request_venue",
  "sapf_attachment",
  "sapf_core_value",
  "sapf_graduate_attribute",
  "sapf_support_request",
  "approval_step",
  "approval_action",
  "sapf_activity_log",
  "sapf_change_request",
  "notification",
  "concern_thread",
  "concern_message",
  "user_tutorial_progress",
] as const;

const booleanColumns = new Map<string, Set<string>>([
  [
    "user",
    new Set(["emailNotificationsEnabled", "emailVerified", "banned"]),
  ],
  [
    "sapf_request",
    new Set([
      "conflictWarning",
      "parentsConsent",
      "hasAttachments",
      "academicInterruption",
      "medicalExam",
      "reportOfCompliance",
    ]),
  ],
  ["approver_position_user", new Set(["active"])],
]);

function quoteIdent(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function normalizeValue(table: string, column: string, value: unknown) {
  if (value === null || value === undefined) return null;

  if (booleanColumns.get(table)?.has(column)) {
    return Boolean(value);
  }

  return value;
}

async function getTargetCounts(pool: Pool) {
  const counts: Array<{ table: string; count: number }> = [];

  for (const table of tableOrder) {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM ${quoteIdent(table)}`,
    );
    counts.push({
      table,
      count: Number(result.rows[0]?.count || 0),
    });
  }

  return counts;
}

async function ensureTargetReady(pool: Pool) {
  const counts = await getTargetCounts(pool);
  const occupied = counts.filter((entry) => entry.count > 0);

  if (occupied.length === 0) return;

  if (!FORCE) {
    throw new Error(
      [
        "Target Postgres database already contains data.",
        "Re-run with --force if you want to truncate the target tables first.",
        occupied.map((entry) => `${entry.table}: ${entry.count}`).join(", "),
      ].join(" "),
    );
  }

  await pool.query(
    `TRUNCATE TABLE ${[...tableOrder]
      .reverse()
      .map((table) => quoteIdent(table))
      .join(", ")} CASCADE`,
  );
}

async function migrate() {
  const sqlite = new Database(SOURCE_PATH, { readonly: true });
  const pool = new Pool({ connectionString: TARGET_URL });

  try {
    await ensureTargetReady(pool);
    await pool.query("BEGIN");

    for (const table of tableOrder) {
      const rows = sqlite
        .prepare(`SELECT * FROM ${quoteIdent(table)}`)
        .all() as Array<Record<string, unknown>>;

      if (rows.length === 0) {
        console.log(`${table}: 0 rows`);
        continue;
      }

      const columns = sqlite
        .prepare(`PRAGMA table_info(${quoteIdent(table)})`)
        .all()
        .map((column: any) => column.name as string);

      const values: unknown[] = [];
      const tuples = rows.map((row, rowIndex) => {
        const placeholders = columns.map((column, columnIndex) => {
          values.push(normalizeValue(table, column, row[column]));
          return `$${rowIndex * columns.length + columnIndex + 1}`;
        });

        return `(${placeholders.join(", ")})`;
      });

      const query = `INSERT INTO ${quoteIdent(table)} (${columns
        .map((column) => quoteIdent(column))
        .join(", ")}) VALUES ${tuples.join(", ")}`;

      await pool.query(query, values);
      console.log(`${table}: ${rows.length} rows`);
    }

    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    sqlite.close();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
