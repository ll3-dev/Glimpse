import { db } from "@/db";
import { tagsTable } from "@/db/schema";
import { useQuery } from "@tanstack/react-query";
import { sql } from "drizzle-orm";

const getTags = () =>
  db
    .select()
    .from(tagsTable)
    .where(sql`${tagsTable.deletedAt} = 0`)
    .orderBy(sql`${tagsTable.createdAt} DESC`);

export const tagQueryKey = "tags";

export const useTagQuery = () => {
  return useQuery({
    queryFn: getTags,
    queryKey: [tagQueryKey],
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
};
