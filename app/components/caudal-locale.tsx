"use client";
export function CaudalLocale({locale}:{locale:string}) {
  return <div className="caudal-language" aria-label="Idioma / Language">{["es","en"].map(value => <button type="button" key={value} aria-pressed={locale===value} onClick={()=>{document.cookie=`caudal-locale=${value}; Path=/; Max-Age=31536000; SameSite=Lax`; window.location.reload();}}>{value.toUpperCase()}</button>)}</div>;
}
