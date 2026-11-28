import { useId } from 'react';
/** FORNO illustration: no vendor artwork and no implication of device telemetry. */
export function MixingBowl({kind}:{kind:'water'|'flour'|'yeast'|'salt'|'mix'|'knead'|'rest'|'temperature'|'unload'|'prepare'|'bulk'}) {
 const id=useId().replaceAll(':','');const url=(name:string)=>`url(#${id}-${name})`;
 return <svg className={`mixing-bowl bowl-${kind}`} viewBox="0 0 320 260" role="img" aria-label={`Illustrierter Mixtopf · ${kind==='water'?'Wasserzugabe':kind==='flour'?'Mehlzugabe':kind==='rest'?'Ruhephase':kind==='yeast'?'Hefezugabe':kind==='salt'?'Salzzugabe':kind==='temperature'?'Temperaturmessung':kind==='unload'?'Teigentnahme':kind==='knead'?'Teigmodus':'Teigzubereitung'}`}>
 <defs><linearGradient id={`${id}-steel`}><stop stopColor="#111815"/><stop offset=".12" stopColor="#9fa5a1"/><stop offset=".21" stopColor="#d3d5d0"/><stop offset=".35" stopColor="#676d69"/><stop offset=".53" stopColor="#242d27"/><stop offset=".7" stopColor="#949c94"/><stop offset=".86" stopColor="#454e46"/><stop offset="1" stopColor="#141b17"/></linearGradient><linearGradient id={`${id}-rim`} x2="0" y2="1"><stop stopColor="#d3d7d1"/><stop offset=".4" stopColor="#313b33"/><stop offset=".7" stopColor="#b9c0b7"/><stop offset="1" stopColor="#555e54"/></linearGradient><linearGradient id={`${id}-water`} x2="0" y2="1"><stop stopColor="#9ee3d8" stopOpacity=".7"/><stop offset="1" stopColor="#389b94" stopOpacity=".8"/></linearGradient><radialGradient id={`${id}-flour`}><stop stopColor="#fff9e7"/><stop offset=".8" stopColor="#d8cfb7"/><stop offset="1" stopColor="#b1a58b"/></radialGradient><linearGradient id={`${id}-handle`}><stop stopColor="#0a100d"/><stop offset=".5" stopColor="#49534a"/><stop offset="1" stopColor="#111812"/></linearGradient></defs>
 <ellipse cx="156" cy="241" rx="98" ry="9" fill="#000" opacity=".2"/>
 <path d="M240 57c44-12 64 8 54 49-8 30-23 54-53 74l-7-24c20-13 35-36 39-55 5-22-3-29-28-19Z" fill={url('handle')} stroke="#586359" strokeWidth="2"/>
 <path d="m65 57 20 151c4 25 133 25 138 0l24-151Z" fill={url('steel')} stroke="#879084" strokeWidth="1.4"/>
 <path d="m83 75 15 127M106 76l8 131" stroke="#fff" opacity=".17" strokeWidth="3"/>
 <ellipse cx="156" cy="59" rx="94" ry="20" fill={url('rim')} stroke="#afb8aa"/>
 <ellipse cx="156" cy="57" rx="84" ry="13" fill="#141d17" stroke="#6c7769"/>
 {kind==='water'&&<><path d="M82 161q73 25 147 0l-7 48c-6 18-128 18-136-1Z" fill={url('water')}/><ellipse cx="155" cy="161" rx="73" ry="12" fill="#9cdace" opacity=".65"/><path d="M154 5c-5 31 9 83 0 153" stroke="#a9ece1" strokeWidth="5" fill="none" opacity=".6"/><ellipse cx="155" cy="160" rx="16" ry="4" stroke="#d0fff1" fill="none" opacity=".7"/></>}
 {['flour','yeast','salt','mix','knead','rest','unload','bulk'].includes(kind)&&<><path d="M86 194q12-22 37-28 25-42 45-23 20 7 29 34 22 1 29 19c-8 29-131 28-140-2Z" fill={url('flour')}/><path d="M120 182q20-21 43-12m-6 26q19-18 36-8" stroke="#e8dfc9" fill="none" strokeWidth="2"/></>}
 {['flour','salt','yeast'].includes(kind)&&Array.from({length:12},(_,i)=><ellipse key={i} cx={134+(i*17)%55} cy={9+(i*23)%118} rx={kind==='yeast'?2.5:1.5} ry={kind==='yeast'?3:1.5} fill={kind==='yeast'?'#d2b37b':'#fff5dc'}/>)}
 {kind==='rest'&&<><path d="M61 53q95-35 190 0l-5 23q-94-26-180 0Z" fill="#c7c8ae" opacity=".9"/><path d="M87 48q57-16 118-2" stroke="#eeedd8" fill="none" opacity=".6"/></>}
 {['mix','knead'].includes(kind)&&<g stroke="#bee28d" strokeWidth="3" fill="none"><path d="M126 126c-27 25 41 37 55 11M181 127l1 13-13-2M189 171c20-20-36-29-55-13M134 167l-1-12 12 1"/></g>}
 {kind==='temperature'&&<><path d="m187 34-46 146" stroke="#cbd8bc" strokeWidth="6"/><rect x="179" y="11" width="25" height="64" rx="8" transform="rotate(18 191 43)" fill="#212b21" stroke="#a3b990"/><path d="m185 30 9 3" stroke="#c2df9a" strokeWidth="3"/></>}
 {kind==='unload'&&<path d="M67 105 33 83m2 15-2-15 16-1" stroke="#c3e29d" strokeWidth="3" fill="none"/>}
 <path d="m80 216 15 17h117l15-17" fill={url('handle')} stroke="#697762"/>
 <path d="M151 91h15m-15 25h10m-10 25h15" stroke="#ced3c7" strokeWidth="1" opacity=".55"/>
 </svg>;
}
