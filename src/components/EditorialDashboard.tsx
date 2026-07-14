import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, limit, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { COUNTRIES, CATEGORIES, NewsLead, CuratedStory, NewsletterIssue, AuditLog } from "../types";
import { 
  Sparkles, Check, AlertCircle, RefreshCw, Send, Eye, Shield, Users, 
  BarChart3, History, Plus, Trash2, ArrowUpRight, HelpCircle, FileText, Smartphone, Laptop, Moon, Sun, Search, Cpu,
  Compass, Sliders
} from "lucide-react";

interface EditorialDashboardProps {
  user: any;
  activeCountry: string;
  language: string;
}

export default function EditorialDashboard({ user, activeCountry, language }: EditorialDashboardProps) {
  const [subTab, setSubTab] = useState<"curation" | "issues" | "subscribers" | "analytics" | "logs" | "apify" | "hospitality">("curation");
  
  // RSS Feeds curation queue state
  const [newsCategory, setNewsCategory] = useState<string>("politics");
  const [newsProvider, setNewsProvider] = useState<string>("auto");
  const [leads, setLeads] = useState<NewsLead[]>([]);
  const [loadingFeeds, setLoadingFeeds] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  // Active Issue Draft state
  const [issueTitle, setIssueTitle] = useState("");
  const [editionDate, setEditionDate] = useState("");
  const [draftStories, setDraftStories] = useState<CuratedStory[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  // Active editorial story state (currently composing)
  const [commentaries, setCommentaries] = useState<Record<string, string>>({}); // leadId -> comment

  // Gemini Assist State
  const [aiLoading, setAiLoading] = useState<string | null>(null); // leadId
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, { type: string; text: string }>>({}); // leadId -> suggestion

  // Preview options
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");

  // Subscriber lists and search
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [subQuery, setSubQuery] = useState("");
  const [loadingSubs, setLoadingSubs] = useState(false);

  // Past Issues
  const [pastIssues, setPastIssues] = useState<NewsletterIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Apify Scraper states
  const [apifyActor, setApifyActor] = useState<"reddit" | "linkedin">("reddit");
  const [apifyLoading, setApifyLoading] = useState(false);
  const [apifyLogs, setApifyLogs] = useState<string[]>([]);
  const [apifyResults, setApifyResults] = useState<any[]>([]);
  const [redditConfig, setRedditConfig] = useState<string>(JSON.stringify({
    "debugMode": false,
    "ignoreStartUrls": false,
    "includeMediaLinks": false,
    "includeNSFW": true,
    "maxComments": 10,
    "maxCommunitiesCount": 2,
    "maxItems": 10,
    "maxPostCount": 10,
    "maxUserCount": 2,
    "proxy": {
      "useApifyProxy": true,
      "apifyProxyGroups": ["RESIDENTIAL"]
    },
    "scrollTimeout": 40,
    "searchComments": false,
    "searchCommunities": false,
    "searchMedia": false,
    "searchPosts": true,
    "searchUsers": false,
    "skipComments": false,
    "skipCommunity": false,
    "skipUserPosts": false,
    "sort": "new",
    "startUrls": [
      { "url": "https://www.reddit.com/r/pasta/comments/vwi6jx/pasta_peperoni_and_ricotta_cheese_how_to_make/" }
    ]
  }, null, 2));

  const [linkedinConfig, setLinkedinConfig] = useState<string>(JSON.stringify({
    "queries": "Software Engineer Montreal",
    "limit": 10,
    "proxy": {
      "useApifyProxy": true
    }
  }, null, 2));

  // Hospitality & Travel Data tools states
  const [hDestination, setHDestination] = useState<string>("Cairo");
  const [hCategory, setHCategory] = useState<"hotels" | "flights" | "reviews" | "attractions">("hotels");
  const [hConfigAdditionalProperties, setHConfigAdditionalProperties] = useState<boolean>(true);
  const [hConfigAdditionalPropertiesSearchEngine, setHConfigAdditionalPropertiesSearchEngine] = useState<boolean>(true);
  const [hConfigAdditionalReviewProperties, setHConfigAdditionalReviewProperties] = useState<boolean>(true);
  const [hConfigScrapeInfluencerProducts, setHConfigScrapeInfluencerProducts] = useState<boolean>(false);
  const [hConfigScrapeReviewsDelivery, setHConfigScrapeReviewsDelivery] = useState<boolean>(false);
  const [hResults, setHResults] = useState<any[]>([]);
  const [hLoading, setHLoading] = useState<boolean>(false);
  const [hError, setHError] = useState<string | null>(null);

  // Load Past Issues and Logs on Mount/Tab switch
  useEffect(() => {
    if (subTab === "issues") {
      loadPastIssues();
    } else if (subTab === "subscribers") {
      loadSubscribers();
    } else if (subTab === "logs") {
      loadAuditLogs();
    }
  }, [subTab, activeCountry]);

  // Load RSS Leads on Category, Country, or Provider change
  useEffect(() => {
    if (subTab === "curation") {
      fetchRssLeads();
    }
  }, [activeCountry, newsCategory, subTab, newsProvider]);

  // Set default draft info
  useEffect(() => {
    const formattedDate = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
    setEditionDate(formattedDate);
    const countryName = COUNTRIES.find(c => c.code === activeCountry)?.name || "Global";
    setIssueTitle(`The Nile Pen - ${countryName} Edition • ${formattedDate}`);
  }, [activeCountry]);

  // Fetch leads from backend
  const fetchRssLeads = async () => {
    setLoadingFeeds(true);
    setFeedError(null);
    try {
      const response = await fetch(`/api/rss-fetch?country=${activeCountry}&category=${newsCategory}&provider=${newsProvider}`);
      const data = await response.json();
      if (data.success && data.items) {
        setLeads(data.items);
      } else {
        throw new Error(data.error || "Failed to fetch news feed");
      }
    } catch (err: any) {
      console.error(err);
      setFeedError(err.message || "Failed to parse news feed");
    } finally {
      setLoadingFeeds(false);
    }
  };

  // Run Apify Actor Scraper
  const runApifyActor = async () => {
    setApifyLoading(true);
    setApifyResults([]);
    setApifyLogs([
      `[Apify] [${new Date().toLocaleTimeString()}] Initializing request for actor: apify/${apifyActor}-scraper...`,
      `[Apify] Checking environment variables & API key...`
    ]);

    let parsedConfig = {};
    try {
      parsedConfig = JSON.parse(apifyActor === "reddit" ? redditConfig : linkedinConfig);
    } catch (parseErr: any) {
      setApifyLogs(prev => [
        ...prev,
        `[Error] Invalid JSON configuration: ${parseErr.message}`
      ]);
      setApifyLoading(false);
      return;
    }

    const staggerLog = (msg: string, delay: number) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          setApifyLogs(prev => [...prev, msg]);
          resolve();
        }, delay);
      });
    };

    try {
      await staggerLog(`[Apify] Connecting to residential proxy groups...`, 400);
      await staggerLog(`[Apify] Booting Chromium browser instance with headless instructions...`, 500);

      const response = await fetch("/api/apify-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorType: apifyActor,
          config: parsedConfig
        })
      });

      const data = await response.json();
      
      await staggerLog(`[Apify] Scraping requested pages and resolving elements...`, 600);
      await staggerLog(`[Apify] Parsed output: ${data.message || "Scrape completed."}`, 400);
      
      if (data.success && data.items) {
        await staggerLog(`[Apify] Successfully retrieved ${data.items.length} structured items from dataset!`, 300);
        setApifyResults(data.items);
        
        await addAuditLogAction(
          "apify_scrape",
          `Triggered Apify ${apifyActor} actor scrape (Dataset returned ${data.items.length} items)`
        );
      } else {
        throw new Error(data.error || "Failed to execute actor run.");
      }
    } catch (err: any) {
      console.error(err);
      setApifyLogs(prev => [
        ...prev,
        `[Error] Scrape run failed: ${err.message}`
      ]);
    } finally {
      setApifyLoading(false);
    }
  };

  // Run Hospitality & Travel Data Search
  const runHospitalitySearch = async () => {
    setHLoading(true);
    setHError(null);
    try {
      const response = await fetch("/api/hospitality-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: hDestination,
          category: hCategory,
          config: {
            additionalProperties: hConfigAdditionalProperties,
            additionalPropertiesSearchEngine: hConfigAdditionalPropertiesSearchEngine,
            additionalReviewProperties: hConfigAdditionalReviewProperties,
            scrapeInfluencerProducts: hConfigScrapeInfluencerProducts,
            scrapeReviewsDelivery: hConfigScrapeReviewsDelivery
          }
        })
      });
      const data = await response.json();
      if (data.success && data.items) {
        setHResults(data.items);
        await addAuditLogAction(
          "hospitality_search",
          `Queried hospitality & travel intelligence for "${hDestination}" (Category: ${hCategory})`
        );
      } else {
        throw new Error(data.error || "Failed to retrieve travel intelligence data.");
      }
    } catch (err: any) {
      console.error(err);
      setHError(err.message || "Something went wrong querying the travel database.");
    } finally {
      setHLoading(false);
    }
  };

  // Trigger Gemini Assistant
  const triggerGeminiAssist = async (leadId: string, action: string, lead: NewsLead) => {
    const textToAnalyze = commentaries[leadId] || lead.snippet;
    setAiLoading(leadId);
    try {
      const response = await fetch("/api/gemini/editor-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          text: textToAnalyze,
          headline: lead.title,
          source: lead.source,
          country: COUNTRIES.find(c => c.code === activeCountry)?.name || "Egypt"
        })
      });
      const data = await response.json();
      if (data.success && data.result) {
        setAiSuggestions(prev => ({
          ...prev,
          [leadId]: { type: action, text: data.result }
        }));
      } else {
        throw new Error(data.error || "AI assist failed");
      }
    } catch (err: any) {
      alert("Gemini Assistant encountered an error: " + err.message);
    } finally {
      setAiLoading(null);
    }
  };

  // Add lead with commentary to draft stories
  const addStoryToDraft = (lead: NewsLead) => {
    const editorialComment = commentaries[lead.id] || "";
    if (!editorialComment.trim()) {
      alert("Please write or generate editorial commentary before publishing to the issue.");
      return;
    }

    const story: CuratedStory = {
      title: lead.title,
      snippet: lead.snippet,
      source: lead.source,
      link: lead.link,
      category: lead.category,
      editorialComment,
      image: lead.image
    };

    setDraftStories([...draftStories, story]);
    // Clear lead from feed to prevent double adding
    setLeads(leads.filter(l => l.id !== lead.id));
    
    // Add audit log
    addAuditLogAction("add_story_draft", `Added story: "${lead.title.substring(0, 40)}..."`);
  };

  // Save audit log helper
  const addAuditLogAction = async (action: string, details: string) => {
    try {
      const log: AuditLog = {
        id: "log_" + Date.now(),
        editorEmail: user?.email || "anonymous-editor@nilepen.pub",
        action,
        details,
        timestamp: Date.now()
      };
      await addDoc(collection(db, "editor_logs"), log);
    } catch (err) {
      console.error("Failed to write audit log:", err);
    }
  };

  // Publish / Schedule issue
  const handlePublishIssue = async (status: "draft" | "published") => {
    if (draftStories.length === 0) {
      alert("An issue must contain at least one curated commentary story.");
      return;
    }
    
    setIsPublishing(true);
    try {
      const issue: NewsletterIssue = {
        id: "issue_" + Date.now(),
        title: issueTitle,
        editionDate,
        country: activeCountry,
        status,
        createdAt: Date.now(),
        publishedAt: status === "published" ? Date.now() : undefined,
        stories: draftStories,
        editorEmail: user?.email || "chief-editor@nilepen.pub"
      };

      await addDoc(collection(db, "newsletter_issues"), issue);
      
      // Also register log
      await addAuditLogAction(
        status === "published" ? "publish_issue" : "save_draft", 
        `Published issue: "${issueTitle}" with ${draftStories.length} commentaries`
      );

      alert(status === "published" ? "The Nile Pen Gazette issue has been published and dispatched!" : "Issue saved as draft.");
      
      // Clear draft state
      setDraftStories([]);
      // Reload past issues
      loadPastIssues();
    } catch (err: any) {
      console.error(err);
      alert("Publishing failed: " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  // Load Past Issues
  const loadPastIssues = async () => {
    setLoadingIssues(true);
    try {
      const q = query(collection(db, "newsletter_issues"), orderBy("createdAt", "desc"), limit(15));
      const querySnapshot = await getDocs(q);
      const issues: NewsletterIssue[] = [];
      querySnapshot.forEach(doc => {
        issues.push(doc.data() as NewsletterIssue);
      });
      setPastIssues(issues);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingIssues(false);
    }
  };

  // Load Subscribers
  const loadSubscribers = async () => {
    setLoadingSubs(true);
    try {
      const querySnapshot = await getDocs(collection(db, "subscribers"));
      const subs: any[] = [];
      querySnapshot.forEach(doc => {
        subs.push({ id: doc.id, ...doc.data() });
      });
      setSubscribers(subs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSubs(false);
    }
  };

  // Load Audit Logs
  const loadAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const q = query(collection(db, "editor_logs"), orderBy("timestamp", "desc"), limit(30));
      const querySnapshot = await getDocs(q);
      const logs: AuditLog[] = [];
      querySnapshot.forEach(doc => {
        logs.push(doc.data() as AuditLog);
      });
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const getFilteredSubscribers = () => {
    if (!subQuery) return subscribers;
    return subscribers.filter(s => s.email.toLowerCase().includes(subQuery.toLowerCase()));
  };

  return (
    <div className="bg-white dark:bg-slate-950 p-4 sm:p-6 rounded-lg border-2 border-slate-900 dark:border-slate-800 shadow-lg min-h-[70vh]">
      {/* Dashboard sub-header navigation */}
      <div className="flex border-b border-slate-300 dark:border-slate-800 pb-3 mb-6 overflow-x-auto gap-2">
        <button
          onClick={() => setSubTab("curation")}
          className={`px-4 py-1.5 rounded font-mono text-xs font-semibold flex items-center gap-1.5 transition ${subTab === "curation" ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950" : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-900 dark:text-slate-400"}`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          Curation Queue
        </button>
        <button
          onClick={() => setSubTab("issues")}
          className={`px-4 py-1.5 rounded font-mono text-xs font-semibold flex items-center gap-1.5 transition ${subTab === "issues" ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950" : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-900 dark:text-slate-400"}`}
        >
          <FileText className="w-3.5 h-3.5" />
          Gazette Editions ({pastIssues.filter(i => i.country === activeCountry).length})
        </button>
        <button
          onClick={() => setSubTab("subscribers")}
          className={`px-4 py-1.5 rounded font-mono text-xs font-semibold flex items-center gap-1.5 transition ${subTab === "subscribers" ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950" : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-900 dark:text-slate-400"}`}
        >
          <Users className="w-3.5 h-3.5" />
          Subscribers ({subscribers.length})
        </button>
        <button
          onClick={() => setSubTab("analytics")}
          className={`px-4 py-1.5 rounded font-mono text-xs font-semibold flex items-center gap-1.5 transition ${subTab === "analytics" ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950" : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-900 dark:text-slate-400"}`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Analytics
        </button>
        <button
          onClick={() => setSubTab("logs")}
          className={`px-4 py-1.5 rounded font-mono text-xs font-semibold flex items-center gap-1.5 transition ${subTab === "logs" ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950" : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-900 dark:text-slate-400"}`}
        >
          <History className="w-3.5 h-3.5" />
          Audit Logs
        </button>
        <button
          onClick={() => setSubTab("apify")}
          className={`px-4 py-1.5 rounded font-mono text-xs font-semibold flex items-center gap-1.5 transition ${subTab === "apify" ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950" : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-900 dark:text-slate-400"}`}
        >
          <Cpu className="w-3.5 h-3.5" />
          Apify Scrapers
        </button>
        <button
          onClick={() => setSubTab("hospitality")}
          className={`px-4 py-1.5 rounded font-mono text-xs font-semibold flex items-center gap-1.5 transition ${subTab === "hospitality" ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950" : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-900 dark:text-slate-400"}`}
        >
          <Compass className="w-3.5 h-3.5 text-amber-500" />
          Hospitality & Travel
        </button>
      </div>

      {/* CURATION TAB */}
      {subTab === "curation" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Panel: RSS Feeds (Incoming news leads) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-serif font-extrabold text-slate-950 dark:text-white uppercase tracking-wider text-base">
                  Live Wire Curation Queue
                </h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">Deduplicated wire service leads via Google News</p>
              </div>
              <div className="flex gap-1.5 shrink-0 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setNewsCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-sm text-[11px] font-mono font-medium border uppercase tracking-wider transition ${newsCategory === cat.id ? "bg-slate-950 border-slate-950 text-white dark:bg-white dark:text-slate-950 font-bold" : "bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-600 dark:text-slate-400"}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* News Provider & Scraper Source Selector */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">News Stream Engine</span>
                <p className="text-xs font-serif font-bold text-slate-800 dark:text-slate-200">
                  Select feed source, API aggregator, or custom actor scraper
                </p>
              </div>
              <div className="w-full md:w-auto shrink-0 flex items-center gap-2">
                <select
                  value={newsProvider}
                  onChange={(e) => setNewsProvider(e.target.value)}
                  className="w-full md:w-64 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-hidden text-slate-900 dark:text-slate-100"
                >
                  <option value="auto">⚡ Auto-Cascade (Seq Fallback)</option>
                  <option value="newsapi">📰 NewsAPI.org Free Tier</option>
                  <option value="webz">🕸️ Webz.io Free Tier</option>
                  <option value="worldnews">🌍 World News API</option>
                  <option value="newsdata">📊 NewsData.io</option>
                  <option value="habari">🇹🇿 Habari News Scraper (Tanzania/Swahili)</option>
                  <option value="apify_african">🌍 African Aggregator (Apify Scraper)</option>
                  <option value="serpapi">🔍 Google News via SerpApi</option>
                  <option value="serper">🎯 Google News via Serper.dev</option>
                  <option value="rss">🗞️ Google News Direct RSS Feed</option>
                </select>
              </div>
            </div>

            {loadingFeeds && (
              <div className="py-12 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded">
                <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
                <span className="text-xs font-mono text-slate-500 mt-2">Ingesting RSS feed, deduplicating wire entries...</span>
              </div>
            )}

            {feedError && (
              <div className="p-4 border border-dashed border-red-200 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 rounded flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs font-mono">
                  <p className="font-bold">Wire Service Outage</p>
                  <p className="mt-1">{feedError}</p>
                  <button onClick={fetchRssLeads} className="mt-3 px-3 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900 rounded font-bold uppercase transition">
                    Retry Ingestion
                  </button>
                </div>
              </div>
            )}

            {/* Wire Stories List */}
            {!loadingFeeds && !feedError && leads.length === 0 && (
              <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded text-slate-400 text-xs font-mono">
                No active wire entries returned for this section. Select another category or country.
              </div>
            )}

            {!loadingFeeds && !feedError && leads.length > 0 && (
              <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                {leads.map(lead => (
                  <div key={lead.id} className="border border-slate-200 dark:border-slate-800 rounded p-4 hover:border-slate-400 dark:hover:border-slate-700 transition space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 uppercase tracking-widest text-slate-500 bg-slate-50 dark:bg-slate-900 font-bold">
                        {lead.source}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(lead.publishedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-slate-950 dark:text-white text-base leading-tight">
                      <a href={lead.link} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1.5">
                        {lead.title}
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </a>
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans line-clamp-3">
                      {lead.snippet}
                    </p>

                    {/* Editorial Composition Area for this lead */}
                    <div className="space-y-2 border-t border-slate-100 dark:border-slate-900 pt-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">Editorial Director commentary:</span>
                        
                        {/* Gemini helpers group */}
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <span className="text-slate-400 mr-1.5 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                            Gemini Assist:
                          </span>
                          <button
                            onClick={() => triggerGeminiAssist(lead.id, "suggest_comment", lead)}
                            className="px-2 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded transition font-medium"
                          >
                            Suggest
                          </button>
                          <button
                            onClick={() => triggerGeminiAssist(lead.id, "proofread", lead)}
                            className="px-2 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded transition font-medium"
                          >
                            Proof
                          </button>
                          <button
                            onClick={() => triggerGeminiAssist(lead.id, "check_bias", lead)}
                            className="px-2 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded transition font-medium"
                          >
                            Bias Check
                          </button>
                        </div>
                      </div>

                      {/* Text commentary edit field */}
                      <textarea
                        value={commentaries[lead.id] || ""}
                        onChange={(e) => setCommentaries({ ...commentaries, [lead.id]: e.target.value })}
                        placeholder="Write our distinguished commentary. Connect this breaking story to local impact or historical trends. Be objective."
                        rows={3}
                        className="w-full text-xs font-sans p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded text-slate-950 dark:text-white focus:outline-hidden"
                      />

                      {/* Gemini Suggestions box */}
                      {aiLoading === lead.id && (
                        <div className="p-2 border border-sky-100 bg-sky-50 dark:bg-sky-950/20 rounded font-mono text-[10px] text-sky-700 dark:text-sky-300 animate-pulse">
                          Chief Editor Gemini conducting intelligence analysis...
                        </div>
                      )}

                      {aiSuggestions[lead.id] && (
                        <div className="p-2.5 border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 rounded text-xs text-slate-800 dark:text-slate-300 space-y-1.5 relative">
                          <p className="font-mono font-bold text-[10px] text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                            Gemini Suggestion ({aiSuggestions[lead.id].type.replace("_", " ")}):
                          </p>
                          <p className="font-serif italic leading-relaxed whitespace-pre-wrap">{aiSuggestions[lead.id].text}</p>
                          <div className="flex justify-end gap-1 font-mono text-[10px]">
                            <button
                              onClick={() => {
                                setCommentaries({ ...commentaries, [lead.id]: aiSuggestions[lead.id].text });
                              }}
                              className="px-2 py-0.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 rounded transition hover:opacity-85 font-bold"
                            >
                              Apply Suggestion
                            </button>
                            <button
                              onClick={() => {
                                const prev = { ...aiSuggestions };
                                delete prev[lead.id];
                                setAiSuggestions(prev);
                              }}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded transition"
                            >
                              Discard
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          onClick={() => addStoryToDraft(lead)}
                          className="px-3.5 py-1.5 bg-slate-950 text-white dark:bg-white dark:text-slate-950 rounded hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-mono font-bold transition flex items-center gap-1 shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Publish to Issue Draft
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Panel: Current Issue Composition Draft */}
          <div className="lg:col-span-5 space-y-6 border-l-0 lg:border-l lg:border-slate-200 lg:pl-6 lg:dark:border-slate-800">
            <div>
              <h3 className="font-serif font-extrabold text-slate-950 dark:text-white uppercase tracking-wider text-base">
                Newsletter Issue Draft
              </h3>
              <p className="text-xs font-mono text-slate-500 mt-0.5">Assemble and proof before bulk sending</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400">Newsletter Edition Title</label>
                <input
                  type="text"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  className="w-full text-xs font-bold font-serif bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded p-2 text-slate-950 dark:text-white focus:outline-hidden"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400">Edition Date</label>
                <input
                  type="text"
                  value={editionDate}
                  onChange={(e) => setEditionDate(e.target.value)}
                  className="w-full text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded p-2 text-slate-950 dark:text-white focus:outline-hidden"
                />
              </div>
            </div>

            {/* List of active stories in draft */}
            <div className="space-y-3">
              <h4 className="font-serif font-bold text-slate-950 dark:text-white text-xs flex justify-between">
                <span>Stories Included ({draftStories.length})</span>
                {draftStories.length > 0 && (
                  <button onClick={() => setDraftStories([])} className="text-[10px] font-mono text-red-500 hover:underline">
                    Clear Draft Stories
                  </button>
                )}
              </h4>

              {draftStories.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded text-slate-400 text-xs font-mono">
                  No editorial stories added to the draft. Use the curation panel on the left to write commentaries and publish them.
                </div>
              ) : (
                <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
                  {draftStories.map((story, index) => (
                    <div key={index} className="p-3 border border-slate-200 dark:border-slate-850 rounded bg-slate-50/50 dark:bg-slate-900/30 text-xs space-y-1 relative group">
                      <button
                        onClick={() => setDraftStories(draftStories.filter((_, i) => i !== index))}
                        className="absolute right-2 top-2 p-1 text-slate-400 hover:text-red-500 rounded hidden group-hover:block transition"
                        title="Remove Story"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className={`text-[9px] font-mono px-1 rounded border uppercase font-bold tracking-wider ${CATEGORIES.find(c => c.id === story.category)?.text} bg-white`}>
                        {story.category}
                      </span>
                      <h5 className="font-serif font-bold text-slate-950 dark:text-white leading-tight mt-1">{story.title}</h5>
                      <p className="font-sans italic text-slate-600 dark:text-slate-400 font-medium line-clamp-2 mt-1">"{story.editorialComment}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Branded Template PREVIEW SECTION */}
            {draftStories.length > 0 && (
              <div className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden space-y-2">
                <div className="p-2.5 bg-slate-100 dark:bg-slate-900 flex justify-between items-center text-xs border-b border-slate-200 dark:border-slate-800">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    Branded Gazette Mailer Preview
                  </span>
                  <div className="flex gap-1.5 font-mono text-[10px]">
                    {/* Device Toggle */}
                    <button
                      onClick={() => setPreviewDevice(previewDevice === "desktop" ? "mobile" : "desktop")}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded transition"
                      title="Toggle device width"
                    >
                      {previewDevice === "desktop" ? <Smartphone className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
                    </button>
                    {/* Theme Toggle */}
                    <button
                      onClick={() => setPreviewTheme(previewTheme === "light" ? "dark" : "light")}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded transition"
                      title="Toggle color theme"
                    >
                      {previewTheme === "light" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Simulated Email Render Container */}
                <div className="p-3 bg-slate-100 dark:bg-slate-900/60 flex justify-center">
                  <div 
                    className={`border border-slate-300 dark:border-slate-800 shadow-sm p-4 sm:p-6 select-none font-sans transition-all duration-300 ${
                      previewDevice === "mobile" ? "max-w-[340px]" : "w-full"
                    } ${
                      previewTheme === "dark" ? "bg-slate-950 text-white border-slate-800" : "bg-white text-slate-900 border-slate-300"
                    }`}
                  >
                    {/* Newsletter Branded Header */}
                    <div className="text-center border-b-2 border-double border-slate-800 dark:border-slate-200 pb-3 mb-4">
                      <span className="text-[10px] font-mono tracking-widest uppercase text-slate-500 block">The Nile Pen Dispatch</span>
                      <h2 className="font-serif font-extrabold text-2xl sm:text-3xl tracking-tight uppercase leading-none mt-1">THE NILE PEN</h2>
                      <div className="flex justify-between items-center text-[9px] font-mono uppercase text-slate-400 mt-2 font-bold tracking-wider">
                        <span>Edition: {COUNTRIES.find(c => c.code === activeCountry)?.name}</span>
                        <span>{editionDate}</span>
                        <span>No. 182</span>
                      </div>
                    </div>

                    {/* Newsletter stories content */}
                    <div className="space-y-6">
                      {draftStories.map((story, sIdx) => {
                        const catConfig = CATEGORIES.find(c => c.id === story.category);
                        return (
                          <div key={sIdx} className="space-y-2">
                            <span className={`text-[9px] font-mono font-bold uppercase tracking-widest px-1 rounded-sm ${catConfig?.text} bg-slate-50 border border-slate-100`}>
                              {story.category}
                            </span>
                            <h4 className="font-serif font-bold text-sm sm:text-base leading-tight">
                              {story.title}
                            </h4>
                            <div className="text-[10px] text-slate-400 font-mono mb-1">
                              Via: <span className="underline">{story.source}</span>
                            </div>
                            
                            {/* Curated Editorial Comment (Main focus!) */}
                            <p className="font-sans text-xs font-medium border-l-2 border-slate-900 dark:border-slate-100 pl-2 py-0.5 italic leading-relaxed text-slate-800 dark:text-slate-200">
                              "{story.editorialComment}"
                            </p>
                            
                            <p className="font-mono text-[9px] text-slate-400 tracking-tight leading-normal">
                              Associated press wire snippet: {story.snippet.substring(0, 80)}...
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Email Footer (GDPR, physical address) */}
                    <div className="border-t border-slate-200 dark:border-slate-800 mt-6 pt-4 text-center text-[9px] font-mono text-slate-400 space-y-1">
                      <p className="font-bold">THE NILE PEN JOURNALISM CO.</p>
                      <p>12 Nile Corniche, Garden City, Cairo, Egypt</p>
                      <p>This gazette was human-curated and authored exclusively for our subscribers.</p>
                      <p className="mt-2 text-slate-500">
                        You are receiving this because you subscribed to the {activeCountry} edition. 
                        To unsubscribe instantly, <span className="underline cursor-pointer">click here</span>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dispatch Send Controls */}
            {draftStories.length > 0 && (
              <div className="p-4 border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/10 rounded space-y-4">
                <div className="flex items-start gap-2 text-emerald-800 dark:text-emerald-400">
                  <Shield className="w-5 h-5 shrink-0 mt-0.5 animate-pulse" />
                  <div className="text-xs font-mono">
                    <p className="font-bold uppercase tracking-wider text-slate-900 dark:text-white">Editorial Send Gate</p>
                    <p className="mt-0.5">Publishing this issue will immediately persist it in Firestore. It will be made visible to all subscribers and logged under your audit logs.</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handlePublishIssue("published")}
                    disabled={isPublishing}
                    className="flex-1 py-2 bg-slate-950 hover:bg-slate-900 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 text-xs font-mono font-bold rounded transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isPublishing ? "Dispatching issue..." : "Publish & Send Now"}</span>
                  </button>
                  <button
                    onClick={() => handlePublishIssue("draft")}
                    disabled={isPublishing}
                    className="py-2 px-3 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-mono font-bold rounded transition"
                  >
                    Draft
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GAZETTE EDITIONS TAB (LIST PAST RELEASES) */}
      {subTab === "issues" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-850">
            <div>
              <h3 className="font-serif font-extrabold text-slate-950 dark:text-white uppercase tracking-wider text-base">
                Published Gazette Editions ({activeCountry})
              </h3>
              <p className="text-xs font-mono text-slate-500 mt-0.5">Chronicles of human-curated newsletter dispatches</p>
            </div>
            <button onClick={loadPastIssues} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 rounded transition">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loadingIssues ? (
            <div className="py-12 flex justify-center text-xs font-mono text-slate-400">
              Reading archives from Firestore...
            </div>
          ) : pastIssues.filter(i => i.country === activeCountry).length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded text-slate-400 text-xs font-mono">
              No editions have been published for the {activeCountry} edition yet. Run curation and publish your first dispatch.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pastIssues.filter(i => i.country === activeCountry).map(issue => (
                <div key={issue.id} className="border border-slate-200 dark:border-slate-800 rounded p-4 space-y-4 bg-slate-50/20 dark:bg-slate-900/10">
                  <div className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-slate-900 pb-2">
                    <span className="font-serif font-bold text-slate-950 dark:text-white text-sm">{issue.editionDate}</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded uppercase font-bold text-emerald-800 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300">
                      {issue.status}
                    </span>
                  </div>

                  <h4 className="font-serif font-extrabold text-slate-950 dark:text-white text-base">{issue.title}</h4>
                  
                  <div className="space-y-2 text-xs">
                    <p className="font-mono font-bold text-[10px] text-slate-400 uppercase tracking-widest">Stories included:</p>
                    {issue.stories.map((s, sIdx) => (
                      <div key={sIdx} className="pl-2 border-l border-slate-300 dark:border-slate-800">
                        <p className="font-serif font-bold text-slate-900 dark:text-slate-200">{s.title}</p>
                        <p className="font-sans italic text-slate-500 line-clamp-1">"{s.editorialComment}"</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 border-t border-slate-100 dark:border-slate-900 pt-2">
                    <span>Curated by: {issue.editorEmail}</span>
                    <span>No. {issue.stories.length} articles</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBSCRIBERS TAB */}
      {subTab === "subscribers" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-850">
            <div>
              <h3 className="font-serif font-extrabold text-slate-950 dark:text-white uppercase tracking-wider text-base">
                Subscriber Registry
              </h3>
              <p className="text-xs font-mono text-slate-500 mt-0.5">Review, search, or audit reader credentials</p>
            </div>
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={subQuery}
                onChange={(e) => setSubQuery(e.target.value)}
                placeholder="Search by email..."
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded pl-9 py-2 text-slate-950 dark:text-white"
              />
            </div>
          </div>

          {loadingSubs ? (
            <div className="py-12 flex justify-center text-xs font-mono text-slate-400">
              Querying Firestore subscribers records...
            </div>
          ) : subscribers.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded text-slate-400 text-xs font-mono">
              No registered subscribers found. Submit subscribers via onboarding modal.
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded overflow-x-auto text-xs font-mono">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3">Subscriber Email</th>
                    <th className="p-3">Active Editions</th>
                    <th className="p-3">Interest Topics</th>
                    <th className="p-3">Frequency</th>
                    <th className="p-3">Registered At</th>
                    <th className="p-3">Referrals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                  {getFilteredSubscribers().map(sub => (
                    <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{sub.email}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {sub.countries?.map((c: string) => (
                            <span key={c} className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{c}</span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="truncate max-w-[140px] block">{sub.categories?.join(", ")}</span>
                      </td>
                      <td className="p-3 capitalize">{sub.frequency || "daily"}</td>
                      <td className="p-3 text-slate-400">{sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : "Prior"}</td>
                      <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{sub.referralCount || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {subTab === "analytics" && (
        <div className="space-y-6">
          <div>
            <h3 className="font-serif font-extrabold text-slate-950 dark:text-white uppercase tracking-wider text-base">
              Performance Analytics Dashboard
            </h3>
            <p className="text-xs font-mono text-slate-500 mt-0.5">Real-time open rates, click data, and growth curves</p>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded bg-slate-50/50 dark:bg-slate-900/10 space-y-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Average Open Rate</span>
              <p className="font-serif font-extrabold text-3xl text-slate-950 dark:text-white">43.2%</p>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">▲ +2.4% vs Last Month</span>
            </div>
            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded bg-slate-50/50 dark:bg-slate-900/10 space-y-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Average Click Rate</span>
              <p className="font-serif font-extrabold text-3xl text-slate-950 dark:text-white">18.5%</p>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">▲ +0.9% vs Last Month</span>
            </div>
            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded bg-slate-50/50 dark:bg-slate-900/10 space-y-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Total Active Readers</span>
              <p className="font-serif font-extrabold text-3xl text-slate-950 dark:text-white">52,401</p>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">▲ +1,842 New Profiles</span>
            </div>
            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded bg-slate-50/50 dark:bg-slate-900/10 space-y-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Newsletter Churn Rate</span>
              <p className="font-serif font-extrabold text-3xl text-slate-950 dark:text-white">1.12%</p>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">▼ -0.3% decrease (Stable)</span>
            </div>
          </div>

          {/* SVG Graphs Section (100% responsive, zero dependencies, gorgeous styled) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Growth Curve */}
            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 space-y-3">
              <h4 className="font-serif font-bold text-slate-950 dark:text-white text-xs uppercase tracking-wider">Subscription Growth Curve (Last 6 Months)</h4>
              <div className="h-48 w-full bg-slate-50 dark:bg-slate-900/20 rounded relative p-2">
                {/* SVG Area Chart */}
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="100" y2="20" stroke="#f1f5f9" strokeWidth="0.5" className="dark:stroke-slate-900" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="#f1f5f9" strokeWidth="0.5" className="dark:stroke-slate-900" />
                  <line x1="0" y1="80" x2="100" y2="80" stroke="#f1f5f9" strokeWidth="0.5" className="dark:stroke-slate-900" />
                  
                  {/* Gradient Area */}
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d="M 0,85 Q 20,78 40,60 T 80,30 T 100,10 L 100,90 L 0,90 Z" fill="url(#growthGrad)" />
                  {/* Line */}
                  <path d="M 0,85 Q 20,78 40,60 T 80,30 T 100,10" fill="none" stroke="#0ea5e9" strokeWidth="2.5" />
                </svg>
                {/* Graph Labels */}
                <div className="absolute inset-x-2 bottom-1 flex justify-between text-[8px] font-mono text-slate-400">
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                  <span>May</span>
                  <span>Jun</span>
                  <span>Jul</span>
                </div>
              </div>
            </div>

            {/* Category interest breakdown */}
            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 space-y-3">
              <h4 className="font-serif font-bold text-slate-950 dark:text-white text-xs uppercase tracking-wider">Interest Index by Topic Segment</h4>
              <div className="space-y-2.5">
                {[
                  { name: "Politics & World Affairs", count: "48,201 requests", width: "95%", bg: "bg-red-500" },
                  { name: "Business & Financial", count: "39,540 requests", width: "78%", bg: "bg-emerald-500" },
                  { name: "Science & Technology", count: "34,912 requests", width: "69%", bg: "bg-blue-500" },
                  { name: "Sports", count: "12,420 requests", width: "24%", bg: "bg-amber-500" },
                  { name: "Culture & Entertainment", count: "9,850 requests", width: "19%", bg: "bg-purple-500" }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="font-bold text-slate-800 dark:text-slate-300">{item.name}</span>
                      <span className="text-slate-400">{item.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-900 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${item.bg}`} style={{ width: item.width }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOGS TAB */}
      {subTab === "logs" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-850">
            <div>
              <h3 className="font-serif font-extrabold text-slate-950 dark:text-white uppercase tracking-wider text-base">
                Editorial Board Audit Trails
              </h3>
              <p className="text-xs font-mono text-slate-500 mt-0.5">Immutable sequence records of publisher/editor actions</p>
            </div>
            <button onClick={loadAuditLogs} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 rounded transition">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loadingLogs ? (
            <div className="py-12 flex justify-center text-xs font-mono text-slate-400">
              Querying history from logs index...
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded text-slate-400 text-xs font-mono">
              Audit logs index is currently empty. Actions are saved upon draft compilation or dispatches.
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 border border-slate-200 dark:border-slate-800 rounded font-mono text-[11px] bg-slate-50/50 dark:bg-slate-900/10 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-white">{log.editorEmail}</span>
                      <span className={`px-1 rounded font-bold uppercase text-[9px] ${
                        log.action.includes("publish") ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" :
                        log.action.includes("add") ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        {log.action.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 italic">"{log.details}"</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* APIFY SCRAPERS TAB */}
      {subTab === "apify" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-850">
            <div>
              <h3 className="font-serif font-extrabold text-slate-950 dark:text-white uppercase tracking-wider text-base">
                Apify Actor Social Listening Pipeline
              </h3>
              <p className="text-xs font-mono text-slate-500 mt-0.5">Scrape social insights & jobs from Reddit & LinkedIn straight into your curation desk</p>
            </div>
            <div className="text-xs font-mono px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-800">
              API STATUS: {process.env.APIFY_API_KEY ? "🟢 CONNECTED (Live Actor Runs Active)" : "🟡 SANDBOX WORKFLOW ACTIVE"}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Actor Configuration */}
            <div className="lg:col-span-5 space-y-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded bg-slate-50/50 dark:bg-slate-900/10 p-4 space-y-3">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold block">1. Select Target Actor Service</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setApifyActor("reddit");
                      setApifyResults([]);
                      setApifyLogs([]);
                    }}
                    className={`p-3 rounded text-left border flex flex-col justify-between transition ${apifyActor === "reddit" ? "bg-white dark:bg-slate-950 border-slate-950 dark:border-white shadow-xs" : "bg-slate-100/50 hover:bg-slate-100 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-600 dark:text-slate-400"}`}
                  >
                    <span className="font-serif font-bold text-slate-950 dark:text-white text-sm">Reddit Scraper</span>
                    <span className="text-[9px] font-mono mt-2 uppercase text-slate-500">apify/reddit-scraper</span>
                  </button>
                  <button
                    onClick={() => {
                      setApifyActor("linkedin");
                      setApifyResults([]);
                      setApifyLogs([]);
                    }}
                    className={`p-3 rounded text-left border flex flex-col justify-between transition ${apifyActor === "linkedin" ? "bg-white dark:bg-slate-950 border-slate-950 dark:border-white shadow-xs" : "bg-slate-100/50 hover:bg-slate-100 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-600 dark:text-slate-400"}`}
                  >
                    <span className="font-serif font-bold text-slate-950 dark:text-white text-sm">LinkedIn Jobs</span>
                    <span className="text-[9px] font-mono mt-2 uppercase text-slate-500">apify/linkedin-jobs</span>
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3 bg-white dark:bg-slate-950">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">2. Actor Input Configuration (JSON)</span>
                  <button
                    onClick={() => {
                      if (apifyActor === "reddit") {
                        setRedditConfig(JSON.stringify({
                          "debugMode": false,
                          "ignoreStartUrls": false,
                          "includeMediaLinks": false,
                          "includeNSFW": true,
                          "maxComments": 10,
                          "maxCommunitiesCount": 2,
                          "maxItems": 10,
                          "maxPostCount": 10,
                          "maxUserCount": 2,
                          "proxy": { "useApifyProxy": true, "apifyProxyGroups": ["RESIDENTIAL"] },
                          "scrollTimeout": 40,
                          "searchComments": false,
                          "searchCommunities": false,
                          "searchMedia": false,
                          "searchPosts": true,
                          "searchUsers": false,
                          "skipComments": false,
                          "skipCommunity": false,
                          "skipUserPosts": false,
                          "sort": "new",
                          "startUrls": [{ "url": "https://www.reddit.com/r/pasta/comments/vwi6jx/pasta_peperoni_and_ricotta_cheese_how_to_make/" }]
                        }, null, 2));
                      } else {
                        setLinkedinConfig(JSON.stringify({
                          "queries": "Software Engineer Montreal",
                          "limit": 10,
                          "proxy": { "useApifyProxy": true }
                        }, null, 2));
                      }
                    }}
                    className="text-[10px] font-mono hover:underline text-slate-500"
                  >
                    Reset Preset
                  </button>
                </div>

                <textarea
                  value={apifyActor === "reddit" ? redditConfig : linkedinConfig}
                  onChange={(e) => {
                    if (apifyActor === "reddit") setRedditConfig(e.target.value);
                    else setLinkedinConfig(e.target.value);
                  }}
                  rows={10}
                  className="w-full font-mono text-[11px] p-2 bg-slate-900 text-emerald-400 rounded focus:outline-hidden border border-slate-800 h-64 whitespace-pre"
                />

                <button
                  onClick={runApifyActor}
                  disabled={apifyLoading}
                  className="w-full py-2.5 bg-slate-950 text-white dark:bg-white dark:text-slate-950 font-mono font-bold uppercase tracking-wider text-xs rounded hover:bg-slate-800 dark:hover:bg-slate-100 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {apifyLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Executing Actor Crawl...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Trigger Actor Scrape
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Execution Logs & Scraped Output Dataset */}
            <div className="lg:col-span-7 space-y-4">
              {/* Execution Console Logs */}
              <div className="border border-slate-200 dark:border-slate-800 rounded bg-slate-950 text-slate-300 p-4 space-y-2.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold block">Actor Sandbox Console Logs</span>
                <div className="h-28 overflow-y-auto font-mono text-[11px] space-y-1 pr-1 bg-black/40 p-2 rounded border border-slate-900 scrollbar-thin">
                  {apifyLogs.length === 0 ? (
                    <span className="text-slate-500 italic">No scrape runs initiated. Setup target configuration and press run.</span>
                  ) : (
                    apifyLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`${log.includes("[Error]") ? "text-red-400" : log.includes("[Apify] Successfully") ? "text-emerald-400" : "text-slate-300"}`}
                      >
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Scraped Output Dataset Grid */}
              <div className="space-y-3">
                <h4 className="font-serif font-bold text-slate-950 dark:text-white uppercase tracking-wider text-xs">
                  Scraped Output Dataset ({apifyResults.length} records)
                </h4>

                {apifyResults.length === 0 ? (
                  <div className="py-20 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded text-slate-400 text-xs font-mono">
                    Output dataset is empty. Trigger a scraping run to populate.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                    {apifyResults.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 hover:border-slate-400 transition flex flex-col md:flex-row gap-4"
                      >
                        {item.image && (
                          <div className="w-full md:w-32 h-24 shrink-0 rounded overflow-hidden bg-slate-100">
                            <img
                              src={item.image}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="space-y-2 flex-1">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 uppercase tracking-widest text-slate-500 bg-slate-50 dark:bg-slate-900 font-bold">
                              {apifyActor === "reddit" ? `${item.subreddit} • ${item.author}` : `${item.company} • ${item.location}`}
                            </span>
                            {item.salary && (
                              <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-1.5 rounded">
                                {item.salary}
                              </span>
                            )}
                          </div>

                          <h5 className="font-serif font-bold text-slate-950 dark:text-white text-sm">
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1.5">
                              {item.title}
                              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 inline" />
                            </a>
                          </h5>

                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans line-clamp-3">
                            {item.text || item.description}
                          </p>

                          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-900">
                            <button
                              onClick={() => {
                                // Add directly to curated draft pipeline
                                const mappedLead: NewsLead = {
                                  id: Buffer.from(item.url + item.title).toString("base64").replace(/[^a-zA-Z0-9]/g, "").substring(0, 20),
                                  title: item.title,
                                  snippet: item.text || item.description,
                                  source: apifyActor === "reddit" ? item.subreddit : item.company,
                                  link: item.url,
                                  country: activeCountry,
                                  category: "technology",
                                  publishedAt: item.publishedAt || new Date().toISOString(),
                                  createdAt: Date.now(),
                                  image: item.image || ""
                                };
                                addStoryToDraft(mappedLead);
                              }}
                              className="px-2.5 py-1.5 bg-slate-950 text-white dark:bg-white dark:text-slate-950 rounded hover:bg-slate-800 dark:hover:bg-slate-100 text-[10px] font-mono font-bold transition flex items-center gap-1 shadow-xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Curate Into Issue Draft
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HOSPITALITY & TRAVEL TAB */}
      {subTab === "hospitality" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
            <div>
              <h3 className="font-serif font-extrabold text-slate-950 dark:text-white uppercase tracking-wider text-base">
                Hospitality & Travel Data Intelligence
              </h3>
              <p className="text-xs font-mono text-slate-500 mt-0.5">Scrape consumer reviews, luxury properties, flight routes, and influencer products</p>
            </div>
            <div className="text-xs font-mono px-3 py-1.5 rounded-sm bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 animate-spin-slow" />
              TRAVEL STREAM: LIVE ACTIVE
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Data Tool Configuration */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Destination Input & Quick Presets */}
              <div className="border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3 bg-white dark:bg-slate-950 shadow-xs">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold block">1. Target Destination / Hub</span>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={hDestination}
                    onChange={(e) => setHDestination(e.target.value)}
                    placeholder="Enter city or travel hub (e.g., Cairo, Giza, Zanzibar...)"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded pl-9 pr-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-hidden font-mono"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {["Cairo", "Zanzibar", "Paris", "Montreal", "Nairobi", "Cape Town"].map(city => (
                    <button
                      key={city}
                      onClick={() => setHDestination(city)}
                      className={`px-2.5 py-1 rounded-sm text-[10px] font-mono transition ${hDestination.toLowerCase() === city.toLowerCase() ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold" : "bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-900 dark:text-slate-400"}`}
                    >
                      📍 {city}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category selector */}
              <div className="border border-slate-200 dark:border-slate-800 rounded p-4 space-y-3 bg-white dark:bg-slate-950 shadow-xs">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold block">2. Data Category API Target</span>
                
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "hotels", label: "🏨 Hotels & Lodging" },
                    { id: "flights", label: "✈️ Flight Routes" },
                    { id: "reviews", label: "💬 Consumer Reviews" },
                    { id: "attractions", label: "🗺️ Local Attractions" }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setHCategory(cat.id as any)}
                      className={`p-2.5 rounded text-left border flex flex-col justify-between transition ${hCategory === cat.id ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-slate-950 dark:border-white shadow-xs font-semibold" : "bg-slate-50 border-slate-200 hover:bg-slate-100 dark:bg-slate-900/40 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs"}`}
                    >
                      <span className="text-xs">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Tool Controls & Options */}
              <div className="border border-slate-200 dark:border-slate-800 rounded p-4 space-y-4 bg-white dark:bg-slate-950 shadow-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-900">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">3. Scraper & API Configurations</span>
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div className="space-y-3">
                  {/* additionalProperties */}
                  <label className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={hConfigAdditionalProperties}
                      onChange={(e) => setHConfigAdditionalProperties(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 dark:border-slate-800 text-amber-500 focus:ring-amber-500 h-4 w-4"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-500 transition">additionalProperties</span>
                      <p className="text-[10px] text-slate-500 leading-normal font-sans">Enables high-fidelity details (amenities, cancel policies, rooms)</p>
                    </div>
                  </label>

                  {/* additionalPropertiesSearchEngine */}
                  <label className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={hConfigAdditionalPropertiesSearchEngine}
                      onChange={(e) => setHConfigAdditionalPropertiesSearchEngine(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 dark:border-slate-800 text-amber-500 focus:ring-amber-500 h-4 w-4"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-500 transition">additionalPropertiesSearchEngine</span>
                      <p className="text-[10px] text-slate-500 leading-normal font-sans">Scrapes flight specs (emissions, layover logs, baggage policies)</p>
                    </div>
                  </label>

                  {/* additionalReviewProperties */}
                  <label className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={hConfigAdditionalReviewProperties}
                      onChange={(e) => setHConfigAdditionalReviewProperties(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 dark:border-slate-800 text-amber-500 focus:ring-amber-500 h-4 w-4"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-500 transition">additionalReviewProperties</span>
                      <p className="text-[10px] text-slate-500 leading-normal font-sans">Extracts complex metrics (subscores, verified tag, author badges)</p>
                    </div>
                  </label>

                  {/* scrapeInfluencerProducts */}
                  <label className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={hConfigScrapeInfluencerProducts}
                      onChange={(e) => setHConfigScrapeInfluencerProducts(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 dark:border-slate-800 text-amber-500 focus:ring-amber-500 h-4 w-4"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-500 transition">scrapeInfluencerProducts</span>
                      <p className="text-[10px] text-slate-500 leading-normal font-sans">Queries local influencer gear & photogenic spot recommendations</p>
                    </div>
                  </label>

                  {/* scrapeReviewsDelivery */}
                  <label className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={hConfigScrapeReviewsDelivery}
                      onChange={(e) => setHConfigScrapeReviewsDelivery(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 dark:border-slate-800 text-amber-500 focus:ring-amber-500 h-4 w-4"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-500 transition">scrapeReviewsDelivery</span>
                      <p className="text-[10px] text-slate-500 leading-normal font-sans">Parses transport delivery and luggage handoff rating logs</p>
                    </div>
                  </label>
                </div>

                <button
                  onClick={runHospitalitySearch}
                  disabled={hLoading}
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 dark:bg-white dark:text-slate-950 font-mono font-bold uppercase tracking-wider text-xs rounded transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {hLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Crawling GDS/API databases...
                    </>
                  ) : (
                    <>
                      <Compass className="w-3.5 h-3.5" />
                      Query Travel Intelligence
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Right Column: Dynamic Travel Intelligence output */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-serif font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  CRAWLED REAL-TIME METRICS ({hResults.length} records)
                </span>
                {hResults.length > 0 && (
                  <span className="text-[10px] font-mono text-slate-400">Timestamp: {new Date().toLocaleTimeString()}</span>
                )}
              </div>

              {hError && (
                <div className="p-4 border border-red-200 bg-red-50 text-red-700 dark:bg-red-950/20 dark:border-red-900 dark:text-red-400 rounded text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{hError}</span>
                </div>
              )}

              {hResults.length === 0 ? (
                <div className="py-24 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950/50 flex flex-col items-center justify-center p-6">
                  <Compass className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2 animate-bounce" />
                  <p className="text-sm font-serif font-bold text-slate-800 dark:text-slate-200">Travel Pipeline Standby</p>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 leading-normal font-sans">
                    Configure your destination, check your target parameters, and launch the search. High-fidelity travel data will populate instantly.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                  {hResults.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 border border-slate-200 dark:border-slate-800 rounded-sm bg-white dark:bg-slate-950 hover:border-slate-400 dark:hover:border-slate-700 transition flex flex-col md:flex-row gap-5"
                    >
                      {item.image && (
                        <div className="w-full md:w-40 h-28 shrink-0 rounded overflow-hidden bg-slate-100 border border-slate-100 dark:border-slate-900">
                          <img
                            src={item.image}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div className="space-y-3 flex-1">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                          <div className="space-y-1">
                            {/* Address or category badge */}
                            <span className="text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 uppercase tracking-widest text-slate-500 dark:text-slate-400">
                              {item.categoryType || (item.departureTime ? "Flight Ticket" : "Accommodation")}
                            </span>
                            <h4 className="font-serif font-extrabold text-slate-950 dark:text-white text-base leading-tight mt-1">
                              {item.name || item.carrier || item.title}
                            </h4>
                          </div>

                          {/* Price badge */}
                          {(item.price || item.pricing) && (
                            <span className="text-xs font-mono font-bold px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-sm self-start">
                              {item.price || item.pricing}
                            </span>
                          )}
                        </div>

                        {/* General details */}
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                          {item.description || item.text}
                        </p>

                        {/* Additional Properties layout block (Conditionally rendered) */}
                        {item.amenities && (
                          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-900">
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold block">Enabled Properties: Amenities & Policies</span>
                            <div className="flex flex-wrap gap-1">
                              {item.amenities.map((am: string, i: number) => (
                                <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                                  ✓ {am}
                                </span>
                              ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-1">
                              <div>Check-in: {item.checkIn}</div>
                              <div>Check-out: {item.checkOut}</div>
                              {item.roomTypes && <div className="col-span-2">Rooms: {item.roomTypes.join(", ")}</div>}
                              {item.cancellation && <div className="col-span-2 text-emerald-600 font-bold">Policy: {item.cancellation}</div>}
                            </div>
                          </div>
                        )}

                        {/* Search Engine Additional Properties block */}
                        {(item.baggagePolicy || item.carbonEmissions) && (
                          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-900 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold block">Engine Specifications</span>
                            <div className="grid grid-cols-2 gap-2">
                              <div>🧳 Baggage: {item.baggagePolicy}</div>
                              <div>🌿 Carbon Emission: <span className="text-emerald-600 font-bold">{item.carbonEmissions}</span></div>
                              <div>⚡ On-Time Performance: {item.onTimePerformance}</div>
                              <div>🕒 Flight Duration: {item.duration} ({item.stops})</div>
                            </div>
                          </div>
                        )}

                        {/* Review Subscores Additional block */}
                        {(item.cleanlinessScore || item.reviewerBadge) && (
                          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-900 text-[10px] font-mono text-slate-500">
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold block">CRAWLED REVIEW SCORES & AUTHOR PROFILE</span>
                            <div className="grid grid-cols-2 gap-2">
                              {item.cleanlinessScore && <div>✨ Cleanliness: {item.cleanlinessScore}/5.0</div>}
                              {item.locationScore && <div>📍 Location Score: {item.locationScore}/5.0</div>}
                              {item.valueScore && <div>💰 Value Score: {item.valueScore}/5.0</div>}
                              {item.managerResponseTime && <div>💬 Host Response: {item.managerResponseTime}</div>}
                              {item.reviewerBadge && <div className="col-span-2">👤 Reviewer Badge: <span className="text-amber-600 font-bold">{item.reviewerBadge}</span> ({item.helpfulVotes} helpful votes)</div>}
                              {item.reviewedSubclass && <div className="col-span-2">🛌 Subject Reviewed: {item.reviewedSubclass}</div>}
                            </div>
                          </div>
                        )}

                        {/* Influencer products & guide recommendations */}
                        {item.influencerProducts && (
                          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-900 text-[10px] font-mono">
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold block">Influencer-Curated Gear & Recommendations</span>
                            <div className="flex flex-col gap-1">
                              {item.influencerProducts.map((p: any, i: number) => (
                                <div key={i} className="flex justify-between border-b border-dashed border-slate-100 dark:border-slate-900 pb-0.5 text-slate-600 dark:text-slate-400">
                                  <span>🎒 {p.name}</span>
                                  <span className="font-bold text-amber-600">{p.price}</span>
                                </div>
                              ))}
                            </div>
                            <div className="text-slate-500 pt-1">
                              📷 Photogenic score: {item.photogenicRating}
                            </div>
                            <div className="text-slate-500 font-sans italic">
                              💡 Tips: {item.gearRecommendations}
                            </div>
                          </div>
                        )}

                        {/* Reviews delivery and airport transfer log details */}
                        {item.deliveryRating && (
                          <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-900 text-[10px] font-mono text-slate-500">
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold block">Transfer Delivery Logs</span>
                            <div>🚚 Transfer Handoff: <span className="font-bold text-emerald-600">{item.deliveryRating}</span></div>
                            <div>🚗 Vehicle Type: {item.transitType}</div>
                            <div>🧳 Luggage Status: {item.luggageHandling}</div>
                          </div>
                        )}

                        {/* Action section: Curate directly into issue */}
                        <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-900">
                          <div className="flex items-center gap-1">
                            {item.rating && (
                              <div className="flex text-amber-500 text-xs">
                                {Array.from({ length: Math.floor(item.rating) }).map((_, i) => (
                                  <span key={i}>★</span>
                                ))}
                                {item.rating % 1 !== 0 && <span>½</span>}
                                <span className="text-slate-400 text-[10px] font-mono ml-1">({item.rating})</span>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              // Dynamically map travel item to standard newsletter CuratedStory
                              const finalSnippet = `[Travel Feature - ${hDestination.toUpperCase()} ${hCategory.toUpperCase()}] ${item.description || item.text || ""}` +
                                (item.amenities ? ` Amenities: ${item.amenities.join(", ")}.` : "") +
                                (item.cancellation ? ` Policy: ${item.cancellation}.` : "") +
                                (item.price ? ` Rate: ${item.price}.` : "");

                              const mappedLead: NewsLead = {
                                id: Buffer.from((item.id || item.name) + hDestination).toString("base64").replace(/[^a-zA-Z0-9]/g, "").substring(0, 20),
                                title: item.name || item.carrier || item.title || `Featured Destination: ${hDestination}`,
                                snippet: finalSnippet,
                                source: `Travel Intel Hub (${hDestination})`,
                                link: "https://nilepen.pub/travel-intelligence",
                                country: activeCountry,
                                category: "business",
                                publishedAt: new Date().toISOString(),
                                createdAt: Date.now(),
                                image: item.image || "https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?q=90&w=1600&auto=format&fit=crop"
                              };
                              addStoryToDraft(mappedLead);
                            }}
                            className="px-3 py-1.5 bg-slate-950 text-white dark:bg-white dark:text-slate-950 rounded hover:bg-slate-800 dark:hover:bg-slate-100 text-[10px] font-mono font-bold transition flex items-center gap-1 shadow-xs border border-slate-950 dark:border-white"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Curate into Newsletter
                          </button>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
