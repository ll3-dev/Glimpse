import { db } from "@/db";
import { glintTable, glintTagsTable } from "@/db/schema";
import { glintQueryKey } from "@/hooks/db/useGlintQuery";
import { TagInsert } from "@/hooks/db/useTagMutate";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sql } from "drizzle-orm";

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

const updateGlint = async (data: GlintInsert) =>
  db.transaction(async (tx) => {
    if (!data.id) throw new Error("Glint ID is required for update");
    await tx
      .delete(glintTagsTable)
      .where(sql`${glintTagsTable.glintId} = ${data.id}`);

    await Promise.all([
      await tx
        .update(glintTable)
        .set({
          title: data.title,
          content: data.content,
          importance: data.importance,
          showedAt: data.showedAt,
          disabledAt: data.disabledAt,
        })
        .where(sql`${glintTable.id} = ${data.id}`),
      ...data.tags.map((tag) =>
        tx.insert(glintTagsTable).values({
          glintId: data.id!,
          tagId: tag.id!,
        })
      ),
    ]);
  });

export const useEditGlintMutate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateGlint,
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [glintQueryKey],
      });
    },
  });
};
