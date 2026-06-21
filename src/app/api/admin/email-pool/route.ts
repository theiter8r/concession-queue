import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { poolStatus } from '@/lib/gmail-pool';

// GET /api/admin/email-pool — which Gmail accounts are currently in rotation
// and which are skipped (quota hit). Useful when something stops sending.
export async function GET() {
  await requireAdmin();
  return NextResponse.json({
    resend: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
    gmail_pool: poolStatus(),
  });
}
