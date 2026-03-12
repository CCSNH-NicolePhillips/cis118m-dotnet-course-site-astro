/**
 * Site Announcements
 * 
 * Add new announcements to the top of this array.
 * Each announcement has a unique `id` — once a user dismisses it, 
 * that id is stored in localStorage so it won't show again.
 * 
 * Set `active: false` to permanently hide an old announcement.
 */

export interface Announcement {
  /** Unique identifier — used as localStorage key. Use format: YYYY-MM-DD-slug */
  id: string;
  /** Date string shown in the header */
  date: string;
  /** Short title */
  title: string;
  /** Emoji or icon character shown next to title */
  icon: string;
  /** 
   * HTML content of the announcement body.
   * Supports full HTML — tables, lists, bold, etc.
   */
  body: string;
  /** Whether this announcement is currently active */
  active: boolean;
  /** ISO date string — don't show this announcement before this time */
  startsAt?: string;
  /** ISO date string — hide this announcement after this time (auto-expires) */
  expiresAt?: string;
}

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: '2026-03-12-spring-break',
    date: 'March 12, 2026',
    title: 'Spring Break — No Class or Work Due',
    icon: '🌴',
    active: true,
    startsAt: '2026-03-12T00:00:00',
    expiresAt: '2026-03-22T23:59:59',
    body: `
      <p style="margin-bottom:16px; font-size:15px;">Architects,</p>

      <p style="margin-bottom:16px;">Enjoy your spring break! There is <strong>no class and no assignments due</strong> this week. Take the time to rest and recharge.</p>

      <div style="background:#0f2a1a; border:1px solid #22c55e; border-radius:8px; padding:16px 20px; margin:18px 0; text-align:center;">
        <div style="font-size:28px; margin-bottom:8px;">🌴</div>
        <div style="font-size:16px; font-weight:700; color:#4ade80; margin-bottom:4px;">Spring Break</div>
        <div style="font-size:13px; color:#86efac;">March 15 – March 22, 2026</div>
      </div>

      <p style="margin-bottom:12px; color:#ccc;">We will resume normal coursework on <strong style="color:#e2e8f0;">Monday, March 23</strong>. See you then!</p>

      <p style="margin-top:20px; color:#888; font-size:13px;">
        — Prof. P<br/>
        <span style="font-size:12px;">Adjunct Professor, MCC</span>
      </p>
    `
  },
  {
    id: '2026-03-02-integrity-telemetry',
    date: 'March 2, 2026',
    title: 'Code Integrity & Telemetry Protocols',
    icon: '🛡️',
    active: true,
    body: `
      <p style="margin-bottom:14px;">Architects,</p>
      
      <p style="margin-bottom:14px;">As we transition into advanced logic structures, it is necessary to formalize the role of <strong>Generative AI</strong> within this curriculum. While the use of AI is encouraged as a developmental tool for debugging and conceptual explanation, it is <strong>not a replacement for manual engineering</strong>.</p>
      
      <h4 style="color:#60a5fa; margin:18px 0 10px; font-size:14px;">🔧 Implementation of Telemetry Tracking</h4>
      <p style="margin-bottom:10px;">Effective immediately, the course code editors have been updated to capture granular telemetry data during the lab and homework submission process.</p>
      
      <table style="width:100%; border-collapse:collapse; margin:12px 0 18px; font-size:13px;">
        <thead>
          <tr style="border-bottom:1px solid #333;">
            <th style="text-align:left; padding:8px 12px; color:#60a5fa;">Metric Captured</th>
            <th style="text-align:left; padding:8px 12px; color:#60a5fa;">Architectural Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid #222;">
            <td style="padding:8px 12px; color:#e2e8f0;">Keystroke Count</td>
            <td style="padding:8px 12px; color:#aaa;">Verification of manual code construction.</td>
          </tr>
          <tr style="border-bottom:1px solid #222;">
            <td style="padding:8px 12px; color:#e2e8f0;">Paste Events</td>
            <td style="padding:8px 12px; color:#aaa;">Monitoring the frequency and volume of external code imports.</td>
          </tr>
          <tr>
            <td style="padding:8px 12px; color:#e2e8f0;">Active Edit Time</td>
            <td style="padding:8px 12px; color:#aaa;">Measuring the real-time engineering duration of the lab.</td>
          </tr>
        </tbody>
      </table>
      
      <h4 style="color:#60a5fa; margin:18px 0 10px; font-size:14px;">🤖 AI Pattern Recognition and Detection</h4>
      <p style="margin-bottom:10px;">It is important to understand that Generative AI produces code using <strong>highly distinct, recognizable patterns</strong> that differ significantly from human-engineered logic. Our internal detection systems are specifically calibrated to identify these patterns with near-certainty.</p>
      
      <ul style="margin:10px 0 14px 20px; color:#ccc; line-height:1.8;">
        <li><strong style="color:#e2e8f0;">Automated Forensic Analysis:</strong> All submitted code is scanned for AI-specific syntax patterns and metadata anomalies.</li>
        <li><strong style="color:#e2e8f0;">Integrity Reporting:</strong> Telemetry and pattern reports are stored permanently and are viewable in the Instructor Dashboard.</li>
        <li><strong style="color:#e2e8f0;">Academic Recording:</strong> Submissions identified as purely AI-generated will be flagged and archived.</li>
      </ul>
      
      <p style="margin-top:16px; padding:12px; background:#111; border-left:3px solid #f59e0b; border-radius:4px; color:#ccc; font-size:13px;">
        The goal of this course is to develop your <strong>cognitive patterns for senior-level engineering</strong>. Bypassing the manual coding process via AI generation prevents the development of the foundational skills required to succeed in subsequent weeks.
      </p>
      
      <p style="margin-top:16px; color:#888; font-size:13px;">
        — Prof. P<br/>
        <span style="font-size:12px;">Adjunct Professor, MCC</span>
      </p>
    `
  }
];
