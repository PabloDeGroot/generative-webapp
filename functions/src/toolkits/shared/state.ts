import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type CollectionReference } from "firebase-admin/firestore";
import { currentToolkit } from "../context";

// Per-user data a toolkit owns (trips, saved items, ...), kept apart from other toolkits:
// toolkits/{toolkitId}/users/{uid}/{collection}. Only firebase-admin reads or writes it;
// firestore.rules deny client access, so tools are the only way in.
export function userCollection(userId: string, name: string): CollectionReference {
    if (getApps().length === 0) initializeApp();
    return getFirestore().collection(`toolkits/${currentToolkit().id}/users/${userId}/${name}`);
}

// Data a toolkit shares between all its users (posts, comments, ...): toolkits/{toolkitId}/{name}.
// Server-only as well: every read and write goes through the toolkit's tools.
const RESERVED_COLLECTIONS = new Set(["components", "users"]); // component library, userCollection()

export function toolkitCollection(name: string): CollectionReference {
    if (RESERVED_COLLECTIONS.has(name)) throw new Error(`'${name}' is reserved under toolkits/{id}/.`);
    if (getApps().length === 0) initializeApp();
    return getFirestore().collection(`toolkits/${currentToolkit().id}/${name}`);
}

/** Tool handlers that need a signed-in user call this first. */
export function requireUser(userId: string | null): string {
    if (!userId) throw new Error("Sign in is required for this action.");
    return userId;
}
