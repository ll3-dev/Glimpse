import { open } from "react-native-nitro-sqlite";
import { drizzle } from "./nitro-sqlite-adapter";
import * as schema from "./schema";

export const DATABASE_NAME = "glimpse.db";

export const nitroDb = open({ name: DATABASE_NAME });
export const db = drizzle(nitroDb, { schema });
