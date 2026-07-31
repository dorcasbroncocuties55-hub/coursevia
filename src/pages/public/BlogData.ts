// ── Shared blog data used by both the listing and article pages ───────────────

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  featured?: boolean;
  accentClass: string; // single tailwind bg colour class — no gradients
  body: string; // plain paragraphs separated by \n\n, headings with ## prefix
};

export const CATEGORIES = [
  "All",
  "Learning",
  "Coaching",
  "Therapy",
  "Creator Tips",
  "Wellness",
  "Platform",
];

// accentClass uses ONE solid muted colour per category — no rainbow gradients
// Learning   → bg-blue-50   text-blue-700   border-blue-100
// Coaching   → bg-emerald-50 text-emerald-700 border-emerald-100
// Therapy    → bg-violet-50  text-violet-700  border-violet-100
// Creator    → bg-amber-50   text-amber-700   border-amber-100
// Wellness   → bg-teal-50    text-teal-700    border-teal-100
// Platform   → bg-gray-100   text-gray-700    border-gray-200

export const CATEGORY_STYLE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Learning:      { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-100",    dot: "bg-blue-400" },
  Coaching:      { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", dot: "bg-emerald-500" },
  Therapy:       { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-100",  dot: "bg-violet-500" },
  "Creator Tips":{ bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-100",   dot: "bg-amber-400" },
  Wellness:      { bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-100",    dot: "bg-teal-500" },
  Platform:      { bg: "bg-gray-100",   text: "text-gray-600",    border: "border-gray-200",    dot: "bg-gray-400" },
};

export const posts: Post[] = [
  // ── FEATURED ──────────────────────────────────────────────────────────────
  {
    slug: "how-to-pick-the-right-online-coach",
    title: "How to Pick the Right Online Coach (Without Wasting Money)",
    excerpt: "Most people hire the wrong coach because they focus on credentials instead of fit. Here's a practical framework for finding someone who actually moves the needle for you.",
    category: "Coaching",
    readTime: "6 min read",
    date: "Apr 14, 2026",
    featured: true,
    accentClass: "bg-emerald-50",
    body: `## Why credentials aren't enough

Hiring a coach based on their certificate list is like choosing a restaurant by its health inspection score — necessary but not sufficient. The coaches who actually change lives are the ones whose style, energy, and focus area match where you are right now.

## The three questions that matter

Before you book a discovery call, answer these honestly:

**1. What specific outcome do I want in 90 days?**
Vague goals attract vague coaches. "I want to grow my business" is not a goal. "I want to close my first three B2B clients" is.

**2. Do I need accountability or strategy?**
Some coaches are brilliant strategists but terrible at holding you to commitments. Others are relentless accountability partners but light on frameworks. Know which you need.

**3. Have they done what I'm trying to do?**
Lived experience beats theoretical knowledge every time. A business coach who has never run a business is a consultant with a nicer title.

## Red flags to watch for

- They can't give you a clear answer on what results their clients typically see
- They push you to sign a 6-month package before a single session
- Their testimonials are all vague ("life-changing!") with no specifics
- They talk more than they listen on the discovery call

## How to use Coursevia to find the right fit

Browse coach profiles, read their specialisation, and look at their listed services. Most coaches on Coursevia offer a short intro session — use it. Pay attention to whether they ask good questions or just pitch themselves.

The right coach will make you feel slightly uncomfortable in a productive way. If every session feels easy, you're probably not being challenged enough.`,
  },
  {
    slug: "online-therapy-what-to-expect",
    title: "Your First Online Therapy Session: What to Expect and How to Prepare",
    excerpt: "Starting therapy online feels different from walking into an office. Here's how to set yourself up so the first session actually counts.",
    category: "Therapy",
    readTime: "5 min read",
    date: "Apr 12, 2026",
    featured: true,
    accentClass: "bg-violet-50",
    body: `## The first session is not about fixing anything

A lot of people walk into their first therapy session expecting to leave with answers. That's not how it works — and that's okay. The first session is about your therapist understanding your context, your history, and what you're hoping to get out of the process.

Think of it as a mutual interview. You're also deciding whether this person is the right fit for you.

## Practical preparation

**Find a private space.** This sounds obvious but it matters enormously. A parked car, a bedroom with the door locked, or a quiet corner with headphones all work. What doesn't work: a shared office, a coffee shop, or anywhere you'll be self-censoring.

**Test your tech 10 minutes before.** Camera, microphone, internet connection. Nothing derails a session faster than 15 minutes of troubleshooting.

**Write down three things you want to mention.** You don't need an agenda, but having a few anchor points stops you from leaving the session thinking "I forgot to mention the most important thing."

## What your therapist is doing in that first session

They're listening for patterns, not just content. They're noticing how you talk about people in your life, what you avoid, what you return to. They're not judging — they're building a map.

## After the session

It's normal to feel emotionally tired, or even a bit flat. You've just done something that takes real courage. Give yourself the rest of the day to decompress.

If the therapist didn't feel right, that's valid information. Finding the right therapeutic relationship sometimes takes two or three tries. Don't let one mismatch put you off the process entirely.`,
  },
  {
    slug: "creator-pricing-strategy",
    title: "The Creator Pricing Strategy That Doubled My Course Revenue",
    excerpt: "Pricing your course too low signals low value. Too high and nobody buys. This is the exact tiered pricing model that works for digital educators in 2026.",
    category: "Creator Tips",
    readTime: "8 min read",
    date: "Apr 10, 2026",
    featured: true,
    accentClass: "bg-amber-50",
    body: `## The pricing mistake almost every new creator makes

They price based on how long it took to make the course. That's the wrong variable entirely. Price based on the value of the outcome, not the cost of production.

A 2-hour course that helps someone land a $10,000 freelance contract is worth far more than a 20-hour course that teaches them something they could have Googled.

## The three-tier model

**Tier 1 — Core (your main price point)**
This is the course itself. Price it at what a single hour of the outcome's value is worth. If your course helps people save 5 hours a week, and their time is worth $50/hour, that's $250/week in value. A $197 course is a no-brainer.

**Tier 2 — Core + Community**
Add a private community, monthly Q&A, or accountability group. Price this 40–60% higher than Tier 1. Most buyers will choose Tier 1, but the Tier 2 option anchors the value of Tier 1.

**Tier 3 — Done-with-you**
A small group cohort or direct access to you. Price this at 3–5x Tier 1. You'll sell fewer but the revenue per student is dramatically higher.

## Launch pricing vs evergreen pricing

Launch at 30–40% below your intended evergreen price. This rewards early adopters, generates reviews, and gives you data on conversion rates before you commit to a permanent price.

After your first 50 students, raise the price. Every time you raise it, mention it. Scarcity and social proof compound.

## What Coursevia's analytics tell you

Watch your completion rate. If students aren't finishing, the problem is usually pacing or depth — not price. Fix the course before raising the price again.`,
  },

  // ── REGULAR ───────────────────────────────────────────────────────────────
  {
    slug: "science-of-learning-retention",
    title: "The Science of Learning Retention: Why You Forget 70% of What You Watch",
    excerpt: "Video courses are convenient but passive watching doesn't stick. Neuroscience-backed techniques to actually retain what you learn online.",
    category: "Learning",
    readTime: "5 min read",
    date: "Apr 7, 2026",
    accentClass: "bg-blue-50",
    body: `## The forgetting curve is real

Hermann Ebbinghaus mapped it in 1885 and nothing has changed: without active reinforcement, you forget roughly 70% of new information within 24 hours. Video courses make this worse because watching feels like learning but is mostly passive.

## What actually works

**Active recall over re-watching.** After each video section, close the tab and write down everything you remember. This is uncomfortable. That discomfort is the learning happening.

**Spaced repetition.** Review material at increasing intervals — 1 day, 3 days, 1 week, 2 weeks. Apps like Anki automate this. For course content, a simple notes review schedule works fine.

**Teach it immediately.** Explain what you just learned to someone else, or write a short summary as if you're explaining it to a friend. The gaps in your explanation reveal the gaps in your understanding.

**Apply within 48 hours.** Knowledge that isn't used within two days rarely sticks. Build a small project, write a post, or have a conversation using what you learned.

## How to structure your course watching

Don't binge. Watch one module, then stop. Do the recall exercise. Apply something. Come back tomorrow. Slower feels wrong but produces dramatically better retention.`,
  },
  {
    slug: "therapist-online-practice-guide",
    title: "Building a Thriving Online Therapy Practice in 2026",
    excerpt: "From setting boundaries with remote clients to managing your calendar and getting discovered — a practical guide for therapists going digital.",
    category: "Therapy",
    readTime: "7 min read",
    date: "Apr 3, 2026",
    accentClass: "bg-violet-50",
    body: `## The shift to online is permanent

The pandemic accelerated something that was already happening. Clients now expect the option of remote sessions, and many prefer it — no commute, no waiting room anxiety, sessions from their own safe space.

For therapists, this is an opportunity. Your potential client base is no longer limited by geography.

## Setting up your digital practice

**Your profile is your first impression.** On Coursevia, your profile is often the first thing a potential client sees before they ever speak to you. Write your bio in plain language. Avoid jargon. Describe who you work with and what they typically come to you for.

**Boundaries are more important online, not less.** Without the physical separation of an office, the lines can blur. Set clear session times, response windows for messages, and a policy on between-session contact. Communicate these upfront.

**Your calendar is your product.** Clients book based on availability. Keep your calendar updated. Offer a mix of morning, evening, and weekend slots if possible — online clients often have day jobs.

## Getting discovered

Specialise visibly. "Therapist" is too broad. "Therapist specialising in anxiety and career transitions for professionals in their 30s" is searchable, relatable, and memorable.

Ask satisfied clients for a review. Social proof matters enormously in therapy because the stakes feel high to new clients.

## The technical side

A reliable internet connection, good lighting, and a neutral background are non-negotiable. Invest in a decent microphone — audio quality affects how safe clients feel more than video quality does.`,
  },
  {
    slug: "cbt-explained-simply",
    title: "CBT Explained Simply: What It Is, What It Isn't, and When It Helps",
    excerpt: "Cognitive Behavioural Therapy is one of the most researched approaches in psychology — but it's widely misunderstood. Here's a clear breakdown.",
    category: "Therapy",
    readTime: "6 min read",
    date: "Mar 30, 2026",
    accentClass: "bg-violet-50",
    body: `## What CBT actually is

Cognitive Behavioural Therapy is based on a simple but powerful idea: the way we think about events affects how we feel and behave. By identifying and challenging unhelpful thought patterns, we can change our emotional responses and actions.

It's structured, time-limited, and focused on the present. Unlike some other therapeutic approaches, CBT doesn't spend much time on childhood history — it focuses on what's happening now and what you can do about it.

## What CBT isn't

It's not positive thinking. It's not telling yourself everything is fine when it isn't. It's not dismissing difficult emotions.

CBT asks you to examine the evidence for your thoughts. If you think "I always fail at everything," CBT asks: is that literally true? What's the evidence for and against? What's a more accurate way to frame this?

## When CBT works well

CBT has strong evidence for anxiety disorders, depression, OCD, PTSD, and phobias. It's particularly effective when the problem involves specific thought patterns that are driving distress.

It works best when you're willing to do work between sessions — journaling, thought records, behavioural experiments. It's not a passive process.

## When other approaches might be better

For complex trauma, relational issues, or when someone needs to feel deeply understood before they can engage with techniques, approaches like EMDR, psychodynamic therapy, or person-centred therapy may be more appropriate.

A good therapist will tell you honestly which approach fits your situation.`,
  },
  {
    slug: "coursevia-platform-update-q2",
    title: "What's New on Coursevia: Q2 2026 Platform Update",
    excerpt: "New booking flows, wallet improvements, KYC upgrades, and the AI voice assistant — everything we shipped this quarter and what's coming next.",
    category: "Platform",
    readTime: "4 min read",
    date: "Mar 28, 2026",
    accentClass: "bg-gray-100",
    body: `## What we shipped in Q2 2026

This quarter was focused on reliability, speed, and making the core flows feel effortless. Here's what landed.

## Booking flow overhaul

The old booking flow had too many steps and too many points of failure. We rebuilt it from scratch — fewer screens, clearer confirmation states, and instant calendar sync for providers. Booking completion rates are up 34%.

## Wallet and withdrawals

Providers can now see a real-time breakdown of pending, available, and total balance. Withdrawal requests process faster, and we added bank account management directly in the dashboard.

## KYC upgrades

Identity verification is now handled through our integrated KYC provider with a significantly faster turnaround. Most verifications complete within 2 hours instead of 24.

## AI voice assistant

We quietly launched a voice assistant that lives in the bottom corner of the platform. It can answer questions about your account, help you navigate to the right page, and surface relevant courses or providers based on what you're looking for.

## What's coming in Q3

- Improved search with filters for availability, price range, and specialisation
- Group session support for coaches and therapists
- Creator analytics dashboard v2
- Mobile app beta`,
  },
  {
    slug: "deep-work-for-online-learners",
    title: "Deep Work for Online Learners: How to Study Without Distractions",
    excerpt: "Cal Newport's deep work principles applied to video-based learning. Build a study environment that makes focus the default, not the exception.",
    category: "Learning",
    readTime: "6 min read",
    date: "Mar 22, 2026",
    accentClass: "bg-blue-50",
    body: `## The attention economy is working against you

Every app on your phone is engineered to interrupt you. Studying online means you're fighting that environment with willpower alone — and willpower is a finite resource.

The solution isn't more discipline. It's better architecture.

## Time-blocking for learning

Assign specific blocks of time to learning and treat them like meetings you can't cancel. 90-minute blocks work well — long enough to get into flow, short enough to stay sharp.

During those blocks: phone in another room, notifications off, one tab open.

## The environment design principle

Make the desired behaviour easier than the alternative. If your study setup requires you to open the same browser where your social feeds live, you're making it hard on yourself. Use a separate browser profile, a different device, or a full-screen mode that hides everything else.

## The two-minute rule for starting

The hardest part is starting. Commit to just two minutes — open the course, press play. Once you're in motion, continuing is easy. The resistance is almost always at the start.

## Measuring learning, not time

Don't track how long you studied. Track what you can now do or explain that you couldn't before. Time is a proxy metric. Capability is the real one.`,
  },
  {
    slug: "coach-client-retention",
    title: "5 Reasons Your Coaching Clients Don't Come Back (And How to Fix It)",
    excerpt: "Client churn is rarely about your expertise. It's almost always about expectation-setting, communication, and perceived progress. Here's how to fix each one.",
    category: "Coaching",
    readTime: "7 min read",
    date: "Mar 18, 2026",
    accentClass: "bg-emerald-50",
    body: `## 1. They don't feel like they're making progress

Progress needs to be made visible. Clients feel it subjectively but they need to see it objectively. Keep a running record of where they started, what they've done, and what's changed. Reference it regularly.

## 2. The goals shifted but the sessions didn't

Life changes. What a client needed in month one is often different from what they need in month three. Check in explicitly every four to six weeks: "Is this still the right focus? Has anything shifted?"

## 3. You're solving problems instead of building capability

If clients feel dependent on you to figure things out, they'll eventually resent it — or feel like they're not growing. The goal is to make yourself progressively less necessary. Coach them on how to think, not just what to think.

## 4. Sessions feel like check-ins, not investments

If a client leaves a session thinking "that was a nice chat," you haven't done your job. Every session should end with a clear action, a new perspective, or a decision made. Make the value tangible.

## 5. You never asked for feedback

Most clients won't tell you when something isn't working — they'll just quietly not renew. Build in a feedback moment every month. Ask directly: "What's working? What could be better?" The answers will improve your practice and make clients feel heard.`,
  },
  {
    slug: "mental-health-at-work",
    title: "Mental Health at Work: When to Seek Professional Support",
    excerpt: "Stress is normal. Burnout is a warning sign. Knowing the difference — and knowing when to get help — can change the trajectory of your career and your health.",
    category: "Wellness",
    readTime: "5 min read",
    date: "Mar 14, 2026",
    accentClass: "bg-teal-50",
    body: `## The difference between stress and burnout

Stress is a response to pressure. It's temporary, it's tied to specific situations, and it usually resolves when the pressure eases. Burnout is different — it's a state of chronic depletion that doesn't go away with a weekend off.

Signs of burnout: persistent exhaustion that sleep doesn't fix, emotional detachment from work you used to care about, a sense that nothing you do matters, and physical symptoms like headaches or frequent illness.

## When self-care isn't enough

Exercise, sleep, and good nutrition are foundations — not treatments. If you're doing all of those things and still struggling, that's important information. It means the problem is deeper than lifestyle.

This is when professional support becomes not just helpful but necessary.

## What therapy can do for work-related mental health

A therapist can help you identify the patterns that are driving the problem — whether that's perfectionism, difficulty with boundaries, a toxic environment you've normalised, or something from your history that's being activated by your current situation.

They can also help you make decisions. Whether to stay in a role, how to have a difficult conversation with a manager, whether a career change is the right move.

## Finding the right support

On Coursevia, you can browse therapists by specialisation. Look for someone who lists workplace stress, burnout, or career transitions as a focus area. Read their bio carefully — the right fit matters as much as the right credentials.

You don't need to be in crisis to start therapy. Starting before things get bad is always easier than starting after.`,
  },
  {
    slug: "video-course-production-on-budget",
    title: "Professional-Looking Video Courses on a $200 Budget",
    excerpt: "You don't need a studio. A phone, a ring light, and the right framing beats expensive gear every time. The complete budget setup guide for new creators.",
    category: "Creator Tips",
    readTime: "9 min read",
    date: "Mar 12, 2026",
    accentClass: "bg-amber-50",
    body: `## The gear that actually matters

**Camera:** Your phone from the last three years is good enough. Seriously. The camera in a modern smartphone outperforms dedicated cameras that cost hundreds of dollars. Use it in landscape mode, prop it at eye level.

**Microphone:** This is where you should spend money. Bad audio kills courses faster than bad video. A USB condenser microphone ($50–80) will transform your production quality. Record in a small room with soft furnishings — carpets, curtains, and bookshelves absorb echo.

**Lighting:** A single ring light ($30–50) placed slightly above eye level and in front of you is all you need. Natural light from a window works too — just make sure it's in front of you, not behind.

**Background:** Clean and uncluttered. A plain wall, a bookshelf, or a simple backdrop. Avoid anything that moves or distracts.

## The $200 breakdown

- Ring light: $35
- USB microphone: $65
- Phone tripod/mount: $20
- Acoustic foam panels (optional): $30
- Screen recording software (free options exist): $0
- Video editing (DaVinci Resolve is free): $0
- Remaining budget for contingencies: $50

## What matters more than gear

Your energy, your clarity, and your pacing. A high-energy presenter with a phone camera will outsell a boring presenter with a $5,000 camera every time.

Record a test video. Watch it back. Fix the one thing that bothers you most. Then record the real thing.`,
  },
  {
    slug: "anxiety-vs-anxiety-disorder",
    title: "Anxiety vs Anxiety Disorder: Understanding the Line",
    excerpt: "Everyone feels anxious sometimes. But when does normal anxiety become something that needs professional attention? A therapist explains the distinction.",
    category: "Therapy",
    readTime: "6 min read",
    date: "Mar 8, 2026",
    accentClass: "bg-violet-50",
    body: `## Anxiety is not the enemy

Anxiety is a survival mechanism. It sharpens your focus before a presentation, makes you check twice before crossing the road, and motivates you to prepare for things that matter. In appropriate doses, it's useful.

The problem isn't anxiety itself — it's when anxiety becomes disproportionate, persistent, or starts limiting your life.

## The key distinctions

**Proportionality:** Is the level of anxiety proportionate to the actual risk? Feeling nervous before a job interview is proportionate. Being unable to leave the house because something bad might happen is not.

**Duration:** Normal anxiety is tied to a specific trigger and fades when the trigger passes. Anxiety disorder often persists without a clear trigger, or lingers long after the triggering event is over.

**Impairment:** Is the anxiety stopping you from doing things you want or need to do? Avoiding social situations, turning down opportunities, or spending significant time managing worry are signs that anxiety has crossed into disorder territory.

## Common anxiety disorders

- Generalised Anxiety Disorder (GAD): persistent, free-floating worry about multiple areas of life
- Social Anxiety Disorder: intense fear of social situations and judgement
- Panic Disorder: recurrent panic attacks and fear of having more
- Specific Phobias: intense fear of specific objects or situations

## When to seek help

If anxiety is affecting your relationships, your work, your sleep, or your ability to enjoy life — that's enough reason to talk to a professional. You don't need to wait until it's unbearable.

Effective treatments exist. CBT, medication, and other approaches have strong evidence. Most people who seek help see significant improvement.`,
  },
  {
    slug: "learner-goal-setting",
    title: "How to Set Learning Goals That You'll Actually Follow Through On",
    excerpt: "Most learning goals fail not because of motivation but because of structure. Here's a system that works for online courses and self-directed study.",
    category: "Learning",
    readTime: "5 min read",
    date: "Mar 4, 2026",
    accentClass: "bg-blue-50",
    body: `## Why most learning goals fail

"I want to learn Python" is not a goal. It's a wish. Goals fail when they're vague, when there's no deadline, and when there's no clear definition of done.

## The outcome-first approach

Start with the end state. What will you be able to do when you've finished learning? Be specific:

- "I want to build a script that automatically organises my files by date" is a goal.
- "I want to understand machine learning" is not.

Work backwards from the outcome to identify what you actually need to learn. You'll almost always find it's less than you thought.

## The minimum viable commitment

Don't plan to study for two hours every day. Plan to study for 20 minutes every day. The goal is to make the habit frictionless enough that you actually do it.

Once the habit is established, the time naturally expands. Starting with an ambitious schedule and failing in week two is worse than starting small and building momentum.

## Tracking that motivates

A simple streak tracker — even a paper calendar with X marks — is surprisingly effective. The visual chain of consistency becomes its own motivation. Don't break the chain.

## The review checkpoint

Every two weeks, ask: am I closer to the outcome I defined? If not, is the problem the course, the schedule, or the goal itself? Adjust one variable at a time.`,
  },
];
