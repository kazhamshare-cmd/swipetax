// Firestore REST API utilities for SwipeTax
// Placeholder implementation - will be expanded as needed

import { Capacitor } from "@capacitor/core";

export function shouldUseRestApi(): boolean {
  // Use REST API on native platforms for better performance
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}

export async function restGetDoc(
  path: string,
  docId?: string
): Promise<Record<string, unknown> | null> {
  // Placeholder - implement REST API call if needed
  // path can be "collection/docId" or just "collection" with separate docId
  console.log('[firestoreRest] restGetDoc called:', path, docId);
  return null;
}

export async function restSetDoc(
  path: string,
  dataOrDocId?: Record<string, unknown> | string,
  data?: Record<string, unknown>
): Promise<void> {
  // Placeholder - implement REST API call if needed
  // Supports both restSetDoc(path, data) and restSetDoc(collection, docId, data)
  console.log('[firestoreRest] restSetDoc called:', path, dataOrDocId, data);
}
