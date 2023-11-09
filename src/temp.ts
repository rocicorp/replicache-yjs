import {Reflect} from '@rocicorp/reflect/client';
import * as monaco from 'monaco-editor';
import {MonacoBinding} from 'y-monaco';
import * as Y from 'yjs';
import {Provider} from './provider.js';

declare const reflect: Reflect<any>;

const ydoc = new Y.Doc();
const provider = new Provider(reflect, 'monaco', ydoc);
const type = ydoc.getText('monaco');

const editor = monaco.editor.create(
  must(document.getElementById('monaco-editor')),
  {
    value: '', // MonacoBinding overwrites this value with the content of type
    language: 'javascript',
  },
);

const binding = new MonacoBinding(
  type,
  must(editor.getModel()),
  new Set([editor]),
  provider.awareness,
);

function must<T>(v: T | null | undefined): T {
  if (v === null || v === undefined) {
    throw new Error('Expected value to be defined');
  }
  return v;
}
