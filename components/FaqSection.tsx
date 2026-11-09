"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does TrackFlow detect my courier automatically?",
      a: "Every courier service follows a unique barcode format and alphanumeric syntax (for instance, India Post Speed Post uses 13 characters like 'EL855948618IN', Ekart uses 'FMPP' followed by 10 digits, and BlueDart uses 11 digits). TrackFlow runs an instant regex priority matching engine to identify your carrier in milliseconds as you type.",
    },
    {
      q: "How do I share tracking details via WhatsApp?",
      a: "Once your shipment details are loaded, click the 'Share' or 'WhatsApp Status' button. TrackFlow automatically creates a formatted status update message along with an optional 1080x1080 high-resolution branded status card you can download or send directly to family, clients, or customers.",
    },
    {
      q: "How does the Multi-Package Watchlist work?",
      a: "When viewing any tracking result, tap 'Save to Watchlist'. Your parcel is stored locally in your browser with zero account requirements. You can assign nicknames (e.g., 'Mom's Gift' or 'Office Laptop') and click the refresh icon anytime to check all your packages in a single tap.",
    },
    {
      q: "Where do I locate my tracking or consignment number?",
      a: "For India Post, check the receipt given at the post office counter—the 13-digit alphanumeric barcode starting with letters (e.g., EM, EK, EL, or ED) and ending with 'IN' is your tracking number. For e-commerce orders (Flipkart, Amazon, Meesho, Myntra), find the tracking code under 'My Orders' > 'Track Package'.",
    },
    {
      q: "What should I do if my tracking status has not updated for several days?",
      a: "Postal and surface cargo shipments may experience scanning pauses while in long-haul linehaul transit between states or during national holidays. Check our Consignment Details card to find the direct official toll-free telephone support and email contacts for your specific carrier.",
    },
  ];

  return (
    <section id="faq-section" className="py-16 border-t border-slate-200/80 dark:border-slate-800/80">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
            <HelpCircle className="h-4 w-4" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Everything You Need to Know
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-5 text-left text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 shrink-0 ml-4 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-indigo-600" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
