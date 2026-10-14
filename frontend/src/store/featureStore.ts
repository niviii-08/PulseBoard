import { create } from "zustand";

interface FeatureState {
  dataZenMode: boolean;
  timeMachineDate: string | null;
  contrarianMode: boolean;
  setDataZenMode: (val: boolean) => void;
  setTimeMachineDate: (val: string | null) => void;
  setContrarianMode: (val: boolean) => void;
}

export const useFeatureStore = create<FeatureState>((set) => ({
  dataZenMode: false,
  timeMachineDate: null,
  contrarianMode: false,
  setDataZenMode: (val) => set({ dataZenMode: val }),
  setTimeMachineDate: (val) => set({ timeMachineDate: val }),
  setContrarianMode: (val) => set({ contrarianMode: val }),
}));
