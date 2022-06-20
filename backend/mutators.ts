import * as base64 from "base64-js";
import * as Y from "yjs";
import { editorKey, M, mutators as feMutators } from "../frontend/mutators";

export const mutators: M = {
  ...feMutators,
  async updateYJS(tx, { name: name, update }) {
    const key = editorKey(name);
    const oldYdocState = await tx.get(key);
    if (typeof oldYdocState === "string") {
      const oldUpdate = base64.toByteArray(oldYdocState);
      const newUpdate = base64.toByteArray(update);
      const updateBytes = Y.mergeUpdatesV2([oldUpdate, newUpdate]);
      await tx.put(key, base64.fromByteArray(updateBytes));
    } else {
      await tx.put(key, update);
    }
  },
};
