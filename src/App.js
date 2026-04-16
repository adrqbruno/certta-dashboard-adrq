import React, { useState, useEffect } from 'react';

// ============================================
// SHEETS CONFIG
// ============================================
const SHEETS_CONFIG = {
  competitorsUrl:    'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlkIr00Ua6EYb3DLBehpFqWvdXd0LSexCXHLaIfRLCOIpG5nm5vOlZ4hKZqWwLXg/pub?gid=1560647113&single=true&output=csv',
  configUrl:         'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlkIr00Ua6EYb3DLBehpFqWvdXd0LSexCXHLaIfRLCOIpG5nm5vOlZ4hKZqWwLXg/pub?gid=109836250&single=true&output=csv',
  ga4Url:            'https://docs.google.com/spreadsheets/d/e/2PACX-1vT8Pxasw_GpaTaTuoCnYyYobveoEsI4OB2SHPx5S77AhomwrTEHYfzt7xQ440hdq9kSmcVI-kyHRhRR/pub?gid=730913988&single=true&output=csv',
  executiveBriefUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlkIr00Ua6EYb3DLBehpFqWvdXd0LSexCXHLaIfRLCOIpG5nm5vOlZ4hKZqWwLXg/pub?gid=1672972077&single=true&output=csv',
};

// ============================================
// GA4 ENGINE
// ============================================
const MONTH_NAMES_PT = { '01':'Jan','02':'Fev','03':'Mar','04':'Abr','05':'Mai','06':'Jun','07':'Jul','08':'Ago','09':'Set','10':'Out','11':'Nov','12':'Dez' };

function parseGA4CSV(csvText) {
  const cleaned = csvText.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
  const lines = cleaned.trim().split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g,'').replace(/^\uFEFF/,''));
  const hm = {};
  headers.forEach((h, i) => {
    const l = h.toLowerCase().replace(/[_\s]/g,'');
    if (l==='date'||l==='data') hm.date=i;
    else if (l==='activeusers'||l==='usuariosativos') hm.activeUsers=i;
    else if (l==='newusers'||l==='novosusuarios') hm.newUsers=i;
    else if (l==='sessions'||l==='sessoes'||l==='sessões') hm.sessions=i;
    else if (l==='screenpageviews'||l==='pageviews'||l==='visualizacoesdepagina') hm.screenPageViews=i;
  });
  if (hm.date===undefined||hm.sessions===undefined) return [];
  const rows = [];
  for (let i=1; i<lines.length; i++) {
    const v = lines[i].split(',').map(s => s.trim().replace(/^["']|["']$/g,''));
    let d = v[hm.date]||'';
    if (/^\d{8}$/.test(d)) d=`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
    else if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) { const [dd,mm,yy]=d.split('/'); d=`${yy}-${mm}-${dd}`; }
    if (!d.match(/^\d{4}-\d{2}-\d{2}$/)) continue;
    const n=(k)=>hm[k]===undefined?0:parseFloat((v[hm[k]]||'0').replace(/\./g,'').replace(',','.'))||0;
    rows.push({ date:d, activeUsers:Math.round(n('activeUsers')), newUsers:Math.round(n('newUsers')), sessions:Math.round(n('sessions')), screenPageViews:Math.round(n('screenPageViews')) });
  }
  return rows;
}

function processGA4Data(rows) {
  const mg = {};
  rows.forEach(row => {
    const [y,m] = row.date.split('-');
    const k = `${y}-${m}`;
    if (!mg[k]) mg[k]={ key:`${MONTH_NAMES_PT[m]||m} ${y}`, days:[] };
    mg[k].days.push(row);
  });
  const sorted = Object.keys(mg).sort();
  const ga4Monthly={}, availableMonths=[];
  sorted.forEach((mk,i) => {
    const days = mg[mk].days.sort((a,b)=>a.date.localeCompare(b.date));
    const key = mg[mk].key;
    const tS=days.reduce((s,d)=>s+d.sessions,0), tP=days.reduce((s,d)=>s+d.screenPageViews,0);
    const tA=days.reduce((s,d)=>s+d.activeUsers,0), tN=days.reduce((s,d)=>s+d.newUsers,0);
    const nPct = tA>0?Math.round((tN/tA)*100):0;
    let pS=0,pP=0,pA=0,pNP=0,hasPrev=false;
    if (i>0) {
      const pd=mg[sorted[i-1]].days;
      pS=pd.reduce((s,d)=>s+d.sessions,0); pP=pd.reduce((s,d)=>s+d.screenPageViews,0);
      pA=pd.reduce((s,d)=>s+d.activeUsers,0);
      const pN=pd.reduce((s,d)=>s+d.newUsers,0);
      pNP=pA>0?Math.round((pN/pA)*100):0; hasPrev=true;
    }
    const tr=(c,p)=>(!hasPrev||p===0)?0:parseFloat(((c-p)/p*100).toFixed(1));
    const prevArr=i>0?mg[sorted[i-1]].days.sort((a,b)=>a.date.localeCompare(b.date)):[];
    ga4Monthly[key]={
      metrics:{
        sessions:{value:tS,trend:tr(tS,pS)},
        pageViews:{value:tP,trend:tr(tP,pP)},
        activeUsers:{value:tA,trend:tr(tA,pA)},
        newUserPercent:{value:nPct,trend:tr(nPct,pNP)}
      },
      dailyData:days.map((d,j)=>({ date:d.date.split('-')[2], sessions:d.sessions, sessionsPrev:prevArr[j]?prevArr[j].sessions:0 }))
    };
    availableMonths.push(key);
  });
  return { ga4Monthly, availableMonths };
}

// ============================================
// STATIC FALLBACK DATA
// ============================================
const COMPETITORS_FALLBACK = [
  { domain:'unico.io',   name:'Unico',       tier:'leader',     organicKeywords:5400, keywordsTrend:1.11,  organicTraffic:39300, trafficTrend:0.29,  paidKeywords:0, paidTraffic:0,   paidTrafficTrend:0,     refDomains:2900, refTrend:-3.5,  authorityScore:36, authorityChange:-3, isOwn:false, highlight:false },
  { domain:'idwall.co',  name:'idwall',      tier:'competitor', organicKeywords:2700, keywordsTrend:0.30,  organicTraffic:12400, trafficTrend:-5.87, paidKeywords:0, paidTraffic:0,   paidTrafficTrend:0,     refDomains:1500, refTrend:-2.61, authorityScore:33, authorityChange:0,  isOwn:false, highlight:false },
  { domain:'jumio.com',  name:'Jumio',       tier:'global',     organicKeywords:171,  keywordsTrend:-1.16, organicTraffic:512,   trafficTrend:0,     paidKeywords:1, paidTraffic:2,   paidTrafficTrend:-71.43,refDomains:8600, refTrend:-2.92, authorityScore:42, authorityChange:0,  isOwn:false, highlight:false },
  { domain:'caf.io',     name:'CAF (legacy)',tier:'legacy',     organicKeywords:515,  keywordsTrend:-5.16, organicTraffic:1200,  trafficTrend:-2.57, paidKeywords:2, paidTraffic:54,  paidTrafficTrend:-37.93,refDomains:3300, refTrend:-1.65, authorityScore:29, authorityChange:0,  isOwn:true,  highlight:false },
  { domain:'clear.sale', name:'ClearSale',   tier:'leader',     organicKeywords:4000, keywordsTrend:0.86,  organicTraffic:22500, trafficTrend:3.73,  paidKeywords:5, paidTraffic:994, paidTrafficTrend:26.14, refDomains:3300, refTrend:-3.64, authorityScore:42, authorityChange:-1, isOwn:false, highlight:false },
  { domain:'certta.ai',  name:'Certta',      tier:'new',        organicKeywords:101,  keywordsTrend:2.02,  organicTraffic:56,    trafficTrend:0,     paidKeywords:0, paidTraffic:0,   paidTrafficTrend:0,     refDomains:762,  refTrend:3.81,  authorityScore:20, authorityChange:16, isOwn:true,  highlight:true  },
];

const GA4_FALLBACK = {
  'Fev 2026': {
    metrics:{ sessions:{value:36600,trend:-25.2}, pageViews:{value:42300,trend:-30.5}, activeUsers:{value:27096,trend:-25.6}, newUserPercent:{value:127,trend:3.6} },
    dailyData:[
      {date:'01',sessions:2113,sessionsPrev:1800},{date:'03',sessions:2805,sessionsPrev:2200},
      {date:'05',sessions:4499,sessionsPrev:3500},{date:'07',sessions:1102,sessionsPrev:1400},
      {date:'10',sessions:2098,sessionsPrev:1900},{date:'12',sessions:1805,sessionsPrev:1600},
      {date:'15',sessions:662,sessionsPrev:1200}, {date:'18',sessions:857,sessionsPrev:1100},
      {date:'20',sessions:784,sessionsPrev:1000}, {date:'22',sessions:414,sessionsPrev:800},
      {date:'24',sessions:869,sessionsPrev:950},  {date:'27',sessions:699,sessionsPrev:850},
      {date:'28',sessions:394,sessionsPrev:700}
    ]
  }
};

const BRIEF_FALLBACK = {
  title:'Authority +16 pts', highlight1:'Backlinks: Forbes, MIT, UOL, LinkedIn',
  highlight2:'Ref domains supera Unico (4.1K vs 2.9K)', gap:'Tráfego 31x abaixo do líder',
  next1:'Manter produção de conteúdo', next2:'Acelerar migração backlinks',
  next3:'Monitorar crossover de tráfego', updatedAt:'Mar 2026'
};

// ============================================
// CSV PARSERS
// ============================================
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h=>h.trim());
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v=>v.trim());
    const row = {};
    headers.forEach((h,i) => {
      let v = vals[i]||'';
      if (['organicKeywords','organicTraffic','paidKeywords','paidTraffic','refDomains','authorityScore','authorityChange'].includes(h)) v=parseInt(v)||0;
      else if (['keywordsTrend','trafficTrend','paidTrend','paidTrafficTrend','refTrend'].includes(h)) v=parseFloat(v)||0;
      else if (['isOwn','highlight'].includes(h)) v=v.toUpperCase()==='TRUE';
      row[h]=v;
    });
    return row;
  });
}

function parseBriefCSV(text) {
  const data={};
  text.trim().split('\n').slice(1).forEach(line => {
    const [k,...rest]=line.split(',').map(v=>v.trim().replace(/^"|"$/g,''));
    if (k) data[k]=rest[0]||'';
  });
  return data;
}

// ============================================
// SPARKLINE
// ============================================
const Sparkline = ({ data, width=500, height=140 }) => {
  if (!data||data.length===0) return (
    <div style={{height,display:'flex',alignItems:'center',justifyContent:'center',color:'#64748b',fontSize:'13px'}}>Sem dados</div>
  );
  const mx=Math.max(...data.map(d=>Math.max(d.sessions,d.sessionsPrev)));
  const pad={top:20,right:20,bottom:30,left:10};
  const cw=width-pad.left-pad.right, ch=height-pad.top-pad.bottom;
  const gx=i=>pad.left+(i/(data.length-1))*cw;
  const gy=v=>pad.top+ch-(v/(mx||1))*ch;
  const ln=k=>data.map((d,i)=>`${i===0?'M':'L'} ${gx(i)} ${gy(d[k])}`).join(' ');
  const ar=k=>`${ln(k)} L ${gx(data.length-1)} ${pad.top+ch} L ${gx(0)} ${pad.top+ch} Z`;
  const iv=Math.max(1,Math.floor(data.length/14));
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {[0,0.5,1].map((r,i)=><line key={i} x1={pad.left} y1={pad.top+ch*(1-r)} x2={width-pad.right} y2={pad.top+ch*(1-r)} stroke="#334155" strokeWidth="1" strokeDasharray="4,4"/>)}
      <path d={ar('sessionsPrev')} fill="#64748b" opacity="0.15"/>
      <path d={ln('sessionsPrev')} fill="none" stroke="#64748b" strokeWidth="2" opacity="0.5"/>
      <path d={ar('sessions')} fill="#3b82f6" opacity="0.2"/>
      <path d={ln('sessions')} fill="none" stroke="#3b82f6" strokeWidth="2.5"/>
      {data.map((d,i)=><circle key={i} cx={gx(i)} cy={gy(d.sessions)} r="3.5" fill="#3b82f6"/>)}
      {data.map((d,i)=>(i%iv===0||i===data.length-1)?<text key={i} x={gx(i)} y={height-8} textAnchor="middle" fill="#64748b" fontSize="10">{d.date}</text>:null)}
      <text x={pad.left+5} y={pad.top+5} fill="#64748b" fontSize="9">{(mx/1000).toFixed(1)}K</text>
    </svg>
  );
};

const MonthSelector = ({ months, selected, onChange }) => (
  <div style={{display:'flex',gap:'4px',background:'#0f172a',padding:'4px',borderRadius:'10px',border:'1px solid #334155',flexWrap:'wrap'}}>
    {months.map(m=>(
      <button key={m} onClick={()=>onChange(m)} style={{padding:'6px 14px',borderRadius:'6px',border:'none',fontSize:'12px',fontWeight:'500',cursor:'pointer',background:selected===m?'#3b82f6':'transparent',color:selected===m?'#fff':'#94a3b8'}}>
        {m.split(' ')[0]}
      </button>
    ))}
  </div>
);

const ExecutiveBrief = ({ data }) => {
  const [copied,setCopied]=useState(false);
  return (
    <div style={{background:'#0f172a',borderRadius:'12px',padding:'20px',border:'1px solid #334155',height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
        <div style={{fontSize:'12px',color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',fontWeight:'600'}}>📋 Executive Brief</div>
        <button onClick={()=>{
          navigator.clipboard.writeText(`📊 Certta SEO - ${data.updatedAt}\n✅ ${data.title}\n• ${data.highlight1}\n• ${data.highlight2}\n⚠️ ${data.gap}\n🎯 ${data.next1} / ${data.next2} / ${data.next3}`)
            .then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000)});
        }} style={{background:copied?'#10b981':'#3b82f6',color:'#fff',border:'none',padding:'6px 12px',borderRadius:'6px',fontSize:'11px',cursor:'pointer'}}>
          {copied?'✓ Copiado!':'📤 Copiar'}
        </button>
      </div>
      <div style={{flex:1}}>
        <div style={{background:'#10b98120',borderLeft:'3px solid #10b981',padding:'12px',borderRadius:'0 8px 8px 0',marginBottom:'12px'}}>
          <div style={{fontSize:'15px',fontWeight:'700',color:'#10b981',marginBottom:'8px'}}>{data.title}</div>
          <div style={{fontSize:'13px',color:'#94a3b8',lineHeight:'1.5'}}>• {data.highlight1}<br/>• {data.highlight2}</div>
        </div>
        <div style={{background:'#ef444420',borderLeft:'3px solid #ef4444',padding:'12px',borderRadius:'0 8px 8px 0',marginBottom:'12px'}}>
          <div style={{fontSize:'10px',fontWeight:'600',color:'#ef4444',marginBottom:'4px',textTransform:'uppercase'}}>Gap Principal</div>
          <div style={{fontSize:'13px',color:'#fca5a5'}}>{data.gap}</div>
        </div>
        <div style={{background:'#3b82f620',borderLeft:'3px solid #3b82f6',padding:'12px',borderRadius:'0 8px 8px 0'}}>
          <div style={{fontSize:'10px',fontWeight:'600',color:'#3b82f6',marginBottom:'8px',textTransform:'uppercase'}}>Próximos Passos</div>
          <div style={{fontSize:'13px',color:'#93c5fd',lineHeight:'1.6'}}>• {data.next1}<br/>• {data.next2}<br/>• {data.next3}</div>
        </div>
      </div>
      <div style={{marginTop:'16px',paddingTop:'12px',borderTop:'1px solid #334155',fontSize:'11px',color:'#64748b',textAlign:'right'}}>📅 {data.updatedAt}</div>
    </div>
  );
};

// ============================================
// APP
// ============================================
export default function App() {
  const [competitors,setCompetitors] = useState(COMPETITORS_FALLBACK);
  const [lastUpdated,setLastUpdated] = useState('Mar 2026');
  const [brief,setBrief]             = useState(BRIEF_FALLBACK);
  const [dataSource,setDataSource]   = useState('fallback');
  const [loading,setLoading]         = useState(true);
  const [ga4Data,setGa4Data]         = useState(GA4_FALLBACK);
  const [months,setMonths]           = useState(['Fev 2026']);
  const [month,setMonth]             = useState('Fev 2026');
  const [ga4Src,setGa4Src]           = useState('fallback');
  const [hRow,setHRow]               = useState(null);
  const [hComp,setHComp]             = useState(null);

  const g4 = ga4Data[month] || {
    metrics:{ sessions:{value:0,trend:0}, pageViews:{value:0,trend:0}, activeUsers:{value:0,trend:0}, newUserPercent:{value:0,trend:0} },
    dailyData:[]
  };

  useEffect(()=>{
    (async()=>{
      let ok=false;
      // GA4
      try {
        const r=await fetch(SHEETS_CONFIG.ga4Url);
        if (!r.ok) throw new Error();
        const rows=parseGA4CSV(await r.text());
        if (rows.length>0) {
          const {ga4Monthly,availableMonths:ms}=processGA4Data(rows);
          if (ms.length>0) { setGa4Data(ga4Monthly); setMonths(ms); setMonth(ms[ms.length-1]); setGa4Src('sheets'); ok=true; }
        }
      } catch(e){}
      // Competitors
      try {
        const r=await fetch(SHEETS_CONFIG.competitorsUrl);
        const d=parseCSV(await r.text());
        if (d.length>0) { setCompetitors(d); setDataSource('sheets'); ok=true; }
      } catch(e){}
      // Config
      try {
        const r=await fetch(SHEETS_CONFIG.configUrl);
        const d=parseCSV(await r.text());
        const row=d.find(r=>r.key==='lastUpdated');
        if (row) setLastUpdated(row.value);
      } catch(e){}
      // Brief
      try {
        const r=await fetch(SHEETS_CONFIG.executiveBriefUrl);
        const d=parseBriefCSV(await r.text());
        if (Object.keys(d).length>0) setBrief({...BRIEF_FALLBACK,...d});
      } catch(e){}
      if (!ok) setDataSource('fallback');
      setLoading(false);
    })();
  },[]);

  // helpers
  const fmt = n=>n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1000?`${(n/1000).toFixed(1)}K`:String(n);
  const tc  = v=>v>10?'#10b981':v>0?'#6ee7b7':v>-10?'#fbbf24':'#ef4444';
  const ti  = v=>v>0?'↑':v<0?'↓':'—';
  const ac  = s=>s>=60?'#7c3aed':s>=40?'#3b82f6':s>=25?'#06b6d4':'#94a3b8';
  const tb  = t=>({
    enterprise:{bg:'#7c3aed20',color:'#7c3aed',label:'Enterprise'},
    leader:    {bg:'#3b82f620',color:'#3b82f6',label:'Market Leader'},
    competitor:{bg:'#06b6d420',color:'#06b6d4',label:'Direct Competitor'},
    global:    {bg:'#f59e0b20',color:'#f59e0b',label:'Global Player'},
    legacy:    {bg:'#ef444420',color:'#ef4444',label:'Legacy Domain'},
    new:       {bg:'#10b98120',color:'#10b981',label:'New Domain'},
  }[t]||{bg:'#06b6d420',color:'#06b6d4',label:'Competitor'});

  // spider
  const crow=competitors.find(c=>c.domain==='certta.ai')||{};
  const cafw=competitors.find(c=>c.domain==='caf.io')||{};
  const cc={
    organicKeywords:(crow.organicKeywords||0)+(cafw.organicKeywords||0),
    organicTraffic: (crow.organicTraffic||0) +(cafw.organicTraffic||0),
    refDomains:     (crow.refDomains||0)     +(cafw.refDomains||0),
    authorityScore: Math.max(crow.authorityScore||0,cafw.authorityScore||0),
    paidPresence:   (crow.paidTraffic||0)    +(cafw.paidTraffic||0),
  };
  const sd=[
    {name:'Certta (combined)',color:'#10b981',...cc},
    ...competitors.filter(c=>!c.isOwn).slice(0,4).map((c,i)=>({
      name:c.name, color:['#3b82f6','#8b5cf6','#f59e0b','#ec4899'][i],
      organicKeywords:c.organicKeywords, organicTraffic:c.organicTraffic,
      refDomains:c.refDomains, authorityScore:c.authorityScore, paidPresence:c.paidTraffic+c.paidKeywords
    }))
  ];
  const mv={
    organicKeywords:Math.max(...sd.map(c=>c.organicKeywords)),
    organicTraffic: Math.max(...sd.map(c=>c.organicTraffic)),
    refDomains:     Math.max(...sd.map(c=>c.refDomains)),
    authorityScore: 100,
    paidPresence:   Math.max(...sd.map(c=>c.paidPresence))||1,
  };
  const AXES=['Organic Keywords','Organic Traffic','Ref Domains','Authority Score','Paid Presence'];
  const CX=220, CY=200, RAD=140;
  const spt=(v,ai)=>{ const a=(Math.PI*2*ai)/AXES.length-Math.PI/2; const r=(v/100)*RAD; return {x:CX+r*Math.cos(a),y:CY+r*Math.sin(a)}; };
  const spoly=vals=>vals.map((v,i)=>{const p=spt(v,i);return `${p.x},${p.y}`;}).join(' ');
  const snorm=c=>[(c.organicKeywords/mv.organicKeywords)*100,(c.organicTraffic/mv.organicTraffic)*100,(c.refDomains/mv.refDomains)*100,c.authorityScore,(c.paidPresence/mv.paidPresence)*100];
  const migPct=Math.round(((crow.organicTraffic||0)/((crow.organicTraffic||0)+(cafw.organicTraffic||1)))*100);

  const S={
    base:{fontFamily:"'IBM Plex Sans',-apple-system,sans-serif",background:'linear-gradient(135deg,#0f172a,#1e293b)',minHeight:'100vh',padding:'32px',color:'#e2e8f0'},
    card:{background:'#1e293b',borderRadius:'16px',padding:'24px',marginBottom:'24px',border:'1px solid #334155'},
    inn: {background:'#0f172a',borderRadius:'12px',padding:'16px',border:'1px solid #334155'},
  };

  if (loading) return (
    <div style={{...S.base,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}><div style={{fontSize:'24px',marginBottom:'16px'}}>⏳</div><div>Carregando...</div></div>
    </div>
  );

  return (
    <div style={S.base}>

      {/* HEADER */}
      <div style={{marginBottom:'32px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'8px',flexWrap:'wrap'}}>
          <h1 style={{fontSize:'28px',fontWeight:'600',color:'#f8fafc',margin:0,letterSpacing:'-0.5px'}}>Certta Performance Hub</h1>
          <span style={{background:'#10b98120',color:'#10b981',padding:'4px 12px',borderRadius:'20px',fontSize:'12px',fontWeight:'500'}}>LIVE</span>
          <span style={{background:dataSource==='sheets'?'#3b82f620':'#f59e0b20',color:dataSource==='sheets'?'#3b82f6':'#f59e0b',padding:'4px 12px',borderRadius:'20px',fontSize:'11px',fontWeight:'500'}}>
            {dataSource==='sheets'?'📊 Google Sheets':'📁 Dados Locais'}
          </span>
        </div>
        <p style={{color:'#94a3b8',fontSize:'14px',margin:0}}>Smarketing & SEO Performance Dashboard • Updated: {lastUpdated}</p>
      </div>

      {/* GA4 */}
      <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px',flexWrap:'wrap',gap:'12px'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
              <span style={{fontSize:'16px',fontWeight:'600',color:'#f8fafc'}}>Website Analytics</span>
              <span style={{background:ga4Src==='sheets'?'#10b98120':'#f59e0b20',color:ga4Src==='sheets'?'#10b981':'#f59e0b',padding:'2px 8px',borderRadius:'10px',fontSize:'10px',fontWeight:'500'}}>
                {ga4Src==='sheets'?'🔗 Live':'📁 Fallback'}
              </span>
            </div>
            <div style={{fontSize:'12px',color:'#64748b',marginTop:'4px'}}>Google Analytics 4 • certta.ai</div>
          </div>
          <MonthSelector months={months} selected={month} onChange={setMonth}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1.2fr',gap:'24px'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'12px'}}>
            {[
              {label:'Sessions',    value:fmt(g4.metrics.sessions.value),        trend:g4.metrics.sessions.trend},
              {label:'Page Views',  value:fmt(g4.metrics.pageViews.value),       trend:g4.metrics.pageViews.trend},
              {label:'Active Users',value:fmt(g4.metrics.activeUsers.value),     trend:g4.metrics.activeUsers.trend},
              {label:'New Users %', value:`${g4.metrics.newUserPercent.value}%`, trend:g4.metrics.newUserPercent.trend},
            ].map(k=>(
              <div key={k.label} style={S.inn}>
                <div style={{fontSize:'11px',color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'8px'}}>{k.label}</div>
                <div style={{fontSize:'26px',fontWeight:'700',color:'#f8fafc',marginBottom:'6px'}}>{k.value}</div>
                <div style={{fontSize:'12px',color:tc(k.trend),fontWeight:'600'}}>{ti(k.trend)} {Math.abs(k.trend).toFixed(1)}% <span style={{color:'#64748b',fontWeight:'400'}}>vs mês ant.</span></div>
              </div>
            ))}
          </div>
          <div style={S.inn}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              <div style={{fontSize:'11px',color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px'}}>Sessions Trend • {month}</div>
              <div style={{display:'flex',gap:'16px',fontSize:'11px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'6px'}}><div style={{width:'12px',height:'3px',background:'#3b82f6',borderRadius:'2px'}}/><span style={{color:'#94a3b8'}}>Current</span></div>
                <div style={{display:'flex',alignItems:'center',gap:'6px'}}><div style={{width:'12px',height:'3px',background:'#64748b',borderRadius:'2px'}}/><span style={{color:'#64748b'}}>Previous</span></div>
              </div>
            </div>
            <Sparkline data={g4.dailyData} width={500} height={140}/>
          </div>
        </div>
      </div>

      {/* MIGRATION */}
      <div style={{background:'linear-gradient(135deg,#1e1b4b,#312e81)',borderRadius:'16px',padding:'24px',marginBottom:'24px',border:'1px solid #4338ca40',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'24px'}}>
        <div>
          <div style={{fontSize:'12px',color:'#a5b4fc',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Domain Migration Status</div>
          <div style={{fontSize:'32px',fontWeight:'700',color:'#f8fafc',marginBottom:'4px'}}>{migPct}%</div>
          <div style={{fontSize:'13px',color:'#94a3b8'}}>Traffic on certta.ai</div>
          <div style={{marginTop:'12px',background:'#1e293b',borderRadius:'8px',height:'8px',overflow:'hidden'}}>
            <div style={{width:`${migPct}%`,height:'100%',background:'linear-gradient(90deg,#10b981,#34d399)',borderRadius:'8px'}}/>
          </div>
        </div>
        <div style={{borderLeft:'1px solid #4338ca40',paddingLeft:'24px'}}>
          <div style={{fontSize:'12px',color:'#fca5a5',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.5px'}}>⚠️ Legacy Decay (caf.io)</div>
          <div style={{fontSize:'32px',fontWeight:'700',color:'#ef4444',marginBottom:'4px'}}>{cafw.trafficTrend||0}%</div>
          <div style={{fontSize:'13px',color:'#94a3b8'}}>Organic traffic MoM</div>
        </div>
        <div style={{borderLeft:'1px solid #4338ca40',paddingLeft:'24px'}}>
          <div style={{fontSize:'12px',color:'#86efac',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.5px'}}>🚀 New Domain (certta.ai)</div>
          <div style={{fontSize:'32px',fontWeight:'700',color:'#10b981',marginBottom:'4px'}}>+{crow.trafficTrend||0}%</div>
          <div style={{fontSize:'13px',color:'#94a3b8'}}>Organic traffic MoM</div>
        </div>
      </div>

      {/* SPIDER */}
      <div style={S.card}>
        <div style={{fontSize:'16px',fontWeight:'600',color:'#f8fafc',marginBottom:'20px'}}>Competitive Positioning Radar</div>
        <div style={{display:'grid',gridTemplateColumns:'minmax(300px,400px) 1fr',gap:'32px',alignItems:'start'}}>
          <svg width="100%" viewBox="0 0 440 400" style={{maxWidth:'440px'}}>
            {[20,40,60,80,100].map((p,i)=><circle key={i} cx={CX} cy={CY} r={(p/100)*RAD} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray={i===4?"none":"4,4"}/>)}
            {AXES.map((_,i)=>{const p=spt(100,i);return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="#334155" strokeWidth="1"/>;}) }
            {AXES.map((lbl,i)=>{const p=spt(120,i);return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline={i===0?"auto":i===Math.floor(AXES.length/2)?"hanging":"middle"} fill="#94a3b8" fontSize="11" fontWeight="500">{lbl}</text>;}) }
            {sd.map((c,idx)=>{const v=snorm(c);return <polygon key={c.name} points={spoly(v)} fill={`${c.color}15`} stroke={c.color} strokeWidth={hComp===idx||hComp===null?"2":"1"} opacity={hComp===null||hComp===idx?1:0.3} style={{transition:'all 0.2s'}}/>;}) }
            {sd.map((c,idx)=>snorm(c).map((v,i)=>{const p=spt(v,i);return <circle key={`${c.name}-${i}`} cx={p.x} cy={p.y} r={hComp===idx?5:4} fill={c.color} opacity={hComp===null||hComp===idx?1:0.3} style={{transition:'all 0.2s'}}/>;}))}
            {[25,50,75,100].map((p,i)=><text key={i} x={CX+5} y={CY-(p/100)*RAD} fill="#64748b" fontSize="9" dominantBaseline="middle">{p}%</text>)}
          </svg>
          <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
            <div style={{display:'grid',gridTemplateColumns:'180px 1fr',gap:'24px',alignItems:'start'}}>
              <div>
                <div style={{fontSize:'12px',color:'#64748b',marginBottom:'12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Competitors</div>
                {sd.map((c,i)=>(
                  <div key={c.name} onMouseEnter={()=>setHComp(i)} onMouseLeave={()=>setHComp(null)} style={{display:'flex',alignItems:'center',gap:'10px',padding:'6px 10px',borderRadius:'6px',background:hComp===i?'#33415530':'transparent',cursor:'pointer',marginBottom:'4px'}}>
                    <div style={{width:'10px',height:'10px',borderRadius:'2px',background:c.color,flexShrink:0}}/>
                    <span style={{fontSize:'13px',fontWeight:c.name.includes('Certta')?'600':'400',color:c.name.includes('Certta')?'#10b981':'#e2e8f0'}}>{c.name}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{fontSize:'12px',color:'#64748b',marginBottom:'12px',textTransform:'uppercase',letterSpacing:'0.5px'}}>🎯 Certta Combined</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:'12px'}}>
                  {[
                    {icon:'🔑',label:'Keywords',   value:fmt(cc.organicKeywords), trend:crow.keywordsTrend||0},
                    {icon:'📈',label:'Org Traffic', value:fmt(cc.organicTraffic),  trend:crow.trafficTrend||0},
                    {icon:'🔗',label:'Ref Domains', value:fmt(cc.refDomains),      trend:crow.refTrend||0},
                    {icon:'⭐',label:'Authority',   value:cc.authorityScore,       trend:crow.authorityChange||0},
                  ].map(k=>(
                    <div key={k.label} style={S.inn}>
                      <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'8px'}}>
                        <span>{k.icon}</span>
                        <span style={{fontSize:'10px',color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px'}}>{k.label}</span>
                      </div>
                      <div style={{fontSize:'20px',fontWeight:'700',color:'#f8fafc',marginBottom:'4px'}}>{k.value}</div>
                      <div style={{fontSize:'11px',color:tc(k.trend),fontWeight:'500'}}>{ti(k.trend)} {Math.abs(k.trend).toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={S.inn}>
              <div style={{fontSize:'11px',color:'#64748b',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'0.5px'}}>📊 Radar Analysis</div>
              <div style={{fontSize:'13px',color:'#94a3b8',lineHeight:'1.7'}}>
                <p style={{margin:'0 0 8px'}}><strong style={{color:'#10b981'}}>Certta's strength:</strong> Ref Domains ({fmt(cc.refDomains)}) competitive with leaders via caf.io legacy backlinks.</p>
                <p style={{margin:'0 0 8px'}}><strong style={{color:'#ef4444'}}>Critical gap:</strong> Organic Traffic {Math.round(mv.organicTraffic/(cc.organicTraffic||1))}x below market leader. Takes 6-12 months to close.</p>
                <p style={{margin:0}}><strong style={{color:'#f59e0b'}}>Opportunity:</strong> Jumio high authority (42) but minimal BR traffic — Certta can capture BR-specific demand.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE + BRIEF */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 380px',gap:'24px',marginBottom:'24px'}}>
        <div style={{background:'#1e293b',borderRadius:'16px',overflow:'hidden',border:'1px solid #334155'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #334155'}}>
            <div style={{fontSize:'16px',fontWeight:'600',color:'#f8fafc'}}>Detailed Competitive Metrics</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'140px repeat(5,1fr)',gap:'4px',padding:'12px 20px',background:'#0f172a',borderBottom:'1px solid #334155',fontSize:'10px',fontWeight:'600',color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px'}}>
            <div>Domain</div>
            <div style={{textAlign:'right'}}>KWs</div>
            <div style={{textAlign:'right'}}>Traffic</div>
            <div style={{textAlign:'right'}}>Paid</div>
            <div style={{textAlign:'right'}}>Refs</div>
            <div style={{textAlign:'center'}}>Auth</div>
          </div>
          {competitors.map((c,idx)=>{
            const ts=tb(c.tier);
            return (
              <div key={c.domain} onMouseEnter={()=>setHRow(idx)} onMouseLeave={()=>setHRow(null)}
                style={{display:'grid',gridTemplateColumns:'140px repeat(5,1fr)',gap:'4px',padding:'12px 20px',borderBottom:idx<competitors.length-1?'1px solid #334155':'none',background:c.highlight?'linear-gradient(90deg,#10b98110,transparent)':c.isOwn&&!c.highlight?'linear-gradient(90deg,#ef444410,transparent)':hRow===idx?'#334155':'transparent',alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:'600',color:c.highlight?'#10b981':c.isOwn?'#f87171':'#f8fafc',fontSize:'13px'}}>{c.name}</div>
                  <span style={{background:ts.bg,color:ts.color,padding:'1px 6px',borderRadius:'8px',fontSize:'9px',fontWeight:'500'}}>{ts.label}</span>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:'600',color:'#f8fafc',fontSize:'13px'}}>{fmt(c.organicKeywords)}</div>
                  <div style={{fontSize:'10px',color:tc(c.keywordsTrend),fontWeight:'500'}}>{ti(c.keywordsTrend)} {Math.abs(c.keywordsTrend).toFixed(1)}%</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:'600',color:'#f8fafc',fontSize:'13px'}}>{fmt(c.organicTraffic)}</div>
                  <div style={{fontSize:'10px',color:tc(c.trafficTrend),fontWeight:'500'}}>{ti(c.trafficTrend)} {Math.abs(c.trafficTrend).toFixed(1)}%</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:'600',color:c.paidTraffic===0?'#475569':'#f8fafc',fontSize:'13px'}}>{c.paidTraffic===0?'—':fmt(c.paidTraffic)}</div>
                  {c.paidTraffic>0&&<div style={{fontSize:'10px',color:tc(c.paidTrafficTrend),fontWeight:'500'}}>{ti(c.paidTrafficTrend)} {Math.abs(c.paidTrafficTrend).toFixed(0)}%</div>}
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:'600',color:'#f8fafc',fontSize:'13px'}}>{fmt(c.refDomains)}</div>
                  <div style={{fontSize:'10px',color:tc(c.refTrend),fontWeight:'500'}}>{ti(c.refTrend)} {Math.abs(c.refTrend).toFixed(1)}%</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
                  <div style={{width:'36px',height:'36px',borderRadius:'50%',background:`conic-gradient(${ac(c.authorityScore)} ${c.authorityScore*3.6}deg,#334155 0deg)`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'#1e293b',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'700',fontSize:'11px',color:ac(c.authorityScore)}}>{c.authorityScore}</div>
                  </div>
                  {c.authorityChange!==0&&<div style={{fontSize:'9px',fontWeight:'600',color:c.authorityChange>0?'#10b981':'#ef4444'}}>{c.authorityChange>0?'+':''}{c.authorityChange}</div>}
                </div>
              </div>
            );
          })}
        </div>
        <ExecutiveBrief data={brief}/>
      </div>

      {/* ══════════════════════════════════════
          SMARKETING PERFORMANCE
          Leads=304 MQL=173 SQL=143 Deals=3
          OpenOpp=R$285.755 PotMRR=R$142.877
          ══════════════════════════════════════ */}
      <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
          <div>
            <div style={{fontSize:'16px',fontWeight:'600',color:'#f8fafc',marginBottom:'4px'}}>Smarketing Performance</div>
            <div style={{fontSize:'12px',color:'#64748b'}}>Full-funnel results: from lead generation to closed revenue</div>
          </div>
          <span style={{background:'#06b6d420',color:'#06b6d4',padding:'4px 12px',borderRadius:'12px',fontSize:'11px',fontWeight:'500'}}>YTD 2026</span>
        </div>

        {/* Score cards */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'24px'}}>
          <div style={{background:'linear-gradient(135deg,#065f46,#047857)',borderRadius:'12px',padding:'24px',border:'1px solid #10b98140'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}>
              <span style={{fontSize:'20px'}}>💼</span>
              <span style={{fontSize:'11px',color:'#a7f3d0',textTransform:'uppercase',letterSpacing:'0.5px',fontWeight:'600'}}>Open Opportunities</span>
            </div>
            <div style={{fontSize:'40px',fontWeight:'700',color:'#fff',marginBottom:'8px'}}>R$ 285.755</div>
            <div style={{fontSize:'13px',color:'#a7f3d0'}}>Pipeline total em aberto</div>
          </div>
          <div style={{background:'linear-gradient(135deg,#1e3a8a,#2563eb)',borderRadius:'12px',padding:'24px',border:'1px solid #3b82f640'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}>
              <span style={{fontSize:'20px'}}>📈</span>
              <span style={{fontSize:'11px',color:'#bfdbfe',textTransform:'uppercase',letterSpacing:'0.5px',fontWeight:'600'}}>Potencial MRR</span>
            </div>
            <div style={{fontSize:'40px',fontWeight:'700',color:'#fff',marginBottom:'8px'}}>R$ 142.877</div>
            <div style={{fontSize:'13px',color:'#bfdbfe'}}>Receita recorrente potencial</div>
          </div>
        </div>

        {/* Funil + KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'24px'}}>

          {/* Esquerda: KPI cards + taxas */}
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <div style={{background:'#0f172a',borderRadius:'10px',padding:'16px',border:'1px solid #334155'}}>
                <div style={{fontSize:'10px',color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'6px'}}>Leads</div>
                <div style={{fontSize:'34px',fontWeight:'700',color:'#3b82f6',marginBottom:'4px'}}>304</div>
                <div style={{fontSize:'11px',color:'#475569'}}>Total gerado</div>
              </div>
              <div style={{background:'#0f172a',borderRadius:'10px',padding:'16px',border:'1px solid #334155'}}>
                <div style={{fontSize:'10px',color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'6px'}}>MQL</div>
                <div style={{fontSize:'34px',fontWeight:'700',color:'#f97316',marginBottom:'4px'}}>173</div>
                <div style={{fontSize:'11px',color:'#475569'}}>56.9% dos leads</div>
              </div>
              <div style={{background:'#0f172a',borderRadius:'10px',padding:'16px',border:'1px solid #334155'}}>
                <div style={{fontSize:'10px',color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'6px'}}>SQL</div>
                <div style={{fontSize:'34px',fontWeight:'700',color:'#8b5cf6',marginBottom:'4px'}}>143</div>
                <div style={{fontSize:'11px',color:'#475569'}}>82.7% dos MQL</div>
              </div>
              <div style={{background:'#0f172a',borderRadius:'10px',padding:'16px',border:'1px solid #334155'}}>
                <div style={{fontSize:'10px',color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'6px'}}>Deals</div>
                <div style={{fontSize:'34px',fontWeight:'700',color:'#10b981',marginBottom:'4px'}}>3</div>
                <div style={{fontSize:'11px',color:'#475569'}}>Win rate 0.99%</div>
              </div>
            </div>


          </div>

          {/* Direita: funil visual */}
          <div style={S.inn}>
            <div style={{fontSize:'11px',color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'18px'}}>Sales Funnel</div>
            {[
              {name:'Leads', value:304, barPct:100,  conv:'100%', color:'#3b82f6'},
              {name:'MQL',   value:173, barPct:56.9, conv:'56.9%',color:'#f97316'},
              {name:'SQL',   value:143, barPct:47.0, conv:'82.7%',color:'#8b5cf6'},
              {name:'Deals', value:3,   barPct:2.5,  conv:'2.1%', color:'#10b981'},
            ].map(s=>(
              <div key={s.name} style={{marginBottom:'14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                  <span style={{fontSize:'12px',color:'#94a3b8',fontWeight:'500'}}>{s.name}</span>
                  <span style={{fontSize:'14px',color:'#f8fafc',fontWeight:'700'}}>{s.value}</span>
                </div>
                <div style={{height:'28px',background:'#1e293b',borderRadius:'6px',overflow:'hidden'}}>
                  <div style={{width:`${s.barPct}%`,height:'100%',background:`linear-gradient(90deg,${s.color},${s.color}bb)`,borderRadius:'6px',display:'flex',alignItems:'center',paddingLeft:'10px',minWidth:'52px'}}>
                    <span style={{fontSize:'11px',fontWeight:'700',color:'#fff'}}>{s.conv}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Resumo */}
            <div style={{marginTop:'20px',paddingTop:'16px',borderTop:'1px solid #334155',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
              <div>
                <div style={{fontSize:'10px',color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'4px'}}>Lead → Deal</div>
                <div style={{fontSize:'22px',fontWeight:'700',color:'#10b981'}}>0.99%</div>
              </div>
              <div>
                <div style={{fontSize:'10px',color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'4px'}}>Open Opp</div>
                <div style={{fontSize:'22px',fontWeight:'700',color:'#f8fafc'}}>R$ 285.7K</div>
              </div>
              <div>
                <div style={{fontSize:'10px',color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'4px'}}>Deals Fechados</div>
                <div style={{fontSize:'22px',fontWeight:'700',color:'#10b981'}}>3</div>
              </div>
              <div>
                <div style={{fontSize:'10px',color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'4px'}}>Pot. MRR</div>
                <div style={{fontSize:'22px',fontWeight:'700',color:'#3b82f6'}}>R$ 142.9K</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{textAlign:'center',fontSize:'12px',color:'#475569'}}>
        Built by AdRoq • GA4 + Semrush + HubSpot • Last update: {lastUpdated}
      </div>

    </div>
  );
}
