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

export async function updateDoc(
  collection: string,
  id: string,
  data: admin.firestore.UpdateData<admin.firestore.DocumentData>
): Promise<void> {
  const db = getFirestore()
  if (!db) return
  await db.collection(collection).doc(id).update(data)
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

export interface MediaDocPaths {
  id: string
  storagePath: string
  previewPath: string | null
  thumbnailPath: string
}

export async function listMedia(albumId: string): Promise<MediaDocPaths[]> {
  const db = getFirestore()
  if (!db) return []
  const snap = await db.collection('albums').doc(albumId).collection('media').get()
  return snap.docs.map((doc) => {
    const d = doc.data()
    return {
      id: doc.id,
      storagePath: (d.storagePath as string) ?? '',
      previewPath: (d.previewPath as string | null) ?? null,
      thumbnailPath: (d.thumbnailPath as string) ?? '',
    }
  })
}

/** Returns set of duplicateKey values for the album (for prepare duplicate check). */
export async function getExistingDuplicateKeys(albumId: string): Promise<Set<string>> {
  const db = getFirestore()
  if (!db) return new Set()
  const snap = await db.collection('albums').doc(albumId).collection('media').get()
  const keys = new Set<string>()
  for (const doc of snap.docs) {
    const key = doc.data().duplicateKey as string | undefined
    if (typeof key === 'string') keys.add(key)
  }
  return keys
}

export async function writeMediaDoc(
  albumId: string,
  mediaId: string,
  data: admin.firestore.DocumentData
): Promise<void> {
  const db = getFirestore()
  if (!db) return
  await db.collection('albums').doc(albumId).collection('media').doc(mediaId).set(data)
}

export async function deleteDoc(collection: string, id: string): Promise<void> {
  const db = getFirestore()
  if (!db) return
  await db.collection(collection).doc(id).delete()
}

export async function deleteMediaDoc(albumId: string, mediaId: string): Promise<void> {
  const db = getFirestore()
  if (!db) return
  await db.collection('albums').doc(albumId).collection('media').doc(mediaId).delete()
}
