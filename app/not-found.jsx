import Link from 'next/link';
export default function NotFound(){
 return <main className="hero2 container" style={{minHeight:'72vh'}}>
  <img src="/emavanta-logo.webp" alt="Emavanta" style={{height:42,width:'auto',marginBottom:24}}/>
  <div className="badge ok">404 · Route not found</div>
  <h1 style={{fontSize:56}}>This page has moved.</h1>
  <p className="lead">The link is outdated or the page was renamed. Your workspace is exactly where you left it.</p>
  <div className="row" style={{justifyContent:'center',marginTop:22}}>
   <Link className="btn" href="/dashboard">Open dashboard</Link>
   <Link className="btn secondary" href="/">Back home</Link>
  </div>
 </main>;
}
