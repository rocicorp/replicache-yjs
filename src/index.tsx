import {WriteTransaction} from '@rocicorp/reflect';
import {Reflect} from '@rocicorp/reflect/client';
import {useSubscribe} from '@rocicorp/reflect/react';
import * as base64 from 'base64-js';
import 'codemirror/lib/codemirror.css';
import {nanoid} from 'nanoid';
import {useEffect} from 'react';
import * as Y from 'yjs';
import {
  UserInfo,
  initClientState,
  putYJSAwarenessState,
  randUserInfo,
  updateYJSAwarenessState,
} from './client-state.js';
import './index.css';
import {UpdateYJS, editorKey, updateYJS} from './mutators.js';
import {Provider} from './provider.js';

const userID = nanoid();
const roomID = `r-${Math.floor(new Date().getTime() / (1000 * 60 * 60))}`;

const server: string | undefined = import.meta.env.VITE_REFLECT_URL;
if (!server) {
  throw new Error('VITE_REFLECT_URL required');
}

const mutators = {
  initClientState,
  updateYJSAwarenessState,
  putYJSAwarenessState,
  updateYJS,
  more: (tx: WriteTransaction) => 1,
};

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

const docName = 'test';

const ydoc1 = new Y.Doc();
const p1 = new Provider(r, docName, ydoc1);

const ydoc2 = new Y.Doc();
const p2 = new Provider(r, docName, ydoc2);

const m1 = ydoc1.getMap('m1');
m1.set('a', 1);

const m2 = ydoc2.getMap('m1');
m2.set('b', 2);

await new Promise(resolve => setTimeout(resolve, 1000));

console.log(m1.toJSON());
console.log(m2.toJSON());

// function ReflectCodeMirror({userInfo, editorID}: RepCodeMirrorProps) {
//   const ydocRef = useRef(new Y.Doc());
//   const ydoc = ydocRef.current;
//   useEffect(() => {
//     void (async () => {
//       await r.mutate.initClientState({
//         userInfo,
//         yjsClientID: ydoc.clientID,
//         yjsAwarenessState: {
//           user: {color: userInfo.color, name: userInfo.name},
//         },
//       });
//     })();
//   }, [ydoc]);
//   const yText = ydoc.getText('codemirror');
//   const bindingRef = useRef<CodemirrorBinding | null>(null);

//   useYJSReflect(r, editorID, yText);

//   const awarenessRef = useRef(new Awareness(ydoc, r));
//   const awareness = awarenessRef.current;

//   return (
//     <div className={styles.container}>
//       <h1>Reflect + yjs</h1>
//       <h3>
//         <a href="https://hello.reflect.net">hello.reflect.net</a>
//       </h3>
//       <CodeMirror
//         editorDidMount={editor => {
//           const binding = new CodemirrorBinding(yText, editor, awareness);
//           bindingRef.current = binding;
//         }}
//         options={{
//           theme: 'material',
//           lineNumbers: true,
//           showCursorWhenSelecting: true,
//           autoCursor: true,
//         }}
//       />
//     </div>
//   );
// }

function useYJSReflect(r: Reflect<UpdateYJS>, editorID: string, yText: Y.Text) {
  const ydoc = yText.doc;
  assert(ydoc);

  const docStateFromReflect = useSubscribe(
    r,
    async tx => {
      const v = await tx.get(editorKey(editorID));
      if (typeof v === 'string') {
        return v;
      }
      return null;
    },
    null,
    [editorID],
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

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('root element is null');
}

const userInfo = randUserInfo();

// render(
//   <React.StrictMode>
//     <ReflectCodeMirror userInfo={userInfo} editorID="one" />
//   </React.StrictMode>,
//   rootElement,
// );

if (import.meta.hot) {
  import.meta.hot.dispose(async () => {
    // this makes sure that there is only one instance of the reflect client during hmr reloads
    await r.close();
    rootElement?.remove();
  });
}

function assert(value: unknown): asserts value {
  if (!value) {
    throw new Error('Assertion failed');
  }
}
