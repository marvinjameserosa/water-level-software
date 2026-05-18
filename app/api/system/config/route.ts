import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const configPath = path.join(process.cwd(), 'public', 'config.json');

export async function GET() {
  try {
    const data = await fs.readFile(configPath, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    // If file doesn't exist or error, return defaults
    const defaults = {
      interval: 30,
      node_1: { diameter: 10.4, threshold: 2.0 },
      node_2: { diameter: 10.4, threshold: 2.0 }
    };
    return NextResponse.json(defaults);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await fs.writeFile(configPath, JSON.stringify(body, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save config:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
