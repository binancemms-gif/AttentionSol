import { createHash } from "node:crypto";
import { ProviderError } from "./helius";

const GATEWAY = "https://gateway.pinata.cloud/ipfs/";
const UPLOAD_URL = "https://uploads.pinata.cloud/v3/files";
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

export type StoredFile = {
  cid: string;
  uri: string;
  sha256: string;
};

export function pinataConfigured(): boolean {
  return Boolean(process.env.PINATA_JWT);
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireToken(): string {
  const token = process.env.PINATA_JWT;
  if (!token) {
    throw new ProviderError(
      "Pinata is not configured. Add PINATA_JWT to enable public IPFS uploads.",
      "NOT_CONFIGURED",
    );
  }
  return token;
}

export async function uploadPublicFile(
  bytes: Uint8Array,
  name: string,
  contentType: string,
): Promise<StoredFile> {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new ProviderError("Upload must be between 1 byte and 6 MB.", "INVALID_RESPONSE");
  }

  const token = requireToken();
  const form = new FormData();
  form.append("network", "public");
  form.append("name", name.slice(0, 120));
  form.append("cid_version", "v1");
  form.append(
    "file",
    new Blob([bytes], { type: contentType }),
    name.slice(0, 120),
  );

  let response: Response;
  try {
    response = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new ProviderError("Pinata did not respond to the upload request.");
  }

  if (!response.ok) {
    throw new ProviderError(
      `Pinata upload failed with HTTP ${response.status}.`,
      "UNAVAILABLE",
    );
  }

  const payload = (await response.json()) as {
    data?: { cid?: unknown };
  };
  const cid = payload.data?.cid;
  if (typeof cid !== "string" || !/^b[a-z2-7]{30,100}$/.test(cid)) {
    throw new ProviderError("Pinata returned an invalid public IPFS CID.", "INVALID_RESPONSE");
  }

  const uri = `${GATEWAY}${cid}`;
  let uploadedBytes: Uint8Array | null = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      uploadedBytes = await retrievePublicUri(uri);
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }
  if (!uploadedBytes) {
    throw new ProviderError("Uploaded IPFS content could not be retrieved.");
  }
  const expectedHash = sha256(bytes);
  if (sha256(uploadedBytes) !== expectedHash) {
    throw new ProviderError(
      "The public IPFS gateway returned different bytes than the uploaded file.",
      "INVALID_RESPONSE",
    );
  }

  return { cid, uri, sha256: expectedHash };
}

export async function retrievePublicUri(uri: string): Promise<Uint8Array> {
  const parsed = new URL(uri);
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "gateway.pinata.cloud" ||
    !/^\/ipfs\/b[a-z2-7]{30,100}$/.test(parsed.pathname)
  ) {
    throw new ProviderError("Only public Pinata IPFS URIs are accepted.", "INVALID_RESPONSE");
  }

  let response: Response;
  try {
    response = await fetch(parsed, {
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ProviderError("The public IPFS gateway is unavailable.");
  }
  if (!response.ok) {
    throw new ProviderError(
      `The public IPFS gateway returned HTTP ${response.status}.`,
      "UNAVAILABLE",
    );
  }

  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES) {
    throw new ProviderError("The retrieved IPFS resource exceeds the size limit.");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new ProviderError("The retrieved IPFS resource exceeds the size limit.");
  }
  return bytes;
}
