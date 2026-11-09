"use client";

import React, { useState } from "react";
import { X, Trash2, RefreshCw, Edit2, Check, ExternalLink, BookmarkPlus, PackageSearch } from "lucide-react";
import { COURIER_MAP } from "@/lib/couriers";

export interface WatchlistItem {
  trackingNumber: string;
  courierId: string;
  nickname: string;
  lastStatus: string;
  lastUpdated: string;
  variant: "delivered" | "in-transit" | "out-for-delivery" | "pending";
}

interface WatchlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: WatchlistItem[];
  onRemoveItem: (trackingNumber: string) => void;
  onUpdateNickname: (trackingNumber: string, newNickname: string) => void;
  onSelectTrack: (trackingNumber: string, courierId: string) => void;
  onRefreshAll: () => void;
  isRefreshing: boolean;
}

export function WatchlistDrawer({
  isOpen,
  onClose,
  items,
  onRemoveItem,
  onUpdateNickname,
  onSelectTrack,
  onRefreshAll,
  isRefreshing,
}: WatchlistDrawerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempNickname, setTempNickname] = useState("");

  if (!isOpen) return null;

  const handleStartEdit = (item: WatchlistItem) => {
    setEditingId(item.trackingNumber);
    setTempNickname(item.nickname);
  };

  const handleSaveEdit = (trackingNumber: string) => {
    onUpdateNickname(trackingNumber, tempNickname.trim() || trackingNumber);
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs">
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="relative w-screen max-w-md border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 p-6 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <BookmarkPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Package Watchlist ({items.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Locally saved shipments with quick status refresh
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRefreshAll}
                disabled={isRefreshing || items.length === 0}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                title="Refresh all parcels"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* List Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
                  <PackageSearch className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Your Watchlist is Empty
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                  Track any parcel and click &ldquo;Add to Watchlist&rdquo; to save it here for instant 1-click status checks.
                </p>
              </div>
            ) : (
              items.map((item) => {
                const courier = COURIER_MAP[item.courierId];
                const isEditing = editingId === item.trackingNumber;

                return (
                  <div
                    key={item.trackingNumber}
                    className="group rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 hover:border-indigo-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-indigo-800 dark:hover:bg-slate-900 transition-all shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <input
                              type="text"
                              value={tempNickname}
                              onChange={(e) => setTempNickname(e.target.value)}
                              className="w-full rounded border border-indigo-400 bg-white px-2 py-0.5 text-xs font-semibold text-slate-900 dark:bg-slate-800 dark:text-white focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(item.trackingNumber)}
                              className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 mb-1">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {item.nickname || item.trackingNumber}
                            </h4>
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-slate-400 hover:text-slate-600 transition-opacity"
                              title="Edit Nickname"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {courier ? courier.shortName : item.courierId}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>#{item.trackingNumber}</span>
                        </div>

                        <p className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {item.lastStatus}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono tabular-nums">
                          {item.lastUpdated}
                        </p>
                      </div>

                      {/* Right actions */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          onClick={() => {
                            onSelectTrack(item.trackingNumber, item.courierId);
                            onClose();
                          }}
                          className="flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:text-indigo-300 dark:hover:bg-indigo-900 transition-colors"
                        >
                          <span>Track</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>

                        <button
                          onClick={() => onRemoveItem(item.trackingNumber)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 transition-colors"
                          title="Remove from Watchlist"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
