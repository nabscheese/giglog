import Link from 'next/link';
export function EmptyState({title,body,href,label}:{title:string;body:string;href?:string;label?:string}){
 return <div className="empty"><h2>{title}</h2><p>{body}</p>{href&&<Link className="btn" href={href}>{label||'Get started'}</Link>}</div>
}
