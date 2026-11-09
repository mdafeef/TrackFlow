import Link from "next/link";
import { PackageX, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 mb-6">
          <PackageX className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Page Not Found
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          The requested page or consignment report could not be found. Return to TrackFlow to track your shipment.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Tracker</span>
        </Link>
      </div>
    </div>
  );
}
