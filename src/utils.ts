import { FirebaseError } from 'firebase/app';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(
  error: unknown, 
  operationType: OperationType, 
  path: string | null,
  setAppError?: (msg: string | null) => void
) {
  const err = error as FirebaseError;
  
  // If it's a permission error, we need to log it specifically for the agent to see
  if (err.code === 'permission-denied') {
    const errInfo: FirestoreErrorInfo = {
      error: err.message,
      operationType,
      path,
      authInfo: {
        // Note: In a real app, you'd pass the auth object here
        providerInfo: []
      }
    };
    console.error('Firestore Permission Error: ', JSON.stringify(errInfo));
    if (setAppError) setAppError(`Permission denied: ${path}`);
  } else {
    console.error(`Firestore Error (${operationType} at ${path}):`, err);
    if (setAppError) setAppError(err.message);
  }
}

export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
