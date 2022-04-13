import create from "zustand";

export const useStore = create((set) => ({
  nickname: "익명",
  setNickname: (nick) =>
    set(() => ({
      nickname: nick,
    })),
}));
