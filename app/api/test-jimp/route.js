export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import Jimp from 'jimp';

export async function GET() {
  try {
    const fontTitle = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
    return NextResponse.json({ success: true, message: "Font loaded successfully" });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message, stack: error.stack });
  }
}
