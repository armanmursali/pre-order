import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';


export function handleNotificationClick(
  notif: { id: string; title: string; message: string }, 
  router: AppRouterInstance
) {
  const message = notif.message || '';


  const storeIdMatch = message.match(/\[STORE_ID:(.*?)\]/);
  
  if (storeIdMatch && storeIdMatch[1]) {
    const storeId = storeIdMatch[1].trim();
    router.push(`/store/${storeId}`);
    return;
  }

  
  const uuidMatch = message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuidMatch && uuidMatch[0]) {
    router.push(`/store/${uuidMatch[0]}`);
    return;
  }

  
  router.push('/store');
}