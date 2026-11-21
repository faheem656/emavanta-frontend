export default function Section({ title, action, children }) {
  return <section className="card"><div className="topbar" style={{marginBottom:16}}><h2 style={{margin:0}}>{title}</h2>{action}</div>{children}</section>;
}
