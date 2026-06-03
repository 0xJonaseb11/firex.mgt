import { drizzle } from "drizzle-orm/postgres-js";
import type { Sql } from "postgres";

import { connectSqlWithFallback } from "@api/lib/database";
import * as schema from "./schema";

const { client: queryClient, databaseUrl: activeDatabaseUrl } =
	await connectSqlWithFallback({
		DATABASE_URL: process.env.DATABASE_URL,
		SUPABASE_PROJECT_REF: process.env.SUPABASE_PROJECT_REF,
		SUPABASE_DB_PASSWORD: process.env.SUPABASE_DB_PASSWORD,
		SUPABASE_POOLER_HOST: process.env.SUPABASE_POOLER_HOST,
	});

export const resolvedDatabaseUrl = activeDatabaseUrl;
export const db = drizzle({ client: queryClient, schema });
export const sql: Sql = queryClient;

export type Database = typeof db;
