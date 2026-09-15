import type { ReactNode, SVGProps } from 'react'
const paths: Record<string, ReactNode> = {
 dashboard:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
 users:<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
 pending:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>, database:<><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></>,
 alert:<><path d="M10.3 3.7 2.5 18a2 2 0 0 0 1.8 3h15.4a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>,
 package:<><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v9M21 8v9l-9 5-9-5V8"/></>, clipboard:<><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 9h6M9 13h6"/></>,
 shield:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>, scan:<><path d="M3 7V4h4M17 3h4v4M21 17v4h-4M7 21H3v-4M8 8h8v8H8z"/></>,
 settings:<><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/></>, search:<><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>, bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
 logout:<><path d="m10 17 5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-5"/></>, plus:<><path d="M12 5v14M5 12h14"/></>, download:<><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></>, menu:<><path d="M4 6h16M4 12h16M4 18h16"/></>,
}
export default function AppIcon({name,...props}:SVGProps<SVGSVGElement>&{name:keyof typeof paths}){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>}
