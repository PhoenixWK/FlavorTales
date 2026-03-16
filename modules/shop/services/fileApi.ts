import type { FileUploadResult } from "@/modules/shop/types/shop";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * Uploads an image file to Cloudflare R2 via the Next.js proxy.
 * @param file JPEG or PNG file, max 5 MB
 */
export async function uploadImage(
  file: File
): Promise<ApiResponse<FileUploadResult>> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/file/upload", {
    method: "POST",
    body: form,
  });

  const json = await res.json();
  if (res.status === 401) {
    window.location.href = "/auth/vendor/login";
    return json;
  }
  return json;
}
