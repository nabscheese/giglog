export function Loading({label='Loading the archive…'}:{label?:string}){
  return <div className="empty"><span className="spinner"/> {label}</div>;
}
