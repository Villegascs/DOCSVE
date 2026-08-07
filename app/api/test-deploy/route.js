export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET() {
  return NextResponse.json({ success: true, message: 'Firebase admin imported correctly if you see this!' });
}
