"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertBanner } from "@/components/dashboard/alert-banner";
import { BatteryStatus } from "@/components/dashboard/battery-status";
import { NodeDashboard } from "@/components/dashboard/node-dashboard";
import { useToast } from "@/hooks/use-toast";

type StoredReading = {
  timestamp: string;
  image?: string;
  nodeId?: string;
  h?: number;
  d?: number;
  diff?: number;
};

const DEFAULT_DIAMETER = 10.4;
const DEFAULT_WATER_LEVEL = 10.7;
const DEFAULT_USER_THRESHOLD = 2.0;

function latestCaptureForNode(history: StoredReading[], nodeId: string) {
  for (let i = history.length - 1; i >= 0; i--) {
    if ((history[i].nodeId ?? "node_1") === nodeId) {
      return history[i];
    }
  }
  return undefined;
}

export default function WaterLevelDashboard() {
  const [history, setHistory] = useState<StoredReading[]>([]);
  const [isErrorState, setIsErrorState] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const { toast } = useToast();

  // Per-node states for inputs
  const [node1Config, setNode1Config] = useState<{ diameter: number | string; threshold: number | string; lastImage?: string }>({ diameter: DEFAULT_DIAMETER, threshold: DEFAULT_USER_THRESHOLD, lastImage: "" });
  const [node2Config, setNode2Config] = useState<{ diameter: number | string; threshold: number | string; lastImage?: string }>({ diameter: DEFAULT_DIAMETER, threshold: DEFAULT_USER_THRESHOLD, lastImage: "" });

  const [isSaving, setIsSaving] = useState(false);
  const [globalInterval, setGlobalInterval] = useState<number | string>(30);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/system/config?ts=' + Date.now(), { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.interval) setGlobalInterval(data.interval);
          if (data.node_1) setNode1Config(data.node_1);
          if (data.node_2) setNode2Config(data.node_2);
        }
      } catch (e) {
        console.error("Failed to load config:", e);
      } finally {
        setIsConfigLoaded(true);
      }
    }
    loadConfig();
  }, []);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/system/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: globalInterval, node_1: node1Config, node_2: node2Config })
      });
      toast({
        title: "Configuration Saved",
        description: "Measurement inputs successfully updated.",
      });
    } catch (e) {
      console.error("Failed to save config:", e);
      toast({
        title: "Save Failed",
        description: "Could not save configuration to backend.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (nodeId: string, timestamp: string) => {
    try {
      await fetch('/api/system/data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, timestamp })
      });
      await fetchHistory();
      toast({ title: "Entry deleted" });
    } catch (e) {
      toast({ title: "Failed to delete entry", variant: "destructive" });
    }
  };

  const handleResetNode = async (nodeId: string) => {
    if (!window.confirm(`Are you sure you want to reset all data for ${nodeId}? This will delete all photos and cannot be undone.`)) return;
    try {
      await fetch('/api/system/data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId })
      });
      await fetchHistory();
      toast({ title: `Data for ${nodeId} reset` });
    } catch (e) {
      toast({ title: "Failed to reset data", variant: "destructive" });
    }
  };

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/data.json?ts=' + Date.now(), { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.history)) setHistory(data.history);
      }
    } catch (err: any) {
      console.error("Data history load failed:", err);
      if (!isErrorState) {
        toast({
          title: "Connection Error",
          description: err?.message || "Data history load failed.",
          variant: "destructive",
        });
        setIsErrorState(true);
      }
    }
  }, [isErrorState, toast]);

  const fetchStateData = useCallback(async () => {
    try {
      // Poll Node 1 directly using the backend manual trigger logic (without taking a photo)
      await fetch('/api/system/node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: 'node_1', action: 'poll' })
      });
      
      // Poll Node 2
      await fetch('/api/system/node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: 'node_2', action: 'poll' })
      });
      
      setIsErrorState(false);
    } catch (error: any) {
      console.error("Failed to load state data:", error);
      if (!isErrorState) {
        toast({
          title: "Connection Error",
          description: error?.message || "Could not reach data API.",
          variant: "destructive",
        });
        setIsErrorState(true);
      }
    }
  }, [isErrorState, toast]);

  useEffect(() => {
    fetchHistory().finally(() => setInitialLoadDone(true));
  }, [fetchHistory]);

  useEffect(() => {
    if (!initialLoadDone) return;
    
    void fetchStateData();
    const intervalMs = typeof globalInterval === 'number' ? globalInterval * 1000 : 30000;
    const intervalId = window.setInterval(() => {
      fetchHistory();
      fetchStateData();
    }, intervalMs);
    return () => window.clearInterval(intervalId);
  }, [fetchStateData, fetchHistory, initialLoadDone, globalInterval]);

  const node1Latest = latestCaptureForNode(history, "node_1");
  const node2Latest = latestCaptureForNode(history, "node_2");

  // Extract the raw distance measured by the ultrasonic sensor (from the top)
  const node1Distance = node1Latest?.d;
  const node2Distance = node2Latest?.d;
  
  // Evaluate alerts directly based on Actual Water Level
  const node1CurrentLevel = typeof node1Distance === "number" ? Math.max(0, Number(node1Config.diameter) - node1Distance) : undefined;
  const node2CurrentLevel = typeof node2Distance === "number" ? Math.max(0, Number(node2Config.diameter) - node2Distance) : undefined;

  const node1Alert = typeof node1Config.threshold === "number" && node1CurrentLevel !== undefined ? node1CurrentLevel <= node1Config.threshold : false;
  const node2Alert = typeof node2Config.threshold === "number" && node2CurrentLevel !== undefined ? node2CurrentLevel <= node2Config.threshold : false;

  const node1ImageFromHistory = Array([...history]).reverse().find(h => (h.nodeId ?? "node_1") === "node_1" && h.image)?.image;
  const node2ImageFromHistory = Array([...history]).reverse().find(h => (h.nodeId ?? "node_1") === "node_2" && h.image)?.image;

  // Use history image first, fall back to config-persisted lastImage
  const node1ImageUrl = node1ImageFromHistory || node1Config.lastImage || undefined;
  const node2ImageUrl = node2ImageFromHistory || node2Config.lastImage || undefined;

  // Persist last image into config whenever a new one appears from history
  useEffect(() => {
    if (node1ImageFromHistory && node1ImageFromHistory !== node1Config.lastImage) {
      setNode1Config(prev => ({ ...prev, lastImage: node1ImageFromHistory }));
    }
  }, [node1ImageFromHistory]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (node2ImageFromHistory && node2ImageFromHistory !== node2Config.lastImage) {
      setNode2Config(prev => ({ ...prev, lastImage: node2ImageFromHistory }));
    }
  }, [node2ImageFromHistory]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Dashboard</h1>
        </div>
        <BatteryStatus isOnline={!isErrorState} />
      </header>

      {(node1Alert || node2Alert) && (
        <AlertBanner
          title="Water Level Alert"
          description={`Water level is ${node1Alert ? "Node 1" : "Node 2"} below threshold.`}
        />
      )}

      <div className="bg-card/50 border border-border p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Global Settings</h2>
          <p className="text-sm text-muted-foreground">Configure the polling interval for continuous background monitoring.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium whitespace-nowrap">Polling Interval (s):</label>
          <input 
            type="number" 
            className="flex h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={globalInterval}
            onChange={(e) => setGlobalInterval(e.target.value === "" ? "" : parseFloat(e.target.value))}
            min={5}
          />
          <button 
            onClick={handleSaveConfig} 
            disabled={isSaving}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* System Interaction Overview */}
      <div className="bg-card/50 border border-border rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">System Interaction Overview</h2>
          <p className="text-sm text-muted-foreground">Side-by-side comparison of both nodes with transparent calculations.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
          {/* Node 1 Summary */}
          <div className="border border-border rounded-lg p-4 space-y-2 bg-card">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Node 1</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Container Depth:</span>
                <span className="font-medium text-foreground">{Number(node1Config.diameter).toFixed(1)} cm</span>
              </div>
              <div className="flex justify-between">
                <span>Distance to Water:</span>
                <span className="font-medium text-foreground">{typeof node1Distance === "number" ? node1Distance.toFixed(1) : "--"} cm</span>
              </div>
              <div className="border-t border-border my-1" />
              <div className="flex justify-between">
                <span className="font-mono text-xs">Depth − Distance =</span>
                <span />
              </div>
            </div>
            <p className={`text-3xl font-bold ${node1Alert ? "text-destructive" : "text-foreground"}`}>
              {node1CurrentLevel !== undefined ? node1CurrentLevel.toFixed(1) : "--"}
              <span className="text-lg ml-1 font-normal text-muted-foreground">cm</span>
            </p>
          </div>

          {/* Center Difference Display */}
          <div className="flex flex-col items-center justify-center px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Difference</span>
            <div className="flex items-center gap-2">
              <svg className="size-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>
              <span className="text-3xl font-bold text-primary">
                {node1CurrentLevel !== undefined && node2CurrentLevel !== undefined
                  ? Math.abs(node1CurrentLevel - node2CurrentLevel).toFixed(1)
                  : "--"}
              </span>
              <span className="text-lg text-muted-foreground">cm</span>
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              |{node1CurrentLevel !== undefined ? node1CurrentLevel.toFixed(1) : "?"} − {node2CurrentLevel !== undefined ? node2CurrentLevel.toFixed(1) : "?"}|
            </p>
          </div>

          {/* Node 2 Summary */}
          <div className="border border-border rounded-lg p-4 space-y-2 bg-card">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Node 2</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Container Depth:</span>
                <span className="font-medium text-foreground">{Number(node2Config.diameter).toFixed(1)} cm</span>
              </div>
              <div className="flex justify-between">
                <span>Distance to Water:</span>
                <span className="font-medium text-foreground">{typeof node2Distance === "number" ? node2Distance.toFixed(1) : "--"} cm</span>
              </div>
              <div className="border-t border-border my-1" />
              <div className="flex justify-between">
                <span className="font-mono text-xs">Depth − Distance =</span>
                <span />
              </div>
            </div>
            <p className={`text-3xl font-bold ${node2Alert ? "text-destructive" : "text-foreground"}`}>
              {node2CurrentLevel !== undefined ? node2CurrentLevel.toFixed(1) : "--"}
              <span className="text-lg ml-1 font-normal text-muted-foreground">cm</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-8">
        <NodeDashboard
          nodeId="node_1"
          title="Node 1"
          history={history}
          level={node1Distance}
          containerDiameter={node1Config.diameter}
          userThreshold={node1Config.threshold}
          onDiameterChange={(val) => setNode1Config(prev => ({ ...prev, diameter: val }))}
          onThresholdChange={(val) => setNode1Config(prev => ({ ...prev, threshold: val }))}
          imageUrl={node1ImageUrl}
          onCaptureComplete={fetchHistory}
          onSave={handleSaveConfig}
          isSaving={isSaving}
          onDeleteEntry={(timestamp) => handleDeleteEntry("node_1", timestamp)}
          onResetNode={() => handleResetNode("node_1")}
        />

        <NodeDashboard
          nodeId="node_2"
          title="Node 2"
          history={history}
          level={node2Distance}
          containerDiameter={node2Config.diameter}
          userThreshold={node2Config.threshold}
          onDiameterChange={(val) => setNode2Config(prev => ({ ...prev, diameter: val }))}
          onThresholdChange={(val) => setNode2Config(prev => ({ ...prev, threshold: val }))}
          imageUrl={node2ImageUrl}
          onCaptureComplete={fetchHistory}
          onSave={handleSaveConfig}
          isSaving={isSaving}
          onDeleteEntry={(timestamp) => handleDeleteEntry("node_2", timestamp)}
          onResetNode={() => handleResetNode("node_2")}
        />
      </div>
    </div>
  );
}
