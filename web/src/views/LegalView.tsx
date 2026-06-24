import { CURRENT_VERSION } from "../changelog";

// Public, auth-free pages mounted at /privacy and /terms (see main.tsx). They
// render standalone — no AuthProvider, no QueryClient, no boot loader — so a
// shared link works for anyone, signed in or not. Navigation between them and
// back to the app uses plain <a href> (a full reload re-reads the pathname).

export type LegalPage = "privacy" | "terms";

const UPDATED = "June 21, 2026";
const CONTACT = "mohammad.akhavan75@gmail.com";

function TopBar({ page }: { page: LegalPage }) {
  return (
    <header className="legal-top">
      <a className="brand" href="/">
        CHECK<b>//</b>POINT
      </a>
      <nav className="legal-nav">
        <a href="/privacy" className={page === "privacy" ? "on" : undefined}>
          Privacy
        </a>
        <span className="sep">·</span>
        <a href="/terms" className={page === "terms" ? "on" : undefined}>
          Terms
        </a>
        <span className="sep">·</span>
        <a href="/">Back to app →</a>
      </nav>
    </header>
  );
}

function Foot() {
  return (
    <footer className="legal-foot">
      <span>CHECKPOINT · v{CURRENT_VERSION}</span>
      <span>
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </span>
    </footer>
  );
}

function PrivacyContent() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <div className="updated">Last updated: {UPDATED}</div>

      <p>
        Checkpoint is a small, independently operated <b>life-continuity tool</b> — it
        helps you resume meaningful work after an interruption by recording where you
        stopped and what to do next. This policy explains what data the app handles, why,
        and the choices you have. It is written to reflect how the app actually works, not
        a generic template.
      </p>

      <div className="callout">
        <b>The short version.</b> Your tasks, notes and checkpoints are private to your
        account. There is no advertising, no analytics or tracking pixels, and your data is
        never sold. The only third party involved is Google — and only for the features you
        choose to use (Google sign-in and the optional, read-only Google&nbsp;Calendar
        mirror).
      </div>

      <h2>Who runs Checkpoint</h2>
      <p>
        Checkpoint is an independent personal project operated by an individual, served at{" "}
        <a href="https://infiniteai.space">infiniteai.space</a>. It is not a company-backed
        commercial product. For any privacy question or request, contact{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <h2>Information we collect</h2>

      <h3>Account information</h3>
      <ul>
        <li>
          <b>Email address</b> — used to identify your account and sign you in.
        </li>
        <li>
          <b>Password</b> — only if you register with email and password. It is stored as a{" "}
          <b>bcrypt hash</b>, never in plain text, and cannot be read back by anyone,
          including the operator.
        </li>
        <li>
          <b>Google account details</b> — if you sign in with Google, we receive and store
          your Google account identifier, email, display name and profile picture URL, as
          provided by Google's sign-in token.
        </li>
      </ul>

      <h3>Content you create</h3>
      <p>
        Everything you put into the app to do its job: tasks, ideas and notes (“items”),
        the domains you organize them under, your <b>checkpoints</b> (the free-text receipts
        describing what changed, problems, the next action and where to resume), optional{" "}
        <b>snapshots</b> (notes you attach to a task), and scheduling details such as
        deadlines and start/end times. This content is private to your account.
      </p>

      <h3>Google Calendar data — only if you connect it</h3>
      <p>
        Connecting your calendar is optional. If you do, Checkpoint keeps a{" "}
        <b>read-only mirror</b> of your events (title, time, location and a link back to
        Google Calendar) so they can appear alongside your tasks. We request only the{" "}
        <span className="mono">calendar.readonly</span> scope — Checkpoint can read your
        calendar but can never create, edit or delete events.
      </p>
      <ul>
        <li>
          We store the email of the Google account the calendar belongs to and a sync token
          used to fetch incremental changes.
        </li>
        <li>
          The Google OAuth tokens that authorize this access (a long-lived refresh token and
          a short-lived access token) are <b>encrypted at rest</b> before being stored.
        </li>
      </ul>

      <h3>Technical data</h3>
      <ul>
        <li>
          <b>Session token.</b> After you sign in, a signed JSON Web Token (JWT) is stored
          in your browser's <span className="mono">localStorage</span> to keep you logged in;
          it expires after about 7&nbsp;days. It is not a third-party tracking cookie.
        </li>
        <li>
          <b>Server logs.</b> The hosting infrastructure may keep standard request logs (such
          as IP address, timestamp and request path) for security and debugging. These are
          not used to build a profile of you.
        </li>
      </ul>

      <h2>How we use your information</h2>
      <ul>
        <li>To operate the app — store and display your items, checkpoints and snapshots.</li>
        <li>To authenticate you and keep your session secure.</li>
        <li>
          To surface the right work at the right time (the Today and Ready views) and, if
          connected, to keep your calendar mirror up to date.
        </li>
        <li>To diagnose problems and protect the service against abuse.</li>
      </ul>
      <p>
        We do <b>not</b> use your content for advertising, profiling, or training machine
        learning models, and we do not run third-party analytics or tracking scripts.
      </p>

      <h2>Google API Services — Limited Use</h2>
      <div className="callout">
        Checkpoint's use and transfer of information received from Google APIs adheres to the{" "}
        <a href="https://developers.google.com/terms/api-services-user-data-policy">
          Google API Services User Data Policy
        </a>
        , including its Limited Use requirements. Calendar data obtained through Google APIs
        is used only to provide and improve the calendar features you have enabled, is never
        sold, is not used for advertising, and is not shared with others except as required
        to run the service or by law.
      </div>

      <h2>Who we share data with</h2>
      <p>We do not sell your data. Data is shared only with the providers needed to run the app:</p>
      <ul>
        <li>
          <b>Google</b> — for Google Sign-In (verifying your identity) and, if you connect a
          calendar, the Google Calendar API. Your interactions with Google are also governed
          by Google's own privacy policy.
        </li>
        <li>
          <b>Google Fonts</b> — the app loads its typefaces from Google's font CDN, so your
          browser's IP address is visible to Google when fonts are fetched.
        </li>
        <li>
          <b>Hosting provider</b> — the infrastructure that runs the application server and
          PostgreSQL database where your account and content are stored.
        </li>
      </ul>
      <p>
        We may also disclose information if required by law or to protect the safety and
        integrity of the service.
      </p>

      <h2>Cookies &amp; local storage</h2>
      <p>
        Checkpoint does not use advertising or tracking cookies. It uses your browser's{" "}
        <span className="mono">localStorage</span> only to hold your session token and small
        UI preferences (for example, which release notes you've seen). The built-in Markdown
        editor runs locally in the app, so editing notes does not send your content to an
        external editor service.
      </p>

      <h2>Data retention &amp; deletion</h2>
      <ul>
        <li>
          <b>Trash.</b> Deleted items go to Trash and are <b>permanently purged 30&nbsp;days
          </b> after deletion. You can restore an item before then.
        </li>
        <li>
          <b>Disconnecting your calendar.</b> When you disconnect Google Calendar, the stored
          OAuth tokens and mirrored events for that connection are removed.
        </li>
        <li>
          <b>Deleting your account.</b> Email{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a> to delete your account. Removing your
          account deletes your items, checkpoints, snapshots, domains and any calendar
          connection.
        </li>
      </ul>

      <h2>Security</h2>
      <ul>
        <li>Passwords are hashed with bcrypt and never stored in plain text.</li>
        <li>Google OAuth tokens are encrypted at rest.</li>
        <li>Traffic is served over HTTPS/TLS, and the API requires a signed session token.</li>
      </ul>
      <p>
        No system is perfectly secure. Checkpoint is a personal project provided on a
        best-effort basis; please keep your password safe and avoid storing highly sensitive
        information you can't afford to lose.
      </p>

      <h2>Your rights</h2>
      <p>
        You can access and edit your content at any time inside the app, and you can ask to
        export, correct or delete your data by contacting{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Depending on where you live, you may have
        additional rights under laws such as the GDPR or CCPA; we will honour valid requests.
      </p>

      <h2>Children</h2>
      <p>
        Checkpoint is not directed at children and is not intended for use by anyone under 16.
        We do not knowingly collect data from children.
      </p>

      <h2>International users</h2>
      <p>
        Your data may be processed and stored on servers located in a country other than your
        own. By using Checkpoint you understand that your information will be handled as
        described in this policy regardless of where it is processed.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        This policy may be updated as the app evolves. Material changes will be reflected by
        the “Last updated” date at the top of this page. Continuing to use Checkpoint after a
        change means you accept the revised policy.
      </p>

      <h2>Contact</h2>
      <p>
        Questions, requests, or concerns? Email{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </>
  );
}

function TermsContent() {
  return (
    <>
      <h1>Terms of Service</h1>
      <div className="updated">Last updated: {UPDATED}</div>

      <p>
        These Terms govern your use of Checkpoint, a personal life-continuity and task tool
        served at <a href="https://infiniteai.space">infiniteai.space</a> (“the Service”). By
        creating an account or using the Service you agree to these Terms. If you do not
        agree, please don't use Checkpoint.
      </p>

      <div className="callout">
        <b>Plain-language summary.</b> Checkpoint is a small personal project shared with a
        limited group of users. It's provided as-is, with no guarantees of uptime or data
        durability — so keep your own backups of anything important. Your content is yours;
        use the Service responsibly.
      </div>

      <h2>The Service</h2>
      <p>
        Checkpoint helps you capture tasks, run focused work sessions, and record{" "}
        <b>checkpoints</b> so you can resume work without rebuilding context from memory. It
        is an independent, non-commercial project offered to a small number of users on a
        limited basis. Features may change, and the Service may be unavailable at times.
      </p>

      <h2>Eligibility &amp; your account</h2>
      <ul>
        <li>You must be at least 16 years old to use Checkpoint.</li>
        <li>
          You are responsible for activity under your account and for keeping your password
          and devices secure. Tell us promptly if you suspect unauthorized access.
        </li>
        <li>Provide accurate account information and one account per person.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Break the law or infringe others' rights using the Service.</li>
        <li>
          Attempt to disrupt, overload, reverse-engineer, probe, or gain unauthorized access
          to the Service or its infrastructure.
        </li>
        <li>Upload malware, or use the Service to store or distribute unlawful content.</li>
        <li>Resell, sublicense, or commercially exploit the Service without permission.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You retain ownership of the items, notes, checkpoints and other content you create.
        You grant the operator only the limited permission needed to host, store, back up and
        display that content so the Service can function for you. You are responsible for the
        content you store and confirm you have the right to store it.
      </p>

      <h2>Google Calendar &amp; third-party services</h2>
      <p>
        If you connect Google Calendar, Checkpoint accesses it on a <b>read-only</b> basis to
        mirror your events; it never modifies your calendar. Your use of Google services is
        also subject to Google's terms. You can disconnect at any time, and you may revoke
        Checkpoint's access from your Google Account settings. Handling of calendar data is
        described in the <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>Availability &amp; “as is” disclaimer</h2>
      <p>
        The Service is provided <b>“as is” and “as available,” without warranties of any
        kind</b>, express or implied, including fitness for a particular purpose, accuracy, or
        non-infringement. There is no guaranteed uptime, support, or backup. The Service may
        change, be suspended, or be discontinued at any time. <b>Keep your own copies of
        anything you can't afford to lose.</b>
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, the operator is not liable for any indirect,
        incidental, or consequential damages, or for any loss of data, profits, or goodwill
        arising from your use of (or inability to use) the Service. The Service is offered free
        of charge and on a best-effort basis.
      </p>

      <h2>Suspension &amp; termination</h2>
      <p>
        You may stop using Checkpoint and request account deletion at any time. We may suspend
        or terminate access if these Terms are violated or if needed to protect the Service or
        its users. On termination, your right to use the Service ends; data deletion is handled
        as described in the <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>Changes to the Service or these Terms</h2>
      <p>
        We may update these Terms as the project evolves; the “Last updated” date reflects the
        latest version. Continued use after changes take effect means you accept the updated
        Terms.
      </p>

      <h2>Governing terms</h2>
      <p>
        These Terms are governed by applicable law in the operator's place of residence. We'll
        always try to resolve any issue informally first — please reach out before pursuing any
        formal dispute.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms? Email{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </>
  );
}

export function LegalView({ page }: { page: LegalPage }) {
  return (
    <div className="legalwrap">
      <TopBar page={page} />
      <article className="legal-doc">
        {page === "privacy" ? <PrivacyContent /> : <TermsContent />}
      </article>
      <Foot />
    </div>
  );
}
