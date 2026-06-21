export interface GameRuleSection {
  key: string;
  title: string;
  start: number;
  rules: string[];
}

const sections: Array<Omit<GameRuleSection, "start">> = [
  {
    key: "general",
    title: "General game rules",
    rules: [
      "Use Waves Arcade only for lawful personal entertainment.",
      "Treat other players, support staff, and administrators with respect.",
      "Do not disrupt the service or another player's ability to play.",
      "Follow these rules on every device, browser, and network you use.",
      "Do not pretend to be Waves Arcade staff or an administrator.",
      "Do not publish misleading claims about official events or rewards.",
      "Report security issues privately through Support.",
      "Do not encourage another player to break these rules.",
      "Rules may be updated to protect fairness, security, and legal compliance."
    ]
  },
  {
    key: "guest",
    title: "Guest player rules",
    rules: [
      "Guests may play without creating an account.",
      "Guest scores are local and are not submitted to the global leaderboard.",
      "Guest progress may be lost when browser data is cleared.",
      "Guest progress does not automatically transfer between devices.",
      "Guests may use only the basic themes, controls, and free customizations shown as available.",
      "Guests may preview locked items but may not equip or buy them.",
      "Guest local data is not proof of ownership, payment, or leaderboard rank.",
      "Manipulated guest data will not be transferred to an account.",
      "Guests must provide a valid reply email when contacting Support."
    ]
  },
  {
    key: "account",
    title: "Account rules",
    rules: [
      "Provide accurate account information and a valid email address.",
      "One person must not create large numbers of accounts to abuse rewards or rankings.",
      "Selling, renting, trading, or giving away an account is prohibited.",
      "Using another person's account without clear authorization is prohibited.",
      "Account names must not impersonate staff or contain abusive content.",
      "You are responsible for activity performed through your account.",
      "Do not use an account created with stolen or automated identity data.",
      "Do not evade an account restriction by creating or using another account.",
      "Account benefits may be removed when they were obtained through abuse or error."
    ]
  },
  {
    key: "password",
    title: "Password and security rules",
    rules: [
      "Use a strong password that you do not reuse on another service.",
      "Never share your password with players, Support, or administrators.",
      "Waves Arcade staff will never ask you to send your password.",
      "Do not request, collect, or store another player's password.",
      "Temporary passwords must be changed immediately after login.",
      "Report suspected account access through Support as soon as possible.",
      "Do not share access tokens, reset links, verification codes, or session cookies.",
      "Using stolen tokens or credentials is prohibited.",
      "Attempts to access the admin panel without authorization are prohibited."
    ]
  },
  {
    key: "score",
    title: "Score and leaderboard rules",
    rules: [
      "Only scores produced by a valid authenticated game session may enter the leaderboard.",
      "Guests cannot submit scores to the global leaderboard.",
      "Score inflation, score fabrication, or score boosting is prohibited.",
      "A score may be held for review when it exceeds reasonable game limits.",
      "A suspicious score is not guaranteed to be restored.",
      "Repeated impossible scores may lead to score removal or account restrictions.",
      "Leaderboard visibility may be restricted without blocking normal gameplay.",
      "Hidden or rejected scores must not be resubmitted through technical workarounds.",
      "Administrator approval of one score does not validate unrelated scores."
    ]
  },
  {
    key: "antiCheat",
    title: "Anti-cheat rules",
    rules: [
      "Do not modify localStorage, sessionStorage, IndexedDB, or cookies to gain an advantage.",
      "Do not alter, replay, forge, or substitute API requests.",
      "Bots, scripts, macros, and automated gameplay are prohibited.",
      "Auto-clickers and automated input tools are prohibited.",
      "Modified clients, injected scripts, and unauthorized browser extensions are prohibited.",
      "Do not change game memory, timers, network messages, or score calculations.",
      "Using bugs or exploits for score, currency, unlocks, or rewards is prohibited.",
      "Knowingly hiding a serious exploit instead of reporting it may lead to restrictions.",
      "Do not disable or bypass integrity, session, rate-limit, or anti-cheat checks."
    ]
  },
  {
    key: "shop",
    title: "Skins, shop and rewards rules",
    rules: [
      "Skins and themes are licenses for in-game use and are not cash or property.",
      "Premium skins may be used only after a valid purchase, grant, or unlock.",
      "Creating fake rewards or unlock events is prohibited.",
      "Do not equip premium items through a modified client or API request.",
      "Currency balances shown by a modified client are not valid server balances.",
      "Reward claims must follow the displayed cooldowns and eligibility rules.",
      "Chargeback, payment, and shop disputes must be sent through Support.",
      "Items obtained from a confirmed exploit may be removed.",
      "Administrators may grant or remove an item only through logged admin actions."
    ]
  },
  {
    key: "ads",
    title: "Ads and rewarded ads rules",
    rules: [
      "Rewarded-ad benefits require a confirmed completed ad event.",
      "Closing or skipping an ad does not guarantee a reward.",
      "Do not fake, replay, automate, or forge ad completion events.",
      "Do not use bots or scripts to farm ad rewards.",
      "Advertising is not shown over active gameplay by design.",
      "Guests may see more non-rewarded ads than logged-in players.",
      "Ad availability depends on provider, country, age, consent, and inventory.",
      "Repeated reward requests without completed ads may be rejected.",
      "Ad blockers may prevent optional rewarded features from working."
    ]
  },
  {
    key: "support",
    title: "Support and appeal rules",
    rules: [
      "Never include a password, token, secret key, or full payment credential in a ticket.",
      "Support will never ask for your current or old password.",
      "Support can assist with secure password reset but cannot reveal an old password.",
      "Spam tickets, duplicate flooding, and automated ticket creation are prohibited.",
      "Offensive, threatening, discriminatory, or harassing support messages are prohibited.",
      "False reports and fabricated evidence are prohibited.",
      "Support may close tickets that are spam, abusive, unrelated, or already resolved.",
      "Appeals must explain the decision being appealed and provide relevant identifiers when available.",
      "Submitting an appeal does not automatically pause a restriction."
    ]
  },
  {
    key: "bans",
    title: "Ban and restriction rules",
    rules: [
      "Possible actions include warnings, feature restrictions, score resets, temporary bans, and permanent bans.",
      "Restrictions may apply only to Support, Shop, rewards, scores, or the leaderboard.",
      "Temporary actions end at the displayed time unless extended for a documented reason.",
      "Permanent bans do not expire automatically.",
      "Ban evasion through another account, device, token, or network is prohibited.",
      "A score may be hidden while the related account remains playable.",
      "Rewards obtained through abuse may be removed independently of a ban.",
      "Administrators must provide a reason for sanctions and record the action.",
      "Abuse of the appeal process may lead to a support restriction."
    ]
  },
  {
    key: "privacy",
    title: "Privacy and data rules",
    rules: [
      "Do not publish another player's private information.",
      "Do not collect player emails, identifiers, or profile data through the game.",
      "Only necessary account and security data should be shared with Support.",
      "Guest data stored in the browser is controlled by that browser and device.",
      "Server data may be used to investigate fraud, cheating, security, and support requests.",
      "Administrator tools must not expose private data without a legitimate need.",
      "Audit logs must not contain passwords, hashes, tokens, or secret keys.",
      "Leaderboard privacy settings may hide a profile while preserving score integrity.",
      "Requests concerning personal data must be sent through the official Support channel."
    ]
  },
  {
    key: "admin",
    title: "Administrator and enforcement rules",
    rules: [
      "Administrators may review suspicious scores, session history, restrictions, and related audit records.",
      "Administrators must not view, request, or disclose a player's password.",
      "A temporary password generated by an administrator is displayed only once and stored only as a secure hash.",
      "Every sensitive administrator action must be written to an audit log.",
      "Administrative decisions must use the available evidence and a clear reason.",
      "Trusted status does not exempt a player from future anti-cheat checks.",
      "An approved appeal may remove a restriction or restore an eligible score.",
      "A rejected appeal must not be used as a reason for harassment or retaliation.",
      "Security, law, provider requirements, or urgent abuse may require immediate action without advance notice."
    ]
  }
];

let nextRuleNumber = 1;
export const gameRuleSections: GameRuleSection[] = sections.map((section) => {
  const result = { ...section, start: nextRuleNumber };
  nextRuleNumber += section.rules.length;
  return result;
});
