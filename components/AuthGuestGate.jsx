'use client';
import { usePathname } from 'next/navigation';
import SessionGate from './SessionGate';
export default function AuthGuestGate({children}){
 const path=usePathname();
 return path==='/signin'||path==='/signup'?<SessionGate mode="guest">{children}</SessionGate>:children;
}
