import { db } from "@/db";
import { glintTable, glintTagsTable, tagsTable } from "@/db/schema";
import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query";
import { sql } from "drizzle-orm";

export const getGlints = async () =>
  db
    .select()
    .from(glintTable)
    .where(sql`${glintTable.deletedAt} = 0`)
    .orderBy(sql`${glintTable.createdAt} DESC`);

export const glintQueryKey = "glints";

export const useGlintQuery = () => {
  return useSuspenseQuery({
    queryFn: getGlints,
    queryKey: [glintQueryKey],
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
};

const getGlintById = async (id: string) =>
  db
    .select()
    .from(glintTable)
    .where(sql`${glintTable.id} = ${id} AND ${glintTable.deletedAt} = 0`)
    .limit(1)
    .then((rows: Array<typeof glintTable.$inferSelect>) => rows[0]);

const getGlintTagsById = async (id: string) =>
  db
    .select({
      id: glintTagsTable.tagId,
      name: tagsTable.name,
    })
    .from(glintTagsTable)
    .leftJoin(tagsTable, sql`${glintTagsTable.tagId} = ${tagsTable.id}`)
    .where(sql`${glintTagsTable.glintId} = ${id}`);

export const useGlintByIdQuery = (id: string) => {
  return useSuspenseQueries({
    queries: [
      {
        queryFn: () => (id ? getGlintById(id) : Promise.resolve(null)),
        queryKey: [glintQueryKey, id],
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
      },
      {
        queryFn: () => (id ? getGlintTagsById(id) : Promise.resolve([])),
        queryKey: [glintQueryKey, "tags", id],
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
      },
    ],
  });
};
