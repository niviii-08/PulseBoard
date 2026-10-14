import { useState, useRef, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin, useRegister } from "@/hooks/queries/useAuth";
import { usePreferencesStore } from "@/store/preferencesStore";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/api/client";
import type { User } from "@/types/domain";
import { ShieldCheck, Shuffle, HeartPulse, CheckCircle2 } from "lucide-react";

type ChallengeType = "bot-spotter" | "wave-tuner" | "pulse-hold" | "emoji-vibe" | "headline-check" | "slang-decoder" | "reaction-gate" | "chai-math";

const ALL_CHALLENGE_TYPES: ChallengeType[] = [
  "bot-spotter",
  "wave-tuner",
  "pulse-hold",
  "emoji-vibe",
  "headline-check",
  "slang-decoder",
  "reaction-gate",
  "chai-math",
];

const CHALLENGE_META: Record<ChallengeType, { badge: string; title: string }> = {
  "bot-spotter": { badge: "TURING TEST #01", title: "Spot the Real Human Post" },
  "wave-tuner": { badge: "TURING TEST #02", title: "Oscilloscope Wavelength Lock" },
  "pulse-hold": { badge: "TURING TEST #03", title: "Biometric Heartbeat Hold" },
  "emoji-vibe": { badge: "TURING TEST #04", title: "Internet Vibe Decoder" },
  "headline-check": { badge: "TURING TEST #05", title: "Clickfarm vs. Human Sense" },
  "slang-decoder": { badge: "TURING TEST #06", title: "Internet Slang IQ Check" },
  "reaction-gate": { badge: "TURING TEST #07", title: "Human Reflex Gate" },
  "chai-math": { badge: "TURING TEST #08", title: "Relatable Chai Arithmetic" },
};

const HUMAN_POST_POOL = [
  { handle: "@neev_writes", text: "me explaining to my mom why ordering 1am biryani is a valid academic expense 😭🍛" },
  { handle: "@chai_overflow", text: "opened 47 browser tabs to fix one CSS margin and now my laptop sounds like a Boeing 747 ✈️" },
  { handle: "@desi_coder", text: "said 'i'll sleep at 11pm tonight' and somehow it's 3:14am and i'm reading about 14th century spoons" },
  { handle: "@mumbaikar_vibes", text: "nothing humbles you faster than confidently walking in the wrong direction after checking Google Maps 💀" },
];

const BOT_POST_POOL = [
  { handle: "@alpha_airdrop_99", text: "🚀 CLAIM 1000x GUARANTEED TOKEN AIRDROP IN BIO NOW!! #wealth #synergy 🤖" },
  { handle: "@unit_734_news", text: "Greetings fellow human! I also enjoy consuming [HOT_BEVERAGE] at 08:00 UTC." },
  { handle: "@forex_bot_x", text: "💰 I MADE $48,290 IN 4 MINUTES USING THIS SECRET QUANTUM TRADING LOOPHOLE 👇" },
  { handle: "@engagement_node", text: "Great post! Very informative content. Click my profile for free followers 100% legit." },
  { handle: "@sys_prompt_09", text: "As an AI language model, I feel immense human joy looking at this #photograph." },
  { handle: "@crypto_whale_bot", text: "🔥 SEND 0.1 ETH TO RECEIVE 2.0 ETH INSTANTLY! VERIFIED SMART CONTRACT GIVEAWAY!" },
];

const EMOJI_RIDDLES = [
  {
    prompt: "Which combo means \"laughing so hard I'm deceased\"?",
    options: [
      { id: "h", emojis: "😭💀", desc: "Crying + Skull", isHuman: true },
      { id: "b1", emojis: "📊📎", desc: "Spreadsheet Clip", isHuman: false },
      { id: "b2", emojis: "🦾🔋", desc: "Firmware Full", isHuman: false },
      { id: "b3", emojis: "📠💾", desc: "Fax Floppy", isHuman: false },
    ],
  },
  {
    prompt: "Which combo means \"spill the gossip immediately\"?",
    options: [
      { id: "h", emojis: "☕👀", desc: "Hot Tea + Side Eye", isHuman: true },
      { id: "b1", emojis: "⚙️🔩", desc: "Gear Torque", isHuman: false },
      { id: "b2", emojis: "📉🏦", desc: "Bond Yield", isHuman: false },
      { id: "b3", emojis: "🔌🖥️", desc: "Server Rack", isHuman: false },
    ],
  },
  {
    prompt: "Which combo means \"let him cook (he's onto something)\"?",
    options: [
      { id: "h", emojis: "👨‍🍳🔥", desc: "Chef + Fire", isHuman: true },
      { id: "b1", emojis: "🧊📠", desc: "Frozen Fax", isHuman: false },
      { id: "b2", emojis: "📁🗑️", desc: "Trash Directory", isHuman: false },
      { id: "b3", emojis: "📡🛰️", desc: "Orbital Ping", isHuman: false },
    ],
  },
];

const HEADLINE_RIDDLES = [
  {
    prompt: "Tap the headline written by a real human journalist (not a spam bot):",
    options: [
      { text: "Local stray dog casually joins marathon, finishes 4km and gets a medal 🐕🏅", isHuman: true },
      { text: "DOCTORS HATE HIM! 1 Weird Trick Melts 40kg Belly Fat in 3 Minutes!!", isHuman: false },
      { text: "CLICK HERE: You Are The 1,000,000th Visitor To Claim Free iPhone 19 Pro!", isHuman: false },
    ],
  },
  {
    prompt: "Tap the genuine human observation (not algorithmic clickbait):",
    options: [
      { text: "Why every Indian household has that one plastic box full of random cables & batteries 🔋", isHuman: true },
      { text: "ALERT: Your Browser Cache Has 147 Critical Viruses! Download RamBooster.exe Now!", isHuman: false },
      { text: "EARN ₹95,000/HOUR FROM HOME BY TYPING CAPTCHAS — NO SKILL REQUIRED!!", isHuman: false },
    ],
  },
];

const SLANG_RIDDLES = [
  {
    slang: "no cap",
    context: "\"That movie was mid, no cap.\"",
    options: [
      { text: "For real, I'm not lying", isCorrect: true },
      { text: "Without a hat on", isCorrect: false },
      { text: "Network capacity exceeded", isCorrect: false },
      { text: "No capital letters mode", isCorrect: false },
    ],
  },
  {
    slang: "it's giving main character",
    context: "\"She walked in like she's giving main character energy.\"",
    options: [
      { text: "Acting like you're the hero of your own story", isCorrect: true },
      { text: "Donating to the lead actor's fund", isCorrect: false },
      { text: "CPU rendering a 3D protagonist model", isCorrect: false },
      { text: "Providing power to the lead role", isCorrect: false },
    ],
  },
  {
    slang: "rent free",
    context: "\"That cringe moment from 2019 is living rent free in my head.\"",
    options: [
      { text: "Occupying your thoughts without invitation", isCorrect: true },
      { text: "A tenant who skips rent", isCorrect: false },
      { text: "Zero-cost real estate listing", isCorrect: false },
      { text: "A free-tier subscription", isCorrect: false },
    ],
  },
  {
    slang: "understood the assignment",
    context: "\"She showed up in full costume — she understood the assignment.\"",
    options: [
      { text: "Nailed it, delivered exactly what was needed", isCorrect: true },
      { text: "Read the homework instructions carefully", isCorrect: false },
      { text: "Processed a workflow task", isCorrect: false },
      { text: "Accepted a classified mission", isCorrect: false },
    ],
  },
];

const CHAI_PROBLEMS = [
  {
    question: "You made 3 cups of chai ☕. Roommate said 'nah I'm fine.' You made 1 extra anyway. They took 2. How many did YOU get?",
    options: ["0 (classic)", "1 ☕", "2 ☕", "3 ☕"],
    answer: "0 (classic)",
  },
  {
    question: "Mom said 'we'll leave in 5 mins' at 2:00pm. You left at 4:15pm. How many '5 more minutes' were there?",
    options: ["Infinite 😔", "2", "14", "17"],
    answer: "Infinite 😔",
  },
  {
    question: "You opened 3 tabs to fix one CSS bug. Each tab opens 4 Stack Overflow tabs. One tab crashed Chrome. How many survived?",
    options: ["All of them 🔥", "11", "12", "14"],
    answer: "All of them 🔥",
  },
  {
    question: "Biryani arrived cold 🍛. You reheated it. Friend arrived and ate the warm half. How many times did YOU microwave your portion?",
    options: ["3 sadly", "0", "1", "Just reordered"],
    answer: "3 sadly",
  },
];

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function generateRandomSession(excludeType?: ChallengeType) {
  const candidates = excludeType
    ? ALL_CHALLENGE_TYPES.filter((t) => t !== excludeType)
    : ALL_CHALLENGE_TYPES;
  const type = candidates[Math.floor(Math.random() * candidates.length)];

  // 1. Random Bot-Spotter trio
  const humanPost = HUMAN_POST_POOL[Math.floor(Math.random() * HUMAN_POST_POOL.length)];
  const botPosts = shuffleArray(BOT_POST_POOL).slice(0, 2);
  const socialChoices = shuffleArray([
    { id: "h", ...humanPost, isHuman: true },
    { id: "b1", ...botPosts[0], isHuman: false },
    { id: "b2", ...botPosts[1], isHuman: false },
  ]);

  // 2. Random Wave Tuner target (56..88 Hz)
  const targetFreq = [58, 64, 72, 78, 84][Math.floor(Math.random() * 5)];
  const initialFreq = targetFreq > 70 ? 30 : 92;

  // 3. Random Pulse Hold zone
  const zoneStart = [62, 66, 70][Math.floor(Math.random() * 3)];
  const zoneEnd = zoneStart + 25;

  // 4. Random Emoji Riddle
  const rawEmoji = EMOJI_RIDDLES[Math.floor(Math.random() * EMOJI_RIDDLES.length)];
  const emojiRiddle = {
    prompt: rawEmoji.prompt,
    options: shuffleArray(rawEmoji.options),
  };

  // 5. Random Headline Riddle
  const rawHeadline = HEADLINE_RIDDLES[Math.floor(Math.random() * HEADLINE_RIDDLES.length)];
  const headlineRiddle = {
    prompt: rawHeadline.prompt,
    options: shuffleArray(rawHeadline.options),
  };

  // 6. Random Slang Riddle
  const rawSlang = SLANG_RIDDLES[Math.floor(Math.random() * SLANG_RIDDLES.length)];
  const slangRiddle = { ...rawSlang, options: shuffleArray(rawSlang.options) };

  // 7. Random Chai Problem
  const chaiProblem = CHAI_PROBLEMS[Math.floor(Math.random() * CHAI_PROBLEMS.length)];

  return {
    type,
    socialChoices,
    targetFreq,
    initialFreq,
    zoneStart,
    zoneEnd,
    emojiRiddle,
    headlineRiddle,
    slangRiddle,
    chaiProblem,
  };
}

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExistingAccount, setIsExistingAccount] = useState(false);

  // Randomized Human Verification Session per User
  const [session, setSession] = useState(() => generateRandomSession());
  const [humanVerified, setHumanVerified] = useState(false);
  const [verifyFeedback, setVerifyFeedback] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | number | null>(null);

  // Wave Tuner State
  const [waveFreq, setWaveFreq] = useState<number>(() => session.initialFreq);

  // Pulse Hold State
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<number | null>(null);

  // Reaction Gate State
  const [reactionPhase, setReactionPhase] = useState<"idle" | "armed" | "go" | "done">("idle");
  const [reactionResult, setReactionResult] = useState<"" | "too-fast" | "too-slow" | "human">("" );
  const reactionTimerRef = useRef<number | null>(null);
  const reactionStartRef = useRef<number>(0);

  const register = useRegister();
  const login = useLogin();
  const navigate = useNavigate();

  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState<string>("Maharashtra");
  const [selectedType, setSelectedType] = useState<"Memes" | "News" | "Both">("Both");
  const { setInterests, setStatePref, setContentType, completeOnboarding } = usePreferencesStore();

  const AVAILABLE_INTERESTS = [
    "Technology", "AI", "Finance", "Business", 
    "Politics", "Science", "Gaming", "Health", "Pop Culture"
  ];
  const INDIAN_STATES = [
    "Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Gujarat", 
    "Uttar Pradesh", "Kerala", "West Bengal", "Telangana"
  ];

  // Reroll a fresh random challenge & random question set
  const rerollRandomChallenge = () => {
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    const next = generateRandomSession(session.type);
    setSession(next);
    setWaveFreq(next.initialFreq);
    setHoldProgress(0);
    setHumanVerified(false);
    setSelectedOptionId(null);
    setVerifyFeedback(null);
    setReactionPhase("idle");
    setReactionResult("");
  };

  // Wave tuner handler
  const handleWaveChange = (val: number) => {
    setWaveFreq(val);
    if (Math.abs(val - session.targetFreq) <= 5) {
      setHumanVerified(true);
      setErrorMessage(null);
      setVerifyFeedback(`✦ Wavelength locked at ${session.targetFreq} Hz — Human verified!`);
    } else {
      setHumanVerified(false);
      setVerifyFeedback(null);
    }
  };

  // Pulse hold handlers
  const startHold = () => {
    if (humanVerified) return;
    setIsHolding(true);
    setVerifyFeedback(null);
    setHoldProgress(0);
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / 1400) * 100));
      setHoldProgress(pct);
      if (pct < 100) {
        holdTimerRef.current = requestAnimationFrame(tick);
      } else {
        setIsHolding(false);
        setVerifyFeedback(`⚡ Overcharged! Release inside the ${session.zoneStart}%–${session.zoneEnd}% green zone.`);
      }
    };
    holdTimerRef.current = requestAnimationFrame(tick);
  };

  const endHold = () => {
    if (!isHolding) return;
    setIsHolding(false);
    if (holdTimerRef.current) cancelAnimationFrame(holdTimerRef.current);
    if (holdProgress >= session.zoneStart && holdProgress <= session.zoneEnd) {
      setHumanVerified(true);
      setErrorMessage(null);
      setVerifyFeedback(`💓 ${holdProgress} BPM Biometric Pulse Locked — Human verified!`);
    } else if (holdProgress < session.zoneStart) {
      setVerifyFeedback("🤖 Too fast (bots click in 0ms)! Hold until the bar reaches the green zone.");
    }
  };

  // Reaction Gate handlers
  const startReactionChallenge = () => {
    if (humanVerified) return;
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    setReactionPhase("armed");
    setReactionResult("");
    setVerifyFeedback(null);
    const delay = 1500 + Math.random() * 2500;
    reactionTimerRef.current = window.setTimeout(() => {
      setReactionPhase("go");
      reactionStartRef.current = performance.now();
      reactionTimerRef.current = window.setTimeout(() => {
        setReactionPhase("done");
        setReactionResult("too-slow");
        setVerifyFeedback("🐢 Too slow! Tap quickly when the light turns green.");
      }, 2000);
    }, delay);
  };

  const handleReactionTap = () => {
    if (reactionPhase === "idle" || (reactionPhase === "done" && reactionResult !== "human")) {
      startReactionChallenge();
      return;
    }
    if (reactionPhase === "armed") {
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
      setReactionPhase("done");
      setReactionResult("too-fast");
      setVerifyFeedback("🤖 Bots jump the gun! Wait for the GREEN light.");
      return;
    }
    if (reactionPhase === "go") {
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
      const rt = Math.round(performance.now() - reactionStartRef.current);
      if (rt < 80) {
        setReactionPhase("done");
        setReactionResult("too-fast");
        setVerifyFeedback("🤖 Under 80ms is machine speed! Are you sure you're human?");
      } else {
        setReactionPhase("done");
        setReactionResult("human");
        setHumanVerified(true);
        setErrorMessage(null);
        setVerifyFeedback(`⚡ ${rt}ms reaction time — Human reflexes confirmed!`);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) cancelAnimationFrame(holdTimerRef.current);
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    };
  }, []);

  const handleStep1Submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanFullName = fullName.trim();
    if (!cleanFullName) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!cleanEmail) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }
    if (!humanVerified) {
      setErrorMessage("⚠️ Please solve the human verification challenge below to verify you are a human.");
      return;
    }

    try {
      // 1. Immediately create and store the account in the PostgreSQL database!
      await register.mutateAsync({
        email: cleanEmail,
        password,
        full_name: cleanFullName,
        state: selectedState || "Tamil Nadu",
        content_type: selectedType || "Both",
        interests: selectedInterests || [],
      });

      // 2. Automatically log the user in to establish authentication tokens!
      try {
        await login.mutateAsync({
          email: cleanEmail,
          password,
        });
      } catch {
        navigate("/login", { replace: true });
        return;
      }

      // 3. Move to Step 2 for optional personalization
      setStep(2);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        // Account already exists in database! Attempt to log in with entered credentials:
        try {
          await login.mutateAsync({
            email: cleanEmail,
            password,
          });
          setStep(2);
          return;
        } catch {
          setIsExistingAccount(true);
          setErrorMessage(
            `An account with ${cleanEmail} is already registered in the database! Please sign in with your password below.`
          );
          return;
        }
      }

      const detail =
        err?.response?.data?.error?.message ||
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create account. Please check your details and try again.";
      setErrorMessage(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
  };

  const handleRegisterSubmit = async (interestsToSave: string[]) => {
    setErrorMessage(null);
    try {
      // Update profile in database if logged in via PATCH /api/v1/auth/me
      try {
        const { data: updatedUser } = await apiClient.patch<User>("/auth/me", {
          state: selectedState,
          content_type: selectedType,
          interests: interestsToSave,
        });
        if (updatedUser) {
          useAuthStore.getState().setUser(updatedUser);
        }
      } catch {
        // Continue even if patch endpoint fails
      }

      setInterests(interestsToSave);
      setStatePref(selectedState);
      setContentType(selectedType);
      completeOnboarding();
      navigate("/trending-memes", { replace: true });
    } catch {
      navigate("/trending-memes", { replace: true });
    }
  };

  const finishRegistration = () => {
    handleRegisterSubmit(selectedInterests);
  };

  const handleToggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(prev => prev.filter(i => i !== interest));
    } else {
      setSelectedInterests(prev => [...prev, interest]);
    }
  };

  const handleSelectAllOrNotSure = () => {
    setSelectedInterests([]);
    handleRegisterSubmit([]);
  };

  // STEP 2: ONBOARDING / PERSONALIZATION
  if (step === 2) {
    return (
      <AuthLayout>
        <h1
          className="text-2xl sm:text-3xl font-normal tracking-tight text-[#1C192B] dark:text-white drop-shadow-sm"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Vibe Check! ✨
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm font-medium text-[#4B4660] dark:text-[#D5D1E8]">
          Tell us where you're from and what kind of tea you're looking for.
        </p>

        <div className="mt-5">
          <Label className="text-xs font-mono font-black uppercase tracking-wider text-[#1C192B] dark:text-[#F3F0FA] mb-2 block">1. What's your home state?</Label>
          <select 
            value={selectedState} 
            onChange={e => setSelectedState(e.target.value)}
            className="w-full bg-white/95 dark:bg-[#1C1733] text-sm font-bold text-[#1C192B] dark:text-white border-2 border-[#1C192B] dark:border-white/30 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-signal-400 appearance-none shadow-sm cursor-pointer"
          >
            {INDIAN_STATES.map(s => <option key={s} value={s} className="bg-white dark:bg-[#1C1733] text-[#1C192B] dark:text-white">{s}</option>)}
          </select>
        </div>

        <div className="mt-5">
          <Label className="text-xs font-mono font-black uppercase tracking-wider text-[#1C192B] dark:text-[#F3F0FA] mb-2 block">2. What are you here for?</Label>
          <div className="flex gap-2.5">
             {["News", "Memes", "Both"].map(t => (
                <button
                   key={t}
                   type="button"
                   onClick={() => setSelectedType(t as any)}
                   className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 border-2 ${
                      selectedType === t 
                         ? "bg-signal-500 text-[#1C192B] border-[#1C192B] dark:border-signal-400 shadow-sm transform scale-[1.03]" 
                         : "bg-white/80 dark:bg-white/10 text-[#1C192B] dark:text-white/80 border-[#1C192B]/40 dark:border-white/20 hover:border-[#1C192B] dark:hover:border-white/50 hover:bg-lilac-200/40 dark:hover:bg-white/20 hover:text-[#1C192B] dark:hover:text-white"
                   }`}
                >
                   {t === "Memes" ? "🤣 Memes" : t === "News" ? "📰 News" : "🔥 Both"}
                </button>
             ))}
          </div>
        </div>

        <div className="mt-5">
          <Label className="text-xs font-mono font-black uppercase tracking-wider text-[#1C192B] dark:text-[#F3F0FA] mb-2 block">3. Any specific topics?</Label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_INTERESTS.map(interest => {
               const isActive = selectedInterests.includes(interest);
               return (
                  <button
                     key={interest}
                     onClick={() => handleToggleInterest(interest)}
                     type="button"
                     className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 border-2 ${
                        isActive 
                           ? "bg-[#1C192B] dark:bg-signal-500 text-white dark:text-[#1C192B] border-[#1C192B] dark:border-signal-400 shadow-sm" 
                           : "bg-white/80 dark:bg-white/10 text-[#1C192B] dark:text-white/80 border-[#1C192B]/40 dark:border-white/20 hover:border-[#1C192B] dark:hover:border-white/50 hover:bg-lilac-200/40 dark:hover:bg-white/20 hover:text-[#1C192B] dark:hover:text-white"
                     }`}
                  >
                     {interest}
                  </button>
               );
            })}
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-flame-100 dark:bg-red-950/70 border-2 border-ink dark:border-red-500/50 text-ink dark:text-red-200 text-xs font-bold">
            {errorMessage}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <Button 
            onClick={finishRegistration} 
            isLoading={register.isPending || login.isPending}
            disabled={register.isPending || login.isPending}
            className="w-full h-11 rounded-xl text-xs font-black uppercase tracking-wider bg-[#1C192B] dark:bg-signal-500 text-white dark:text-[#1C192B] hover:bg-[#342D4C] dark:hover:bg-signal-400 transition-all shadow-md border-2 border-ink dark:border-signal-400 dark:shadow-[0_4px_20px_rgba(242,207,67,0.3)]"
          >
            <span>Let's Go!</span>
            <span className="ml-1 text-signal-500 dark:text-[#1C192B]">✦</span>
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleSelectAllOrNotSure} 
            disabled={register.isPending || login.isPending}
            className="w-full h-9 rounded-xl text-xs font-bold font-mono uppercase tracking-wider border-2 border-dashed border-ink/40 dark:border-white/30 hover:border-ink dark:hover:border-white/70 bg-white/40 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-ink dark:text-white"
          >
            Skip Topics
          </Button>
        </div>
        
        <div className="mt-4 flex justify-center">
            <button onClick={() => setStep(1)} className="text-xs text-ink-muted dark:text-white/70 hover:text-ink dark:hover:text-white uppercase font-bold tracking-widest underline underline-offset-4">
                Back to Account Details
            </button>
        </div>
      </AuthLayout>
    );
  }

  const meta = CHALLENGE_META[session.type];

  // STEP 1: ACCOUNT DETAILS + RANDOMIZED TURING VIBE CHECK PER USER
  return (
    <AuthLayout>
      <div className="space-y-1">
        <h1
          className="text-2xl sm:text-3xl font-normal tracking-tight text-[#1C192B] dark:text-white drop-shadow-sm"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Create your account
        </h1>
        <p className="text-xs sm:text-sm font-medium text-[#4B4660] dark:text-[#D5D1E8]">
          The first account created becomes an admin automatically.
        </p>
      </div>

      <form className="mt-5 space-y-3.5" onSubmit={handleStep1Submit}>
        <div className="space-y-1">
          <Label htmlFor="full_name" className="text-xs font-mono font-black tracking-wider uppercase text-[#1C192B] dark:text-[#F3F0FA]">Full name</Label>
          <Input
            id="full_name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
            className="border-2 rounded-xl px-3.5 py-2.5 text-sm shadow-sm bg-white/95 dark:bg-[#1C1733] border-[#1C192B] dark:border-white/30 text-[#1C192B] dark:text-white placeholder:text-[#4B4660]/60 dark:placeholder:text-white/40 focus:ring-2 focus:ring-violet-400"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email" className="text-xs font-mono font-black tracking-wider uppercase text-[#1C192B] dark:text-[#F3F0FA]">Email Address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="border-2 rounded-xl px-3.5 py-2.5 text-sm shadow-sm bg-white/95 dark:bg-[#1C1733] border-[#1C192B] dark:border-white/30 text-[#1C192B] dark:text-white placeholder:text-[#4B4660]/60 dark:placeholder:text-white/40 focus:ring-2 focus:ring-violet-400"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password" className="text-xs font-mono font-black tracking-wider uppercase text-[#1C192B] dark:text-[#F3F0FA]">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="border-2 rounded-xl px-3.5 py-2.5 text-sm shadow-sm bg-white/95 dark:bg-[#1C1733] border-[#1C192B] dark:border-white/30 text-[#1C192B] dark:text-white placeholder:text-[#4B4660]/60 dark:placeholder:text-white/40 focus:ring-2 focus:ring-violet-400"
          />
        </div>


        {/* ─── RANDOMIZED PER-USER HUMAN VERIFICATION ─── */}
        <div
          className={`rounded-2xl border-2 p-3.5 transition-all shadow-sm ${
            humanVerified
              ? "bg-health-100/90 dark:bg-emerald-950/40 border-[#1C192B] dark:border-emerald-500/40"
              : "bg-[#FAF6F0] dark:bg-[#1C1733] border-[#1C192B] dark:border-white/20"
          }`}
        >
          {/* Header with Random Assigned Badge + Reroll Button */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5">
              <span
                className={`px-2 py-0.5 rounded-full border text-[9px] font-mono font-black uppercase ${
                  humanVerified
                    ? "bg-health-500 text-[#1C192B] border-[#1C192B]"
                    : "bg-lilac-300 dark:bg-lilac-400 text-[#1C192B] border-[#1C192B]"
                }`}
              >
                {humanVerified ? "✓ VERIFIED" : meta.badge}
              </span>
              <span className="text-[11px] font-mono font-black uppercase tracking-tight text-[#1C192B] dark:text-white truncate">
                {meta.title}
              </span>
            </div>

            <button
              type="button"
              onClick={rerollRandomChallenge}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white dark:bg-white/10 border border-[#1C192B] dark:border-white/30 text-[9px] font-mono font-bold text-[#1C192B] dark:text-white hover:bg-lilac-200 dark:hover:bg-white/20 transition-colors shrink-0"
              title="Get a different random challenge"
            >
              <Shuffle className="w-2.5 h-2.5" />
              <span>Reroll</span>
            </button>
          </div>

          {/* 1. SPOT THE HUMAN POST */}
          {session.type === "bot-spotter" && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-ink-muted dark:text-[#D5D1E8] mb-1">
                Tap the <span className="text-ink dark:text-white font-black underline">real human post</span> from the live stream:
              </p>
              {session.socialChoices.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => {
                    setSelectedOptionId(post.id);
                    if (post.isHuman) {
                      setHumanVerified(true);
                      setErrorMessage(null);
                      setVerifyFeedback("✦ Certified Human! You spotted the genuine human post.");
                    } else {
                      setHumanVerified(false);
                      setVerifyFeedback("🤖 Beep boop! That's a synthetic bot post. Try again!");
                    }
                  }}
                  className={`w-full text-left p-2 rounded-xl border-2 text-[11px] transition-all ${
                    selectedOptionId === post.id
                      ? post.isHuman
                        ? "bg-health-500/40 dark:bg-emerald-500/30 border-ink dark:border-emerald-400 font-bold text-ink dark:text-white shadow-sm"
                        : "bg-flame-200 dark:bg-red-950/70 border-ink dark:border-red-500 font-bold text-ink dark:text-white shadow-sm"
                      : "bg-surface/90 dark:bg-white/10 border-ink/40 dark:border-white/20 hover:border-ink dark:hover:border-white/50 hover:bg-lilac-100/50 dark:hover:bg-white/20 text-ink dark:text-white"
                  }`}
                >
                  <span className="font-mono font-black text-[10px] text-lilac-700 dark:text-lilac-300 mr-1.5">{post.handle}</span>
                  <span className="leading-tight">{post.text}</span>
                </button>
              ))}
            </div>
          )}

          {/* 2. VIBE FREQUENCY TUNER */}
          {session.type === "wave-tuner" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-ink-muted dark:text-[#D5D1E8]">
                <span>Slide to match the target frequency:</span>
                <span className="font-mono font-black text-ink bg-signal-500 px-2 py-0.5 rounded-full border border-ink text-[10px]">
                  {waveFreq} Hz / {session.targetFreq} Hz
                </span>
              </div>

              <div className="relative h-14 w-full rounded-xl bg-[#1C192B] border-2 border-ink dark:border-white/30 overflow-hidden flex items-center justify-center px-2">
                <svg className="w-full h-10" viewBox="0 0 240 40" fill="none">
                  <path
                    d="M 0 20 Q 15 4, 30 20 T 60 20 T 90 20 T 120 20 T 150 20 T 180 20 T 210 20 T 240 20"
                    stroke="#F2CF43"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.65"
                  />
                  <path
                    d={`M 0 20 Q ${Math.max(6, 28 - Math.floor(waveFreq / 5))} ${
                      20 - Math.min(18, Math.floor(waveFreq / 4))
                    }, ${Math.max(12, 56 - Math.floor(waveFreq / 2.8))} 20 T ${Math.max(
                      24,
                      112 - Math.floor(waveFreq / 1.4)
                    )} 20 T 180 20 T 240 20`}
                    stroke={humanVerified ? "#A8C6A3" : "#C2B0D5"}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
                {humanVerified && (
                  <span className="absolute right-2 top-1.5 px-2 py-0.5 rounded-full bg-health-500 text-ink font-mono font-black text-[9px] uppercase">
                    PHASE LOCKED ✦
                  </span>
                )}
              </div>

              <input
                type="range"
                min={20}
                max={100}
                value={waveFreq}
                onChange={(e) => handleWaveChange(Number(e.target.value))}
                className="w-full accent-signal-500 dark:accent-signal-400 cursor-pointer h-2 bg-surface dark:bg-white/20 rounded-lg border border-ink dark:border-white/30"
              />
            </div>
          )}

          {/* 3. BIOMETRIC PULSE HOLD */}
          {session.type === "pulse-hold" && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-ink-muted dark:text-[#D5D1E8]">
                Bots click in <code className="font-mono text-ink dark:text-white font-bold">0ms</code>. Hold & release inside the{" "}
                <span className="text-ink dark:text-white font-black">Green Zone ({session.zoneStart}–{session.zoneEnd}%)</span>:
              </p>

              <div className="relative h-6 w-full rounded-full bg-surface dark:bg-white/10 border-2 border-ink dark:border-white/30 overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 bg-health-500/45 border-x-2 border-dashed border-ink dark:border-white/50 z-10 flex items-center justify-center"
                  style={{ left: `${session.zoneStart}%`, width: `${session.zoneEnd - session.zoneStart}%` }}
                >
                  <span className="text-[8px] font-mono font-black uppercase text-ink dark:text-white">PULSE ZONE</span>
                </div>
                <div
                  className={`h-full transition-none ${
                    holdProgress >= session.zoneStart && holdProgress <= session.zoneEnd
                      ? "bg-health-500"
                      : "bg-lilac-500"
                  }`}
                  style={{ width: `${holdProgress}%` }}
                />
              </div>

              <button
                type="button"
                onMouseDown={startHold}
                onMouseUp={endHold}
                onMouseLeave={endHold}
                onTouchStart={startHold}
                onTouchEnd={endHold}
                className={`w-full py-2 rounded-xl border-2 font-mono text-xs font-black uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 ${
                  humanVerified
                    ? "bg-health-500 text-ink border-ink"
                    : isHolding
                    ? "bg-signal-500 text-ink scale-[0.99] border-ink"
                    : "bg-[#1C192B] dark:bg-signal-500 text-white dark:text-[#1C192B] hover:bg-[#342D4C] dark:hover:bg-signal-400 border-ink dark:border-signal-400"
                }`}
              >
                <HeartPulse className={`w-4 h-4 ${isHolding ? "animate-ping text-ink" : "text-signal-500 dark:text-[#1C192B]"}`} />
                <span>
                  {humanVerified
                    ? "Biometric Pulse Confirmed ✓"
                    : isHolding
                    ? `Holding Pulse... ${holdProgress}% (Release in Green!)`
                    : "Hold to Transmit Human Pulse"}
                </span>
              </button>
            </div>
          )}

          {/* 4. EMOJI VIBE DECODER */}
          {session.type === "emoji-vibe" && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-ink-muted dark:text-[#D5D1E8]">{session.emojiRiddle.prompt}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {session.emojiRiddle.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedOptionId(opt.id);
                      if (opt.isHuman) {
                        setHumanVerified(true);
                        setErrorMessage(null);
                        setVerifyFeedback("✦ Cultural fluency 100% — Certified Human!");
                      } else {
                        setHumanVerified(false);
                        setVerifyFeedback("🤖 Only a bot picks that combo! Try again.");
                      }
                    }}
                    className={`p-2 rounded-xl border-2 flex items-center gap-2 text-left transition-all ${
                      selectedOptionId === opt.id
                        ? opt.isHuman
                          ? "bg-health-500/50 dark:bg-emerald-500/30 border-ink dark:border-emerald-400 shadow-sm"
                          : "bg-flame-200 dark:bg-red-950/70 border-ink dark:border-red-500 shadow-sm"
                        : "bg-surface/90 dark:bg-white/10 border-ink/40 dark:border-white/20 hover:border-ink dark:hover:border-white/50 hover:bg-lilac-100/50 dark:hover:bg-white/20"
                    }`}
                  >
                    <span className="text-lg">{opt.emojis}</span>
                    <span className="text-[10px] font-bold text-ink dark:text-white leading-tight">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. CLICKFARM VS. HUMAN HEADLINE CHECK */}
          {session.type === "headline-check" && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-ink-muted dark:text-[#D5D1E8] mb-1">{session.headlineRiddle.prompt}</p>
              {session.headlineRiddle.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedOptionId(idx);
                    if (opt.isHuman) {
                      setHumanVerified(true);
                      setErrorMessage(null);
                      setVerifyFeedback("✦ Clickbait filter passed — Certified Human!");
                    } else {
                      setHumanVerified(false);
                      setVerifyFeedback("🤖 That's a classic spam clickfarm headline! Pick the human one.");
                    }
                  }}
                  className={`w-full text-left p-2 rounded-xl border-2 text-[11px] font-semibold transition-all ${
                    selectedOptionId === idx
                      ? opt.isHuman
                        ? "bg-health-500/40 dark:bg-emerald-500/30 border-ink dark:border-emerald-400 font-bold text-ink dark:text-white shadow-sm"
                        : "bg-flame-200 dark:bg-red-950/70 border-ink dark:border-red-500 font-bold text-ink dark:text-white shadow-sm"
                      : "bg-surface/90 dark:bg-white/10 border-ink/40 dark:border-white/20 hover:border-ink dark:hover:border-white/50 hover:bg-lilac-100/50 dark:hover:bg-white/20 text-ink dark:text-white"
                  }`}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          )}

          {/* 6. SLANG DECODER */}
          {session.type === "slang-decoder" && (
            <div className="space-y-2">
              <div className="bg-[#1C192B] dark:bg-[#1C1733] text-center px-3 py-2.5 rounded-xl border border-ink/60 dark:border-white/20">
                <p className="text-[10px] font-mono font-bold text-lilac-300 uppercase tracking-wider mb-0.5">Decode This Slang 🧠</p>
                <p className="text-xl font-black text-signal-500 tracking-tight">"{session.slangRiddle.slang}"</p>
                <p className="text-[10px] text-white/60 font-mono italic mt-0.5">{session.slangRiddle.context}</p>
              </div>
              <p className="text-[11px] font-bold text-ink-muted dark:text-[#D5D1E8]">What does it actually mean?</p>
              <div className="grid grid-cols-1 gap-1.5">
                {session.slangRiddle.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedOptionId(idx);
                      if (opt.isCorrect) {
                        setHumanVerified(true);
                        setErrorMessage(null);
                        setVerifyFeedback("✦ Fluent in internet speak — Certified Human!");
                      } else {
                        setHumanVerified(false);
                        setVerifyFeedback("🤖 Only a bot picks that! Try again.");
                      }
                    }}
                    className={`w-full text-left p-2 rounded-xl border-2 text-[11px] font-semibold transition-all ${
                      selectedOptionId === idx
                        ? opt.isCorrect
                          ? "bg-health-500/40 dark:bg-emerald-500/30 border-ink dark:border-emerald-400 font-bold text-ink dark:text-white shadow-sm"
                          : "bg-flame-200 dark:bg-red-950/70 border-ink dark:border-red-500 font-bold text-ink dark:text-white shadow-sm"
                        : "bg-surface/90 dark:bg-white/10 border-ink/40 dark:border-white/20 hover:border-ink dark:hover:border-white/50 hover:bg-lilac-100/50 dark:hover:bg-white/20 text-ink dark:text-white"
                    }`}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 7. REACTION GATE */}
          {session.type === "reaction-gate" && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-ink-muted dark:text-[#D5D1E8]">
                Tap <span className="text-ink dark:text-white font-black underline">only when the light turns GREEN</span>. Bots react in 0ms — prove your human lag!
              </p>
              <div className="flex items-center gap-4">
                {/* Traffic Light */}
                <div className="bg-[#1C192B] dark:bg-[#1C1733] rounded-2xl px-3 py-3 border-2 border-ink dark:border-white/20 flex flex-col items-center gap-2 shrink-0">
                  <div className={`w-8 h-8 rounded-full border-2 border-ink/60 dark:border-white/30 transition-all duration-300 ${
                    reactionPhase === "idle" || reactionPhase === "armed"
                      ? "bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.8)]"
                      : "bg-red-950 opacity-25"
                  }`} />
                  <div className={`w-8 h-8 rounded-full border-2 border-ink/60 dark:border-white/30 transition-all duration-300 ${
                    reactionPhase === "armed"
                      ? "bg-yellow-400 shadow-[0_0_14px_rgba(250,204,21,0.8)] animate-pulse"
                      : "bg-yellow-950 opacity-25"
                  }`} />
                  <div className={`w-8 h-8 rounded-full border-2 border-ink/60 dark:border-white/30 transition-all duration-300 ${
                    reactionPhase === "go"
                      ? "bg-green-400 shadow-[0_0_18px_rgba(74,222,128,0.9)] animate-pulse"
                      : reactionResult === "human"
                      ? "bg-green-400"
                      : "bg-green-950 opacity-25"
                  }`} />
                </div>
                <div className="flex-1 text-center space-y-1">
                  {reactionPhase === "idle" && <p className="text-[11px] font-mono text-ink-muted dark:text-white/70">Press the button to begin</p>}
                  {reactionPhase === "armed" && <p className="text-[12px] font-mono text-red-400 font-black animate-pulse">🔴 Wait for it...</p>}
                  {reactionPhase === "go" && <p className="text-[14px] font-mono text-green-400 font-black animate-bounce">🟢 TAP NOW!</p>}
                  {reactionPhase === "done" && reactionResult === "human" && <p className="text-[11px] font-mono text-health-500 dark:text-emerald-400 font-black">✦ Human confirmed!</p>}
                  {reactionPhase === "done" && reactionResult !== "human" && <p className="text-[11px] font-mono text-flame-500 dark:text-red-400 font-black">Press retry ↓</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={handleReactionTap}
                disabled={humanVerified}
                className={`w-full py-2.5 rounded-xl border-2 font-mono text-xs font-black uppercase tracking-wider transition-all shadow-sm ${
                  humanVerified
                    ? "bg-health-500 text-ink border-ink cursor-default"
                    : reactionPhase === "go"
                    ? "bg-green-400 text-[#1C192B] border-green-500 scale-[1.02] shadow-lg"
                    : reactionPhase === "armed"
                    ? "bg-red-500 text-white border-red-600 cursor-wait"
                    : "bg-[#1C192B] dark:bg-signal-500 text-white dark:text-[#1C192B] hover:bg-[#342D4C] dark:hover:bg-signal-400 border-ink dark:border-signal-400"
                }`}
              >
                {humanVerified ? "⚡ Reflex Gate Passed ✓"
                  : reactionPhase === "idle" ? "Start Reflex Test"
                  : reactionPhase === "armed" ? "🔴 Hold it..."
                  : reactionPhase === "go" ? "🟢 TAP NOW!!"
                  : reactionResult === "too-fast" ? "🤖 Too Fast — Retry"
                  : "🐢 Too Slow — Retry"}
              </button>
            </div>
          )}

          {/* 8. CHAI MATH */}
          {session.type === "chai-math" && (
            <div className="space-y-2">
              <div className="bg-[#1C192B] dark:bg-[#1C1733] px-3 py-2.5 rounded-xl border border-ink/60 dark:border-white/20">
                <p className="text-[11px] font-bold text-lilac-200 leading-snug">{session.chaiProblem.question}</p>
              </div>
              <p className="text-[10px] font-mono font-bold text-ink-muted dark:text-[#D5D1E8] uppercase tracking-wider">Pick the most relatable answer:</p>
              <div className="grid grid-cols-2 gap-1.5">
                {session.chaiProblem.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedOptionId(idx);
                      if (opt === session.chaiProblem.answer) {
                        setHumanVerified(true);
                        setErrorMessage(null);
                        setVerifyFeedback("✦ Only a real one knows this pain — Certified Human!");
                      } else {
                        setHumanVerified(false);
                        setVerifyFeedback("🤖 Bots don't live this struggle. Pick the real answer!");
                      }
                    }}
                    className={`p-2.5 rounded-xl border-2 text-[11px] font-bold text-center transition-all ${
                      selectedOptionId === idx
                        ? opt === session.chaiProblem.answer
                          ? "bg-health-500/40 dark:bg-emerald-500/30 border-ink dark:border-emerald-400 shadow-sm text-ink dark:text-white"
                          : "bg-flame-200 dark:bg-red-950/70 border-ink dark:border-red-500 shadow-sm text-ink dark:text-white"
                        : "bg-surface/90 dark:bg-white/10 border-ink/40 dark:border-white/20 hover:border-ink dark:hover:border-white/50 hover:bg-lilac-100/50 dark:hover:bg-white/20 text-ink dark:text-white"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Verification Status Feedback */}
          {verifyFeedback && (
            <div
              className={`mt-2.5 flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border ${
                humanVerified
                  ? "bg-health-500 text-ink border-ink"
                  : "bg-flame-200 dark:bg-red-950/70 text-ink dark:text-red-200 border-ink dark:border-red-500/50"
              }`}
            >
              {humanVerified ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <ShieldCheck className="w-3.5 h-3.5 shrink-0" />}
              <span>{verifyFeedback}</span>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-flame-100 dark:bg-red-950/70 border-2 border-ink dark:border-red-500/50 text-ink dark:text-red-200 text-xs font-bold space-y-2">
            <p>{errorMessage}</p>
            {isExistingAccount && (
              <Button
                type="button"
                onClick={() => navigate("/login", { state: { email: email.trim().toLowerCase() } })}
                className="w-full h-9 text-xs font-black uppercase tracking-wider bg-[#1C192B] dark:bg-signal-500 text-white dark:text-[#1C192B] hover:bg-[#342D4C] dark:hover:bg-signal-400 rounded-xl border-2 border-ink dark:border-signal-400 shadow-sm"
              >
                Sign In to Your Account →
              </Button>
            )}
          </div>
        )}

        <Button
          type="submit"
          className={`w-full h-11 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md border-2 ${
            humanVerified
              ? "bg-[#1C192B] dark:bg-signal-500 text-white dark:text-[#1C192B] hover:bg-[#342D4C] dark:hover:bg-signal-400 border-ink dark:border-signal-400 dark:shadow-[0_4px_20px_rgba(242,207,67,0.3)] cursor-pointer"
              : "bg-ink/10 dark:bg-white/10 text-ink-muted dark:text-white/40 border-ink/20 dark:border-white/10 cursor-not-allowed opacity-70"
          }`}
          isLoading={register.isPending || login.isPending}
          disabled={register.isPending || login.isPending || !humanVerified}
        >
          <span>
            {register.isPending
              ? "Saving to Database..."
              : login.isPending
              ? "Logging into Session..."
              : humanVerified
              ? "Create Account & Continue"
              : "Verify Human Status to Continue"}
          </span>
          <span className="ml-1 text-signal-500 dark:text-[#1C192B]">✦</span>
        </Button>
      </form>

      <p className="mt-4 pt-3 border-t-2 border-[#1C192B]/10 dark:border-white/15 text-center text-xs font-semibold text-[#4B4660] dark:text-[#D5D1E8]">
        Already have an account?{" "}
        <Link to="/login" className="font-bold text-violet-800 dark:text-signal-400 hover:text-violet-950 dark:hover:text-signal-300 underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
