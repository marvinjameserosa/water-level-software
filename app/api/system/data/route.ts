import { NextResponse } from 'next/server';
import { readFile, writeFile, unlink } from 'fs/promises';
import { join } from 'path';

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  try {
    const { nodeId, timestamp } = await request.json();
    if (!nodeId) return NextResponse.json({ error: "Missing nodeId" }, { status: 400 });

    const publicDir = join(process.cwd(), "public");
    const dataPath = join(publicDir, "data.json");
    
    let fileData;
    try {
      fileData = await readFile(dataPath, 'utf8');
    } catch {
      return NextResponse.json({ error: "No data found" }, { status: 404 });
    }
    
    let data = JSON.parse(fileData);
    if (!Array.isArray(data.history)) {
      return NextResponse.json({ success: true });
    }

    let entriesToDelete = [];
    if (timestamp) {
      entriesToDelete = data.history.filter((h: any) => h.nodeId === nodeId && h.timestamp === timestamp);
      data.history = data.history.filter((h: any) => !(h.nodeId === nodeId && h.timestamp === timestamp));
    } else {
      entriesToDelete = data.history.filter((h: any) => h.nodeId === nodeId);
      data.history = data.history.filter((h: any) => h.nodeId !== nodeId);
    }

    // Delete associated images
    for (const entry of entriesToDelete) {
      if (entry.image) {
        try {
          const imagePath = entry.image.replace(/^\/+/, '');
          const absoluteImagePath = join(publicDir, imagePath);
          await unlink(absoluteImagePath);
        } catch (err) {
          console.warn(`Could not delete image ${entry.image}:`, err);
        }
      }
    }

    await writeFile(dataPath, JSON.stringify(data, null, 2));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to delete data:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
