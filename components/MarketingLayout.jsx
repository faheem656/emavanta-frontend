import '../styles/marketing.css';
import MarketingNav from './MarketingNav';
import MarketingFooter from './MarketingFooter';
import ConnectionStatus from './ConnectionStatus';
export default function MarketingLayout({ children }){
  return <div className="mkt"><MarketingNav /><ConnectionStatus />{children}<MarketingFooter /></div>;
}
