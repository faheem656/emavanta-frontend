'use client';
export default function SessionLoading(){
 return <div className="session-screen" role="status" aria-live="polite">
  <div className="session-orb session-orb-one" aria-hidden="true"/><div className="session-orb session-orb-two" aria-hidden="true"/>
  <main className="session-card">
   <div className="session-logo"><img src="/emavanta-mark.webp" alt=""/><span>emavanta</span></div>
   <div className="session-illustration" aria-hidden="true"><div className="session-ring"/><div className="session-ring session-ring-alt"/><div className="session-center"><svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 2.5l7 3v5.3c0 4.7-2.9 8.6-7 10.2-4.1-1.6-7-5.5-7-10.2V5.5l7-3z" stroke="currentColor" strokeWidth="1.6"/><path d="M9 11.8l2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg></div></div>
   <span className="session-eyebrow">YOUR WORKSPACE, SECURELY</span><h1>Getting everything ready<span className="session-dot">.</span></h1>
   <p>We're making sure it's really you before opening your workspace.</p>
   <div className="session-progress"><i/></div><div className="session-bottom"><span><i/> Secure connection</span><span>Just a moment</span></div>
  </main>
 </div>;
}
