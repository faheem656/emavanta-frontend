export default function PageHead({title,subtitle,actions}){
 return <div className="topbar" style={{marginBottom:22}}>
  <div><h1 style={{margin:0}}>{title}</h1>{subtitle&&<div className="muted" style={{marginTop:4}}>{subtitle}</div>}</div>
  <div className="row">{actions}</div>
 </div>;
}
