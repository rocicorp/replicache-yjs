import { UnControlled as CodeMirror } from "react-codemirror2";
import "codemirror/lib/codemirror.css";
import React, { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { CodemirrorBinding } from "y-codemirror";
import * as base64 from "base64-js";
import { mutators } from "./mutators.js";
import type { Replicache } from "replicache";
import { useSubscribe } from "replicache-react";

type M = typeof mutators;

const App = ({ rep, repKey }: { rep: Replicache<M>; repKey: string }) => {
  return <RepCodeMirror rep={rep} repKey={repKey} />;
};

function RepCodeMirror({
  rep,
  repKey,
}: {
  rep: Replicache<M>;
  repKey: string;
}) {
  const ydocRef = useRef(new Y.Doc());
  const ydoc = ydocRef.current;
  const yText = ydoc.getText("codemirror");
  const bindingRef = useRef<CodemirrorBinding | null>(null);

  const docStateFromReplicache = useSubscribe(
    rep,
    async (tx) => {
      const v = await tx.get(repKey);
      if (typeof v === "string") {
        return v;
      }
      return null;
    },
    null
  );

  if (docStateFromReplicache !== null) {
    const update = base64.toByteArray(docStateFromReplicache);
    Y.applyUpdateV2(ydoc, update);
  }

  useEffect(() => {
    const f = async () => {
      const update = Y.encodeStateAsUpdateV2(ydoc);
      await rep.mutate.updateYJS({
        key: repKey,
        update: base64.fromByteArray(update),
      });
    };
    yText.observe(f);
    return () => {
      yText.unobserve(f);
    };
  }, [yText, repKey]);

  return (
    <CodeMirror
      editorDidMount={(editor) => {
        const binding = new CodemirrorBinding(yText, editor);
        bindingRef.current = binding;
      }}
    />
  );
}

export default App;
