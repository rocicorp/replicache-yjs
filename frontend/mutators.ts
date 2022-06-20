import type { WriteTransaction } from "replicache";

export type M = typeof mutators;

export const mutators = {
  async updateYJS(
    tx: WriteTransaction,
    { name, update }: { name: string; update: string }
  ) {
    await tx.put(editorKey(name), update);
  },
  async updateYJSAwareness(
    tx: WriteTransaction,
    {
      name,
      yjsClientID,
      update,
    }: { name: string; yjsClientID: number; update: string }
  ) {
    await tx.put(awarenessKey(name, yjsClientID), update);
  },

  async removeYJSAwareness(
    tx: WriteTransaction,
    { name, yjsClientID }: { name: string; yjsClientID: number }
  ) {
    await tx.del(awarenessKey(name, yjsClientID));
  },
};

function awarenessKey(name: string, yjsClientID: number): string {
  return `${editorKey(name)}/awareness/${yjsClientID}`;
}

export function editorKey(name: string): string {
  return `yjs/cm/${name}`;
}

export function awarenessKeyPrefix(name: string): string {
  return `${editorKey(name)}/awareness/`;
}
