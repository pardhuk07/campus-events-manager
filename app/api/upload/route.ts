import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { apiSuccess, apiError, ErrorCodes } from '@/lib/constants';
import { requireExecOrCore } from '@/lib/auth';

/**
 * Cloudinary receipt upload API route
 * - Enforces server session & RBAC: Club Executives & ACM Core only.
 * - Reads CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET from server environment variables.
 * - Never exposes CLOUDINARY_API_SECRET to the client.
 * - Accepts 1 file per request: PDF, JPG, or PNG, max 5 MB.
 * - Validates file type and size on the server.
 * - When Cloudinary credentials are set: signs request with SHA-1 and uploads to Cloudinary /auto/upload.
 * - Graceful Fallback: When credentials are missing or unconfigured in deployment, stores the verified
 *   receipt as an inline base64 document so the receipt remains fully viewable in a new tab without
 *   blocking expense submissions.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. STRICT SERVER-SIDE RBAC: Only Club Executives and ACM Core can upload receipts
    const auth = await requireExecOrCore(request);
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'No file provided for upload.', 400);
    }

    // 2. Validate File Size: Max 5 MB
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `File size exceeds 5 MB limit (selected file is ${sizeInMb} MB). Please choose a file up to 5 MB.`,
        400
      );
    }

    // 3. Validate File Type: PDF, JPG, or PNG
    const originalFileName = file.name || 'receipt';
    const lastDotIndex = originalFileName.lastIndexOf('.');
    const ext = lastDotIndex !== -1 ? originalFileName.substring(lastDotIndex).toLowerCase() : '';
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];

    const mime = (file.type || '').toLowerCase();
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/pjpeg',
    ];

    const isExtensionValid = allowedExtensions.includes(ext);
    const isMimeValid = !mime || allowedMimes.includes(mime);

    if (!isExtensionValid || !isMimeValid) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid file type. Only PDF, JPG, or PNG files are accepted.',
        400
      );
    }

    // Helper to generate inline data URL fallback
    const createInlineFallback = async () => {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');
      const resolvedMime = mime || (ext === '.pdf' ? 'application/pdf' : 'image/png');
      return `data:${resolvedMime};base64,${base64}`;
    };

    // 4. Read Cloudinary Credentials from Server Environment Variables
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

    if (!cloudName || !apiKey || !apiSecret) {
      // Graceful fallback for environments (e.g. Vercel) where Cloudinary credentials are not yet added
      const dataUrl = await createInlineFallback();
      return apiSuccess({
        url: dataUrl,
        publicId: `receipt_${Date.now()}`,
        fileName: originalFileName,
        isFallback: true,
      });
    }

    // 5. Generate Cloudinary SHA-1 Signature for Secure Signed Upload
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'campus_receipts';

    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    // 6. Send Upload Request to Cloudinary REST API
    const cloudFormData = new FormData();
    cloudFormData.append('file', file);
    cloudFormData.append('api_key', apiKey);
    cloudFormData.append('timestamp', timestamp.toString());
    cloudFormData.append('folder', folder);
    cloudFormData.append('signature', signature);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

    const cloudRes = await fetch(uploadUrl, {
      method: 'POST',
      body: cloudFormData,
    });

    if (!cloudRes.ok) {
      console.warn('Cloudinary upload returned non-200, falling back to secure inline document storage.');
      const dataUrl = await createInlineFallback();
      return apiSuccess({
        url: dataUrl,
        publicId: `receipt_${Date.now()}`,
        fileName: originalFileName,
        isFallback: true,
      });
    }

    const cloudData = await cloudRes.json();

    return apiSuccess({
      url: cloudData.secure_url || cloudData.url,
      publicId: cloudData.public_id,
      fileName: originalFileName,
    });
  } catch (error: any) {
    console.error('Server upload error:', error);
    return apiError(
      ErrorCodes.FILE_UPLOAD_FAILED,
      error.message || 'An unexpected error occurred while uploading receipt.',
      500
    );
  }
}
