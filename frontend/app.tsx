import { UnControlled as CodeMirror } from "react-codemirror2";
import "codemirror/lib/codemirror.css";
import React, { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import * as yprotocolAwareness from "y-protocols/awareness.js";
import { CodemirrorBinding } from "y-codemirror";
import * as base64 from "base64-js";
import { awarenessKeyPrefix, editorKey, mutators } from "./mutators";
import type { MutatorDefs, Replicache, WriteTransaction } from "replicache";
import { useSubscribe } from "replicache-react";

type M = typeof mutators;

type RepCodeMirrorProps = {
  rep: Replicache<M>;
  editorID: string;
  cursorColor: string;
  userName: string;
};

function RepCodeMirror({
  rep,
  editorID,
  cursorColor,
  userName,
}: RepCodeMirrorProps) {
  const ydocRef = useRef(new Y.Doc());
  const ydoc = ydocRef.current;
  const yText = ydoc.getText("codemirror");
  const bindingRef = useRef<CodemirrorBinding | null>(null);

  useYJSReplicache(rep, editorID, yText);

  const awarenessStateFromReplicache = useSubscribe(
    rep,
    async (tx) =>
      tx
        .scan({ prefix: awarenessKeyPrefix(editorID) })
        .values()
        .toArray(),
    [],
    [editorID]
  );
  const awarenessRef = useRef(new yprotocolAwareness.Awareness(ydoc));
  const awareness = awarenessRef.current;

  for (const value of awarenessStateFromReplicache) {
    if (typeof value === "string" && awarenessRef.current) {
      yprotocolAwareness.applyAwarenessUpdate(
        awareness,
        base64.toByteArray(value),
        "origin"
      );
    }
  }

  useEffect(() => {
    awareness.setLocalStateField("user", {
      color: cursorColor,
      name: userName,
    });
  }, [cursorColor, userName]);

  useEffect(() => {
    const f = async ({
      added,
      updated,
      removed,
    }: {
      added: number[];
      updated: number[];
      removed: number[];
    }) => {
      // Remove clients that have not pinged in a while.
      for (const removedClient of removed) {
        await rep.mutate.removeYJSAwareness({
          name: editorID,
          yjsClientID: removedClient,
        });
      }

      if (
        added.includes(awareness.clientID) ||
        updated.includes(awareness.clientID) ||
        removed.includes(awareness.clientID)
      ) {
        const update = yprotocolAwareness.encodeAwarenessUpdate(awareness, [
          awareness.clientID,
        ]);
        void rep.mutate
          .updateYJSAwareness({
            name: editorID,
            yjsClientID: awareness.clientID,
            update: base64.fromByteArray(update),
          })
          .catch((err) => console.error(err));
      }
    };
    awareness.on("change", f);
    return () => awareness.off("change", f);
  }, [awareness]);

  return (
    <CodeMirror
      editorDidMount={(editor) => {
        const binding = new CodemirrorBinding(yText, editor, awareness);
        bindingRef.current = binding;
      }}
    />
  );
}

export default RepCodeMirror;

type UpdateYJS = {
  updateYJS: (
    tx: WriteTransaction,
    { name, update }: { name: string; update: string }
  ) => Promise<void>;
};

function useYJSReplicache(
  rep: Replicache<UpdateYJS>,
  editorID: string,
  yText: Y.Text
) {
  const ydoc = yText.doc;
  if (!ydoc) {
    return;
  }

  const docStateFromReplicache = useSubscribe(
    rep,
    async (tx) => {
      const v = await tx.get(editorKey(editorID));
      if (typeof v === "string") {
        return v;
      }
      return null;
    },
    null,
    [editorID]
  );

  if (docStateFromReplicache !== null) {
    const update = base64.toByteArray(docStateFromReplicache);
    Y.applyUpdateV2(ydoc, update);
  }

  useEffect(() => {
    const f = async () => {
      const update = Y.encodeStateAsUpdateV2(ydoc);
      await rep.mutate.updateYJS({
        name: editorID,
        update: base64.fromByteArray(update),
      });
    };
    yText.observe(f);
    return () => {
      yText.unobserve(f);
    };
  }, [yText, editorID]);
}
