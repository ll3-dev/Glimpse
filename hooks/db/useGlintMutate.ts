import { db } from "@/db";
import { glintTable, glintTagsTable } from "@/db/schema";
import { glintQueryKey } from "@/hooks/db/useGlintQuery";
import { TagInsert } from "@/hooks/db/useTagMutate";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type GlintInsert = typeof glintTable.$inferInsert & {
  tags: TagInsert[];
};

const addGlint = async (data: GlintInsert) =>
  db.transaction(async (tx) => {
    const { lastInsertRowId, changes } = await tx
      .insert(glintTable)
      .values(data);
    if (changes === 0) return tx.rollback();

    await Promise.all(
      data.tags.map((tag) =>
        tx.insert(glintTagsTable).values({
          glintId: lastInsertRowId,
          tagId: tag.id!,
        })
      )
    );
  });

export const useAddGlintMutate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addGlint,
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [glintQueryKey],
      });
    },
  });
};

