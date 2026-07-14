import React, { useState } from "react";
import { Shield, CheckSquare, Eye, Scale, HelpCircle } from "lucide-react";

export default function LegalPages() {
  const [activeTab, setActiveTab] = useState<"privacy" | "terms" | "compliance">("privacy");

  return (
    <div className="bg-white dark:bg-slate-950 p-6 rounded-lg border border-slate-900 dark:border-slate-800 shadow-lg font-sans">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-3 mb-6 font-mono text-xs overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab("privacy")}
          className={`px-4 py-1.5 rounded transition font-semibold flex items-center gap-1.5 ${activeTab === "privacy" ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950" : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-900 dark:text-slate-400"}`}
        >
          <Eye className="w-3.5 h-3.5" />
          Privacy & Data Protection
        </button>
        <button
          onClick={() => setActiveTab("terms")}
          className={`px-4 py-1.5 rounded transition font-semibold flex items-center gap-1.5 ${activeTab === "terms" ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950" : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-900 dark:text-slate-400"}`}
        >
          <Scale className="w-3.5 h-3.5" />
          Terms of Service
        </button>
        <button
          onClick={() => setActiveTab("compliance")}
          className={`px-4 py-1.5 rounded transition font-semibold flex items-center gap-1.5 ${activeTab === "compliance" ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950" : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-900 dark:text-slate-400"}`}
        >
          <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
          GDPR & CAN-SPAM Audit
        </button>
      </div>

      {/* PRIVACY POLICY */}
      {activeTab === "privacy" && (
        <article className="space-y-4 max-w-3xl leading-relaxed text-sm text-slate-700 dark:text-slate-300">
          <h3 className="font-serif font-extrabold text-slate-950 dark:text-white uppercase tracking-wider text-lg border-b border-slate-200 dark:border-slate-800 pb-2">
            Gazette Privacy Ledger & Data Covenant
          </h3>
          <p className="font-serif italic text-slate-500">Last Revised: July 5, 2026</p>
          
          <p>
            At <strong>The Nile Pen</strong>, we hold the sanctity of personal information in the highest regard. This charter outlines our practices surrounding subscription databases, cookie usage, and our data minimization covenant.
          </p>

          <h4 className="font-serif font-bold text-slate-900 dark:text-white text-base mt-4">1. Information We Collect</h4>
          <p>
            We strictly limit data acquisition to parameters necessary to customize our newsletter dispatches:
          </p>
          <ul className="list-disc pl-5 font-mono text-xs space-y-1">
            <li>Connected Email Address (for dispatch purposes).</li>
            <li>Custom parameters (edition preferences, topics of focus, preferred send schedule, and send timezone).</li>
            <li>Usage metrics (e.g., anonymous referral counts and bookmark collections stored in local browser structures).</li>
          </ul>

          <h4 className="font-serif font-bold text-slate-900 dark:text-white text-base mt-4">2. Zero Third-Party Monetization Covenant</h4>
          <p>
            We never trade, rent, license, or monetize subscription databases. All subscriber information remains securely isolated within our encrypted Firestore clusters.
          </p>

          <h4 className="font-serif font-bold text-slate-900 dark:text-white text-base mt-4">3. Data Export & Purge Rights</h4>
          <p>
            In absolute conformity with European General Data Protection Regulation (GDPR) mandates, subscribers possess a self-service panel to download their entire personal archives (JSON format) or trigger immediate, irreversible purge operations on their profiles.
          </p>
        </article>
      )}

      {/* TERMS OF SERVICE */}
      {activeTab === "terms" && (
        <article className="space-y-4 max-w-3xl leading-relaxed text-sm text-slate-700 dark:text-slate-300">
          <h3 className="font-serif font-extrabold text-slate-950 dark:text-white uppercase tracking-wider text-lg border-b border-slate-200 dark:border-slate-800 pb-2">
            Subscription Terms & Editorial Covenant
          </h3>
          <p className="font-serif italic text-slate-500">Effective: July 5, 2026</p>

          <p>
            By subscribing to the dispatches of <strong>The Nile Pen</strong>, readers agree to hold themselves to the terms of service outlined below:
          </p>

          <h4 className="font-serif font-bold text-slate-900 dark:text-white text-base mt-4">1. Editorial Standards & No-AI Pledge</h4>
          <p>
            We pledge to never distribute AI-generated, synthetic news articles. All content published in our newsletter issues consists strictly of real, public RSS news leads annotated with human commentary written by certified editors.
          </p>

          <h4 className="font-serif font-bold text-slate-900 dark:text-white text-base mt-4">2. Re-distribution & Fair Attribution</h4>
          <p>
            Subscribers are welcome to share newsletter dispatches. However, any republication or citation of our commentators' opinions must clearly attribute <strong>The Nile Pen</strong> and retain hyperlinks directing to original wire service outlets.
          </p>

          <h4 className="font-serif font-bold text-slate-900 dark:text-white text-base mt-4">3. Right of Discontinuance</h4>
          <p>
            We reserve the right to suspend subscription profiles that engage in bot activities, scraping, or spamming of our referral program.
          </p>
        </article>
      )}

      {/* COMPLIANCE CHECKLIST */}
      {activeTab === "compliance" && (
        <div className="space-y-4 max-w-3xl">
          <h3 className="font-serif font-extrabold text-slate-950 dark:text-white uppercase tracking-wider text-lg border-b border-slate-200 dark:border-slate-800 pb-2">
            GDPR & CAN-SPAM Compliance Ledger
          </h3>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            A comprehensive checklist auditing the legal compliance of our newsletter dispatches:
          </p>

          <div className="space-y-3 font-mono text-xs">
            {[
              {
                title: "Physical Address in Email Footer",
                desc: "Mandated by CAN-SPAM Act of 2003. Handled by printing our Garden City, Cairo headquarters on all dispatches.",
                status: "VERIFIED"
              },
              {
                title: "Instant Unsubscribe Mechanism",
                desc: "An obvious, unshaded link letting subscribers exit instantly with zero dark patterns. Honored immediately.",
                status: "VERIFIED"
              },
              {
                title: "Subscriber Data Portability (GDPR)",
                desc: "Provides self-service JSON data export tool directly in account security panel.",
                status: "VERIFIED"
              },
              {
                title: "Right to be Forgotten (GDPR)",
                desc: "Allows subscribers to permanently delete their account and subscription nodes instantly.",
                status: "VERIFIED"
              },
              {
                title: "Opt-In Consent for Newsletters",
                desc: "Explicitly requests category and country follow selections on registration, avoiding pre-checked broad marketing.",
                status: "VERIFIED"
              }
            ].map((item, idx) => (
              <div key={idx} className="p-4 border border-slate-250 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-900 flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <p className="font-bold text-slate-900 dark:text-white text-xs">{item.title}</p>
                  <p className="text-slate-500 leading-normal">{item.desc}</p>
                </div>
                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-2 py-0.5 rounded font-bold">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
