// Einpass- und Prüf-Skript der Serien-Anzeigen (läuft IM Browser, auch beim PDF-Druck).
// Verbatim aus Geldregen_2027/werkzeug/gr_build.py (FIT_JS) – dort für 3.276 Anzeigen erprobt.
// Aufgaben: Gewinnernamen (.nm) einzeilig einpassen (min. 11 px, sonst Warnung „Name zu lang“);
// TNB über die ganze Anzeigenbreite mit RAND_MM = 2 mm Seitenrand; Inhalt (.body) in die Fläche über dem
// Teilnahmebedingungs-Band einpassen (iterativ: breite/fit/loesen); TNB 6,0 pt (5,5 pt, wenn Skalierung < 0,90);
// Prüfungen (Überlappung, Überlauf, Platzhalter, Name zu lang) → window.__pruefung.
// Nicht ändern, ohne scripts/check-serie.mjs und die Prüfseiten erneut laufen zu lassen.

const BREITE = 1575
const BODY_HOEHE = 922

const QUELLE = String.raw`<script>
(function(){
const W=@W@, BODY=@BODY@;
function einpassen(ad){
  const H=+ad.dataset.h, wmm=+ad.dataset.wmm;
  // Gewinnernamen einzeilig: zu lange Namen schrittweise verkleinern (min. 11 px)
  const zuLang=[];
  ad.querySelectorAll('.nm').forEach(e=>{ let fs=parseFloat(getComputedStyle(e).fontSize);
    while(e.scrollWidth>e.clientWidth+0.5&&fs>11){ fs-=0.5; e.style.fontSize=fs+'px'; }
    if(e.scrollWidth>e.clientWidth+0.5) zuLang.push(e.textContent); });
  const band=ad.querySelector('.tband'), tnb=band.querySelector('.tnb'), sp=tnb.querySelector('.sp'), lg=tnb.querySelector('.lg');
  const pad=+band.dataset.pad+(parseFloat(getComputedStyle(band).borderTopWidth)||0);
  const pxpt=pt=>pt*0.3528*W/wmm;
  // TNB über die ganze Breite der Anzeige: links und rechts nur RAND_MM Abstand zum Anzeigenrand (Andreas A., 06.10.2026)
  const RAND_MM=2, rand=RAND_MM*W/wmm;
  function breite(s){ band.style.paddingLeft=rand+'px'; band.style.paddingRight=rand+'px'; }
  function fit(pt){ tnb.style.fontSize=pxpt(pt)+'px'; if(sp) sp.style.height='0px'; const lh=lg?lg.offsetHeight:0; let h=Math.max(lh,10);
    for(let k=0;k<15;k++){ if(sp) sp.style.height=Math.max(0,h-lh)+'px'; const c=tnb.scrollHeight; if(c>h+0.5) h=c; else break; }
    return Math.ceil(h+pad); }
  function loesen(pt){ let s=1, bh=0;            // schmalerer Text → höheres Band → kleineres s … bis es sich nicht mehr ändert
    for(let k=0;k<10;k++){ breite(s); bh=fit(pt); const s2=Math.min(1,(H-bh)/BODY); if(Math.abs(s2-s)<0.0005){ s=s2; break; } s=s2; }
    breite(s); bh=fit(pt); return [bh, Math.min(1,(H-bh)/BODY)]; }
  let pt=6.0, [bh,s]=loesen(pt);
  if(s<0.90){ pt=5.5; [bh,s]=loesen(pt); }
  const avail=H-bh, ox=(W-W*s)/2, oy=s<1?0:Math.round((avail-BODY)/2);
  ad.querySelector('.body').style.transform='translate('+ox+'px,'+oy+'px) scale('+s+')';
  band.style.top=(H-bh)+'px'; band.style.height=bh+'px';
  const cb=ad.querySelector('.colbg'); if(cb){ cb.style.width=(ox+520*s)+'px'; cb.style.height=(H-bh)+'px'; }
  // Prüfungen
  const w=[], ar=ad.getBoundingClientRect(), bt=ar.top+H-bh+0.5;
  if(s<0.82) w.push('Inhalt stark verkleinert ('+s.toFixed(2)+')');
  const bl=[...ad.querySelectorAll('.blk')].map(e=>({n:e.dataset.n,r:e.getBoundingClientRect()}));
  for(const b of bl){ if(b.r.bottom>bt+1) w.push(b.n+' ragt ins TNB-Band ('+Math.round(b.r.bottom-bt)+'px)'); if(b.r.right>ar.right+1) w.push(b.n+' ragt rechts hinaus'); }
  for(let i=0;i<bl.length;i++) for(let j=i+1;j<bl.length;j++){ const a=bl[i].r,b=bl[j].r;
    if(a.left<b.right-2&&b.left<a.right-2&&a.top<b.bottom-2&&b.top<a.bottom-2) w.push('Überlappung: '+bl[i].n+' / '+bl[j].n); }
  ad.querySelectorAll('.tile,.card,.ant').forEach(e=>{ if(e.scrollHeight>e.clientHeight+1||e.scrollWidth>e.clientWidth+1) w.push('Text passt nicht: '+e.textContent.replace(/\s+/g,' ').trim().slice(0,28)); });
  zuLang.forEach(n=>w.push('Name zu lang: '+n));
  if(ad.querySelector('.fehlt')) w.push('Platzhalter (gelb) enthalten');
  const echt=w.filter(x=>!x.startsWith('Platzhalter'));
  return {ok:w.length===0,echt_ok:echt.length===0,warnungen:w,tnb_pt:pt,skalierung:+s.toFixed(3),band_px:bh};
}
document.fonts.ready.then(()=>{
  const ads=[...document.querySelectorAll('.ad')], res=ads.map(einpassen);
  window.__pruefung=res[0]; window.__alle=res;
  ads.forEach((ad,i)=>{ const w=res[i].warnungen; if((window.__VORSCHAU||location.hash==='#markieren')&&w.length){ const d=document.createElement('div'); d.textContent=w.join(' | ');
    d.style.cssText='position:absolute;left:0;top:0;right:0;background:red;color:#fff;font:bold 30px Arial;z-index:99;padding:6px'; ad.appendChild(d);} });
  const tab=document.getElementById('bericht');
  if(tab){ const p55=res.filter(r=>r.tnb_pt<6).length, ph=res.filter(r=>!r.ok&&r.echt_ok).length;
    const prob=ads.map((ad,i)=>[ad,res[i]]).filter(([ad,r])=>!r.echt_ok);
    tab.innerHTML='<tr><th colspan="4" style="font-size:18px;background:'+(prob.length?'#FFEBEE':'#E8F5E9')+'">ECHTE HINWEISE: '+prob.length+' · Anzeigen: '+res.length+' · nur gelber Platzhalter: '+ph+' · TNB 5,5 pt: '+p55+'</th></tr>'
      +'<tr><th>Anzeige</th><th>TNB pt</th><th>Skal.</th><th>Hinweise</th></tr>'
      +prob.map(([ad,r])=>'<tr style="background:#FFEBEE"><td>'+ad.dataset.name+'</td><td>'+r.tnb_pt+'</td><td>'+r.skalierung+'</td><td>'+r.warnungen.join(' | ')+'</td></tr>').join(''); }
  const z=document.getElementById('zoom'); if(z) z.style.zoom=(innerWidth-40)/(3*W+80); else if(window.__VORSCHAU) document.body.style.zoom=Math.min(1,(innerWidth-4)/W);
});
})();
</script>`

export const FIT_JS = QUELLE.replace('@W@', String(BREITE)).replace('@BODY@', String(BODY_HOEHE))
