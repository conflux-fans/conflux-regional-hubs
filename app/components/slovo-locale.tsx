"use client";
export function SlovoLocale({locale}:{locale:string}) {
  return <div className="slovo-language" aria-label="Мова / Language">{["ru","uk"].map(value => <button type="button" key={value} aria-pressed={locale===value} onClick={()=>{document.cookie=`slovo-locale=${value}; Path=/; Max-Age=31536000; SameSite=Lax`; window.location.reload();}}>{value==="ru"?"RU":"UA"}</button>)}</div>;
}
