import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MASTER_IP = process.env.MASTER_IP || "http://192.168.4.1";

// Map the Node IDs to their Static IPs on the Pico's network
const NODE_IPS: Record<string, string> = {
  "node_1": "http://192.168.4.2",
  "node_2": "http://192.168.4.3",
};

type HistoryEntry = {
  timestamp: string;
  image: string;
  nodeId: string;
  h: number;
  d: number;
  diff: number;
};

function formatFileTimestamp(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes() + 1).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

export async function GET() {
  try {
    const res = await fetch(`${MASTER_IP}/api/state?ts=${Date.now()}`, { 
      cache: "no-store", 
      signal: AbortSignal.timeout(10000),
      headers: { "Connection": "close" }
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Master AP returned status ${res.status}` }, { status: res.status });
    }
    const json = await res.json();
    return NextResponse.json(json.nodes || {});
  } catch (error) {
    console.error("Node API GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch nodes state" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { nodeId, action } = await request.json();
    if (!nodeId || !NODE_IPS[nodeId]) {
      return NextResponse.json({ error: "Invalid or missing nodeId" }, { status: 400 });
    }

    let h = 10.7, d = 10.4, diff = 0;
    let buffer: Buffer | null = null;
    let filename = "";

    // 1. Only trigger camera if action is not 'poll'
    if (action !== 'poll') {
      const targetUrl = `${NODE_IPS[nodeId]}/capture`;
      console.log(`[Backend] Fetching photo directly from ${targetUrl}`);
      
      const imgRes = await fetch(targetUrl, { 
        cache: "no-store", 
        signal: AbortSignal.timeout(10000)
      });

      if (!imgRes.ok) {
        throw new Error(`Edge node failed to capture image: ${imgRes.statusText}`);
      }

      const blob = await imgRes.blob();
      const bytes = await blob.arrayBuffer();
      buffer = Buffer.from(bytes);

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // 2. Fetch current node state for h, d, diff
    try {
      const sensorUrl = `${NODE_IPS[nodeId]}/sensor`;
      console.log(`[Backend] Fetching sensor data directly from ${sensorUrl}`);
      const sensorRes = await fetch(sensorUrl, { 
        cache: "no-store", 
        signal: AbortSignal.timeout(5000),
        headers: { "Connection": "close" }
      });
      if (sensorRes.ok) {
        const sensorJson = await sensorRes.json();
        if (typeof sensorJson.distance === 'number') {
          h = sensorJson.distance;
          d = sensorJson.distance;
        }
      }
    } catch (err) {
      console.warn("Could not fetch latest sensor state from node directly:", err);
      // Fallback to MASTER_IP if direct fetch fails
      try {
        const stateRes = await fetch(`${MASTER_IP}/api/state?ts=${Date.now()}`, { 
          cache: "no-store", 
          signal: AbortSignal.timeout(10000),
          headers: { "Connection": "close" }
        });
        if (stateRes.ok) {
          const stateJson = await stateRes.json();
          const nodeState = stateJson.nodes?.[nodeId];
          if (nodeState) {
            h = nodeState.h ?? h;
            d = nodeState.d ?? d;
            diff = nodeState.diff ?? diff;
          }
        }
      } catch (err2) {
        console.warn("Could not fetch latest node state from master:", err2);
      }
    }

    // 3. Save image locally ONLY if we captured one
    const captureDate = new Date();
    const publicDir = join(process.cwd(), "public");
    const dataPath = join(publicDir, "data.json");
    
    if (buffer) {
      filename = `capture_${formatFileTimestamp(captureDate)}.jpg`;
      const capturesDir = join(publicDir, "captures");
      await mkdir(capturesDir, { recursive: true });
      await writeFile(join(capturesDir, filename), buffer);
    }

    // 4. Update data.json
    let data: { diameter: number; history: HistoryEntry[] } = { diameter: d, history: [] };
    try {
      const fileData = await readFile(dataPath, "utf-8");
      const parsedData = JSON.parse(fileData);
      data = {
        diameter: typeof parsedData.diameter === "number" ? parsedData.diameter : d,
        history: Array.isArray(parsedData.history) ? parsedData.history : [],
      };
    } catch {
      // File does not exist yet
    }

    const newEntry: HistoryEntry = {
      timestamp: captureDate.toISOString(),
      image: buffer ? `/captures/${filename}` : (data.history.find(h => h.nodeId === nodeId)?.image || ""),
      nodeId,
      h,
      d,
      diff,
    };
    
    // Only keep last 100 entries
    data.history.unshift(newEntry);
    if (data.history.length > 100) data.history = data.history.slice(0, 100);
    
    await writeFile(dataPath, JSON.stringify(data, null, 2));
    
    return NextResponse.json({ success: true, entry: newEntry });

  } catch (error) {
    console.error("Direct Capture Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process direct capture" },
      { status: 500 }
    );
  }
}