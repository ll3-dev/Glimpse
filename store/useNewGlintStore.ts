import { GlintInsert } from "@/hooks/db/useGlintMutate";
import { TagInsert } from "@/hooks/db/useTagMutate";
import { create } from "zustand";

interface GlintState
  extends Omit<
    GlintInsert,
    "createdAt" | "showedAt" | "disabledAt" | "updatedAt" | "deletedAt"
  > {
  showedAt: number; // Timestamp in milliseconds
  disabledAt: number; // Timestamp in milliseconds
}

interface GlintAction {
  set: (field: keyof GlintState, value: GlintState[keyof GlintState]) => void;
  setGlint: (glint: GlintInsert) => void;
  addTag: (tag: TagInsert) => void;
  removeTag: (index: number) => void;
  reset: () => void;
}

const initialGlintState: GlintState = {
  title: "",
  content: "",
  importance: 5,
  showedAt: new Date().getTime(),
  disabledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).getTime(), // Default to 7 days from now
  tags: [],
};

export const useNewGlintStore = create<GlintState & { actions: GlintAction }>(
  (set) => ({
    ...initialGlintState,
    actions: {
      set: (field: keyof GlintState, value: GlintState[keyof GlintState]) =>
        set((state) => ({ ...state, [field]: value })),
      setGlint: (glint: GlintInsert) =>
        set(() => ({
          ...initialGlintState,
          ...glint,
        })),
      reset: () => set(() => ({ ...initialGlintState })),
      addTag: (tag: TagInsert) =>
        set((state) => {
          if (state.tags.some((t) => t.id === tag.id)) {
            return state;
          }
          return {
            ...state,
            tags: [...state.tags, tag],
          };
        }),
      removeTag: (index: number) =>
        set((state) => ({
          ...state,
          tags: state.tags.filter((_, i) => i !== index),
        })),
    },
  })
);
