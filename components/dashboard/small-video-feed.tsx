"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Camera, ImageOff } from "lucide-react";

interface SmallVideoFeedProps {
  isAlert: boolean;
  isCapturing?: boolean;
  imageUrl?: string;
  onManualCapture?: () => void | Promise<void>;
}

export function SmallVideoFeed({
  isAlert,
  isCapturing = false,
  imageUrl,
  onManualCapture,
}: SmallVideoFeedProps) {
  const handleCapture = () => {
    if (isCapturing) {
      return;
    }

    void onManualCapture?.();
  };

  return (
    <div className="space-y-3">
      <Card
        className={`relative overflow-hidden border ${isAlert ? "border-destructive/50" : "border-border"}`}
      >
        <div className="relative flex h-48 w-full items-center justify-center bg-muted">
          {imageUrl ? (
            <img
              key={imageUrl}
              src={imageUrl}
              alt="Latest capture"
              className="h-full w-full object-contain bg-[#EEF2F7]"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageOff className="size-10" />
              <span className="text-sm font-medium">No Photo</span>
            </div>
          )}

          {/* Alert overlay */}
          {isAlert && (
            <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <AlertCircle className="size-8 text-destructive" />
                <span className="text-sm font-semibold text-destructive">
                  ALERT
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>
      <Button
        onClick={handleCapture}
        className="h-12 w-full text-sm font-semibold"
        variant="default"
        size="lg"
        disabled={isCapturing}
      >
        <Camera className="size-4 mr-2" />
        {isCapturing ? "Capturing..." : "Manual Trigger"}
      </Button>
    </div>
  );
}

