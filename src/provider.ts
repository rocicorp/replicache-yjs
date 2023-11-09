import {Reflect} from '@rocicorp/reflect/client';
import * as base64 from 'base64-js';
import * as Y from 'yjs';
import {Awareness, AwarenessMutatorDefs} from './awareness.js';
import {UpdateYJS} from './mutators.js';

function yjsProviderKey(name: string | number): string {
  return `yjs/${name}`;
}

type M = UpdateYJS & AwarenessMutatorDefs;

export class Provider {
  readonly #reflect: Reflect<M>;
  readonly #ydoc: Y.Doc;
  #cancelSubscribe: () => void;
  readonly name: string;

  #awareness: Awareness | null = null;

  constructor(reflect: Reflect<M>, name: string, ydoc: Y.Doc) {
    this.#reflect = reflect;
    this.name = name;
    this.#ydoc = ydoc;

    ydoc.on('update', this.#handleUpdate);
    ydoc.on('destroy', this.#handleDestroy);

    this.#cancelSubscribe = reflect.subscribe(
      async tx => {
        const v = await tx.get(yjsProviderKey(this.name));
        return typeof v === 'string' ? v : null;
      },
      docStateFromReflect => {
        if (docStateFromReflect !== null) {
          const update = base64.toByteArray(docStateFromReflect);
          Y.applyUpdateV2(ydoc, update);
        }
      },
    );
  }

  get awareness(): Awareness {
    if (this.#awareness === null) {
      this.#awareness = new Awareness(this.#ydoc, this.#reflect);
    }
    return this.#awareness;
  }

  #handleUpdate = async () => {
    // We could/should use the update passed into the on('update') but encoding the whole state is easier for now.
    const update = Y.encodeStateAsUpdateV2(this.#ydoc);
    await this.#reflect.mutate.updateYJS({
      name: this.name,
      update: base64.fromByteArray(update),
    });
  };

  #handleDestroy = () => {
    this.destroy();
  };

  destroy(): void {
    this.#cancelSubscribe();
    this.#ydoc.off('destroy', this.#handleDestroy);
    this.#ydoc.off('update', this.#handleUpdate);
  }
}
