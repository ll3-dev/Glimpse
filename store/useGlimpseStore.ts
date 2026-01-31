import { create } from "zustand";
import { setWidgetData } from "@/modules/nitro-bridges";

interface GlimpseActions {
  setGlimpse: (glimpse: string) => void;
}

export const useGlimpseStore = create<{ actions: GlimpseActions }>(() => ({
  actions: {
    setGlimpse: (glimpse) =>
      setWidgetData("widgetData", glimpse, "group.glimpse.data"),
  },
}));
