/**
 * Shared helpers for uploading shop images and audio blobs to R2.
 * Used by both CreateShopForm and CreatePoiForm to avoid duplication.
 */
import { uploadImage } from "./fileApi";
import { uploadAudio } from "./audioApi";

export interface UploadedImageAssets {
  avatarFileId: number;
  additionalImageIds: number[];
}

export interface UploadedAudioAssets {
  viFileId: number | null;
  enFileId: number | null;
}

/**
 * Uploads avatar + additional images to R2.
 * Throws if avatar upload fails or any additional image upload fails.
 */
export async function uploadImages(imageFiles: {
  avatar: File | null;
  additional: File[];
}): Promise<UploadedImageAssets> {
  if (!imageFiles.avatar) {
    throw new Error("Vui lòng chọn ảnh đại diện.");
  }

  const avatarResult = await uploadImage(imageFiles.avatar);
  if (!avatarResult.success) {
    throw new Error(avatarResult.message ?? "Tải ảnh đại diện thất bại.");
  }

  const additionalResults = await Promise.all(
    imageFiles.additional.map((f) => uploadImage(f))
  );
  for (const r of additionalResults) {
    if (!r.success) throw new Error(r.message ?? "Tải ảnh bổ sung thất bại.");
  }

  return {
    avatarFileId: avatarResult.data.fileId,
    additionalImageIds: additionalResults.map((r) => r.data.fileId),
  };
}

/**
 * Uploads audio blobs (or uploaded File objects) to R2.
 * Audio failures are non-blocking: they call onError and return null file IDs
 * instead of throwing, so the caller can still proceed with form submission.
 */
export async function uploadAudios(
  audioBlobs: { vi?: Blob; en?: Blob },
  onError?: (lang: "vi" | "en", message: string) => void
): Promise<UploadedAudioAssets> {
  const [viResult, enResult] = await Promise.allSettled([
    audioBlobs.vi ? uploadAudio(audioBlobs.vi, "vi") : Promise.resolve(null),
    audioBlobs.en ? uploadAudio(audioBlobs.en, "en") : Promise.resolve(null),
  ]);

  const viFileId =
    viResult.status === "fulfilled" && viResult.value?.success
      ? viResult.value.data.fileId
      : null;
  const enFileId =
    enResult.status === "fulfilled" && enResult.value?.success
      ? enResult.value.data.fileId
      : null;

  if (
    viResult.status === "rejected" ||
    (viResult.status === "fulfilled" && viResult.value && !viResult.value.success)
  ) {
    const msg =
      viResult.status === "rejected"
        ? String(viResult.reason)
        : (viResult.value?.message ?? "Tải audio tiếng Việt thất bại.");
    onError?.("vi", msg);
  }

  if (
    enResult.status === "rejected" ||
    (enResult.status === "fulfilled" && enResult.value && !enResult.value.success)
  ) {
    const msg =
      enResult.status === "rejected"
        ? String(enResult.reason)
        : (enResult.value?.message ?? "Tải audio tiếng Anh thất bại.");
    onError?.("en", msg);
  }

  return { viFileId, enFileId };
}

/** Strips HTML tags from a content-editable string and returns plain text. */
export function stripHtml(html: string): string {
  if (typeof document !== "undefined") {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.innerText;
  }
  return html.replace(/<[^>]*>/g, "");
}
