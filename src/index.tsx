import { Reflect } from "@rocicorp/reflect/client";
import { nanoid } from "nanoid";
import React, { useEffect, useRef, useState } from "react";
import { UserInfo, randUserInfo } from "./client-state.js";
import {
  UpdateYJS,
  awarenessKeyPrefix,
  editorKey,
  mutators,
} from "./mutators.js";
import { UnControlled as CodeMirror } from "react-codemirror2";
import "codemirror/lib/codemirror.css";
import * as Y from "yjs";
import * as yprotocolAwareness from "y-protocols/awareness.js";
import { CodemirrorBinding } from "y-codemirror";
import * as base64 from "base64-js";
import { render } from "react-dom";
import { useSubscribe } from "@rocicorp/reflect/react";
import styles from "./index.module.css";
import "./index.css";

const userID = nanoid();
const roomID = "my-room";

const server: string | undefined = import.meta.env.VITE_REFLECT_URL;
if (!server) {
  throw new Error("VITE_REFLECT_URL required");
}

const r = new Reflect({
  server,
  userID,
  roomID,
  auth: userID,
  mutators,
});

type RepCodeMirrorProps = {
  editorID: string;
  userInfo: UserInfo;
};

function ReflectCodeMirror({ userInfo, editorID }: RepCodeMirrorProps) {
  useEffect(() => {
    void (async () => {
      await r.mutate.initClientState(userInfo);
    })();
  }, []);

  const ydocRef = useRef(new Y.Doc());
  const ydoc = ydocRef.current;
  const yText = ydoc.getText("codemirror");
  const bindingRef = useRef<CodemirrorBinding | null>(null);

  useYJSReflect(r, editorID, yText);

  const awarenessStateFromReflect = useSubscribe(
    r,
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

  for (const value of awarenessStateFromReflect) {
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
      color: userInfo.color,
      name: userInfo.name,
    });
  }, [userInfo.color, userInfo.name]);

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
        await r.mutate.removeYJSAwareness({
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
        void r.mutate
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
    <div className={styles.container}>
      <h1>Reflect + yjs</h1>
      <CodeMirror
        editorDidMount={(editor) => {
          const binding = new CodemirrorBinding(yText, editor, awareness);
          bindingRef.current = binding;
        }}
        options={{
          theme: "material",
          lineNumbers: true,
          showCursorWhenSelecting: true,
          autoCursor: true,
        }}
      />
    </div>
  );
}

function useYJSReflect(
  r: Reflect<UpdateYJS>,
  editorID: string,
  yText: Y.Text
) {
  const ydoc = yText.doc;
  if (!ydoc) {
    return;
  }

  const docStateFromReflect = useSubscribe(
    r,
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

  if (docStateFromReflect !== null) {
    const update = base64.toByteArray(docStateFromReflect);
    Y.applyUpdateV2(ydoc, update);
  }

  useEffect(() => {
    const f = async () => {
      const update = Y.encodeStateAsUpdateV2(ydoc);
      await r.mutate.updateYJS({
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

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("root element is null");
}

const userInfo = randUserInfo();

render(
  <React.StrictMode>
    <ReflectCodeMirror userInfo={userInfo} editorID="one" />
  </React.StrictMode>,
  rootElement
);

if (import.meta.hot) {
  import.meta.hot.dispose(async () => {
    // this makes sure that there is only one instance of the reflect client during hmr reloads
    await r.close();
    rootElement?.remove();
  });
}
