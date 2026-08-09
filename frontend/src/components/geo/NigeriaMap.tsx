"use client";

import { useState, useEffect, useRef } from "react";
import { Expand, Minimize } from "lucide-react";
import Image from "next/image";
import { nigeriaThreatData } from "@/lib/mock/nigeria-threat-data";

export function NigeriaMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync state when exiting fullscreen via ESC key or button
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

    type StateName = keyof typeof nigeriaThreatData;

    const [selectedState, setSelectedState] =
    useState<StateName>("Lagos");

    const info = nigeriaThreatData[selectedState];

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        // Request Native Fullscreen
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
      } else {
        // Exit Native Fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error("Error toggling fullscreen:", err);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-white border-border p-6 transition-all ${
        isFullscreen
          ? "fixed inset-0 z-50 flex flex-col justify-center items-center rounded-none border-0 overflow-auto"
          : "rounded-xl border"
      }`}
    >
      <h2 className="text-xl font-bold mb-6 text-foreground">
        🇳🇬 Nigerian Attack Heat Map
      </h2>

      {/* Expand / Minimize Toggle Button */}
      <button
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        className="absolute top-4 right-4 rounded-lg border border-border bg-white p-2 hover:bg-card-muted transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-border"
      >
        {isFullscreen ? (
          <Minimize className="w-5 h-5 text-foreground" />
        ) : (
          <Expand className="w-5 h-5 text-foreground" />
        )}
      </button>

      <div className={`flex justify-center w-full ${isFullscreen ? "h-full max-h-[85vh]" : ""}`}>
        <Image
          src="/maps/nigeria.svg"
          alt="Nigeria Map"
          width={700}
          height={600}
          className={`w-full max-w-3xl object-contain ${isFullscreen ? "h-full" : ""}`}
          priority
        />
      </div>
    </div>
  );
}