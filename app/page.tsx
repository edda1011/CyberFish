import AnalyzerSwitcher from "./components/analyzer-switcher";

const LockIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></svg>
);

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.7 20h18.6L12 3Z" /><path d="M12 9v5M12 17.5v.1" /></svg>
);

const BrandMark = () => (
  <span className="brand-mark" aria-hidden="true">
    <svg viewBox="0 0 32 32"><path d="M16 3.5 26 7v7.4c0 6.4-4.2 11.4-10 14.1C10.2 25.8 6 20.8 6 14.4V7l10-3.5Z" /><path d="M10.2 16c2.8-3.8 7.3-5.2 11.7-3.6-1.8 4.6-6.4 7.1-11.7 3.6Zm0 0-2.1 2.1m8.6-4.9.1.1" /></svg>
  </span>
);

export default function Home() {
  return (
    <main id="top">
      <section className="ocean-shell">
        <div className="sonar" aria-hidden="true"><span /><span /><span /><i /></div>
        <header className="site-header">
          <a className="brand" href="#top" aria-label="CyberFish home"><BrandMark /><span>CyberFish</span></a>
          <nav aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#everyday">Stay safe</a>
            <a href="#privacy">Privacy</a>
            <a className="privacy-chip" href="#privacy"><LockIcon /> Private by default</a>
          </nav>
        </header>

        <div className="hero">
          <div className="hero-copy">
            <h1>Not sure about a link?<br /><span>Check it before you open it.</span></h1>
            <p>CyberFish helps you spot phishing and scams, then explains what to do next in plain English.</p>
            <div className="hero-privacy"><span><LockIcon /></span><div><strong>Private by default</strong><small>Nothing you check is saved.</small></div></div>
          </div>

          <AnalyzerSwitcher />
        </div>
      </section>

      <section className="guidance-shell" id="how-it-works">
        <div className="guidance-grid">
          <article className="warning-panel" aria-label="Example analysis result">
            <div className="warning-heading"><span><AlertIcon /></span><div><h2>Some warning signs</h2><p>Don&apos;t open this link yet.</p></div><small>EXAMPLE</small></div>
            <div className="result-columns">
              <div>
                <h3>Why it looks suspicious</h3>
                <ul className="reason-list">
                  <li><span>1</span>The domain doesn&apos;t match the company it claims to be.</li>
                  <li><span>2</span>A shortened address hides where the link really goes.</li>
                  <li><span>3</span>The domain appears to be newly registered.</li>
                </ul>
              </div>
              <div className="next-step">
                <h3>What to do next</h3>
                <p>Close the message and don&apos;t enter any information.</p>
                <p>Contact the company through an official app or website you already trust.</p>
              </div>
            </div>
            <p className="disclaimer">A risk check provides guidance, not a guarantee of safety.</p>
          </article>

          <div className="moments" id="everyday">
            <div className="section-heading"><h2>Made for everyday moments</h2><p>Pause, check, then decide.</p></div>
            <div className="moment-list">
              <article><span className="moment-icon delivery" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7zM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg></span><div><h3>Delivery message</h3><p>Check unexpected tracking or parcel links before you tap.</p></div></article>
              <article><span className="moment-icon bank" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m3 9 9-5 9 5M5 10h14M6 10v7m4-7v7m4-7v7m4-7v7M4 18h16M3 21h18" /></svg></span><div><h3>Bank email</h3><p>Verify payment and account links through an official channel.</p></div></article>
              <article><span className="moment-icon account" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></svg></span><div><h3>Account alert</h3><p>Double-check urgent sign-in or security notifications.</p></div></article>
            </div>
            <div className="privacy-banner" id="privacy"><span><LockIcon /></span><div><strong>Your privacy comes first</strong><p>CyberFish does not store submitted content. URL reputation checks use Google Safe Browsing; email text is sent to Gemini only when you turn on AI analysis.</p></div></div>
          </div>
        </div>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top"><BrandMark /><span>CyberFish</span></a>
        <p>Clear evidence. Safer next steps.</p>
        <div className="footer-links"><a href="#how-it-works">How it works</a><a href="#privacy">Privacy</a><span>Part 4D · Optional AI analysis</span></div>
      </footer>
    </main>
  );
}
