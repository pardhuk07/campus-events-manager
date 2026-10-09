import { NextResponse } from 'next/server';
import { prisma, EventStatus, Role } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, userRole } = body;

    // RBAC Security Check: Only ACM_CORE can approve or reject events
    if (userRole !== Role.ACM_CORE) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Only ACM Core Verifiers are authorized to approve or reject events.',
        },
        { status: 403 }
      );
    }

    if (!Object.values(EventStatus).includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status: ${status}` },
        { status: 400 }
      );
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { status },
      include: { club: { select: { name: true } } },
    });

    return NextResponse.json({
      success: true,
      message: `Event '${updatedEvent.title}' updated to ${status}`,
      event: updatedEvent,
    });
  } catch (error) {
    console.error('Error updating event status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
