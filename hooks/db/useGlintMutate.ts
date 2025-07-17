import { db } from "@/db";
import { glimpseTable } from "@/db/schema";
import { glimpseQueryKey } from "@/hooks/db/useGlintQuery";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const addGlimpse = async (content: string) =>
  await db.insert(glimpseTable).values({ content });

export const useAddGlimpseMutate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addGlimpse,
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: [glimpseQueryKey],
      }),
  });
};
