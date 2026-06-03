import { drizzle } from "drizzle-orm/postgres-js";

import config from "@api/config";
import {
	createSqlClient,
	resolveDatabaseUrlForConnect,
} from "@api/lib/database";
import * as schema from "./schema";

const connectUrl = await resolveDatabaseUrlForConnect(config.databaseUrl);
const queryClient = createSqlClient(connectUrl);
export const db = drizzle({ client: queryClient, schema });
export const sql = queryClient;

export type Database = typeof db;
