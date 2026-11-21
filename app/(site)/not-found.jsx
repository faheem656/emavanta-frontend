import Link from 'next/link';
export default function NotFound(){return <section className="hero2 container">
 <img src="/emavanta-logo.webp" alt="Emavanta" style={{height:38,width:"auto",marginBottom:22}}/><div className="badge ok">404</div><h1 style={{fontSize:64}}>That page moved on.</h1>
 <p className="lead">The link is broken or the page was renamed. Everything else is still where you left it.</p>
 <div className="row" style={{justifyContent:'center',marginTop:22}}><Link className="btn" href="/">Back home</Link><Link className="btn secondary" href="/features/outreach">See features</Link></div>
</section>;}
