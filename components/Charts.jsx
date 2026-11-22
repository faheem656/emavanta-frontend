'use client';
import { useMemo, useState } from 'react';

/** Smooth multi-series area chart with grid, gradient fill and a hover readout. */
export function AreaChart({ series = [], labels = [], height = 230, unit = '' }) {
  const [hover, setHover] = useState(null);
  const W = 720, H = height, PAD = { t: 14, r: 12, b: 26, l: 40 };
  const all = series.flatMap(s => s.values || []);
  const max = Math.max(...all, 1);
  const min = 0;
  const x = i => PAD.l + (i / Math.max(labels.length - 1, 1)) * (W - PAD.l - PAD.r);
  const y = v => PAD.t + (1 - (v - min) / (max - min || 1)) * (H - PAD.t - PAD.b);
  const path = values => values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const smooth = values => {
    if (values.length < 3) return path(values);
    let d = `M${x(0)},${y(values[0])}`;
    for (let i = 0; i < values.length - 1; i++) {
      const cx = (x(i) + x(i + 1)) / 2;
      d += ` C${cx},${y(values[i])} ${cx},${y(values[i + 1])} ${x(i + 1)},${y(values[i + 1])}`;
    }
    return d;
  };
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(max * (1 - t)));
  return <div className="chart-wrap">
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" onMouseLeave={() => setHover(null)}
      onMouseMove={e => {
        const r = e.currentTarget.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * W;
        const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (labels.length - 1));
        if (i >= 0 && i < labels.length) setHover(i);
      }}>
      <defs>
        {series.map((s, i) => <linearGradient key={i} id={`ac-${i}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={s.color} stopOpacity=".28" /><stop offset="1" stopColor={s.color} stopOpacity="0" />
        </linearGradient>)}
      </defs>
      {ticks.map((t, i) => <g key={i}>
        <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#eef2f8" strokeWidth="1" />
        <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#9aa9bf">{t >= 1000 ? `${Math.round(t / 1000)}k` : t}</text>
      </g>)}
      {series.map((s, i) => <g key={i}>
        <path d={`${smooth(s.values)} L${x(s.values.length - 1)},${y(min)} L${x(0)},${y(min)} Z`} fill={`url(#ac-${i})`} />
        <path d={smooth(s.values)} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinecap="round" />
      </g>)}
      {labels.map((l, i) => (labels.length <= 8 || i % Math.ceil(labels.length / 7) === 0) &&
        <text key={`l-${i}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#9aa9bf">{l}</text>)}
      {hover !== null && <>
        <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="#c7d7ee" strokeDasharray="3 3" />
        {series.map((s, i) => <circle key={i} cx={x(hover)} cy={y(s.values[hover] || 0)} r="4" fill={s.color} stroke="#fff" strokeWidth="2" />)}
      </>}
    </svg>
    <div className="chart-legend">
      {series.map(s => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}
    </div>
    {hover !== null && <div className="chart-tip" style={{ left: `${(hover / Math.max(labels.length - 1, 1)) * 88 + 4}%` }}>
      <b>{labels[hover]}</b>
      {series.map(s => <div key={s.name}><i style={{ background: s.color }} />{s.name}: <b>{s.values[hover] ?? 0}{unit}</b></div>)}
    </div>}
  </div>;
}

export function Sparkline({ values = [], color = '#2563eb' }) {
  const max = Math.max(...values, 1), min = Math.min(...values, 0), range = max - min || 1;
  const pts = values.map((v, i) => `${(i / Math.max(values.length - 1, 1)) * 100},${34 - ((v - min) / range) * 28}`).join(' ');
  const id = `sg-${color.replace('#', '')}`;
  return <svg className="spark" viewBox="0 0 100 36" preserveAspectRatio="none">
    <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stopColor={color} stopOpacity=".3" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
    <polygon points={`0,36 ${pts} 100,36`} fill={`url(#${id})`} />
    <polyline points={pts} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    {values.length > 0 && <circle cx={100} cy={34 - ((values[values.length - 1] - min) / range) * 28} r="2.5" fill={color} />}
  </svg>;
}

export function Donut({ segments = [], size = 168, label = 'TOTAL' }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0; const r = 56, c = 2 * Math.PI * r;
  return <svg width={size} height={size} viewBox="0 0 150 150">
    <circle cx="75" cy="75" r={r} fill="none" stroke="#eef2f8" strokeWidth="16" />
    {segments.map((s, i) => {
      const len = (s.value / total) * c;
      const el = <circle key={i} cx="75" cy="75" r={r} fill="none" stroke={s.color} strokeWidth="16"
        strokeLinecap="butt" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} transform="rotate(-90 75 75)" />;
      acc += len; return el;
    })}
    <text x="75" y="72" textAnchor="middle" fill="#12233a" fontSize="22" fontWeight="800">{total.toLocaleString()}</text>
    <text x="75" y="88" textAnchor="middle" fill="#93a5bd" fontSize="9" letterSpacing="1">{label}</text>
  </svg>;
}

export function Bars({ data = [], height = 150, highlight }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return <div className="bars-chart" style={{ height }}>
    {data.map((d, i) => <div key={i} className="bars-col">
      <div className="bars-val">{d.value > 0 ? (d.value > 999 ? `${Math.round(d.value / 100) / 10}k` : d.value) : ''}</div>
      <div className={`bars-bar ${highlight === i ? 'hot' : ''}`} title={`${d.label}: ${d.value}`}
        style={{ height: `${Math.max(5, (d.value / max) * (height - 46))}px`, background: highlight === i ? 'linear-gradient(180deg,#6d5ce7,#4c3fd0)' : 'linear-gradient(180deg,#c9dcfa,#eaf1fb)' }} />
      <div className="muted bars-label">{d.label}</div>
    </div>)}
  </div>;
}

export function Ring({ pct = 0, size = 74, color = '#2563eb', label }) {
  const r = 28, c = 2 * Math.PI * r;
  return <div className="ring" style={{ width: size, height: size }}>
    <svg viewBox="0 0 70 70"><circle cx="35" cy="35" r={r} fill="none" stroke="#eef2f8" strokeWidth="7" />
      <circle cx="35" cy="35" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${(Math.min(100, pct) / 100) * c} ${c}`} transform="rotate(-90 35 35)" /></svg>
    <span>{label ?? `${Math.round(pct)}%`}</span>
  </div>;
}
