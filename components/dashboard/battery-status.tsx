import { Wifi, WifiOff } from "lucide-react";

export function BatteryStatus({ isOnline }: { isOnline: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-4 py-3 shadow-sm min-w-[140px]">
      <span className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
        {isOnline ? (
          <>
            <Wifi className="size-4 text-green-500" />
            <span className="text-green-600 dark:text-green-400">Online</span>
          </>
        ) : (
          <>
            <WifiOff className="size-4 text-red-500" />
            <span className="text-red-600 dark:text-red-400">Offline</span>
          </>
        )}
      </span>
    </div>
  );
}
