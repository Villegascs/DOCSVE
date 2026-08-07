export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET() {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  
  return NextResponse.json({
    hasUser: !!emailUser,
    userValue: emailUser,
    hasPass: !!emailPass,
    passLength: emailPass ? emailPass.length : 0,
    passLastChars: emailPass ? emailPass.slice(-4) : null
  });
}
