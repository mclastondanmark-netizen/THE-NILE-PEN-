import React, { useState, useEffect } from "react";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Masthead from "./components/Masthead";
import ReaderView from "./components/ReaderView";
import EditorialDashboard from "./components/EditorialDashboard";
import NileAssistant from "./components/NileAssistant";
import AuthModal from "./components/AuthModal";
import LegalPages from "./components/LegalPages";
import FooterNewsletter from "./components/FooterNewsletter";
import { COUNTRIES, Subscriber } from "./types";
import { Scale, ShieldAlert, Sparkles, User, LogIn, ChevronRight, Check } from "lucide-react";

export default function App() {
  const [activeCountry, setActiveCountry] = useState("SS");
  const [activeView, setActiveView] = useState<"reader" | "editor" | "settings">("reader");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState<"en" | "ar" | "fr" | "es">("en");

  // Auth State
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("subscriber"); // subscriber / editor / admin
  const [loadingAuth, setLoadingAuth] = useState(true);

  // UI Drawer/Modal state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Track state of user authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoadingAuth(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Fetch role from Firestore
        try {
          const roleRef = doc(db, "user_roles", firebaseUser.uid);
          const roleSnap = await getDoc(roleRef);
          if (roleSnap.exists()) {
            setUserRole(roleSnap.data().role || "subscriber");
          } else {
            // Default to subscriber
            await setDoc(roleRef, { role: "subscriber", email: firebaseUser.email });
            setUserRole("subscriber");
          }
        } catch (err) {
          console.error("Failed to load user role from Firestore", err);
          setUserRole("subscriber");
        }
      } else {
        setUser(null);
        setUserRole("subscriber");
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // Track dark mode toggle
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDarkMode]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserRole("subscriber");
      setActiveView("reader");
      alert("Successfully exited office.");
    } catch (err) {
      console.error(err);
    }
  };

  // Demo Login Quick-Triggers (Extremely convenient for preview!)
  const triggerDemoLogin = async (role: "subscriber" | "editor") => {
    const email = role === "editor" ? "chief-editor@nilepen.pub" : "reader@domain.com";
    const password = "password123";
    
    try {
      setLoadingAuth(true);
      
      // Attempt login
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (loginErr) {
        // If account doesn't exist, register it automatically to make onboarding seamless!
        const { createUserWithEmailAndPassword } = await import("firebase/auth");
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      }

      const uid = userCredential.user.uid;
      
      // Update role explicitly in Firestore
      await setDoc(doc(db, "user_roles", uid), {
        role,
        email
      }, { merge: true });

      // Create subscriber node
      await setDoc(doc(db, "subscribers", uid), {
        email,
        countries: [activeCountry],
        categories: ["politics", "business", "technology"],
        frequency: "daily",
        sendTime: "08:00",
        timezone: "UTC",
        createdAt: Date.now(),
        referralCount: role === "editor" ? 14 : 0,
        language,
        isSubscribed: true
      }, { merge: true });

      setUser(userCredential.user);
      setUserRole(role);
      
      if (role === "editor") {
        setActiveView("editor");
      } else {
        setActiveView("reader");
      }
      
      alert(`Demo Mode Activated: Signed in as ${role === "editor" ? "Chief Editor (RBAC Editor Role)" : "Standard Gazette Subscriber"}`);
    } catch (err: any) {
      console.error(err);
      alert("Demo initialization failed: " + err.message);
    } finally {
      setLoadingAuth(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-primary transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Newspaper Masthead Header */}
        <Masthead
          activeCountry={activeCountry}
          setActiveCountry={setActiveCountry}
          user={user}
          userRole={userRole}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          activeView={activeView}
          setActiveView={setActiveView}
          language={language}
          setLanguage={(lang: any) => setLanguage(lang)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
          onOpenChat={() => setIsChatOpen(true)}
        />

        {/* Demo Assistant helper banner */}
        {!user && (
          <div className="mb-6 p-4 border border-dashed border-brand-border rounded bg-brand-surface flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs font-mono">
              <Sparkles className="w-5 h-5 text-brand-accent animate-pulse shrink-0" />
              <div>
                <p className="font-bold text-brand-primary uppercase tracking-wider">The Nile Pen Interactive Demo Office</p>
                <p className="text-brand-secondary mt-0.5">Explore standard subscriber access, or login instantly as an Editor to curated RSS wirefeeds.</p>
              </div>
            </div>
            <div className="flex gap-2 font-mono text-[10px] shrink-0 w-full sm:w-auto">
              <button
                onClick={() => triggerDemoLogin("editor")}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-brand-primary text-brand-surface font-bold hover:opacity-85 rounded transition"
              >
                Sign In as Chief Editor
              </button>
              <button
                onClick={() => triggerDemoLogin("subscriber")}
                className="flex-1 sm:flex-initial px-3 py-1.5 border border-brand-border hover:bg-brand-surface rounded transition text-brand-secondary"
              >
                Sign In as Subscriber
              </button>
            </div>
          </div>
        )}

        {/* MAIN BODY NAVIGATION PANEL */}
        <div className="py-2" id="main-content-viewport">
          {activeView === "reader" && (
            <ReaderView 
              activeCountry={activeCountry} 
              user={user} 
              language={language} 
              onOpenAuth={() => setIsAuthOpen(true)} 
            />
          )}

          {activeView === "editor" && (userRole === "editor" || userRole === "admin") && (
            <EditorialDashboard 
              user={user} 
              activeCountry={activeCountry} 
              language={language} 
            />
          )}

          {activeView === "settings" && (
            <LegalPages />
          )}
        </div>

        {/* FOOTER SECTION */}
        <footer className="border-t-4 border-double border-brand-primary pt-8 mt-16 pb-8 text-xs font-serif text-brand-secondary">
          <FooterNewsletter />
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left space-y-1">
              <p className="font-extrabold tracking-tight uppercase text-brand-primary">THE NILE PEN JOURNALISM LTD.</p>
              <p className="font-sans text-[10px] text-brand-secondary">No. 12 Corniche El Nile, Garden City, Cairo, Egypt</p>
            </div>
            
            <div className="flex gap-6 font-mono text-[10px] uppercase tracking-wider">
              <button 
                onClick={() => setActiveView("settings")}
                className="hover:underline hover:text-brand-primary transition flex items-center gap-1"
              >
                <Scale className="w-3.5 h-3.5" />
                Compliance & Regulations (GDPR/CAN-SPAM)
              </button>
              <span className="text-brand-border">•</span>
              <span className="text-brand-secondary">Press Wire Sync: Active</span>
            </div>

            <div className="text-center md:text-right font-sans text-[10px] text-brand-secondary">
              © {new Date().getFullYear()} The Nile Pen. All rights reserved. Registered with the Supreme Council for Media Regulation.
            </div>
          </div>
        </footer>

        {/* SIDE DRAWERS AND POPUPS */}
        <NileAssistant 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
          activeCountry={activeCountry} 
        />

        <AuthModal 
          isOpen={isAuthOpen} 
          onClose={() => setIsAuthOpen(false)} 
          user={user} 
          userRole={userRole} 
          setUserRole={setUserRole} 
          language={language} 
        />

      </div>

    </div>
  );
}
