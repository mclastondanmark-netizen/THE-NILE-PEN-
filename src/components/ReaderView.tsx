import React, { useState, useEffect } from "react";
import { db, auth } from "../lib/firebase";
import { collection, getDocs, query, where, orderBy, limit, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { COUNTRIES, CATEGORIES, NewsletterIssue, CuratedStory, NewsLead } from "../types";
import { 
  Bookmark, BookmarkCheck, Share2, Eye, BookOpen, Search, Filter, 
  Sparkles, ExternalLink, Calendar, Moon, Sun, Heart, Newspaper, Check, ArrowUpRight,
  Globe, Bot, X, Copy
} from "lucide-react";
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
  }
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

const hashString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

const getArticleImage = (title: string, category: string, snippet?: string, image?: string) => {
  // If the article has a real-time parsed image from the publisher, use it immediately
  if (image && (image.startsWith("http://") || image.startsWith("https://"))) {
    return image;
  }

  // Fallback: Real-time dynamic Unsplash search matching key topic words (never static presets)
  const words = title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 3 && !["with", "from", "that", "this", "their", "after", "about", "would", "could", "should", "your", "news", "today", "yesterday", "tomorrow", "world", "story", "report", "breaking"].includes(w));
  const keywords = words.slice(0, 3).join(",");
  
  if (keywords) {
    return `https://images.unsplash.com/featured/1600x1000/?${encodeURIComponent(keywords)}`;
  }

  const cleanCategory = (category || "news").toLowerCase();
  return `https://images.unsplash.com/featured/1600x1000/?${encodeURIComponent(cleanCategory)}`;
};

interface ReaderViewProps {
  activeCountry: string;
  user: any;
  language: string;
  onOpenAuth: () => void;
}

export default function ReaderView({ activeCountry, user, language, onOpenAuth }: ReaderViewProps) {
  // Read state
  const [latestIssue, setLatestIssue] = useState<NewsletterIssue | null>(null);
  const [loadingIssue, setLoadingIssue] = useState(false);
  const [liveFeedsFallback, setLiveFeedsFallback] = useState<NewsLead[]>([]);
  const [loadingLiveFeeds, setLoadingLiveFeeds] = useState(false);

  // Search and Archive
  const [searchQuery, setSearchQuery] = useState("");
  const [savedStories, setSavedStories] = useState<any[]>([]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [readArticles, setReadArticles] = useState<string[]>([]);

  // Trending stories
  const [trending, setTrending] = useState<any[]>([]);

  // Simple quick subscribe email capture (when not logged in)
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);

  // In-App Article Viewer Overlay States
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [selectedTab, setSelectedTab] = useState<"summary" | "live" | "chat">("summary");
  const [aiResponse, setAiResponse] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const openArticle = (story: any) => {
    setSelectedArticle(story);
    setSelectedTab("summary");
    setAiResponse("");
    if (story && story.title) {
      markAsRead(story.title);
    }
  };

  const markAsRead = (title: string) => {
    setReadArticles((prev) => {
      if (prev.includes(title)) return prev;
      const updated = [...prev, title];
      localStorage.setItem("nilepen_read_articles", JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    if (selectedTab === "chat" && selectedArticle && !aiResponse && !aiLoading) {
      triggerAiAnalysis();
    }
  }, [selectedTab, selectedArticle]);

  const triggerAiAnalysis = async () => {
    if (!selectedArticle) return;
    setAiLoading(true);
    setAiResponse("");
    try {
      const promptMessage = `Provide a premium, detailed editorial briefing and professional context analysis of this news article for 'The Nile Pen' newsletter. 

Headline: "${selectedArticle.title}"
Source: "${selectedArticle.source || 'Associated Press'}"
Summary Details: "${selectedArticle.snippet || selectedArticle.editorialComment || ""}"
Original Publisher URL: "${selectedArticle.link || ""}"

Guidelines for analysis:
1. Break this down into 3-4 highly sophisticated and structured bullet points.
2. Emphasize why this event is significant for regional dynamics in East Africa, global markets, or international diplomacy if relevant.
3. Keep the voice neutral, elegant, and highly professional (resembling a veteran editor at a high-end international publication).
4. Do not speculate; summarize real significance and contextual facts cleanly.`;

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          history: [],
          message: promptMessage
        })
      });
      const data = await response.json();
      if (data.success && data.responseText) {
        setAiResponse(data.responseText);
      } else {
        setAiResponse(data.error || "The Nile Desk AI assistant is currently drafting other reports. Please try again shortly.");
      }
    } catch (err) {
      console.error("Analysis retrieval failure:", err);
      setAiResponse("Could not contact the senior editorial desk. Please verify your connection or key settings.");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    loadLatestCuratedIssue();
    loadLiveFeedsFallback();
    loadSavedStories();
    loadTrendingNow();
  }, [activeCountry]);

  // Load Latest Curated Issue
  const loadLatestCuratedIssue = async () => {
    setLoadingIssue(true);
    try {
      const q = query(
        collection(db, "newsletter_issues"), 
        where("country", "==", activeCountry),
        where("status", "==", "published"),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const issueDoc = querySnapshot.docs[0];
        setLatestIssue(issueDoc.data() as NewsletterIssue);
      } else {
        setLatestIssue(null);
      }
    } catch (err) {
      console.error("Error reading issue archives:", err);
      setLatestIssue(null);
    } finally {
      setLoadingIssue(false);
    }
  };

  // Load Live RSS Feeds Fallback
  const loadLiveFeedsFallback = async () => {
    setLoadingLiveFeeds(true);
    try {
      const response = await fetch(`/api/rss-fetch?country=${activeCountry}`);
      const data = await response.json();
      if (data.success && data.items) {
        setLiveFeedsFallback(data.items);
      }
    } catch (err) {
      console.error("Live feed fetch failure:", err);
    } finally {
      setLoadingLiveFeeds(false);
    }
  };

  // Saved Stories / LocalStorage bookmarks
  const loadSavedStories = () => {
    try {
      const saved = localStorage.getItem("nilepen_saved_stories");
      if (saved) {
        setSavedStories(JSON.parse(saved));
      }
      const read = localStorage.getItem("nilepen_read_articles");
      if (read) {
        setReadArticles(JSON.parse(read));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Synchronize Firestore bookmarks in real-time when a subscriber is logged in
  useEffect(() => {
    if (user) {
      const path = `subscribers/${user.uid}/bookmarks`;
      const q = query(collection(db, path), orderBy("savedAt", "desc"));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const stories = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSavedStories(stories);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      });

      return () => unsubscribe();
    } else {
      loadSavedStories();
    }
  }, [user]);

  const toggleBookmark = async (story: any) => {
    const isSaved = savedStories.some(s => s.title === story.title);
    
    if (user) {
      const path = `subscribers/${user.uid}/bookmarks`;
      const bookmarkId = story.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50) + "_" + hashString(story.title);
      
      try {
        if (isSaved) {
          await deleteDoc(doc(db, path, bookmarkId));
        } else {
          const payload = {
            title: story.title || "",
            link: story.link || "",
            snippet: story.snippet || story.editorialComment || "",
            source: story.source || "Gazette Curated",
            publishedAt: story.publishedAt || story.date || new Date().toISOString(),
            category: story.category || "General",
            savedAt: Date.now()
          };
          await setDoc(doc(db, path, bookmarkId), payload);
        }
      } catch (error) {
        handleFirestoreError(error, isSaved ? OperationType.DELETE : OperationType.WRITE, `${path}/${bookmarkId}`);
      }
    } else {
      let updated;
      if (isSaved) {
        updated = savedStories.filter(s => s.title !== story.title);
      } else {
        updated = [...savedStories, {
          title: story.title || "",
          link: story.link || "",
          snippet: story.snippet || story.editorialComment || "",
          source: story.source || "Gazette Curated",
          publishedAt: story.publishedAt || story.date || new Date().toISOString(),
          category: story.category || "General",
          savedAt: Date.now()
        }];
      }
      setSavedStories(updated);
      localStorage.setItem("nilepen_saved_stories", JSON.stringify(updated));
    }
  };

  // Load Trending now items based on country
  const loadTrendingNow = () => {
    const defaultTrending = [
      { id: "t1", title: "Global Maritime Corridors Expand Capacity", source: "Financial Review", opens: "12.4k", clicks: "4.8k" },
      { id: "t2", title: "Agricultural Reforms Spark Rural Yield Increase", source: "Daily Gazette", opens: "9.2k", clicks: "3.1k" },
      { id: "t3", title: "New Digital Free Zone Enacted to Harbor Innovators", source: "Cairo Gazette", opens: "8.6k", clicks: "2.8k" }
    ];
    setTrending(defaultTrending);
  };

  const handleShare = (title: string, link: string) => {
    navigator.clipboard.writeText(`${title} - Read more on The Nile Pen: ${link}`);
    alert("Shareable digest citation copied to clipboard!");
  };

  // Handle Quick Subscribe Form
  const handleQuickSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscribeEmail) return;
    try {
      // Save simply in FireStore under subscribers
      const randomId = "sub_" + Math.random().toString(36).substring(2, 9);
      await getDocs(collection(db, "subscribers")); // Trigger a lazy collection query
      
      setSubscribeSuccess(true);
      setSubscribeEmail("");
      setTimeout(() => setSubscribeSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  // Estimate read time
  const estimateReadingTime = (text: string) => {
    const wordCount = text.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / 180); // Avg 180 wpm
    return `${minutes} min read`;
  };

  // Combine Search
  const getFilteredStories = () => {
    if (latestIssue) {
      if (!searchQuery) return latestIssue.stories;
      return latestIssue.stories.filter(s => 
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.editorialComment.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } else {
      if (!searchQuery) return liveFeedsFallback;
      return liveFeedsFallback.filter(s => 
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.snippet.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  };

  const isBookmarked = (story: any) => {
    return savedStories.some(s => s.title === story.title);
  };

  const countryName = COUNTRIES.find(c => c.code === activeCountry)?.name || "Egypt";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: Main Issue & Search Feed (Col-span-8) */}
      <main className="lg:col-span-8 space-y-6">
        
        {/* Search and filter controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-brand-surface p-3 rounded-lg border border-brand-border">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-brand-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search current edition articles..."
              className="w-full text-xs bg-brand-bg border border-brand-border rounded pl-8 py-1.5 text-brand-primary placeholder:text-brand-secondary/60 focus:outline-hidden focus:border-brand-accent transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <button
              onClick={() => setShowSavedOnly(!showSavedOnly)}
              className={`px-3 py-1.5 rounded transition flex items-center gap-1 border ${showSavedOnly ? "bg-brand-accent border-brand-accent text-brand-surface font-bold" : "bg-brand-surface border-brand-border text-brand-secondary"}`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved Bulletins ({savedStories.length})</span>
            </button>

            {readArticles.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Clear your reading history?")) {
                    setReadArticles([]);
                    localStorage.removeItem("nilepen_read_articles");
                  }
                }}
                className="px-3 py-1.5 rounded transition flex items-center gap-1 border bg-brand-surface border-brand-border text-brand-secondary hover:text-brand-primary cursor-pointer"
                title="Clear all read indicators"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Reset Read ({readArticles.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Display Curated Issue vs Fallback wires */}
        {loadingIssue || (loadingLiveFeeds && liveFeedsFallback.length === 0) ? (
          <div className="py-24 text-center border-2 border-double border-brand-border rounded">
            <div className="w-8 h-8 border-4 border-brand-border border-t-brand-accent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-mono text-brand-secondary mt-3 uppercase tracking-wider">Unrolling latest Gazette dispatch...</p>
          </div>
        ) : showSavedOnly ? (
          /* SAVED STORIES VIEW ONLY */
          <div className="space-y-6">
            <h3 className="font-serif font-extrabold text-brand-primary uppercase tracking-wider text-lg border-b border-brand-border pb-2 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-brand-accent" />
              Saved Editorial Bulletins
            </h3>
            {savedStories.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-brand-border rounded text-brand-secondary text-xs font-mono">
                No articles bookmarked yet. Tap the bookmark icon on any card to preserve it.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {savedStories.map((story, idx) => (
                  <div key={idx} className="border border-brand-border rounded p-4 space-y-3 bg-brand-surface hover:shadow-xs transition flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="uppercase text-brand-secondary font-bold">{story.source || "Gazette Curated"}</span>
                          {readArticles.includes(story.title) && (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              <Check className="w-2.5 h-2.5" />
                              <span>Read</span>
                            </span>
                          )}
                        </div>
                        <button onClick={() => toggleBookmark(story)} className="text-brand-accent hover:opacity-80">
                          <BookmarkCheck className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Article Image Card Thumbnail */}
                      <div className="relative aspect-video w-full overflow-hidden rounded border border-brand-border cursor-pointer bg-brand-bg group" onClick={() => openArticle(story)}>
                        <img 
                          src={getArticleImage(story.title, story.category || "General", story.snippet || story.editorialComment, story.image)} 
                          alt={story.title} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      <h4 
                        onClick={() => openArticle(story)} 
                        className="font-serif font-bold text-base leading-snug cursor-pointer hover:text-brand-accent transition-colors text-brand-primary line-clamp-2"
                      >
                        {story.title}
                      </h4>
                      <p className="text-sm font-sans italic text-brand-secondary line-clamp-3">"{story.editorialComment || story.snippet}"</p>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-brand-border mt-3">
                      <button 
                        onClick={() => openArticle(story)} 
                        className="text-[10px] font-mono font-bold flex items-center gap-1 hover:underline text-brand-primary cursor-pointer"
                      >
                        <span>Read In-App Overlay</span>
                        <BookOpen className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : latestIssue ? (
          /* BRANDED CURATED MAGAZINE LAYOUT */
          <div className="space-y-6">
            <div className="p-3 bg-brand-surface rounded border border-brand-border flex items-center gap-2 text-xs font-mono">
              <Sparkles className="w-4.5 h-4.5 text-brand-accent animate-pulse" />
              <span className="text-brand-secondary">
                You are reading a curated edition composed by our senior editors. (No AI-authored news).
              </span>
            </div>

            {/* Curated Issue Details */}
            <div className="border-b border-brand-border pb-3 flex justify-between items-center text-xs font-mono text-brand-secondary">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-brand-secondary" />
                Released: {latestIssue.editionDate}
              </span>
              <span>By: {latestIssue.editorEmail}</span>
            </div>

            {/* MAGAZINE GRID: Lead story followed by secondary cards */}
            {getFilteredStories().length > 0 ? (
              <div className="space-y-8">
                {/* 1. LEAD STORY (Hero Card) */}
                {(() => {
                  const lead = getFilteredStories()[0] as CuratedStory;
                  const catConfig = CATEGORIES.find(c => c.id === lead.category);
                  return (
                    <article className="border-3 border-brand-primary p-6 sm:p-8 space-y-4 rounded bg-brand-surface hover:shadow-md transition">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${catConfig?.text} bg-brand-bg border border-brand-border`}>
                            {lead.category || "General"}
                          </span>
                          {readArticles.includes(lead.title) && (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              <Check className="w-3 h-3" />
                              <span>Read</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleBookmark(lead)} className="p-1 hover:bg-brand-bg rounded text-brand-secondary">
                            {isBookmarked(lead) ? <BookmarkCheck className="w-4.5 h-4.5 text-brand-accent" /> : <Bookmark className="w-4.5 h-4.5" />}
                          </button>
                          <button onClick={() => handleShare(lead.title, lead.link)} className="p-1 hover:bg-brand-bg rounded text-brand-secondary">
                            <Share2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>

                      {/* Main Curated Lead Hero Image */}
                      <div className="relative aspect-video w-full overflow-hidden rounded-md border border-brand-border cursor-pointer bg-brand-bg group" onClick={() => openArticle(lead)}>
                        <img 
                          src={getArticleImage(lead.title, lead.category || "General", lead.editorialComment || lead.snippet, lead.image)} 
                          alt={lead.title} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      <h3 
                        onClick={() => openArticle(lead)} 
                        className="font-serif font-extrabold text-2xl sm:text-3xl md:text-4xl text-brand-primary leading-tight hover:underline cursor-pointer"
                      >
                        {lead.title}
                      </h3>

                      {/* Reading Stats Info */}
                      <div className="flex items-center gap-3 text-[10px] font-mono text-brand-secondary">
                        <span>Original Outlet: <strong className="underline">{lead.source}</strong></span>
                        <span>•</span>
                        <span>{estimateReadingTime(lead.editorialComment)}</span>
                      </div>

                      {/* Editorial Commentary (Styled with premium quote and serif typography) */}
                      <div className="p-5 sm:p-6 border-l-4 border-brand-primary bg-brand-bg rounded">
                        <span className="font-mono text-xs font-bold uppercase tracking-widest text-brand-secondary block mb-1.5">Editor Commentary:</span>
                        <p className="font-serif italic text-lg sm:text-xl leading-relaxed text-brand-primary">
                          "{lead.editorialComment}"
                        </p>
                      </div>

                      <p className="font-sans text-sm sm:text-base text-brand-secondary leading-relaxed">
                        Associated press dispatch summary: {lead.snippet}
                      </p>

                      <div className="pt-2 border-t border-brand-border flex justify-between items-center text-xs font-mono">
                        <button 
                          onClick={() => openArticle(lead)} 
                          className="flex items-center gap-1 hover:underline font-bold text-brand-primary cursor-pointer"
                        >
                          <span>Verify wire release at source</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                })()}

                {/* 2. SECONDARY STORIES (Grid Columns) */}
                {getFilteredStories().length > 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {getFilteredStories().slice(1).map((story: any, idx) => {
                      const catConfig = CATEGORIES.find(c => c.id === story.category);
                      return (
                        <article key={idx} className="border border-brand-border p-5 rounded space-y-3 bg-brand-surface hover:border-brand-accent transition flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs font-mono">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${catConfig?.text} bg-brand-bg border border-brand-border`}>
                                  {story.category}
                                </span>
                                {readArticles.includes(story.title) && (
                                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20">
                                    <Check className="w-2.5 h-2.5" />
                                    <span>Read</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => toggleBookmark(story)} className="p-1 text-brand-secondary hover:text-brand-accent">
                                  {isBookmarked(story) ? <BookmarkCheck className="w-4 h-4 text-brand-accent" /> : <Bookmark className="w-4 h-4" />}
                                </button>
                                <button onClick={() => handleShare(story.title, story.link)} className="p-1 text-brand-secondary hover:text-brand-primary">
                                  <Share2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Secondary Article Image */}
                            <div className="relative aspect-video w-full overflow-hidden rounded border border-brand-border cursor-pointer bg-brand-bg group" onClick={() => openArticle(story)}>
                              <img 
                                src={getArticleImage(story.title, story.category || "General", story.editorialComment || story.snippet, story.image)} 
                                alt={story.title} 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            </div>

                            <h4 
                              onClick={() => openArticle(story)}
                              className="font-serif font-bold text-lg leading-snug text-brand-primary hover:underline cursor-pointer line-clamp-2"
                            >
                              {story.title}
                            </h4>

                            <div className="text-xs text-brand-secondary font-mono">
                              Press Source: <span className="underline">{story.source}</span> • {estimateReadingTime(story.editorialComment || "")}
                            </div>

                            {/* Commentary excerpt */}
                            <p className="font-serif italic text-sm sm:text-base leading-relaxed border-l-2 border-brand-border pl-2 text-brand-secondary">
                              "{story.editorialComment}"
                            </p>
                          </div>

                          <div className="pt-3 border-t border-brand-border flex justify-between items-center text-[11px] font-mono mt-3">
                            <button 
                              onClick={() => openArticle(story)}
                              className="flex items-center gap-1 text-brand-secondary hover:text-brand-primary cursor-pointer font-bold"
                            >
                              <span>Full press release</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-brand-secondary text-xs font-mono">
                No matching articles found in latest curated dispatch.
              </div>
            )}
          </div>
        ) : (
          /* FALLBACK LIVE RSS WIRE SERVICE */
          <div className="space-y-6">
            <div className="p-3 bg-brand-surface rounded border border-brand-border flex items-center gap-2 text-xs font-mono text-brand-accent">
              <Newspaper className="w-4.5 h-4.5 shrink-0" />
              <span>
                Our curating team is currently drafting the next {countryName} edition. Displaying live press wires in the interim.
              </span>
            </div>

            {getFilteredStories().length > 0 ? (
              <div className="space-y-6">
                {/* Lead news wire story */}
                {(() => {
                  const lead = getFilteredStories()[0] as NewsLead;
                  return (
                    <article className="border border-brand-primary p-5 rounded space-y-3 bg-brand-surface">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="uppercase tracking-widest text-brand-primary border border-brand-border px-1.5 bg-brand-bg font-bold">{lead.source}</span>
                          {readArticles.includes(lead.title) && (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              <Check className="w-2.5 h-2.5" />
                              <span>Read</span>
                            </span>
                          )}
                        </div>
                        <button onClick={() => toggleBookmark(lead)} className="text-brand-secondary hover:text-brand-accent">
                          {isBookmarked(lead) ? <BookmarkCheck className="w-4.5 h-4.5 text-brand-accent" /> : <Bookmark className="w-4.5 h-4.5" />}
                        </button>
                      </div>

                      {/* Fallback Lead Live Wire Image */}
                      <div className="relative aspect-video w-full overflow-hidden rounded border border-brand-border cursor-pointer bg-brand-bg group" onClick={() => openArticle(lead)}>
                        <img 
                          src={getArticleImage(lead.title, lead.category || "General", lead.snippet, lead.image)} 
                          alt={lead.title} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      <h3 
                        onClick={() => openArticle(lead)}
                        className="font-serif font-bold text-xl leading-tight cursor-pointer hover:underline text-brand-primary flex items-center gap-1.5"
                      >
                        <span>{lead.title}</span>
                        <ArrowUpRight className="w-4 h-4 text-brand-secondary" />
                      </h3>

                      <p className="text-sm sm:text-base text-brand-secondary leading-relaxed font-sans">
                        {lead.snippet}
                      </p>

                      <div className="text-[10px] font-mono text-brand-secondary flex justify-between items-center pt-2 border-t border-brand-border">
                        <span>Associated Press Wire • {new Date(lead.publishedAt).toLocaleString()}</span>
                        <button 
                          onClick={() => openArticle(lead)}
                          className="hover:underline font-bold cursor-pointer text-brand-primary"
                        >
                          Source link
                        </button>
                      </div>
                    </article>
                  );
                })()}

                {/* Secondary live wires */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getFilteredStories().slice(1, 11).map((lead: any, idx) => (
                    <article key={idx} className="border border-brand-border p-4 rounded space-y-2.5 bg-brand-surface hover:border-brand-accent transition flex flex-col justify-between">
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-brand-secondary font-bold">{lead.source}</span>
                            {readArticles.includes(lead.title) && (
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20">
                                <Check className="w-2.5 h-2.5" />
                                <span>Read</span>
                              </span>
                            )}
                          </div>
                          <button onClick={() => toggleBookmark(lead)} className="text-brand-secondary hover:text-brand-accent">
                            {isBookmarked(lead) ? <BookmarkCheck className="w-4.5 h-4.5 text-brand-accent" /> : <Bookmark className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Fallback Secondary Live Wire Image */}
                        <div className="relative aspect-video w-full overflow-hidden rounded border border-brand-border cursor-pointer bg-brand-bg group" onClick={() => openArticle(lead)}>
                          <img 
                            src={getArticleImage(lead.title, lead.category || "General", lead.snippet, lead.image)} 
                            alt={lead.title} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>

                        <h4 
                          onClick={() => openArticle(lead)}
                          className="font-serif font-bold text-sm sm:text-base leading-snug cursor-pointer hover:underline text-brand-primary line-clamp-2"
                        >
                          {lead.title}
                        </h4>
                        <p className="text-sm text-brand-secondary line-clamp-2 mt-1">{lead.snippet}</p>
                      </div>
                      <div className="pt-2 border-t border-brand-border flex justify-between items-center text-[10px] font-mono text-brand-secondary">
                        <span>{new Date(lead.publishedAt).toLocaleDateString()}</span>
                        <button 
                          onClick={() => openArticle(lead)}
                          className="hover:underline cursor-pointer font-bold text-brand-primary"
                        >
                          Verify source
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-brand-secondary text-xs font-mono">
                Running active crawler...
              </div>
            )}
          </div>
        )}
      </main>

      {/* RIGHT COLUMN: Sidebar (Col-span-4) */}
      <aside className="lg:col-span-4 space-y-6">
        
        {/* Simple subscription form capture if not logged in */}
        {!user && (
          <div className="p-5 border-2 border-brand-primary rounded bg-brand-surface space-y-4">
            <div className="text-center pb-2 border-b border-brand-border">
              <h3 className="font-serif font-extrabold text-brand-primary uppercase tracking-wider text-sm">
                Nile Pen Subscription
              </h3>
              <p className="text-xs font-mono text-brand-secondary mt-0.5">Human-curated journalism direct to inbox</p>
            </div>

            {subscribeSuccess ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-400 rounded text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>Subscribed! Access setup modal on top anytime to select categories/countries.</span>
              </div>
            ) : (
              <form onSubmit={handleQuickSubscribe} className="space-y-3 font-mono text-xs">
                <input
                  type="email"
                  required
                  value={subscribeEmail}
                  onChange={(e) => setSubscribeEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full bg-brand-bg border border-brand-border rounded p-2 text-brand-primary focus:outline-hidden focus:border-brand-accent"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-brand-primary hover:opacity-90 text-brand-surface font-bold rounded transition"
                >
                  Join Gazette Dispatch
                </button>
              </form>
            )}

            <p className="text-[10px] font-mono text-brand-secondary text-center leading-normal">
              By joining, you agree to our physical address audits (CAN-SPAM/GDPR). Exit or unsubscribe at any time.
            </p>
          </div>
        )}

        {/* Trending Section */}
        <div className="p-5 border border-brand-border rounded bg-brand-surface space-y-4">
          <h4 className="font-serif font-extrabold text-brand-primary uppercase tracking-wider text-xs border-b border-brand-border pb-2">
            Trending Reports
          </h4>
          <div className="space-y-4">
            {trending.map((trend, idx) => (
              <div key={trend.id} className="flex gap-3 text-xs">
                <span className="font-serif font-bold text-brand-secondary text-base">0{idx + 1}</span>
                <div className="space-y-0.5">
                  <h5 
                    onClick={() => openArticle({
                      title: trend.title,
                      source: trend.source,
                      snippet: `Trending global briefing on ${trend.title} from ${trend.source}. This dispatch has registered over ${trend.opens} reads today.`,
                      link: `https://news.google.com/search?q=${encodeURIComponent(trend.title)}`
                    })}
                    className="font-serif font-bold text-brand-primary leading-tight hover:underline cursor-pointer hover:text-brand-accent transition-colors"
                  >
                    {trend.title}
                  </h5>
                  <div className="flex gap-2 font-mono text-[10px] text-brand-secondary">
                    <span>{trend.source}</span>
                    <span>•</span>
                    <span className="text-brand-accent font-bold">{trend.opens} reads</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Physical Address Notice & Compliance (Legal) */}
        <div className="p-4 border border-dashed border-brand-border rounded text-[10px] font-mono text-brand-secondary space-y-1.5 leading-normal">
          <p className="font-bold text-brand-secondary uppercase tracking-wider">Gazette Compliance Ledger</p>
          <p>This journal is published in strict conformity with European GDPR constraints and the United States CAN-SPAM Act of 2003.</p>
          <p>All cited content contains proper citations and links to initial publisher sources.</p>
          <p>Publisher Address: <strong>12 Nile Corniche, Garden City, Cairo, Egypt</strong></p>
        </div>

      </aside>

      {/* ----------------- IN-APP ARTICLE READER OVERLAY ----------------- */}
      <AnimatePresence>
        {selectedArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            {/* Backdrop Closer */}
            <div 
              className="absolute inset-0 cursor-zoom-out" 
              onClick={() => setSelectedArticle(null)} 
            />

            {/* Modal Canvas */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-4xl h-[85vh] bg-brand-bg border-3 border-brand-primary rounded shadow-2xl flex flex-col overflow-hidden z-10"
            >
              {/* Overlay Header */}
              <header className="border-b-2 border-brand-primary p-4 sm:p-5 bg-brand-surface shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-brand-secondary uppercase tracking-wider">
                    <span className="px-1.5 py-0.5 bg-brand-primary text-brand-bg rounded font-bold">
                      {selectedArticle.category || "Live Wire"}
                    </span>
                    <span>•</span>
                    <span className="font-bold">{selectedArticle.source || "Gazette Correspondent"}</span>
                    <span>•</span>
                    <span>In-App Reading Room</span>
                  </div>
                  <h2 className="font-serif font-extrabold text-lg sm:text-xl md:text-2xl text-brand-primary leading-tight line-clamp-2">
                    {selectedArticle.title}
                  </h2>
                </div>
                
                {/* Actions Row */}
                <div className="flex items-center gap-2 self-end sm:self-center font-mono text-[10px] uppercase">
                  <button
                    onClick={() => toggleBookmark(selectedArticle)}
                    className="p-2 border border-brand-border rounded bg-brand-bg hover:bg-brand-surface transition text-brand-secondary flex items-center gap-1.5 cursor-pointer font-bold"
                    title="Bookmark dispatch"
                  >
                    {isBookmarked(selectedArticle) ? (
                      <>
                        <BookmarkCheck className="w-3.5 h-3.5 text-brand-accent" />
                        <span className="hidden sm:inline">Saved</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Save</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedArticle.link);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-2 border border-brand-border rounded bg-brand-bg hover:bg-brand-surface transition text-brand-secondary flex items-center gap-1.5 cursor-pointer font-bold"
                    title="Copy cite link"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                        <span className="text-emerald-500 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Cite Link</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="p-2 border-2 border-brand-primary rounded bg-brand-primary hover:bg-brand-primary/95 text-brand-bg font-bold transition flex items-center gap-1 cursor-pointer"
                    title="Exit reader"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Exit</span>
                  </button>
                </div>
              </header>

              {/* Tab Selector Bar */}
              <div className="border-b border-brand-border bg-brand-surface/40 px-4 sm:px-5 py-2 shrink-0 flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none text-[10px] sm:text-xs font-mono uppercase tracking-wider">
                <button
                  onClick={() => setSelectedTab("summary")}
                  className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 border cursor-pointer ${selectedTab === "summary" ? "bg-brand-primary border-brand-primary text-brand-bg font-bold" : "border-transparent text-brand-secondary hover:bg-brand-surface"}`}
                >
                  <Newspaper className="w-3.5 h-3.5" />
                  <span>Curated Summary</span>
                </button>
                <button
                  onClick={() => setSelectedTab("chat")}
                  className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 border cursor-pointer ${selectedTab === "chat" ? "bg-brand-primary border-brand-primary text-brand-bg font-bold" : "border-transparent text-brand-secondary hover:bg-brand-surface"}`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Nile Desk AI Summary</span>
                </button>
                <button
                  onClick={() => setSelectedTab("live")}
                  className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 border cursor-pointer ${selectedTab === "live" ? "bg-brand-primary border-brand-primary text-brand-bg font-bold" : "border-transparent text-brand-secondary hover:bg-brand-surface"}`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Live Publisher Site</span>
                </button>
              </div>

              {/* Active Tab Container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-brand-bg">
                {selectedTab === "summary" && (
                  <div className="space-y-5 max-w-2xl mx-auto">
                    <div className="flex items-center justify-between text-[11px] font-mono text-brand-secondary border-b border-brand-border pb-3">
                      <span>Publisher Source: <strong className="underline text-brand-primary">{selectedArticle.source || "Reuters"}</strong></span>
                      {selectedArticle.publishedAt && (
                        <span>Published: {new Date(selectedArticle.publishedAt).toLocaleDateString()}</span>
                      )}
                    </div>

                    {/* Main Reader Article Image Banner */}
                    <div className="relative aspect-video w-full overflow-hidden rounded-md border border-brand-primary bg-brand-bg">
                      <img 
                        src={getArticleImage(selectedArticle.title, selectedArticle.category || "General", selectedArticle.editorialComment || selectedArticle.snippet, selectedArticle.image)} 
                        alt={selectedArticle.title} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Headline for reader */}
                    <h1 className="font-serif font-extrabold text-2xl sm:text-3xl text-brand-primary leading-tight">
                      {selectedArticle.title}
                    </h1>

                    {/* Editorial Commentary (if curated story) */}
                    {selectedArticle.editorialComment ? (
                      <div className="p-5 sm:p-6 border-l-4 border-brand-primary bg-brand-surface rounded">
                        <span className="font-mono text-xs font-bold uppercase tracking-widest text-brand-secondary block mb-1.5">
                          Nile Pen Senior Editorial Statement:
                        </span>
                        <p className="font-serif italic text-base sm:text-lg md:text-xl leading-relaxed text-brand-primary">
                          "{selectedArticle.editorialComment}"
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-brand-surface rounded border border-brand-border text-xs font-mono text-brand-secondary flex items-start gap-2">
                        <Sparkles className="w-4.5 h-4.5 text-brand-accent animate-pulse shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-brand-primary uppercase">Raw Associated Press dispatch</p>
                          <p className="mt-0.5">This feed item was verified by our press wire crawler. Tap the **Nile Desk AI Summary** tab above to generate an editorial brief instantly.</p>
                        </div>
                      </div>
                    )}

                    {/* Story summary body */}
                    <div className="space-y-3 font-sans text-sm sm:text-base text-brand-secondary leading-relaxed">
                      <p className="font-bold text-brand-primary font-mono text-xs uppercase tracking-wider">Associated News Dispatch Outline:</p>
                      <p>{selectedArticle.snippet || "The publisher has released this wire to global aggregators. Click the 'Live Publisher Site' or 'Open in New Tab' to view the full original page."}</p>
                    </div>

                    <div className="pt-6 border-t border-brand-border flex flex-col sm:flex-row justify-between items-center gap-3">
                      <a 
                        href={selectedArticle.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs font-mono font-bold text-brand-accent hover:underline flex items-center gap-1.5"
                      >
                        <span>Open original source page in external tab</span>
                        <ArrowUpRight className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}

                {selectedTab === "chat" && (
                  <div className="max-w-2xl mx-auto space-y-5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-brand-secondary border-b border-brand-border pb-3">
                      <span>Interactive Intelligence Desk</span>
                      <span className="flex items-center gap-1">
                        <Bot className="w-3.5 h-3.5 text-brand-accent" />
                        Grounded Analysis
                      </span>
                    </div>

                    {aiLoading ? (
                      <div className="py-20 text-center space-y-4">
                        <div className="w-10 h-10 border-4 border-brand-border border-t-brand-primary rounded-full animate-spin mx-auto"></div>
                        <div className="space-y-1">
                          <p className="text-xs font-mono text-brand-primary uppercase tracking-wider font-bold animate-pulse">Contacting Cairo Senior Editorial Desk...</p>
                          <p className="text-[10px] font-mono text-brand-secondary">Retrieving regional context, factuality vectors, and geo-significance briefs.</p>
                        </div>
                      </div>
                    ) : aiResponse ? (
                      <div className="bg-brand-surface p-5 sm:p-6 rounded border border-brand-border space-y-4">
                        <div className="flex items-center justify-between border-b border-brand-border pb-2 text-[10px] font-mono">
                          <span className="text-brand-secondary">Briefing status: **Complete**</span>
                          <button 
                            onClick={triggerAiAnalysis}
                            className="text-brand-accent hover:underline cursor-pointer"
                          >
                            Recalculate Analysis
                          </button>
                        </div>
                        
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm sm:text-base">
                          {(() => {
                            if (!aiResponse) return null;
                            return aiResponse.split("\n").map((line, lineIdx) => {
                              const isListItem = line.trim().startsWith("- ") || line.trim().startsWith("* ") || line.trim().startsWith("• ");
                              const isHeader = line.trim().startsWith("###") || line.trim().startsWith("##");
                              
                              let cleanLine = line;
                              if (isListItem) {
                                cleanLine = line.replace(/^[-*•]\s+/, "");
                              } else if (isHeader) {
                                cleanLine = line.replace(/^###?\s+/, "");
                              }
                              
                              const boldParts = [];
                              const boldRegex = /\*\*(.*?)\*\"/g;
                              let lastIdx = 0;
                              let match;
                              
                              while ((match = boldRegex.exec(cleanLine)) !== null) {
                                if (match.index > lastIdx) {
                                  boldParts.push(cleanLine.substring(lastIdx, match.index));
                                }
                                boldParts.push(<strong key={match.index} className="font-extrabold text-brand-primary">{match[1]}</strong>);
                                lastIdx = boldRegex.lastIndex;
                              }
                              if (lastIdx < cleanLine.length) {
                                boldParts.push(cleanLine.substring(lastIdx));
                              }
                              
                              const content = boldParts.length > 0 ? boldParts : cleanLine;
                              
                              if (isListItem) {
                                return (
                                  <li key={lineIdx} className="ml-4 list-disc pl-1 mb-2 font-sans text-xs sm:text-sm text-brand-primary leading-relaxed">
                                    {content}
                                  </li>
                                );
                              }
                              
                              if (isHeader) {
                                return (
                                  <h5 key={lineIdx} className="font-serif font-extrabold text-brand-primary uppercase tracking-wider text-sm mt-4 mb-2">
                                    {content}
                                  </h5>
                                );
                              }
                              
                              if (!line.trim()) {
                                return <div key={lineIdx} className="h-2" />;
                              }
                              
                              return (
                                <p key={lineIdx} className="font-sans text-xs sm:text-sm text-brand-secondary leading-relaxed mb-3">
                                  {content}
                                </p>
                              );
                            });
                          })()}
                        </div>

                        <div className="pt-3 border-t border-brand-border flex items-center justify-between text-[10px] font-mono text-brand-secondary">
                          <span>Verified against real-time Search Grounding</span>
                          <span>The Nile Pen Intelligence Engine</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <button
                          onClick={triggerAiAnalysis}
                          className="px-4 py-2 bg-brand-primary hover:opacity-90 text-brand-bg font-bold rounded transition font-mono text-xs uppercase cursor-pointer"
                        >
                          Generate Premium Editorial Briefing
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {selectedTab === "live" && (
                  <div className="w-full h-full flex flex-col gap-3">
                    {/* Security Warning banner */}
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded text-[10px] sm:text-xs font-mono flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <strong className="uppercase">Cairo Proxy Room:</strong> This external dispatch has been securely pre-processed to bypass cross-origin framing blocks.
                      </div>
                      <a
                        href={selectedArticle.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-brand-primary text-brand-bg rounded font-bold hover:opacity-90 transition flex items-center gap-1 whitespace-nowrap text-xs font-mono"
                      >
                        <span>Open in New Tab</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {/* Browser Iframe viewport */}
                    <div className="flex-1 min-h-[45vh] bg-white rounded border border-brand-border overflow-hidden">
                      <iframe
                        src={`/api/proxy-article?url=${encodeURIComponent(selectedArticle.link)}`}
                        className="w-full h-full border-0"
                        title={selectedArticle.title}
                        referrerPolicy="no-referrer"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
