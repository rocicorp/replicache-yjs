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

const App = ({ rep }: { rep: Replicache<M> }) => {
  const ydocRef = useRef(new Y.Doc());
  const ydoc = ydocRef.current;
  const yText = ydoc.getText("codemirror");
  const [serverText, setServerText] = useState<string>(yText.toJSON());

  const [docState, setDocState] = useState(
    base64.fromByteArray(Y.encodeStateAsUpdateV2(ydoc))
  );

  useEffect(() => {
    const f = () => {
      const update = Y.encodeStateAsUpdateV2(ydoc);
      setServerText(yText.toJSON());
      setDocState(base64.fromByteArray(update));
      console.groupEnd();
    };
    yText.observe(f);
    return () => {
      yText.unobserve(f);
    };
  }, [yText]);

  useEffect(() => {
    const text = "Hello World";
    yText.insert(0, text);
    const update = Y.encodeStateAsUpdateV2(ydoc);
    setDocState(base64.fromByteArray(update));
  }, []);

  const onUpdate = useCallback(
    (clientDocState: string) => {
      Y.applyUpdateV2(ydoc, base64.toByteArray(clientDocState));
    },
    [ydoc]
  );

  return (
    <>
      <section>
        <h3>Server</h3>
        <pre>{serverText}</pre>
      </section>
      <section>
        <h3>Client 1</h3>
        <Test docState={docState} onUpdate={onUpdate} />
      </section>
      <section>
        <h3>Client 2</h3>
        <Test docState={docState} onUpdate={onUpdate} />
      </section>
    </>
  );
};

function Test({
  docState,
  onUpdate,
}: {
  docState: string;
  onUpdate: (docState: string) => void;
}) {
  const ydocRef = useRef(new Y.Doc());
  const ydoc = ydocRef.current;
  const update = base64.toByteArray(docState);
  Y.applyUpdateV2(ydoc, update);
  const yText = ydoc.getText("codemirror");
  const bindingRef = useRef<CodemirrorBinding | null>(null);

  useEffect(() => {
    const f = () => {
      const update = Y.encodeStateAsUpdateV2(ydoc);
      onUpdate(base64.fromByteArray(update));
    };
    yText.observe(f);
    return () => {
      yText.unobserve(f);
    };
  }, [yText]);

  return (
    <div style={{ margin: 10, border: "1px solid" }}>
      <CodeMirror
        // value={value}
        // onBeforeChange={(editor, data, value) => {
        //   setValue(value);
        // }}
        onChange={(editor, data, value) => {
          // console.log(editor, data, value);
        }}
        editorDidMount={(editor) => {
          // console.log("editorDidMount", editor);
          // if (typeof window !== "undefined") {
          const binding = new CodemirrorBinding(yText, editor);
          bindingRef.current = binding;
          // }
        }}
      />
    </div>
  );
}

export default App;
