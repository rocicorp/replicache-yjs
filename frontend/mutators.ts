import type { WriteTransaction } from "replicache";

export type M = typeof mutators;

export const mutators = {
  async updateYJS(
    tx: WriteTransaction,
    { key, update }: { key: string; update: string }
  ) {
    await tx.put(key, update);
  },
};
