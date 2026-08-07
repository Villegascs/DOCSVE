export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';

export async function GET() {
  let status = 'OK';
  let message = 'All good';
  
  try {
    const { db } = require('@/lib/firebase-admin.js');
    if (!db) throw new Error("db is undefined");
    message = 'Firebase loaded';
  } catch (e) {
    status = 'ERROR';
    message = e.stack || e.message;
  }
  
  return NextResponse.json({ status, message });
}
