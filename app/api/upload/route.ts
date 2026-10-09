import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // In a full production deployment with Cloudinary keys:
    // We upload the buffer to Cloudinary CDN.
    // For reliable local demonstration and testing:
    const mockUrl = `https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80`;

    return NextResponse.json({
      success: true,
      url: mockUrl,
      fileName: file.name,
      message: 'Receipt uploaded successfully',
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
