import '../styles/marketing.css';
import MarketingNav from './MarketingNav';
import MarketingFooter from './MarketingFooter';
export default function MarketingLayout({ children }){
  return <div className="mkt"><MarketingNav />{children}<MarketingFooter /></div>;
}
