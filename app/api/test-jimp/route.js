export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import Jimp from 'jimp';

export async function GET() {
  try {
    const fontPath = require('path').join(process.cwd(), 'public', 'fonts', 'open-sans', 'open-sans-32-white', 'open-sans-32-white.fnt');
    const fontTitle = await Jimp.loadFont(fontPath);
    return NextResponse.json({ success: true, message: "Font loaded successfully from public dir" });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message, stack: error.stack });
  }
}
