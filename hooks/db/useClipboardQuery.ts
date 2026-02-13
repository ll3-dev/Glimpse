import { db } from "@/db";
import {
  clipboardTable,
  clipboardFolderTable,
  clipboardFolderItemsTable,
  clipboardTagsTable,
  tagsTable,
} from "@/db/schema";
import { useQuery } from "@tanstack/react-query";
import { sql, eq, and, desc } from "drizzle-orm";

export const getClipboardItems = async (folderId?: number) => {
  if (folderId) {
    return db
      .select({
        id: clipboardTable.id,
        type: clipboardTable.type,
        content: clipboardTable.content,
        metadata: clipboardTable.metadata,
        isPinned: clipboardTable.isPinned,
        copiedCount: clipboardTable.copiedCount,
        lastCopiedAt: clipboardTable.lastCopiedAt,
        createdAt: clipboardTable.createdAt,
        deletedAt: clipboardTable.deletedAt,
      })
      .from(clipboardTable)
      .innerJoin(
        clipboardFolderItemsTable,
        eq(clipboardFolderItemsTable.clipboardId, clipboardTable.id)
      )
      .where(
        and(
          eq(clipboardFolderItemsTable.folderId, folderId),
          sql`${clipboardTable.deletedAt} = 0`
        )
      )
      .orderBy(desc(clipboardTable.isPinned), desc(clipboardTable.lastCopiedAt));
  }

  return db
    .select()
    .from(clipboardTable)
    .where(sql`${clipboardTable.deletedAt} = 0`)
    .orderBy(desc(clipboardTable.isPinned), desc(clipboardTable.lastCopiedAt));
};

export const clipboardQueryKey = "clipboards";

export const useClipboardQuery = (folderId?: number) => {
  return useQuery({
    queryFn: () => getClipboardItems(folderId),
    queryKey: [clipboardQueryKey, folderId],
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
};

const getClipboardById = async (id: number) =>
  db
    .select()
    .from(clipboardTable)
    .where(sql`${clipboardTable.id} = ${id} AND ${clipboardTable.deletedAt} = 0`)
    .limit(1)
    .then((rows: Array<typeof clipboardTable.$inferSelect>) => rows[0]);

export const useClipboardByIdQuery = (id: number) => {
  return useQuery({
    queryFn: () => getClipboardById(id),
    queryKey: [clipboardQueryKey, id],
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    enabled: !!id,
  });
};

const getClipboardFolders = async () =>
  db
    .select()
    .from(clipboardFolderTable)
    .where(sql`${clipboardFolderTable.deletedAt} = 0`)
    .orderBy(sql`${clipboardFolderTable.order} ASC`);

export const useClipboardFoldersQuery = () => {
  return useQuery({
    queryFn: getClipboardFolders,
    queryKey: [clipboardQueryKey, "folders"],
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
};

const getClipboardTags = async (clipboardId: number) =>
  db
    .select({
      id: clipboardTagsTable.tagId,
      name: tagsTable.name,
    })
    .from(clipboardTagsTable)
    .leftJoin(tagsTable, eq(clipboardTagsTable.tagId, tagsTable.id))
    .where(eq(clipboardTagsTable.clipboardId, clipboardId));

export const useClipboardTagsQuery = (clipboardId: number) => {
  return useQuery({
    queryFn: () => getClipboardTags(clipboardId),
    queryKey: [clipboardQueryKey, "tags", clipboardId],
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    enabled: !!clipboardId,
  });
};
