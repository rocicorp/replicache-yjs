import {Reflect} from '@rocicorp/reflect/client';
import 'codemirror/lib/codemirror.css';
import {nanoid} from 'nanoid';
import React, {useEffect, useRef} from 'react';
import {UnControlled as CodeMirror} from 'react-codemirror2';
import {render} from 'react-dom';
import {CodemirrorBinding} from 'y-codemirror';
import * as Y from 'yjs';
import './index.css';
import styles from './index.module.css';
import {Provider, mutators} from './provider.js';
import {UserInfo, randUserInfo} from './user-info.js';

const userID = nanoid();
const roomID = `r-${Math.floor(new Date().getTime() / (1000 * 60 * 60))}`;

const server: string | undefined = import.meta.env.VITE_REFLECT_URL;
if (!server) {
  throw new Error('VITE_REFLECT_URL required');
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

function ReflectCodeMirror({userInfo, editorID}: RepCodeMirrorProps) {
  const ydocRef = useRef(new Y.Doc());
  const ydoc = ydocRef.current;

  const provider = new Provider(r, editorID, ydoc);
  useEffect(() => {
    provider.awareness.setLocalStateField('user', userInfo);
  }, [provider.awareness, userInfo]);

  useEffect(() => {
    return () => provider.destroy();
  }, []);

  const yText = ydoc.getText('codemirror');
  const bindingRef = useRef<CodemirrorBinding | null>(null);

  return (
    <div className={styles.container}>
      <h1>Reflect + yjs</h1>
      <h3>
        <a href="https://hello.reflect.net">hello.reflect.net</a>
      </h3>
      <CodeMirror
        editorDidMount={editor => {
          const binding = new CodemirrorBinding(
            yText,
            editor,
            provider.awareness,
          );
          bindingRef.current = binding;
        }}
        options={{
          theme: 'material',
          lineNumbers: true,
          showCursorWhenSelecting: true,
          autoCursor: true,
        }}
      />
    </div>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('root element is null');
}

const userInfo = randUserInfo();

render(
  <React.StrictMode>
    <ReflectCodeMirror userInfo={userInfo} editorID="one" />
  </React.StrictMode>,
  rootElement,
);

if (import.meta.hot) {
  import.meta.hot.dispose(async () => {
    // this makes sure that there is only one instance of the reflect client during hmr reloads
    await r.close();
    rootElement.textContent = '';
  });
}
