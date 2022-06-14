import type { WriteTransaction } from "replicache";

export type M = typeof mutators;

export const mutators = {
  async updateYJS(tx: WriteTransaction, ydocState: string) {
    await tx.put(`yjs`, ydocState);
  },
};
