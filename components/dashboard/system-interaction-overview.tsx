"use client";

interface NodeSummary {
  label: string;
  containerDepth: number;
  distance?: number;
  waterLevel?: number;
  isAlert: boolean;
}

interface SystemInteractionOverviewProps {
  node1: NodeSummary;
  node2: NodeSummary;
}

function NodeCard({ node }: { node: NodeSummary }) {
  return (
    <div className="border border-border rounded-lg p-4 space-y-2 bg-card">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{node.label}</h3>
      <div className="space-y-1 text-sm text-muted-foreground">
        <div className="flex justify-between">
          <span>Container Depth:</span>
          <span className="font-medium text-foreground">{node.containerDepth.toFixed(1)} cm</span>
        </div>
        <div className="flex justify-between">
          <span>Distance to Water:</span>
          <span className="font-medium text-foreground">{typeof node.distance === "number" ? node.distance.toFixed(1) : "--"} cm</span>
        </div>
        <div className="border-t border-border my-1" />
        <div className="flex justify-between">
          <span className="font-mono text-xs">Depth − Distance =</span>
          <span />
        </div>
      </div>
      <p className={`text-3xl font-bold ${node.isAlert ? "text-destructive" : "text-foreground"}`}>
        {node.waterLevel !== undefined ? node.waterLevel.toFixed(1) : "--"}
        <span className="text-lg ml-1 font-normal text-muted-foreground">cm</span>
      </p>
    </div>
  );
}

export function SystemInteractionOverview({ node1, node2 }: SystemInteractionOverviewProps) {
  const difference =
    node1.waterLevel !== undefined && node2.waterLevel !== undefined
      ? Math.abs(node1.waterLevel - node2.waterLevel)
      : undefined;

  return (
    <div className="bg-card/50 border border-border rounded-xl p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
        <NodeCard node={node1} />

        {/* Center Difference Display */}
        <div className="flex flex-col items-center justify-center px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Difference</span>
          <div className="flex items-center gap-2">
            <svg className="size-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3 4 7l4 4" /><path d="M4 7h16" /><path d="m16 21 4-4-4-4" /><path d="M20 17H4" /></svg>
            <span className="text-3xl font-bold text-primary">
              {difference !== undefined ? difference.toFixed(1) : "--"}
            </span>
            <span className="text-lg text-muted-foreground">cm</span>
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            |{node1.waterLevel !== undefined ? node1.waterLevel.toFixed(1) : "?"} − {node2.waterLevel !== undefined ? node2.waterLevel.toFixed(1) : "?"}|
          </p>
        </div>

        <NodeCard node={node2} />
      </div>
    </div>
  );
}
