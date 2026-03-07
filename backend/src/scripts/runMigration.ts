import { supabase } from "../config/supabase";
import { readFileSync } from "fs";
import { join } from "path";
import { logger } from "../utils/logger";

async function runMigration() {
  try {
    logger.info("Starting database migration...");

    // Read the migration file
    const migrationPath = join(
      __dirname,
      "../../../supabase/migrations/002_safe_migration.sql",
    );
    const migrationSQL = readFileSync(migrationPath, "utf-8");

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    logger.info(`Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          const { error } = await supabase.rpc("exec_sql", {
            sql: statement + ";",
          });

          if (error) {
            logger.warn(`Statement ${i + 1} warning:`, error.message);
          } else {
            logger.info(`Statement ${i + 1} executed successfully`);
          }
        } catch (err: any) {
          logger.warn(`Statement ${i + 1} error:`, err.message);
        }
      }
    }

    logger.info("Migration completed!");
    process.exit(0);
  } catch (error: any) {
    logger.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
