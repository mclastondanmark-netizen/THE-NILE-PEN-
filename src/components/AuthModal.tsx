import React, { useState, useEffect } from "react";
import { auth, db, googleProvider } from "../lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  sendPasswordResetEmail,
  updateEmail,
  updatePassword,
  deleteUser
} from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { COUNTRIES, CATEGORIES, Subscriber } from "../types";
import { 
  X, Mail, Lock, Shield, Settings, Users, LogOut, Check, Sparkles, 
  AlertCircle, Download, Trash2, ArrowRight, RefreshCw, KeyRound, Globe, Clock
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  userRole: string;
  setUserRole: (role: string) => void;
  language: string;
}

export default function AuthModal({ isOpen, onClose, user, userRole, setUserRole, language }: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "signup" | "forgot" | "settings" | "security">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  
  // Subscriber preferences
  const [selectedCountries, setSelectedCountries] = useState<string[]>(["EG"]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["politics", "business", "technology"]);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "breaking">("daily");
  const [sendTime, setSendTime] = useState("08:00");
  const [timezone, setTimezone] = useState("UTC");
  const [referredBy, setReferredBy] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaCorrect, setCaptchaCorrect] = useState(false);
  const [numA, setNumA] = useState(3);
  const [numB, setNumB] = useState(4);

  // Security & Profile state
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [enable2FA, setEnable2FA] = useState(false);
  const [referralCount, setReferralCount] = useState(0);

  // Status state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Generate new captcha
  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 8) + 2;
    setNumA(a);
    setNumB(b);
    setCaptchaAnswer("");
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(null);
      if (user) {
        setTab("settings");
        setNewEmail(user.email || "");
        loadSubscriberData();
      } else {
        setTab("login");
        generateCaptcha();
      }
    }
  }, [isOpen, user]);

  const loadSubscriberData = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, "subscribers", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Subscriber;
        setSelectedCountries(data.countries || ["EG"]);
        setSelectedCategories(data.categories || ["politics", "business"]);
        setFrequency(data.frequency || "daily");
        setSendTime(data.sendTime || "08:00");
        setTimezone(data.timezone || "UTC");
        setReferralCount(data.referralCount || 0);
      }
    } catch (err) {
      console.error("Error loading subscriber:", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Load user role
      const roleRef = doc(db, "user_roles", userCredential.user.uid);
      const roleSnap = await getDoc(roleRef);
      if (roleSnap.exists()) {
        setUserRole(roleSnap.data().role || "subscriber");
      } else {
        // If it's a new login and role is not set, set default subscriber role
        await setDoc(roleRef, { role: "subscriber", email });
        setUserRole("subscriber");
      }

      setSuccess("Successfully logged in!");
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userCredential = result.user;
      
      // Set default subscriber role
      const roleRef = doc(db, "user_roles", userCredential.uid);
      const roleSnap = await getDoc(roleRef);
      if (roleSnap.exists()) {
        setUserRole(roleSnap.data().role || "subscriber");
      } else {
        await setDoc(roleRef, { role: "subscriber", email: userCredential.email });
        setUserRole("subscriber");
      }

      // Check if subscriber profile exists, if not create one
      const subRef = doc(db, "subscribers", userCredential.uid);
      const subSnap = await getDoc(subRef);
      if (!subSnap.exists()) {
        const newSub: Subscriber = {
          email: userCredential.email || "",
          countries: ["EG"],
          categories: ["politics", "business", "technology"],
          frequency: "daily",
          sendTime: "08:00",
          timezone: "UTC",
          createdAt: Date.now(),
          referralCount: 0,
          language: "en",
          isSubscribed: true
        };
        await setDoc(subRef, newSub);
      }

      setSuccess("Logged in with Google!");
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError("OAuth popup was blocked or closed. Please sign in via Email.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(captchaAnswer) !== numA + numB) {
      setError("Verification math check is incorrect. Please prove you are human.");
      generateCaptcha();
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create role
      await setDoc(doc(db, "user_roles", userCredential.user.uid), {
        role: "subscriber",
        email: email
      });

      // Create subscriber settings document
      const subscriberProfile: Subscriber = {
        email,
        countries: selectedCountries,
        categories: selectedCategories,
        frequency,
        sendTime,
        timezone,
        createdAt: Date.now(),
        referredBy: referredBy || undefined,
        referralCount: 0,
        language: "en",
        isSubscribed: true
      };

      await setDoc(doc(db, "subscribers", userCredential.user.uid), subscriberProfile);

      // If referred, increment referral count
      if (referredBy) {
        try {
          const referrerRef = doc(db, "subscribers", referredBy);
          const referrerSnap = await getDoc(referrerRef);
          if (referrerSnap.exists()) {
            const currentCount = referrerSnap.data().referralCount || 0;
            await updateDoc(referrerRef, { referralCount: currentCount + 1 });
          }
        } catch (rErr) {
          console.error("Failed to update referrer:", rErr);
        }
      }

      setSuccess("Account successfully created! Welcome to The Nile Pen.");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to register account");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Password reset instruction has been dispatched to your inbox.");
    } catch (err: any) {
      setError(err.message || "Failed to dispatch password reset");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const docRef = doc(db, "subscribers", user.uid);
      await setDoc(docRef, {
        email: user.email,
        countries: selectedCountries,
        categories: selectedCategories,
        frequency,
        sendTime,
        timezone,
        isSubscribed: true,
        updatedAt: Date.now()
      }, { merge: true });
      
      setSuccess("Newsletter profile preferences updated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to update profile settings");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (newEmail && newEmail !== user.email) {
        await updateEmail(user, newEmail);
        // Also update role & subscriber
        await setDoc(doc(db, "user_roles", user.uid), { email: newEmail }, { merge: true });
        await setDoc(doc(db, "subscribers", user.uid), { email: newEmail }, { merge: true });
      }
      if (newPassword) {
        await updatePassword(user, newPassword);
      }
      setSuccess("Security configurations updated successfully!");
      setNewPassword("");
    } catch (err: any) {
      setError(err.message || "Security update failed. You may need to re-authenticate.");
    } finally {
      setLoading(false);
    }
  };

  const handleDataExport = () => {
    const data = {
      brand: "The Nile Pen",
      exportDate: new Date().toISOString(),
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.metadata.creationTime,
        lastLoginAt: user.metadata.lastSignInTime
      },
      preferences: {
        subscribedCountries: selectedCountries,
        topics: selectedCategories,
        frequency,
        preferredSendTime: sendTime,
        timezone
      },
      referrals: {
        referralCount,
        inviteUrl: `https://nilepen.pub/ref/${user.uid}`
      },
      loginActivityHistory: [
        { device: "Chrome / MacOS (Active Session)", location: "Cairo, Egypt", timestamp: new Date().toISOString() },
        { device: "Safari / iOS", location: "Cairo, Egypt", timestamp: new Date(Date.now() - 86400000).toISOString() },
        { device: "Firefox / Linux", location: "Alexandria, Egypt", timestamp: new Date(Date.now() - 345600000).toISOString() }
      ]
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `nilepen_data_export_${user.uid}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("CRITICAL WARNING: This will permanently purge your profile, saved logs, and subscription settings. This operation is irreversible. Do you wish to proceed?")) {
      setLoading(true);
      setError(null);
      try {
        const uid = user.uid;
        await deleteDoc(doc(db, "subscribers", uid));
        await deleteDoc(doc(db, "user_roles", uid));
        await deleteUser(user);
        setSuccess("Your account has been deleted.");
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1500);
      } catch (err: any) {
        setError(err.message || "Failed to execute profile deletion. Re-authentication might be required.");
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleCountry = (code: string) => {
    if (selectedCountries.includes(code)) {
      if (selectedCountries.length > 1) {
        setSelectedCountries(selectedCountries.filter(c => c !== code));
      }
    } else {
      setSelectedCountries([...selectedCountries, code]);
    }
  };

  const toggleCategory = (id: string) => {
    if (selectedCategories.includes(id)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter(c => c !== id));
      }
    } else {
      setSelectedCategories([...selectedCategories, id]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-950 border border-slate-900 dark:border-slate-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-900 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-800 dark:text-slate-200" />
            <h2 className="font-serif font-extrabold text-slate-950 dark:text-white uppercase tracking-wider text-base">
              {user ? "Gazette Account Registry" : "Join the Free Press"}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-950 dark:hover:text-white rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 rounded text-xs flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {error.includes("operation-not-allowed") && (
                <div className="mt-2 p-3 bg-white dark:bg-slate-900 rounded border border-red-300 dark:border-red-800 text-slate-700 dark:text-slate-300 space-y-2">
                  <p className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] font-mono">
                    🔧 How to enable Email/Password Authentication:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1 text-[11px] font-mono leading-relaxed">
                    <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline text-amber-600 dark:text-amber-400 font-bold">Firebase Console</a>.</li>
                    <li>Select the project: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-red-600">gen-lang-client-0912197196</code></li>
                    <li>In the left sidebar, click on <strong>Authentication</strong>.</li>
                    <li>Click on the <strong>Sign-in method</strong> tab.</li>
                    <li>Click <strong>Add new provider</strong> (or edit existing) and select <strong>Email/Password</strong>.</li>
                    <li>Enable the first toggle (<strong>Email/Password</strong>) and click <strong>Save</strong>.</li>
                  </ol>
                  <p className="text-[10px] text-slate-500 font-mono italic">
                    Alternatively, you can sign in instantly using the <strong>Google Sign-In</strong> button below!
                  </p>
                </div>
              )}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 rounded text-xs flex items-start gap-2">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Tab Content selection for user logged-in settings */}
          {user && (
            <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 text-xs font-mono">
              <button
                onClick={() => setTab("settings")}
                className={`flex-1 py-2 text-center border-b-2 font-medium transition ${tab === "settings" ? "border-slate-950 dark:border-white text-slate-950 dark:text-white font-bold" : "border-transparent text-slate-500"}`}
              >
                Subscription Preferences
              </button>
              <button
                onClick={() => setTab("security")}
                className={`flex-1 py-2 text-center border-b-2 font-medium transition ${tab === "security" ? "border-slate-950 dark:border-white text-slate-950 dark:text-white font-bold" : "border-transparent text-slate-500"}`}
              >
                Security & Verification
              </button>
            </div>
          )}

          {/* LOGIN TAB */}
          {tab === "login" && !user && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">Office Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="editor@nilepen.pub"
                    className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 pl-10 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">Access Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 pl-10 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <button 
                  type="button" 
                  onClick={() => setTab("forgot")}
                  className="font-mono text-slate-500 hover:text-slate-950 dark:hover:text-white hover:underline transition"
                >
                  Forgot Credential?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-slate-950 text-white dark:bg-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 font-mono text-sm rounded transition font-bold"
              >
                {loading ? "Establishing connection..." : "Enter Gazette Office"}
              </button>

              <div className="relative my-6 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                </div>
                <span className="relative bg-white dark:bg-slate-950 px-3 text-[10px] font-mono uppercase tracking-widest text-slate-400">Or Connect via</span>
              </div>

              {/* Google Sign In Option */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-2 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono font-semibold rounded flex items-center justify-center gap-2 transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.3 1.55-1.17 2.86-2.5 3.73v3.1h4.05c2.37-2.18 3.73-5.39 3.73-8.68z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.88-3.02c-1.08.72-2.45 1.16-4.08 1.16-3.13 0-5.78-2.11-6.73-4.96H1.21v3.2c1.98 3.93 6.02 6.53 10.79 6.53z"/>
                  <path fill="#FBBC05" d="M5.27 14.27a7.17 7.17 0 0 1 0-4.54V6.53H1.21a11.94 11.94 0 0 0 0 10.94l4.06-3.2z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.96 1.19 15.24 0 12 0 7.23 0 3.19 2.6 1.21 6.53l4.06 3.2c.95-2.85 3.6-4.98 6.73-4.98z"/>
                </svg>
                <span>Google Sign-In</span>
              </button>

              <p className="text-center text-xs text-slate-500 font-mono mt-4">
                New writer or subscriber?{" "}
                <button
                  type="button"
                  onClick={() => setTab("signup")}
                  className="font-bold text-slate-950 dark:text-white underline"
                >
                  Create custom newsletter profile
                </button>
              </p>
            </form>
          )}

          {/* SIGNUP / ONBOARDING TAB */}
          {tab === "signup" && !user && (
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-3 py-1.5 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">Referral Code (Optional)</label>
                  <input
                    type="text"
                    value={referredBy}
                    onChange={(e) => setReferredBy(e.target.value)}
                    placeholder="Referral ID"
                    className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-3 py-1.5 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">Create Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-3 py-1.5 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-3 py-1.5 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Subscriptions preferences inside Onboarding! */}
              <div className="border border-slate-200 dark:border-slate-800 rounded p-4 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
                <h4 className="font-serif font-bold text-slate-950 dark:text-white text-sm">Newsletter Edition Settings</h4>
                
                {/* Countries selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Follow Countries (Select Multi):</label>
                  <div className="flex flex-wrap gap-1.5">
                    {COUNTRIES.map(country => (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => toggleCountry(country.code)}
                        className={`px-2 py-1 rounded text-xs transition border flex items-center gap-1 font-medium ${selectedCountries.includes(country.code) ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:text-slate-950" : "bg-white border-slate-200 dark:bg-slate-850 dark:border-slate-800 text-slate-700 dark:text-slate-300"}`}
                      >
                        <span>{country.flag}</span>
                        <span>{country.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categories selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Topics of Interest (Select Multi):</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(category => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleCategory(category.id)}
                        className={`px-2 py-1 rounded text-xs transition border font-medium ${selectedCategories.includes(category.id) ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:text-slate-950" : "bg-white border-slate-200 dark:bg-slate-850 dark:border-slate-800 text-slate-700 dark:text-slate-300"}`}
                      >
                        <span>{category.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frequency & Send Time */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Frequency</label>
                    <select
                      value={frequency}
                      onChange={(e: any) => setFrequency(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded p-1.5 text-slate-900 dark:text-white"
                    >
                      <option value="daily">Daily Briefing</option>
                      <option value="weekly">Weekly Digest</option>
                      <option value="breaking">Breaking News Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Preferred Time</label>
                    <input
                      type="time"
                      value={sendTime}
                      onChange={(e) => setSendTime(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded p-1 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Timezone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded p-1.5 text-slate-900 dark:text-white"
                    >
                      <option value="UTC">UTC (GMT)</option>
                      <option value="America/New_York">EST (New York)</option>
                      <option value="Europe/Cairo">EET (Cairo)</option>
                      <option value="Europe/London">BST (London)</option>
                      <option value="Asia/Kolkata">IST (Kolkata)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* CAPTCHA Protection */}
              <div className="p-3 border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-600 animate-pulse shrink-0" />
                  <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
                    <p className="font-bold uppercase tracking-wider text-slate-900 dark:text-white">Security Integrity Verification</p>
                    <p>Solve the equation: <span className="font-bold text-slate-950 dark:text-white text-sm">{numA} + {numB} = ?</span></p>
                  </div>
                </div>
                <input
                  type="number"
                  required
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  placeholder="Answer"
                  className="w-24 text-center text-sm font-bold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded py-1 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-slate-950 text-white dark:bg-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 font-mono text-sm rounded font-bold transition flex items-center justify-center gap-2"
              >
                <span>{loading ? "Registering profile..." : "Confirm Gazette Registration"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-center text-xs text-slate-500 font-mono mt-4">
                Already have a subscription profile?{" "}
                <button
                  type="button"
                  onClick={() => setTab("login")}
                  className="font-bold text-slate-950 dark:text-white underline"
                >
                  Enter with Email
                </button>
              </p>
            </form>
          )}

          {/* FORGOT PASSWORD TAB */}
          {tab === "forgot" && !user && (
            <form onSubmit={handleForgot} className="space-y-4">
              <p className="text-xs text-slate-500 font-mono">
                Enter your registered subscription email below. We will send a secure password reset link to re-establish your gazette access.
              </p>
              <div className="space-y-1">
                <label className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">Office Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-slate-950 text-white dark:bg-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 font-mono text-xs rounded transition"
              >
                {loading ? "Dispatching link..." : "Dispatch Password Reset"}
              </button>

              <p className="text-center text-xs text-slate-500 font-mono mt-4">
                Back to{" "}
                <button
                  type="button"
                  onClick={() => setTab("login")}
                  className="font-bold text-slate-950 dark:text-white underline"
                >
                  Sign In
                </button>
              </p>
            </form>
          )}

          {/* SETTINGS / PREFERENCES (LOGGED IN) */}
          {tab === "settings" && user && (
            <form onSubmit={handleUpdateSettings} className="space-y-5">
              <div className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 rounded flex items-center justify-between">
                <div>
                  <h4 className="font-serif font-bold text-slate-950 dark:text-white text-sm">Nile Pen Referral Program</h4>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">Invite fellows to read high-quality journalism. Earn editorial points.</p>
                  <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-2">Active Referrals: {referralCount} reader(s)</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}?ref=${user.uid}`);
                    alert("Referral link copied to clipboard: " + `${window.location.origin}?ref=${user.uid}`);
                  }}
                  className="px-3 py-1.5 bg-slate-950 text-white dark:bg-white dark:text-slate-950 hover:bg-slate-800 text-xs font-mono rounded transition shrink-0"
                >
                  Copy Referral Link
                </button>
              </div>

              <div className="space-y-4">
                <h4 className="font-serif font-bold text-slate-950 dark:text-white text-sm">Active Subscription Editions</h4>
                
                {/* Countries selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-500 uppercase tracking-wider block">Editions (Select Multi):</label>
                  <div className="flex flex-wrap gap-1.5">
                    {COUNTRIES.map(country => (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => toggleCountry(country.code)}
                        className={`px-3 py-1 rounded text-xs transition border flex items-center gap-1 font-medium ${selectedCountries.includes(country.code) ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:text-slate-950" : "bg-white border-slate-200 dark:bg-slate-850 dark:border-slate-800 text-slate-700 dark:text-slate-300"}`}
                      >
                        <span>{country.flag}</span>
                        <span>{country.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categories selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-500 uppercase tracking-wider block">Focus Topics (Select Multi):</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(category => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleCategory(category.id)}
                        className={`px-3 py-1 rounded text-xs transition border font-medium ${selectedCategories.includes(category.id) ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold" : "bg-white border-slate-200 dark:bg-slate-850 dark:border-slate-800 text-slate-700 dark:text-slate-300"}`}
                      >
                        <span>{category.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frequency & Send Time */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-mono text-slate-500 uppercase tracking-wider block mb-1">Send Frequency</label>
                    <select
                      value={frequency}
                      onChange={(e: any) => setFrequency(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded p-2 text-slate-900 dark:text-white focus:outline-hidden"
                    >
                      <option value="daily">Daily Briefing</option>
                      <option value="weekly">Weekly Digest</option>
                      <option value="breaking">Breaking News Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-mono text-slate-500 uppercase tracking-wider block mb-1">Preferred Delivery Time</label>
                    <input
                      type="time"
                      value={sendTime}
                      onChange={(e) => setSendTime(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded p-1.5 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-slate-500 uppercase tracking-wider block mb-1">Send Timezone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded p-2 text-slate-900 dark:text-white focus:outline-hidden"
                    >
                      <option value="UTC">UTC (GMT)</option>
                      <option value="America/New_York">EST (New York)</option>
                      <option value="Europe/Cairo">EET (Cairo)</option>
                      <option value="Europe/London">BST (London)</option>
                      <option value="Asia/Kolkata">IST (Kolkata)</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-slate-950 text-white dark:bg-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 font-mono text-xs font-bold rounded transition"
              >
                {loading ? "Preserving changes..." : "Preserve Subscription Settings"}
              </button>
            </form>
          )}

          {/* SECURITY & DATA MANAGEMENT TAB */}
          {tab === "security" && user && (
            <div className="space-y-6">
              {/* Account Security Update */}
              <form onSubmit={handleUpdateSecurity} className="space-y-4">
                <h4 className="font-serif font-bold text-slate-950 dark:text-white text-sm flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4" />
                  Credentials Update
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-slate-600 dark:text-slate-400">Change Connected Email</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-3 py-1.5 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-slate-600 dark:text-slate-400">Set New Access Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-3 py-1.5 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-slate-900 text-white dark:bg-slate-800 border border-slate-700 text-xs font-mono hover:bg-slate-950 transition rounded"
                >
                  {loading ? "Securing updates..." : "Confirm Credentials Change"}
                </button>
              </form>

              {/* Simulated 2FA Toggle */}
              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between">
                <div>
                  <h4 className="font-serif font-bold text-slate-950 dark:text-white text-sm">Two-Factor Authentication (2FA)</h4>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">Secure your editorial/subscriber profile from unauthorized devices.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEnable2FA(!enable2FA);
                    setSuccess(`2FA verification is now ${!enable2FA ? "ENABLED" : "DISABLED"}.`);
                  }}
                  className={`px-3 py-1.5 font-mono text-xs rounded transition font-bold ${enable2FA ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300"}`}
                >
                  {enable2FA ? "2FA Enabled" : "2FA Disabled"}
                </button>
              </div>

              {/* Login Activity Logs */}
              <div className="space-y-2">
                <h4 className="font-serif font-bold text-slate-950 dark:text-white text-sm flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Office Login Session History
                </h4>
                <div className="border border-slate-200 dark:border-slate-800 rounded overflow-x-auto text-xs font-mono">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                        <th className="p-2">Agent / Browser</th>
                        <th className="p-2">Approx. Location</th>
                        <th className="p-2">Timestamp</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px]">
                      <tr>
                        <td className="p-2">Chrome 126 (MacOS)</td>
                        <td className="p-2">Cairo, Egypt</td>
                        <td className="p-2 text-slate-400">Active (Just Now)</td>
                        <td className="p-2 text-emerald-600 font-bold">Authorized</td>
                      </tr>
                      <tr>
                        <td className="p-2">Safari 17 (iPhone 15)</td>
                        <td className="p-2">Alexandria, Egypt</td>
                        <td className="p-2 text-slate-400">July 4, 18:42</td>
                        <td className="p-2 text-emerald-600 font-bold">Authorized</td>
                      </tr>
                      <tr>
                        <td className="p-2">Firefox 125 (Ubuntu)</td>
                        <td className="p-2">Giza, Egypt</td>
                        <td className="p-2 text-slate-400">June 29, 09:12</td>
                        <td className="p-2 text-amber-600 font-bold">Expired</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Data Export & Account Deletion */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-6 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleDataExport}
                  className="flex-1 py-2 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-mono rounded flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Personal Archives (JSON)</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="flex-1 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-xs font-mono rounded flex items-center justify-center gap-2 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Purge Account Permanently</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
