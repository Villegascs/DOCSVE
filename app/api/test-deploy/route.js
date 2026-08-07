export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';

export async function GET() {
  let status = 'OK';
  let message = 'All good';
  let sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  try {
    if (!sa) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT');
    JSON.parse(sa);
  } catch (e) {
    status = 'ERROR';
    message = e.message;
  }
  return NextResponse.json({ status, message, hasServiceAccount: !!sa });
}
