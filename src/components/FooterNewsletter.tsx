import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { Mail, Check, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // Basic email format verification
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setStatus("error");
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const path = "mailing_list";
      await addDoc(collection(db, path), {
        email: email.trim().toLowerCase(),
        createdAt: Date.now()
      });
      setStatus("success");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setErrorMessage("Failed to subscribe. Please try again later.");
      try {
        handleFirestoreError(err, OperationType.CREATE, "mailing_list");
      } catch (logErr) {
        // Log locally but keep UI stable
        console.error(logErr);
      }
    }
  };

  return (
    <div className="border-b border-brand-border pb-8 mb-8" id="footer-newsletter-signup">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Information Text */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-brand-secondary uppercase tracking-widest">
            <Sparkles className="w-4 h-4 text-brand-accent animate-pulse" />
            <span>The Nile Pen Gazette Dispatch</span>
          </div>
          <h3 className="font-serif font-extrabold text-2xl sm:text-3xl text-brand-primary leading-tight">
            Subscribe to our Daily Gazette
          </h3>
          <p className="text-sm sm:text-base text-brand-secondary font-sans max-w-2xl leading-relaxed">
            Stay informed with pure, human-curated journalism. Every morning, receive direct summaries of major Nile Basin press wires paired with expert editorial analysis. Strictly no AI-generated reporting.
          </p>
        </div>

        {/* Right Column: Email Capture Form */}
        <div className="lg:col-span-5 w-full">
          <AnimatePresence mode="wait">
            {status === "success" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-brand-surface border border-emerald-500/30 rounded-lg flex items-start gap-3 text-emerald-700 dark:text-emerald-400"
              >
                <div className="p-1 bg-emerald-500 text-brand-surface rounded-full shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <p className="font-serif font-bold text-sm">Welcome aboard the Gazette Ledger!</p>
                  <p className="text-xs font-mono">Your email has been added to our verified subscriber mailing list.</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-grow">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-secondary" />
                    <input
                      type="email"
                      required
                      disabled={status === "loading"}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (status === "error") setStatus("idle");
                      }}
                      placeholder="Enter your email address"
                      className="w-full text-xs font-mono bg-brand-surface border border-brand-border rounded-lg pl-10 pr-4 py-3 text-brand-primary placeholder:text-brand-secondary/60 focus:outline-hidden focus:border-brand-accent transition-colors duration-200"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="py-3 px-6 bg-brand-accent hover:opacity-90 text-brand-surface font-mono text-xs font-bold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 shrink-0 min-w-[120px]"
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <span>Join Ledger</span>
                    )}
                  </button>
                </form>

                {status === "error" && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-mono text-brand-urgent flex items-center gap-1.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}

                <p className="text-[10px] font-mono text-brand-secondary/80 leading-normal">
                  No dark patterns or spam. Unsubscribe at any time. Read our{" "}
                  <span className="underline cursor-pointer hover:text-brand-primary">
                    Privacy Policy
                  </span>{" "}
                  for information on data portability and compliance.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
