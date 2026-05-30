"use client";

interface GlobalSettingsProps {
  globalInterval: number | string;
  onIntervalChange: (value: number | string) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function GlobalSettings({
  globalInterval,
  onIntervalChange,
  onSave,
  isSaving,
}: GlobalSettingsProps) {
  return (
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
          onChange={(e) => onIntervalChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
          min={5}
        />
        <button 
          onClick={onSave} 
          disabled={isSaving}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
