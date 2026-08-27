import { mkdir, readFile, readdir } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import sqlite3 from "sqlite3";

type SqlValue = string | number | bigint | Buffer | null;

export type SqliteRunResult = {
  meta: {
    changes: number;
    last_row_id: number;
  };
};

export class SqliteStatement {
  private readonly database: SqliteDatabase;
  readonly sql: string;
  readonly values: SqlValue[];

  constructor(database: SqliteDatabase, sql: string, values: SqlValue[] = []) {
    this.database = database;
    this.sql = sql;
    this.values = values;
  }

  bind(...values: SqlValue[]) {
    return new SqliteStatement(this.database, this.sql, values);
  }

  first<T>() {
    return this.database.get<T>(this.sql, this.values);
  }

  async all<T>() {
    return { results: await this.database.all<T>(this.sql, this.values) };
  }

  run() {
    return this.database.run(this.sql, this.values);
  }
}

export class SqliteDatabase {
  private readonly native: sqlite3.Database;
  private operationQueue: Promise<void> = Promise.resolve();

  constructor(native: sqlite3.Database) {
    this.native = native;
  }

  prepare(sql: string) {
    return new SqliteStatement(this, sql);
  }

  run(sql: string, values: SqlValue[] = []) {
    return this.enqueue(() => this.runImmediately(sql, values));
  }

  private runImmediately(sql: string, values: SqlValue[] = []) {
    return new Promise<SqliteRunResult>((resolvePromise, reject) => {
      this.native.run(sql, values, function onRun(error) {
        if (error) reject(error);
        else resolvePromise({ meta: { changes: this.changes, last_row_id: this.lastID } });
      });
    });
  }

  get<T>(sql: string, values: SqlValue[] = []) {
    return this.enqueue(() => this.getImmediately<T>(sql, values));
  }

  private getImmediately<T>(sql: string, values: SqlValue[] = []) {
    return new Promise<T | null>((resolvePromise, reject) => {
      this.native.get(sql, values, (error, row: T | undefined) => {
        if (error) reject(error);
        else resolvePromise(row ?? null);
      });
    });
  }

  all<T>(sql: string, values: SqlValue[] = []) {
    return this.enqueue(() => this.allImmediately<T>(sql, values));
  }

  private allImmediately<T>(sql: string, values: SqlValue[] = []) {
    return new Promise<T[]>((resolvePromise, reject) => {
      this.native.all(sql, values, (error, rows: T[]) => {
        if (error) reject(error);
        else resolvePromise(rows);
      });
    });
  }

  exec(sql: string) {
    return this.enqueue(() => this.execImmediately(sql));
  }

  private execImmediately(sql: string) {
    return new Promise<void>((resolvePromise, reject) => {
      this.native.exec(sql, (error) => error ? reject(error) : resolvePromise());
    });
  }

  batch(statements: SqliteStatement[]) {
    return this.enqueue(async () => {
      await this.execImmediately("BEGIN IMMEDIATE");
      try {
        const results = [];
        for (const statement of statements) results.push(await this.runImmediately(statement.sql, statement.values));
        await this.execImmediately("COMMIT");
        return results;
      } catch (error) {
        await this.execImmediately("ROLLBACK").catch(() => undefined);
        throw error;
      }
    });
  }

  close() {
    return this.enqueue(() => this.closeImmediately());
  }

  private closeImmediately() {
    return new Promise<void>((resolvePromise, reject) => {
      this.native.close((error) => error ? reject(error) : resolvePromise());
    });
  }

  private enqueue<T>(operation: () => Promise<T>) {
    const result = this.operationQueue.then(operation, operation);
    this.operationQueue = result.then(() => undefined, () => undefined);
    return result;
  }
}

type DatabaseState = { promise?: Promise<SqliteDatabase> };
const globalDatabase = globalThis as typeof globalThis & { __regionalHubDatabase?: DatabaseState };
const databaseState = globalDatabase.__regionalHubDatabase ??= {};

function databasePath() {
  const configured = process.env.SQLITE_PATH?.trim() || "data/app.db";
  return isAbsolute(configured) ? configured : resolve(/* turbopackIgnore: true */ process.cwd(), configured);
}

function openNativeDatabase(path: string) {
  return new Promise<sqlite3.Database>((resolvePromise, reject) => {
    const database = new sqlite3.Database(path, (error) => error ? reject(error) : resolvePromise(database));
  });
}

async function applyMigrations(database: SqliteDatabase) {
  const migrationsDirectory = resolve(process.cwd(), "db/migrations");
  const migrationFiles = (await readdir(migrationsDirectory)).filter((name) => name.endsWith(".sql")).sort();
  await database.exec("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY NOT NULL, applied_at INTEGER NOT NULL)");

  for (const name of migrationFiles) {
    await database.exec("BEGIN IMMEDIATE");
    try {
      const applied = await database.get<{ name: string }>("SELECT name FROM schema_migrations WHERE name = ?", [name]);
      if (!applied) {
        await database.exec(await readFile(resolve(migrationsDirectory, name), "utf8"));
        await database.run("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)", [name, Date.now()]);
      }
      await database.exec("COMMIT");
    } catch (error) {
      await database.exec("ROLLBACK").catch(() => undefined);
      throw error;
    }
  }
  await database.exec("PRAGMA optimize");
}

async function initializeDatabase() {
  const path = databasePath();
  await mkdir(dirname(path), { recursive: true });
  const database = new SqliteDatabase(await openNativeDatabase(path));
  await database.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  await applyMigrations(database);
  return database;
}

export function getDatabase() {
  return databaseState.promise ??= initializeDatabase();
}

export async function closeDatabase() {
  const promise = databaseState.promise;
  databaseState.promise = undefined;
  if (promise) await (await promise).close();
}
