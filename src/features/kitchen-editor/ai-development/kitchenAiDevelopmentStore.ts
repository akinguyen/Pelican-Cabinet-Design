import { create } from "zustand";
import type { AiDesignState } from "./aiKitchenDevelopmentTypes";

type KitchenAiDevelopmentStore = {
  designState: AiDesignState;
  setDesignState: (designState: AiDesignState) => void;
};

export const useKitchenAiDevelopmentStore = create<KitchenAiDevelopmentStore>((set) => ({
  designState: "idle",
  setDesignState: (designState) => set({ designState }),
}));
