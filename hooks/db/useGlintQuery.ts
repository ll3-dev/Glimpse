import { db } from "@/db";
import { glintTable } from "@/db/schema";
import { useQuery } from "@tanstack/react-query";
import { sql } from "drizzle-orm";

const getGlints = async () =>
  db
    .select()
    .from(glintTable)
    .where(sql`${glintTable.deletedAt} = 0`)
    .orderBy(sql`${glintTable.createdAt} DESC`);

export const glintQueryKey = "glints";

export const useGlintQuery = () => {
  return useQuery({
    queryFn: getGlints,
    queryKey: [glintQueryKey],
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
};
