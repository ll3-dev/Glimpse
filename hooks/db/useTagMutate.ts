import { db } from "@/db";
import { tagsTable } from "@/db/schema";
import { tagQueryKey } from "@/hooks/db/useTagQuery";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type TagInsert = typeof tagsTable.$inferInsert;

const addTag = (data: TagInsert) => db.insert(tagsTable).values(data);

export const useAddTagMutate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addTag,
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: [tagQueryKey],
      }),
  });
};
