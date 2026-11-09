"use client";

import React from "react";
import { Package, Calendar, MapPin, Scale, Banknote, Phone, Mail, Clock } from "lucide-react";
import { TrackingResult } from "@/app/api/track/route";

interface PackageDetailsGridProps {
  data: TrackingResult;
}

export function PackageDetailsGrid({ data }: PackageDetailsGridProps) {
  const { bookingDetails, courier, estimatedDelivery } = data;

  return (
    <div className="space-y-6">
      {/* Estimated Delivery Prediction Card */}
      <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 to-white p-6 shadow-xs dark:border-indigo-900/50 dark:from-indigo-950/30 dark:to-slate-900 transition-colors">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              Delivery Intelligence & ETA Prediction
            </h4>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">
              {estimatedDelivery.date}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300">
          {estimatedDelivery.message}
        </p>

        <div className="mt-4 flex items-center gap-4 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 border-t border-indigo-100 dark:border-indigo-900/30 pt-3">
          <div>
            Accuracy Confidence:{" "}
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {estimatedDelivery.confidence}
            </span>
          </div>
          <span aria-hidden="true">·</span>
          <div>
            Standard SLA:{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {estimatedDelivery.rangeDays}
            </span>
          </div>
        </div>
      </div>

      {/* Consignment Specification Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          Consignment Specifications
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <Package className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-medium text-slate-400">Article Category</span>
              <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                {bookingDetails.articleType || "Standard Express Parcel"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <Calendar className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-medium text-slate-400">Booking Timestamp</span>
              <p className="font-semibold text-slate-900 dark:text-white mt-0.5 font-mono tabular-nums">
                {bookingDetails.bookedAt}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-medium text-slate-400">Origin Booking Hub</span>
              <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                {bookingDetails.origin}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <MapPin className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-medium text-slate-400">Destination Delivery Hub</span>
              <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                {bookingDetails.destination}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <Scale className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-medium text-slate-400">Parcel Weight</span>
              <p className="font-semibold text-slate-900 dark:text-white mt-0.5 font-mono tabular-nums">
                {bookingDetails.weight || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <Banknote className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-medium text-slate-400">Postage Tariff / Charges</span>
              <p className="font-semibold text-slate-900 dark:text-white mt-0.5 font-mono tabular-nums">
                {bookingDetails.tariff || "Prepaid"}
              </p>
            </div>
          </div>
        </div>

        {/* Courier Support Details */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="font-medium text-slate-700 dark:text-slate-300">
            Official Carrier Support ({courier.shortName}):
          </div>
          <div className="flex items-center gap-4">
            {courier.supportPhone && (
              <a
                href={`tel:${courier.supportPhone}`}
                className="inline-flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400 font-mono tabular-nums"
              >
                <Phone className="h-3 w-3" />
                <span>{courier.supportPhone}</span>
              </a>
            )}
            {courier.supportEmail && (
              <a
                href={`mailto:${courier.supportEmail}`}
                className="inline-flex items-center gap-1 text-slate-600 hover:underline dark:text-slate-300"
              >
                <Mail className="h-3 w-3" />
                <span>Email Support</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
