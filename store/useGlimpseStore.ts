import { create } from "zustand";
import glimpseNativeBridges from "@/modules/glimpse-native-bridges";

interface GlimpseActions {
  setGlimpse: (glimpse: string) => void;
}

export const useGlimpseStore = create<{ actions: GlimpseActions }>(() => ({
  actions: {
    setGlimpse: (glimpse) =>
      glimpseNativeBridges.set("widgetData", glimpse, "group.glimpse.data"),
  },
}));
