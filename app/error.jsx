"use client";
import { useEffect, useState } from "react";
export default function Error({ error, reset }) {
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (tries < 2) { const t = setTimeout(() => { setTries(n => n + 1); reset(); }, 1000); return () => clearTimeout(t); }
  }, [tries, reset]);
  return <main className="hero2 container" style={{ minHeight: "70vh" }}>
    <div className="badge ok">Preparing your workspace</div>
    <h1 style={{ fontSize: 46 }}>Just a moment…</h1>
    <p className="lead">We are reconnecting your dashboard automatically. Your data is safe.</p>
    <button className="btn" onClick={() => { setTries(n => n + 1); reset(); }}>Continue to dashboard</button>
  </main>;
}
