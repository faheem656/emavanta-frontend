'use client';

export function SkeletonBlock({ className = '', style = {} }) {
  return <span className={`skeleton-block ${className}`} style={style} aria-hidden="true" />;
}

export function CardGridSkeleton({ count = 4, columns = 2 }) {
  return <div className={`skeleton-card-grid cols-${columns}`} aria-hidden="true">
    {Array.from({ length: count }, (_, index) => <div className="skeleton-card" key={index}>
      <SkeletonBlock className="skeleton-circle" />
      <SkeletonBlock style={{ width: `${54 + (index % 3) * 10}%`, height: 10, marginTop: 18 }} />
      <SkeletonBlock style={{ width: `${75 - (index % 2) * 12}%`, height: 22, marginTop: 10 }} />
      <SkeletonBlock style={{ width: '92%', height: 8, marginTop: 14 }} />
      <SkeletonBlock style={{ width: '64%', height: 8, marginTop: 7 }} />
    </div>)}
  </div>;
}

export function ListSkeleton({ count = 4 }) {
  return <div className="skeleton-list" aria-hidden="true">
    {Array.from({ length: count }, (_, index) => <div className="skeleton-list-row-card" key={index}>
      <SkeletonBlock className="skeleton-circle" />
      <span><SkeletonBlock style={{ width: `${112 + (index % 3) * 18}px`, height: 9 }} />
        <SkeletonBlock style={{ width: `${155 + (index % 2) * 20}px`, height: 7, marginTop: 9 }} /></span>
      <SkeletonBlock style={{ width: 52, height: 17, marginLeft: 'auto' }} />
    </div>)}
  </div>;
}

export function TableSkeleton({ rows = 5, columns = 5 }) {
  return <div className="skeleton-table-wrap" aria-hidden="true">
    <div className="skeleton-table-head" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {Array.from({ length: columns }, (_, index) => <SkeletonBlock key={index} style={{ width: `${48 + (index % 3) * 12}%`, height: 8 }} />)}
    </div>
    {Array.from({ length: rows }, (_, row) => <div className="skeleton-table-row" key={row} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {Array.from({ length: columns }, (_, col) => <SkeletonBlock key={col} style={{ width: `${54 + ((row + col) % 3) * 12}%`, height: 9 }} />)}
    </div>)}
  </div>;
}

export default function DashboardSkeleton({ variant = 'overview', showHeader = true }) {
  return <div className={`page-skeleton page-skeleton-${variant}`} role="status" aria-label="Dashboard data loading">
    {showHeader && <div className="skeleton-page-head">
      <div><SkeletonBlock style={{ width: variant === 'admin' ? 250 : 165, height: 21 }} />
        <SkeletonBlock style={{ width: variant === 'admin' ? 325 : 290, height: 9, marginTop: 10 }} /></div>
      <div className="skeleton-head-actions"><SkeletonBlock style={{ width: 106, height: 35 }} /><SkeletonBlock style={{ width: 126, height: 35 }} /></div>
    </div>}

    {variant === 'admin' ? <>
      <div className="skeleton-tabs">{[0, 1, 2, 3, 4].map(i => <SkeletonBlock key={i} style={{ width: 116 + (i % 2) * 28, height: 36 }} />)}</div>
      <div className="skeleton-admin-grid">
        {[0, 1, 2].map(i => <div className="skeleton-card" key={i}>
          <SkeletonBlock style={{ width: 132 + i * 18, height: 13 }} />
          <SkeletonBlock style={{ width: '88%', height: 9, marginTop: 20 }} />
          <SkeletonBlock style={{ width: '72%', height: 9, marginTop: 10 }} />
          <SkeletonBlock style={{ width: '80%', height: 9, marginTop: 10 }} />
        </div>)}
      </div>
      <div className="skeleton-card skeleton-admin-table"><SkeletonBlock style={{ width: 190, height: 13 }} /><TableSkeleton rows={4} columns={4} /></div>
    </> : <>
      <div className="skeleton-kpis">{[0, 1, 2, 3].map(i => <div className="skeleton-card" key={i}>
        <div className="skeleton-kpi-top"><SkeletonBlock className="skeleton-circle" /><SkeletonBlock style={{ width: 54, height: 18 }} /></div>
        <SkeletonBlock style={{ width: '58%', height: 8, marginTop: 20 }} />
        <SkeletonBlock style={{ width: '42%', height: 27, marginTop: 9 }} />
        <SkeletonBlock style={{ width: '72%', height: 8, marginTop: 10 }} />
      </div>)}</div>
      <div className="skeleton-dashboard-grid">
        <div className="skeleton-card skeleton-chart-card"><SkeletonBlock style={{ width: 180, height: 13 }} /><SkeletonBlock className="skeleton-chart" /></div>
        <div className="skeleton-card"><SkeletonBlock style={{ width: 150, height: 13 }} /><SkeletonBlock className="skeleton-donut" /></div>
        <div className="skeleton-card"><SkeletonBlock style={{ width: 144, height: 13 }} />{[0, 1, 2].map(i => <div className="skeleton-list-row" key={i}><SkeletonBlock className="skeleton-circle" /><span><SkeletonBlock style={{ width: 124, height: 8 }} /><SkeletonBlock style={{ width: 172, height: 6, marginTop: 8 }} /></span></div>)}</div>
      </div>
      <div className="skeleton-dashboard-grid skeleton-dashboard-bottom">
        <div className="skeleton-card skeleton-chart-card"><SkeletonBlock style={{ width: 145, height: 13 }} /><SkeletonBlock className="skeleton-bars" /></div>
        <div className="skeleton-card"><SkeletonBlock style={{ width: 170, height: 13 }} /><TableSkeleton rows={4} columns={3} /></div>
      </div>
    </>}
  </div>;
}
