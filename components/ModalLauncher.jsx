'use client';
import { useState } from 'react';
import Modal from './Modal';
import { useToast } from './ToastProvider';
export default function ModalLauncher({title,trigger,children}){
 const [open,setOpen]=useState(false);
 return <>{trigger({open:()=>setOpen(true)})}
  {open&&<Modal title={title} onClose={()=>setOpen(false)}>{children(()=>setOpen(false))}</Modal>}</>;
}
