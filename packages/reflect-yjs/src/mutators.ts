// This file defines our "mutators".
//
// Mutators are how you change data in Reflect apps.
//
// They are registered with Reflect at construction-time and callable like:
// `myReflect.mutate.setCursor()`.
//
// Reflect runs each mutation immediately (optimistically) on the client,
// against the local cache, and then later (usually moments later) sends a
// description of the mutation (its name and arguments) to the server, so that
// the server can *re-run* the mutation there against the authoritative
// datastore.
//
// This re-running of mutations is how Reflect handles conflicts: the
// mutators defensively check the database when they run and do the appropriate
// thing. The Reflect sync protocol ensures that the server-side result takes
// precedence over the client-side optimistic result.

import type {
  ClientID,
  ReadTransaction,
  ReadonlyJSONObject,
  ReadonlyJSONValue,
  WriteTransaction,
} from '@rocicorp/reflect';
import * as base64 from 'base64-js';
import * as Y from 'yjs';

export const mutators = {
  yjsSetLocalStateField,
  yjsSetLocalState,
  updateYJS,
};

export type Mutators = typeof mutators;

export async function updateYJS(
  tx: WriteTransaction,
  {name, update}: {name: string; update: string},
) {
  const existing = await tx.get<string>(yjsProviderKey(name));
  if (!existing) {
    await tx.set(yjsProviderKey(name), update);
  } else {
    const updates = [base64.toByteArray(existing), base64.toByteArray(update)];
    const merged = Y.mergeUpdatesV2(updates);
    await tx.set(yjsProviderKey(name), base64.fromByteArray(merged));
  }
}

function yjsAwarenessPrefix(name: string) {
  return `yjs/awareness/${name}/`;
}

export function yjsProviderKey(name: string): string {
  return `yjs/provider/${name}`;
}

export function yjsAwarenessKey(
  name: string,
  reflectClientID: ClientID,
  yjsClientID: number,
): string {
  return `${yjsAwarenessPrefix(name)}${reflectClientID}/${yjsClientID}`;
}

export async function yjsSetLocalStateField(
  tx: WriteTransaction,
  {
    name,
    yjsClientID,
    field,
    value,
  }: {
    name: string;
    yjsClientID: number;
    field: string;
    value: ReadonlyJSONValue;
  },
) {
  const clientState = await getClientState(tx, name, tx.clientID, yjsClientID);
  if (clientState) {
    await putClientState(tx, name, tx.clientID, yjsClientID, {
      ...(clientState as object),
      [field]: value,
    });
  }
}

export async function yjsSetLocalState(
  tx: WriteTransaction,
  {
    name,
    yjsClientID,
    yjsAwarenessState,
  }: {
    name: string;
    yjsClientID: number;
    yjsAwarenessState: ReadonlyJSONObject | null;
  },
) {
  if (yjsAwarenessState === null) {
    await deleteClientState(tx, name, tx.clientID, yjsClientID);
  } else {
    await putClientState(tx, name, tx.clientID, yjsClientID, yjsAwarenessState);
  }
}

function deleteClientState(
  tx: WriteTransaction,
  name: string,
  reflectClientID: ClientID,
  yjsClientID: number,
) {
  return tx.del(yjsAwarenessKey(name, reflectClientID, yjsClientID));
}

function putClientState(
  tx: WriteTransaction,
  name: string,
  reflectClientID: string,
  yjsClientID: number,
  yjsAwarenessState: ReadonlyJSONObject | null,
) {
  return tx.set(
    yjsAwarenessKey(name, reflectClientID, yjsClientID),
    yjsAwarenessState,
  );
}

function getClientState(
  tx: WriteTransaction,
  name: string,
  reflectClientID: string,
  yjsClientID: number,
) {
  return tx.get(yjsAwarenessKey(name, reflectClientID, yjsClientID));
}

export async function listClientStates(
  tx: ReadTransaction,
  name: string,
): Promise<[ClientID, number, ReadonlyJSONObject][]> {
  const entries: [ClientID, number, ReadonlyJSONObject][] = [];
  const prefix = yjsAwarenessPrefix(name);
  for await (const [key, value] of tx.scan({prefix}).entries()) {
    const [reflectClientID, yjsClientID] = key.slice(prefix.length).split('/');
    entries.push([
      reflectClientID,
      Number(yjsClientID),
      value as ReadonlyJSONObject,
    ]);
  }
  return entries;
}