import { v2 as cloudinary } from "cloudinary";
import { getSetting, setSetting } from "./db";
import { CloudinaryConfig } from "../types";

interface StoredCloudinarySettings {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadPreset: string;
}

function parseCloudinaryUrlEnv(): Partial<StoredCloudinarySettings> {
  const raw = (process.env.CLOUDINARY_URL || "").trim();
  if (!raw.startsWith("cloudinary://")) return {};
  try {
    const parsed = new URL(raw);
    return {
      cloudName: parsed.hostname || "",
      apiKey: decodeURIComponent(parsed.username || ""),
      apiSecret: decodeURIComponent(parsed.password || ""),
    };
  } catch {
    return {};
  }
}

export async function resolveCloudinaryCredentials(): Promise<
  StoredCloudinarySettings & { source: "ENV" | "DATABASE" | "NONE"; configured: boolean }
> {
  const fromUrl = parseCloudinaryUrlEnv();
  const envCloudName = (process.env.CLOUDINARY_CLOUD_NAME || fromUrl.cloudName || "").trim();
  const envApiKey = (process.env.CLOUDINARY_API_KEY || fromUrl.apiKey || "").trim();
  const envApiSecret = (process.env.CLOUDINARY_API_SECRET || fromUrl.apiSecret || "").trim();
  const envPreset = (process.env.CLOUDINARY_UPLOAD_PRESET || "").trim();

  const stored = (await getSetting<StoredCloudinarySettings>("cloudinary_settings")) || {
    cloudName: "",
    apiKey: "",
    apiSecret: "",
    uploadPreset: "",
  };

  const cloudName = envCloudName || stored.cloudName || "";
  const apiKey = envApiKey || stored.apiKey || "";
  const apiSecret = envApiSecret || stored.apiSecret || "";
  const uploadPreset = envPreset || stored.uploadPreset || "";

  const signedReady = Boolean(cloudName && apiKey && apiSecret);
  const unsignedReady = Boolean(cloudName && uploadPreset);
  const configured = signedReady || unsignedReady;

  const source: "ENV" | "DATABASE" | "NONE" =
    envCloudName && (envApiSecret || envPreset)
      ? "ENV"
      : configured
      ? "DATABASE"
      : "NONE";

  return {
    cloudName,
    apiKey,
    apiSecret,
    uploadPreset,
    source,
    configured,
  };
}

export async function getPublicCloudinaryConfig(): Promise<CloudinaryConfig> {
  const creds = await resolveCloudinaryCredentials();
  return {
    cloudName: creds.cloudName,
    apiKey: creds.apiKey,
    apiSecret: creds.apiSecret ? "••••••••••••" : "",
    uploadPreset: creds.uploadPreset,
    configured: creds.configured,
    source: creds.source,
  };
}

export async function saveCloudinaryConfig(input: {
  cloudName?: string;
  apiKey?: string;
  apiSecret?: string;
  uploadPreset?: string;
}): Promise<CloudinaryConfig> {
  const existing = (await getSetting<StoredCloudinarySettings>("cloudinary_settings")) || {
    cloudName: "",
    apiKey: "",
    apiSecret: "",
    uploadPreset: "",
  };

  const nextSecret =
    input.apiSecret && !input.apiSecret.includes("••••")
      ? input.apiSecret.trim()
      : existing.apiSecret;

  await setSetting("cloudinary_settings", {
    cloudName: (input.cloudName ?? existing.cloudName).trim(),
    apiKey: (input.apiKey ?? existing.apiKey).trim(),
    apiSecret: nextSecret,
    uploadPreset: (input.uploadPreset ?? existing.uploadPreset).trim(),
  });

  return getPublicCloudinaryConfig();
}

export interface UploadAssetOptions {
  fileData: string | Buffer;
  fileName?: string;
  mimeType?: string;
  folder?: string;
  resourceType?: "image" | "video" | "raw" | "auto";
}

export interface UploadAssetResult {
  url: string;
  publicId: string;
  bytes?: number;
  format?: string;
  provider: "cloudinary" | "inline_fallback";
}

function toDataUri(fileData: string | Buffer, mimeType = "application/octet-stream"): string {
  if (Buffer.isBuffer(fileData)) {
    return `data:${mimeType};base64,${fileData.toString("base64")}`;
  }
  if (fileData.startsWith("data:") || fileData.startsWith("http://") || fileData.startsWith("https://")) {
    return fileData;
  }
  return `data:${mimeType};base64,${fileData}`;
}

export async function uploadToCloudinary(options: UploadAssetOptions): Promise<UploadAssetResult> {
  const {
    fileData,
    fileName = `asset_${Date.now()}`,
    mimeType = "application/octet-stream",
    folder = "thamjj13/uploads",
    resourceType = "auto",
  } = options;

  if (typeof fileData === "string" && (fileData.startsWith("https://") || fileData.startsWith("http://"))) {
    return {
      url: fileData,
      publicId: "",
      provider: "cloudinary",
    };
  }

  const creds = await resolveCloudinaryCredentials();
  const dataUri = toDataUri(fileData, mimeType);
  const sanitizedBaseName = fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 64);

  // 1. Signed server-side upload via Cloudinary v2 SDK (preferred production mode)
  if (creds.cloudName && creds.apiKey && creds.apiSecret) {
    cloudinary.config({
      cloud_name: creds.cloudName,
      api_key: creds.apiKey,
      api_secret: creds.apiSecret,
      secure: true,
    });

    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: resourceType,
      public_id: `${Date.now()}_${sanitizedBaseName || "asset"}`,
      overwrite: false,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      bytes: result.bytes,
      format: result.format,
      provider: "cloudinary",
    };
  }

  // 2. Unsigned upload preset fallback if cloudName + uploadPreset are configured
  if (creds.cloudName && creds.uploadPreset) {
    const endpointType = resourceType === "video" ? "video" : resourceType === "raw" ? "raw" : "auto";
    const form = new FormData();
    form.append("file", dataUri);
    form.append("upload_preset", creds.uploadPreset);
    form.append("folder", folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(creds.cloudName)}/${endpointType}/upload`,
      {
        method: "POST",
        body: form,
      }
    );

    const payload: any = await response.json();
    if (!response.ok || !payload.secure_url) {
      throw new Error(payload?.error?.message || "Cloudinary unsigned upload failed.");
    }

    return {
      url: payload.secure_url,
      publicId: payload.public_id || "",
      bytes: payload.bytes,
      format: payload.format,
      provider: "cloudinary",
    };
  }

  // 3. Development fallback when Cloudinary credentials have not been set yet
  if (dataUri.length > 8 * 1024 * 1024) {
    throw new Error(
      "Cloudinary credentials are not configured yet. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment or Admin Panel to upload large files."
    );
  }

  console.warn(
    `[CLOUDINARY] Credentials not yet configured — storing inline fallback for ${fileName}. Configure CLOUDINARY_* env vars for production CDN storage.`
  );

  return {
    url: dataUri,
    publicId: "",
    provider: "inline_fallback",
  };
}

export async function deleteFromCloudinary(
  publicId: string,
  resourceType: "image" | "video" | "raw" = "image"
): Promise<boolean> {
  if (!publicId) return false;
  const creds = await resolveCloudinaryCredentials();
  if (!creds.cloudName || !creds.apiKey || !creds.apiSecret) return false;

  try {
    cloudinary.config({
      cloud_name: creds.cloudName,
      api_key: creds.apiKey,
      api_secret: creds.apiSecret,
      secure: true,
    });
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return true;
  } catch (err) {
    console.error("Failed to destroy Cloudinary asset:", err);
    return false;
  }
}
