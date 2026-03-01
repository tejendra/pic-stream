import admin from 'firebase-admin'
import { ensureFirebase } from './firebase.js'

export function getFirestore(): admin.firestore.Firestore | null {
  if (!admin.apps.length) ensureFirebase()
  if (!admin.apps.length) return null
  return admin.firestore()
}

export async function writeDoc(
  collection: string,
  id: string,
  data: admin.firestore.DocumentData
): Promise<void> {
  const db = getFirestore()
  if (!db) return
  await db.collection(collection).doc(id).set(data)
}

export async function readDoc<T = admin.firestore.DocumentData>(
  collection: string,
  id: string
): Promise<T | null> {
  const db = getFirestore()
  if (!db) return null
  const snap = await db.collection(collection).doc(id).get()
  return (snap.exists ? snap.data() : null) as T | null
}

export async function listAlbums(): Promise<Array<{ id: string } & admin.firestore.DocumentData>> {
  const db = getFirestore()
  if (!db) return []
  const snap = await db.collection('albums').get()
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}
