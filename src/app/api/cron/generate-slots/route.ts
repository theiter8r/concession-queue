import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateSlots } from '@/lib/slot-generation';

// Daily Vercel Cron — keeps the horizon full (§4b).
// Vercel signs cron invocations with the CRON_SECRET header on Pro; on Hobby
// it injects `x-vercel-cron`. Accept either.
export async function GET(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const fromVercelCron = req.headers.get('x-vercel-cron');
  const ok =
    fromVercelCron === '1' ||
    (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`);
  if (!ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const sb = supabaseAdmin();
  try {
    const n = await generateSlots(sb, null);
    return NextResponse.json({ ok: true, generated: n });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 500 });
  }
}
