import type Database from "better-sqlite3";
import { region, type SocialProvider } from "../config/regions.ts";
import { getDatabase } from "./database.server.ts";

export type SocialConnection = {
  provider: SocialProvider;
  label: string;
  profileUrl: string;
  handle: string;
  enabled: boolean;
};

type ConnectionRow = Record<string, unknown>;

function defaultConnections(): SocialConnection[] {
  return (
    Object.entries(region.socials) as Array<
      [SocialProvider, (typeof region.socials)[SocialProvider]]
    >
  ).map(([provider, value]) => ({
    provider,
    ...value,
    enabled: Boolean(value.profileUrl),
  }));
}

export function createSocialConnectionStore(database: Database.Database) {
  const listSocialConnections = async (): Promise<SocialConnection[]> => {
    const rows = database
      .prepare(
        "SELECT provider, profile_url, handle, enabled FROM social_connections WHERE region_slug = ?",
      )
      .all(region.slug) as ConnectionRow[];
    const saved = new Map(
      rows.map((row) => [String(row.provider), row]),
    );

    return defaultConnections().map((connection) => {
      const row = saved.get(connection.provider);
      return row
        ? {
            ...connection,
            profileUrl: String(row.profile_url || ""),
            handle: String(row.handle || ""),
            enabled: Boolean(row.enabled),
          }
        : connection;
    });
  };

  const saveSocialConnections = async (
    connections: SocialConnection[],
  ): Promise<SocialConnection[]> => {
    const statement = database.prepare(
      "INSERT INTO social_connections (id,region_slug,provider,profile_url,handle,enabled,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(region_slug,provider) DO UPDATE SET profile_url=excluded.profile_url,handle=excluded.handle,enabled=excluded.enabled,updated_at=excluded.updated_at",
    );
    const now = new Date().toISOString();
    database.exec("BEGIN IMMEDIATE");
    try {
      for (const connection of connections) {
        statement.run(
          `${region.slug}-${connection.provider}`,
          region.slug,
          connection.provider,
          connection.profileUrl,
          connection.handle,
          connection.enabled ? 1 : 0,
          now,
        );
      }
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
    return listSocialConnections();
  };

  return { listSocialConnections, saveSocialConnections };
}

export async function listSocialConnections(): Promise<SocialConnection[]> {
  return createSocialConnectionStore(getDatabase()).listSocialConnections();
}

export async function saveSocialConnections(
  connections: SocialConnection[],
): Promise<SocialConnection[]> {
  return createSocialConnectionStore(getDatabase()).saveSocialConnections(connections);
}
