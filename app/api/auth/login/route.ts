import { NextResponse } from 'next/server';
import { verifyUserCredentials } from '@/services/authService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, selectedRole } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid Gmail address.' },
        { status: 400 }
      );
    }

    const result = await verifyUserCredentials(email, password, selectedRole);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Verified successfully as ${result.user?.role}`,
      user: result.user,
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication service error.' },
      { status: 500 }
    );
  }
}
