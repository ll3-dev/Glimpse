import { db } from "@/db";
import { glimpseTable } from "@/db/schema";
import { useSuspenseQuery } from "@tanstack/react-query";

const getGlimpses = async () => await db.select().from(glimpseTable);
export const glimpseQueryKey = "glimpses";

export const useGlimpseQuery = () => {
  return useSuspenseQuery({
    queryFn: getGlimpses,
    queryKey: [glimpseQueryKey],
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
};
