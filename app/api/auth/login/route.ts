import { NextResponse } from 'next/server';
import { authenticateGmailUser } from '@/services/authService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid Gmail / email address.' },
        { status: 400 }
      );
    }

    const user = await authenticateGmailUser(email, name);

    return NextResponse.json({
      success: true,
      message: `Verified successfully as ${user.role}`,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed.' },
      { status: 500 }
    );
  }
}
