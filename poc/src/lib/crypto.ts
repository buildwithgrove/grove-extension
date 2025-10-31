const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type CryptoKeyPair = {
  key: CryptoKey;
  salt: Uint8Array;
};

export function generateSalt(length = 16): Uint8Array {
  const salt = new Uint8Array(length);
  crypto.getRandomValues(salt);
  return salt;
}

export async function importPassphrase(passphrase: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return keyMaterial;
}

export async function deriveEncryptionKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await importPassphrase(passphrase);
  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 150_000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export function toBase64(data: ArrayBuffer | Uint8Array): string {
  const buffer = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = "";
  buffer.forEach(value => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
}

export function fromBase64(data: string): Uint8Array {
  const binary = atob(data);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer;
}

export async function encryptPayload<T>(passphrase: string, payload: T, saltBase64?: string) {
  const salt = saltBase64 ? fromBase64(saltBase64) : generateSalt();
  const key = await deriveEncryptionKey(passphrase, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = encoder.encode(JSON.stringify(payload));
  const buffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return {
    encrypted: toBase64(buffer),
    iv: toBase64(iv),
    salt: toBase64(salt)
  };
}

export async function decryptPayload<T>(passphrase: string, encrypted: string, iv: string, salt: string): Promise<T> {
  const saltBytes = fromBase64(salt);
  const key = await deriveEncryptionKey(passphrase, saltBytes);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(iv) },
    key,
    fromBase64(encrypted)
  );
  const decoded = decoder.decode(decrypted);
  return JSON.parse(decoded) as T;
}
