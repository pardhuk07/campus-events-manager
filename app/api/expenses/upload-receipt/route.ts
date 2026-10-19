import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return errorResponse(
        "FILE_UPLOAD_FAILED",
        "Cloudinary environment variables are missing on the server",
        500
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("VALIDATION_ERROR", "No file provided for upload", 400);
    }

    // Convert file to base64 buffer for Cloudinary upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64File = `data:${file.type};base64,${buffer.toString("base64")}`;

    const timestamp = Math.round(new Date().getTime() / 1000);
    const crypto = await import("crypto");
    const signature = crypto
      .createHash("sha1")
      .update(`folder=acm_receipts&timestamp=${timestamp}${apiSecret}`)
      .digest("hex");

    const uploadPayload = new FormData();
    uploadPayload.append("file", base64File);
    uploadPayload.append("api_key", apiKey);
    uploadPayload.append("timestamp", timestamp.toString());
    uploadPayload.append("signature", signature);
    uploadPayload.append("folder", "acm_receipts");

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: uploadPayload,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Cloudinary error:", result);
      return errorResponse(
        "FILE_UPLOAD_FAILED",
        result.error?.message || "Failed to upload image to Cloudinary",
        502
      );
    }

    return successResponse({
      receiptUrl: result.secure_url,
      receiptPublicId: result.public_id,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return errorResponse("FILE_UPLOAD_FAILED", "Receipt upload failed", 500);
  }
}
