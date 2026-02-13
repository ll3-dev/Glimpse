import { db } from "@/db";
import {
  clipboardTable,
  clipboardFolderTable,
  clipboardFolderItemsTable,
  clipboardTagsTable,
} from "@/db/schema";
import { clipboardQueryKey } from "@/hooks/db/useClipboardQuery";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sql, eq, and } from "drizzle-orm";

export type ClipboardInsert = typeof clipboardTable.$inferInsert;

export type ClipboardItemInput = {
  type: "text" | "image" | "url" | "file";
  content: string;
  metadata?: string;
};

// Check if clipboard item already exists (same content)
const findExistingClipboardItem = async (content: string) => {
  return db
    .select()
    .from(clipboardTable)
    .where(
      and(
        eq(clipboardTable.content, content),
        sql`${clipboardTable.deletedAt} = 0`
      )
    )
    .limit(1)
    .then((rows: Array<typeof clipboardTable.$inferSelect>) => rows[0]);
};

const addClipboardItem = async (data: ClipboardItemInput) => {
  // Check if item already exists
  const existing = await findExistingClipboardItem(data.content);

  if (existing) {
    // Update existing item
    const [updated] = await db
      .update(clipboardTable)
      .set({
        lastCopiedAt: Math.floor(Date.now() / 1000),
        copiedCount: existing.copiedCount + 1,
      })
      .where(eq(clipboardTable.id, existing.id))
      .returning();
    return updated;
  }

  // Insert new item
  const [newItem] = await db
    .insert(clipboardTable)
    .values({
      type: data.type,
      content: data.content,
      metadata: data.metadata,
      lastCopiedAt: Math.floor(Date.now() / 1000),
      copiedCount: 1,
    })
    .returning();

  return newItem;
};

export const useAddClipboardMutate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addClipboardItem,
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [clipboardQueryKey],
      });
    },
  });
};

const togglePinClipboard = async (id: number, isPinned: boolean) => {
  const [updated] = await db
    .update(clipboardTable)
    .set({ isPinned: isPinned ? 1 : 0 })
    .where(eq(clipboardTable.id, id))
    .returning();

  return updated;
};

export const useTogglePinClipboard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isPinned }: { id: number; isPinned: boolean }) =>
      togglePinClipboard(id, isPinned),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [clipboardQueryKey],
      });
    },
  });
};

const deleteClipboard = async (id: number) => {
  const [deleted] = await db
    .update(clipboardTable)
    .set({ deletedAt: Math.floor(Date.now() / 1000) })
    .where(eq(clipboardTable.id, id))
    .returning();

  return deleted;
};

export const useDeleteClipboard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteClipboard(id),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [clipboardQueryKey],
      });
    },
  });
};

// Folder operations
export type ClipboardFolderInsert = typeof clipboardFolderTable.$inferInsert;

const addClipboardFolder = async (data: Omit<ClipboardFolderInsert, "id">) => {
  const [newFolder] = await db.insert(clipboardFolderTable).values(data).returning();
  return newFolder;
};

export const useAddClipboardFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addClipboardFolder,
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [clipboardQueryKey, "folders"],
      });
    },
  });
};

const addToFolder = async (clipboardId: number, folderId: number) => {
  const [added] = await db
    .insert(clipboardFolderItemsTable)
    .values({ clipboardId, folderId })
    .returning();

  return added;
};

export const useAddToFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clipboardId, folderId }: { clipboardId: number; folderId: number }) =>
      addToFolder(clipboardId, folderId),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [clipboardQueryKey],
      });
    },
  });
};

const removeFromFolder = async (clipboardId: number, folderId: number) => {
  const deleted = await db
    .delete(clipboardFolderItemsTable)
    .where(
      and(
        eq(clipboardFolderItemsTable.clipboardId, clipboardId),
        eq(clipboardFolderItemsTable.folderId, folderId)
      )
    );

  return deleted;
};

export const useRemoveFromFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clipboardId, folderId }: { clipboardId: number; folderId: number }) =>
      removeFromFolder(clipboardId, folderId),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [clipboardQueryKey],
      });
    },
  });
};

const deleteFolder = async (id: number) => {
  const [deleted] = await db
    .update(clipboardFolderTable)
    .set({ deletedAt: Math.floor(Date.now() / 1000) })
    .where(eq(clipboardFolderTable.id, id))
    .returning();

  return deleted;
};

export const useDeleteFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteFolder(id),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [clipboardQueryKey, "folders"],
      });
    },
  });
};
