import { readFile, writeFile } from 'fs/promises';
import path from 'path';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const MASTER_IP = process.env.MASTER_IP || "http://192.168.4.1";
    // We cannot use http://localhost:3000 reliably in instrumentation as the port might change.
    // Instead we will just use a helper function or assume default port 3000 for local dev.
    const LOCAL_API = process.env.LOCAL_API || "http://127.0.0.1:3000/api/system/node";
    const configPath = path.join(process.cwd(), 'public', 'config.json');
    const dataPath = path.join(process.cwd(), 'public', 'data.json');

    let alertTriggered: Record<string, boolean> = {
      node_1: false,
      node_2: false
    };

    let isPolling = false;

    async function readConfig() {
      try {
        const data = await readFile(configPath, 'utf8');
        return JSON.parse(data);
      } catch (e) {
        return { interval: 30, node_1: { diameter: 10.4, threshold: 2.0 }, node_2: { diameter: 10.4, threshold: 2.0 } };
      }
    }

    async function readData() {
      try {
        const data = await readFile(dataPath, 'utf8');
        return JSON.parse(data);
      } catch (e) {
        return { diameter: 0, history: [] };
      }
    }

    async function writeData(data: any) {
      if (data.history && data.history.length > 100) {
        data.history = data.history.slice(0, 100);
      }
      await writeFile(dataPath, JSON.stringify(data, null, 2));
    }

    async function triggerCamera(nodeId: string) {
      console.log(`[Monitor] Triggering camera for ${nodeId}`);
      try {
        const res = await fetch(LOCAL_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodeId })
        });
        if (!res.ok) {
          console.error(`[Monitor] Camera trigger failed for ${nodeId}: ${res.statusText}`);
        } else {
          console.log(`[Monitor] Camera trigger successful for ${nodeId}`);
        }
      } catch (err: any) {
        console.error(`[Monitor] Camera trigger error for ${nodeId}:`, err.message);
      }
    }

    const NODE_IPS: Record<string, string> = {
      "node_1": "http://192.168.4.2",
      "node_2": "http://192.168.4.3",
    };

    async function poll() {
      if (isPolling) return;
      isPolling = true;

      const config = await readConfig();
      
      try {
        const currentData = await readData();
        let changed = false;
        
        for (const nodeId of ['node_1', 'node_2']) {
          const sensorUrl = `${NODE_IPS[nodeId]}/sensor`;
          let nodeState = null;
          
          try {
            const sensorRes = await fetch(sensorUrl, { 
              cache: 'no-store', 
              signal: AbortSignal.timeout(5000),
              headers: { "Connection": "close" }
            });
            if (sensorRes.ok) {
              const sensorJson = await sensorRes.json();
              if (typeof sensorJson.distance === 'number') {
                nodeState = {
                  h: sensorJson.distance,
                  d: sensorJson.distance,
                  diff: 0
                };
              }
            }
          } catch (e: any) {
            console.error(`[Monitor] Failed to fetch sensor data directly from ${nodeId}: ${e.message}`);
          }
          
          if (!nodeState) continue;
          
          const lastEntry = currentData.history.find((h: any) => (h.nodeId || "node_1") === nodeId);
          
          if (!lastEntry || lastEntry.h !== nodeState.h || lastEntry.d !== nodeState.d || lastEntry.diff !== nodeState.diff) {
            currentData.history.unshift({
              timestamp: new Date().toISOString(),
              nodeId,
              h: nodeState.h,
              d: nodeState.d,
              diff: nodeState.diff
            });
            changed = true;
          }
          
          const nodeConfig = config[nodeId] || { diameter: 10.4, threshold: 2.0 };
          const waterLevel = nodeConfig.diameter - nodeState.d;
          
          if (waterLevel <= nodeConfig.threshold) {
            if (!alertTriggered[nodeId]) {
              alertTriggered[nodeId] = true;
              console.log(`[Monitor] Alert triggered for ${nodeId}. Water level: ${waterLevel}`);
              await triggerCamera(nodeId);
              const freshData = await readData();
              currentData.history = freshData.history;
            }
          } else {
            if (alertTriggered[nodeId]) {
              console.log(`[Monitor] Alert reset for ${nodeId}. Water level: ${waterLevel}`);
              alertTriggered[nodeId] = false;
            }
          }
        }
        
        if (changed) {
          await writeData(currentData);
        }
      } catch (err: any) {
        console.error("[Monitor] Polling error:", err.message);
      }
      
      isPolling = false;
      const intervalMs = (config.interval || 30) * 1000;
      setTimeout(poll, intervalMs);
    }

    // Only start polling if it hasn't been started yet (avoids HMR double starts)
    if (!(global as any).__MONITOR_STARTED) {
      (global as any).__MONITOR_STARTED = true;
      console.log("[Monitor] Starting background monitoring via instrumentation...");
      // Delay initial poll to give the Next.js server time to start up so localhost API works
      setTimeout(poll, 5000);
    }
  }
}
