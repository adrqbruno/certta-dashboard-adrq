import React, { useState, useEffect } from 'react';

// ============================================
// CONFIGURAÇÃO - URLs DO GOOGLE SHEETS
// ============================================
const SHEETS_CONFIG = {
  competitorsUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlkIr00Ua6EYb3DLBehpFqWvdXd0LSexCXHLaIfRLCOIpG5nm5vOlZ4hKZqWwLXg/pub?gid=1560647113&single=true&output=csv',
  configUrl:      'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlkIr00Ua6EYb3DLBehpFqWvdXd0LSexCXHLaIfRLCOIpG5nm5vOlZ4hKZqWwLXg/pub?gid=109836250&single=true&output=csv',
  ga4Url:         'https://docs.google.com/spreadsheets/d/e/2PACX-1vT8Pxasw_GpaTaTuoCnYyYobveoEsI4OB2SHPx5S77AhomwrTEHYfzt7xQ440hdq9kSmcVI-kyHRhRR/pub?gid=730913988&single=true&output=csv',
  executiveBriefUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlkIr00Ua6EYb3DLBehpFqWvdXd0LSexCXHLaIfRLCOIpG5nm5vOlZ4hKZqWwLXg/pub?gid=1672972077&single=true&output=csv',
};

// ============================================
// GA4 DATA PROCESSING ENGINE
// ============================================
const MONTH_NAMES_PT = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
};

function parseGA4CSV(csvText) {
  const cleaned = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleaned.trim().split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').replace(/^\uFEFF/, ''));
  const headerMap = {};
  headers.forEach((h, idx) => {
    const lower = h.toLowerCase().replace(/[_\s]/g, '');
    if (lower === 'date' || lower === 'data') headerMap.date = idx;
    else if (lower === 'activeusers' || lower === 'usuariosativos') headerMap.activeUsers = idx;
    else if (lower === 'newusers' || lower === 'novosusuarios') headerMap.newUsers = idx;
    else if (lower === 'engagementrate' || lower === 'taxadeengajamento') headerMap.engagementRate = idx;
    else if (lower === 'sessions' || lower === 'sessoes' || lower === 'sessões') headerMap.sessions = idx;
    else if (lower === 'screenpageviews' || lower === 'pageviews' || lower === 'visualizacoesdepagina') headerMap.screenPageViews = idx;
  });
  if (headerMap.date === undefined || headerMap.sessions === undefined) return [];
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    let dateStr = values[headerMap.date] || '';
    if (/^\d{8}$/.test(dateStr)) { dateStr = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`; }
    else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) { const [dd, mm, yyyy] = dateStr.split('/'); dateStr = `${yyyy}-${mm}-${dd}`; }
    else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) { const parts = dateStr.split('/'); dateStr = `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`; }
    if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) continue;
    const getNum = (key) => {
      if (headerMap[key] === undefined) return 0;
      return parseFloat((values[headerMap[key]] || '0').replace(/\./g, '').replace(',', '.')) || 0;
    };
    rows.push({ date: dateStr, activeUsers: Math.round(getNum('activeUsers')), newUsers: Math.round(getNum('newUsers')), engagementRate: getNum('engagementRate'), sessions: Math.round(getNum('sessions')), screenPageViews: Math.round(getNum('screenPageViews')) });
  }
  return rows;
}

function getMonthKey(dateStr) {
  const [year, month] = dateStr.split('-');
  return `${MONTH_NAMES_PT[month] || month} ${year}`;
}

function processGA4Data(rows) {
  const monthGroups = {};
  rows.forEach(row => {
    const [year, month] = row.date.split('-');
    const idx = `${year}-${month}`;
    if (!monthGroups[idx]) monthGroups[idx] = { key: getMonthKey(row.date), days: [] };
    monthGroups[idx].days.push(row);
  });
  const sorted = Object.keys(monthGroups).sort();
  const ga4Monthly = {};
  const availableMonths = [];
  sorted.forEach((monthIdx, i) => {
    const days = monthGroups[monthIdx].days.sort((a, b) => a.date.localeCompare(b.date));
    const monthKey = monthGroups[monthIdx].key;
    const sum = (key) => days.reduce((s, d) => s + d[key], 0);
    const totalSessions = sum('sessions');
    const totalPageViews = sum('screenPageViews');
    const totalActiveUsers = sum('activeUsers');
    const totalNewUsers = sum('newUsers');
    const newUserPercent = totalActiveUsers > 0 ? Math.round((totalNewUsers / totalActiveUsers) * 100) : 0;
    let prevSessions = 0, prevPageViews = 0, prevActiveUsers = 0, prevNewUserPercent = 0, hasPrev = false;
    if (i > 0) {
      const prevDays = monthGroups[sorted[i - 1]].days;
      prevSessions = prevDays.reduce((s, d) => s + d.sessions, 0);
      prevPageViews = prevDays.reduce((s, d) => s + d.screenPageViews, 0);
      prevActiveUsers = prevDays.reduce((s, d) => s + d.activeUsers, 0);
      const prevNewUsers = prevDays.reduce((s, d) => s + d.newUsers, 0);
      prevNewUserPercent = prevActiveUsers > 0 ? Math.round((prevNewUsers / prevActiveUsers) * 100) : 0;
      hasPrev = true;
    }
    const trend = (cur, prev) => (!hasPrev || prev === 0) ? 0 : parseFloat(((cur - prev) / prev * 100).toFixed(1));
    const prevDaysArr = i > 0 ? monthGroups[sorted[i - 1]].days.sort((a, b) => a.date.localeCompare(b.date)) : [];
    ga4Monthly[monthKey] = {
      metrics: {
        sessions:      { value: totalSessions,    trend: trend(totalSessions, prevSessions) },
        pageViews:     { value: totalPageViews,   trend: trend(totalPageViews, prevPageViews) },
        activeUsers:   { value: totalActiveUsers, trend: trend(totalActiveUsers, prevActiveUsers) },
        newUserPercent:{ value: newUserPercent,   trend: trend(newUserPercent, prevNewUserPercent) }
      },
      dailyData: days.map((day, idx2) => ({
        date: day.date.split('-')[2],
        sessions: day.sessions,
        sessionsPrev: prevDaysArr[idx2] ? prevDaysArr[idx2].sessions : 0
      }))
    };
    availableMonths.push(monthKey);
  });
  return { ga4Monthly, availableMonths };
}

// ============================================
// STATIC DATA
// ============================================
const FALLBACK_DATA = {
  lastUpdated: 'Mar 2026',
  competitors: [
    { domain: 'unico.io',    name: 'Unico',       tier: 'leader',     organicKeywords: 5400, keywordsTrend:  1.11, organicTraffic: 39300, trafficTrend:  0.29, paidKeywords: 0, paidTrend:    0, paidTraffic:   0, paidTrafficTrend:   0,     refDomains: 2900, refTrend: -3.5,  authorityScore: 36, authorityChange: -3, isOwn: false, highlight: false },
    { domain: 'idwall.co',   name: 'idwall',      tier: 'competitor', organicKeywords: 2700, keywordsTrend:  0.30, organicTraffic: 12400, trafficTrend: -5.87, paidKeywords: 0, paidTrend:    0, paidTraffic:   0, paidTrafficTrend:   0,     refDomains: 1500, refTrend: -2.61, authorityScore: 33, authorityChange:  0, isOwn: false, highlight: false },
    { domain: 'jumio.com',   name: 'Jumio',       tier: 'global',     organicKeywords:  171, keywordsTrend: -1.16, organicTraffic:   512, trafficTrend:  0,    paidKeywords: 1, paidTrend:  -50, paidTraffic:   2, paidTrafficTrend: -71.43, refDomains: 8600, refTrend: -2.92, authorityScore: 42, authorityChange:  0, isOwn: false, highlight: false },
    { domain: 'caf.io',      name: 'CAF (legacy)',tier: 'legacy',     organicKeywords:  515, keywordsTrend: -5.16, organicTraffic:  1200, trafficTrend: -2.57, paidKeywords: 2, paidTrend: -33.33, paidTraffic: 54, paidTrafficTrend: -37.93, refDomains: 3300, refTrend: -1.65, authorityScore: 29, authorityChange:  0, isOwn: true,  highlight: false },
    { domain: 'clear.sale',  name: 'ClearSale',   tier: 'leader',     organicKeywords: 4000, keywordsTrend:  0.86, organicTraffic: 22500, trafficTrend:  3.73, paidKeywords: 5, paidTrend:   25, paidTraffic: 994, paidTrafficTrend:  26.14, refDomains: 3300, refTrend: -3.64, authorityScore: 42, authorityChange: -1, isOwn: false, highlight: false },
    { domain: 'certta.ai',   name: 'Certta',      tier: 'new',        organicKeywords:  101, keywordsTrend:  2.02, organicTraffic:    56, trafficTrend:  0,    paidKeywords: 0, paidTrend:    0, paidTraffic:   0, paidTrafficTrend:   0,     refDomains:  762, refTrend:  3.81, authorityScore: 20, authorityChange: 16, isOwn: true,  highlight: true  },
  ]
};

// ── FUNIL 100% ESTÁTICO — não há nenhum fetch que sobrescreva ──
const FUNNEL_DATA = {
  period:       'YTD 2026',
  openOpp:      285755,
  potencialMrr: 142877,
  leads:        304,
  mql:          173,
  sql:          143,
  deals:        3,
};

const GA4_FALLBACK = {
  'Fev 2026': {
    metrics: {
      sessions:      { value: 36600, trend: -25.2 },
      pageViews:     { value: 42300, trend: -30.5 },
      activeUsers:   { value: 27096, trend: -25.6 },
      newUserPercent:{ value: 127,   trend:   3.6 }
    },
    dailyData: [
      { date: '01', sessions: 2113, sessionsPrev: 1800 },
      { date: '03', sessions: 2805, sessionsPrev: 2200 },
      { date: '05', sessions: 4499, sessionsPrev: 3500 },
      { date: '07', sessions: 1102, sessionsPrev: 1400 },
      { date: '10', sessions: 2098, sessionsPrev: 1900 },
      { date: '12', sessions: 1805, sessionsPrev: 1600 },
      { date: '15', sessions: 662,  sessionsPrev: 1200 },
      { date: '18', sessions: 857,  sessionsPrev: 1100 },
      { date: '20', sessions: 784,  sessionsPrev: 1000 },
      { date: '22', sessions: 414,  sessionsPrev:  800 },
      { date: '24', sessions: 869,  sessionsPrev:  950 },
      { date: '27', sessions: 699,  sessionsPrev:  850 },
      { date: '28', sessions: 394,  sessionsPrev:  700 }
    ]
  }
};

const EXECUTIVE_BRIEF_FALLBACK = {
  title:      'Authority +16 pts',
  highlight1: 'Backlinks: Forbes, MIT, UOL, LinkedIn',
  highlight2: 'Ref domains supera Unico (4.1K vs 2.9K)',
  gap:        'Tráfego 31x abaixo do líder',
  next1:      'Manter produção de conteúdo',
  next2:      'Acelerar migração backlinks',
  next3:      'Monitorar crossover de tráfego',
  updatedAt:  'Mar 2026'
};

// ============================================
// CSV PARSERS
// ============================================
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((header, idx) => {
      let value = values[idx] || '';
      if (['organicKeywords','organicTraffic','paidKeywords','paidTraffic','refDomains','authorityScore','authorityChange'].includes(header)) value = parseInt(value) || 0;
      else if (['keywordsTrend','trafficTrend','paidTrend','paidTrafficTrend','refTrend'].includes(header)) value = parseFloat(value) || 0;
      else if (['isOwn','highlight'].includes(header)) value = value.toUpperCase() === 'TRUE';
      row[header] = value;
    });
    data.push(row);
  }
  return data;
}

function parseExecutiveBriefCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const data = {};
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (values[0]) data[values[0]] = values[1] || '';
  }
  return data;
}

// ============================================
// CHART COMPONENTS
// ============================================
const SparklineChart = ({ data, width = 500, height = 140 }) => {
  if (!data || data.length === 0) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '13px' }}>
      Dados não disponíveis para este período
    </div>
  );
  const maxVal = Math.max(...data.map(d => Math.max(d.sessions, d.sessionsPrev)));
  const pad = { top: 20, right: 20, bottom: 30, left: 10 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;
  const gx = (i) => pad.left + (i / (data.length - 1)) * cw;
  const gy = (v) => pad.top + ch - (v / (maxVal || 1)) * ch;
  const path = (key) => data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${gx(i)} ${gy(d[key])}`).join(' ');
  const area = (key) => {
    const lp = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${gx(i)} ${gy(d[key])}`).join(' ');
    return `${lp} L ${gx(data.length-1)} ${pad.top+ch} L ${gx(0)} ${pad.top+ch} Z`;
  };
  const interval = Math.max(1, Math.floor(data.length / 14));
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {[0, 0.5, 1].map((r, i) => <line key={i} x1={pad.left} y1={pad.top + ch*(1-r)} x2={width-pad.right} y2={pad.top + ch*(1-r)} stroke="#334155" strokeWidth="1" strokeDasharray="4,4" />)}
      <path d={area('sessionsPrev')} fill="#64748b" opacity="0.15" />
      <path d={path('sessionsPrev')} fill="none" stroke="#64748b" strokeWidth="2" opacity="0.5" />
      <path d={area('sessions')} fill="#3b82f6" opacity="0.2" />
      <path d={path('sessions')} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
      {data.map((d, i) => <circle key={i} cx={gx(i)} cy={gy(d.sessions)} r="3.5" fill="#3b82f6" />)}
      {data.map((d, i) => (i % interval === 0 || i === data.length-1) ? <text key={i} x={gx(i)} y={height-8} textAnchor="middle" fill="#64748b" fontSize="10">{d.date}</text> : null)}
      <text x={pad.left+5} y={pad.top+5} fill="#64748b" fontSize="9">{(maxVal/1000).toFixed(1)}K</text>
      <text x={pad.left+5} y={pad.top+ch-5} fill="#64748b" fontSize="9">0</text>
    </svg>
  );
};

const MonthSelector = ({ months, selected, onChange }) => (
  <div style={{ display: 'flex', gap: '4px', background: '#0f172a', padding: '4px', borderRadius: '10px', border: '1px solid #334155', flexWrap: 'wrap' }}>
    {months.map(m => (
      <button key={m} onClick={() => onChange(m)} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s', background: selected === m ? '#3b82f6' : 'transparent', color: selected === m ? '#fff' : '#94a3b8' }}>
        {m.split(' ')[0]}
      </button>
    ))}
  </div>
);

const ExecutiveBrief = ({ data }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(`📊 *Certta SEO Update - ${data.updatedAt}*\n\n✅ *${data.title}*\n• ${data.highlight1}\n• ${data.highlight2}\n\n⚠️ *Gap principal:*\n${data.gap}\n\n🎯 *Próximos passos:*\n• ${data.next1}\n• ${data.next2}\n• ${data.next3}`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px', border: '1px solid #334155', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>📋 Executive Brief</div>
        <button onClick={handleCopy} style={{ background: copied ? '#10b981' : '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '500', cursor: 'pointer' }}>
          {copied ? '✓ Copiado!' : '📤 Copiar'}
        </button>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ background: '#10b98120', borderLeft: '3px solid #10b981', padding: '12px', borderRadius: '0 8px 8px 0', marginBottom: '12px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#10b981', marginBottom: '8px' }}>{data.title}</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>• {data.highlight1}<br />• {data.highlight2}</div>
        </div>
        <div style={{ background: '#ef444420', borderLeft: '3px solid #ef4444', padding: '12px', borderRadius: '0 8px 8px 0', marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: '#ef4444', marginBottom: '4px', textTransform: 'uppercase' }}>Gap Principal</div>
          <div style={{ fontSize: '13px', color: '#fca5a5' }}>{data.gap}</div>
        </div>
        <div style={{ background: '#3b82f620', borderLeft: '3px solid #3b82f6', padding: '12px', borderRadius: '0 8px 8px 0' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: '#3b82f6', marginBottom: '8px', textTransform: 'uppercase' }}>Próximos Passos</div>
          <div style={{ fontSize: '13px', color: '#93c5fd', lineHeight: '1.6' }}>• {data.next1}<br />• {data.next2}<br />• {data.next3}</div>
        </div>
      </div>
      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #334155', fontSize: '11px', color: '#64748b', textAlign: 'right' }}>
        📅 Atualizado: {data.updatedAt}
      </div>
    </div>
  );
};

// ============================================
// MAIN APP
// ============================================
function App() {
  const [hoveredRow, setHoveredRow]             = useState(null);
  const [hoveredCompetitor, setHoveredCompetitor] = useState(null);
  const [competitors, setCompetitors]           = useState(FALLBACK_DATA.competitors);
  const [lastUpdated, setLastUpdated]           = useState(FALLBACK_DATA.lastUpdated);
  const [executiveBrief, setExecutiveBrief]     = useState(EXECUTIVE_BRIEF_FALLBACK);
  const [dataSource, setDataSource]             = useState('fallback');
  const [loading, setLoading]                   = useState(true);
  const [ga4MonthlyData, setGa4MonthlyData]     = useState(GA4_FALLBACK);
  const [availableMonths, setAvailableMonths]   = useState(['Fev 2026']);
  const [selectedMonth, setSelectedMonth]       = useState('Fev 2026');
  const [ga4Source, setGa4Source]               = useState('fallback');

  // FUNNEL É CONSTANTE — lido direto de FUNNEL_DATA, nunca de nenhum fetch
  const fd = FUNNEL_DATA;

  const ga4Data = ga4MonthlyData[selectedMonth] || {
    metrics: { sessions:{value:0,trend:0}, pageViews:{value:0,trend:0}, activeUsers:{value:0,trend:0}, newUserPercent:{value:0,trend:0} },
    dailyData: []
  };

  useEffect(() => {
    async function fetchData() {
      let loadedSomething = false;

      // ── GA4 ──
      try {
        const res = await fetch(SHEETS_CONFIG.ga4Url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const csv = await res.text();
        const rows = parseGA4CSV(csv);
        if (rows.length > 0) {
          const { ga4Monthly, availableMonths: months } = processGA4Data(rows);
          if (months.length > 0) {
            setGa4MonthlyData(ga4Monthly);
            setAvailableMonths(months);
            setSelectedMonth(months[months.length - 1]);
            setGa4Source('sheets');
            loadedSomething = true;
          }
        }
      } catch (e) { console.error('[GA4]', e); }

      // ── Competitors ──
      try {
        const res = await fetch(SHEETS_CONFIG.competitorsUrl);
        const csv = await res.text();
        const data = parseCSV(csv);
        if (data.length > 0) { setCompetitors(data); setDataSource('sheets'); loadedSomething = true; }
      } catch (e) { console.error('[Competitors]', e); }

      // ── Config ──
      try {
        const res = await fetch(SHEETS_CONFIG.configUrl);
        const csv = await res.text();
        const data = parseCSV(csv);
        const row = data.find(r => r.key === 'lastUpdated');
        if (row) setLastUpdated(row.value);
      } catch (e) { console.error('[Config]', e); }

      // ── Executive Brief ──
      try {
        const res = await fetch(SHEETS_CONFIG.executiveBriefUrl);
        const csv = await res.text();
        const data = parseExecutiveBriefCSV(csv);
        if (Object.keys(data).length > 0) setExecutiveBrief({ ...EXECUTIVE_BRIEF_FALLBACK, ...data });
      } catch (e) { console.error('[Brief]', e); }

      if (!loadedSomething) setDataSource('fallback');
      setLoading(false);
    }
    fetchData();
  }, []);

  // ── Helpers ──
  const fmt  = (n) => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n);
  const fmtR = (n) => n >= 1e6 ? `R$ ${(n/1e6).toFixed(1)}M` : n >= 1000 ? `R$ ${(n/1000).toFixed(1)}K` : `R$ ${n.toFixed(0)}`;
  const trendColor = (v) => v > 10 ? '#10b981' : v > 0 ? '#6ee7b7' : v > -10 ? '#fbbf24' : '#ef4444';
  const trendIcon  = (v) => v > 0 ? '↑' : v < 0 ? '↓' : '—';
  const authColor  = (s) => s >= 60 ? '#7c3aed' : s >= 40 ? '#3b82f6' : s >= 25 ? '#06b6d4' : '#94a3b8';
  const tierBadge  = (t) => ({
    enterprise: { bg: '#7c3aed20', color: '#7c3aed', label: 'Enterprise' },
    leader:     { bg: '#3b82f620', color: '#3b82f6', label: 'Market Leader' },
    competitor: { bg: '#06b6d420', color: '#06b6d4', label: 'Direct Competitor' },
    global:     { bg: '#f59e0b20', color: '#f59e0b', label: 'Global Player' },
    legacy:     { bg: '#ef444420', color: '#ef4444', label: 'Legacy Domain' },
    new:        { bg: '#10b98120', color: '#10b981', label: 'New Domain' },
  }[t] || { bg: '#06b6d420', color: '#06b6d4', label: 'Competitor' });

  // ── Spider data ──
  const certtaRow = competitors.find(c => c.domain === 'certta.ai') || {};
  const cafRow    = competitors.find(c => c.domain === 'caf.io')    || {};
  const certtaCombined = {
    organicKeywords: (certtaRow.organicKeywords||0) + (cafRow.organicKeywords||0),
    organicTraffic:  (certtaRow.organicTraffic||0)  + (cafRow.organicTraffic||0),
    refDomains:      (certtaRow.refDomains||0)      + (cafRow.refDomains||0),
    authorityScore:  Math.max(certtaRow.authorityScore||0, cafRow.authorityScore||0),
    paidPresence:    (certtaRow.paidTraffic||0)     + (cafRow.paidTraffic||0),
  };
  const spiderData = [
    { name: 'Certta (combined)', color: '#10b981', ...certtaCombined },
    ...competitors.filter(c => !c.isOwn).slice(0, 4).map((c, i) => ({
      name: c.name, color: ['#3b82f6','#8b5cf6','#f59e0b','#ec4899'][i],
      organicKeywords: c.organicKeywords, organicTraffic: c.organicTraffic,
      refDomains: c.refDomains, authorityScore: c.authorityScore, paidPresence: c.paidTraffic + c.paidKeywords
    }))
  ];
  const maxV = {
    organicKeywords: Math.max(...spiderData.map(c => c.organicKeywords)),
    organicTraffic:  Math.max(...spiderData.map(c => c.organicTraffic)),
    refDomains:      Math.max(...spiderData.map(c => c.refDomains)),
    authorityScore:  100,
    paidPresence:    Math.max(...spiderData.map(c => c.paidPresence)) || 1,
  };
  const axes = ['Organic Keywords','Organic Traffic','Ref Domains','Authority Score','Paid Presence'];
  const cx = 220, cy = 200, R = 140;
  const pt = (val, ax) => { const a = (Math.PI*2*ax)/axes.length - Math.PI/2; const r = (val/100)*R; return { x: cx+r*Math.cos(a), y: cy+r*Math.sin(a) }; };
  const poly = (vals) => vals.map((v,i) => { const p=pt(v,i); return `${p.x},${p.y}`; }).join(' ');
  const norm = (c) => [
    (c.organicKeywords / maxV.organicKeywords)*100,
    (c.organicTraffic  / maxV.organicTraffic )*100,
    (c.refDomains      / maxV.refDomains     )*100,
    c.authorityScore,
    (c.paidPresence    / maxV.paidPresence   )*100,
  ];

  const migrationPct = Math.round(((certtaRow.organicTraffic||0) / ((certtaRow.organicTraffic||0) + (cafRow.organicTraffic||1))) * 100);

  // ── Funnel stages (purely from FUNNEL_DATA constant) ──
  const funnelStages = [
    { name: 'Leads', value: fd.leads,  color: '#3b82f6' },
    { name: 'MQL',   value: fd.mql,    color: '#f97316' },
    { name: 'SQL',   value: fd.sql,    color: '#8b5cf6' },
    { name: 'Deals', value: fd.deals,  color: '#10b981' },
  ];

  const convRates = [
    { label: 'Lead → MQL', value: ((fd.mql  / fd.leads)*100).toFixed(1), color: '#f97316' },
    { label: 'MQL → SQL',  value: ((fd.sql  / fd.mql  )*100).toFixed(1), color: '#8b5cf6' },
    { label: 'SQL → Deal', value: ((fd.deals/ fd.sql  )*100).toFixed(1), color: '#10b981' },
    { label: 'Lead → Deal',value: ((fd.deals/ fd.leads)*100).toFixed(2), color: '#06b6d4' },
  ];

  // ── Sub-components ──
  const GA4Card = ({ label, value, trend, sub }) => (
    <div style={{ background: '#0f172a', borderRadius: '10px', padding: '16px', border: '1px solid #334155' }}>
      <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '26px', fontWeight: '700', color: '#f8fafc', marginBottom: '6px' }}>{value}</div>
      <div style={{ display: 'flex', gap: '6px', fontSize: '12px' }}>
        <span style={{ color: trendColor(trend), fontWeight: '600' }}>{trendIcon(trend)} {Math.abs(trend).toFixed(1)}%</span>
        <span style={{ color: '#64748b' }}>{sub}</span>
      </div>
    </div>
  );

  const KpiCard = ({ icon, label, value, trend, sub }) => (
    <div style={{ background: '#0f172a', borderRadius: '12px', padding: '16px', border: '1px solid #334155' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      </div>
      <div style={{ fontSize: '22px', fontWeight: '700', color: '#f8fafc', marginBottom: '4px' }}>{value}</div>
      {trend !== undefined && (
        <div style={{ fontSize: '12px', color: trendColor(trend), fontWeight: '500' }}>
          {trendIcon(trend)} {Math.abs(trend).toFixed(1)}% {sub && <span style={{ color: '#64748b' }}>{sub}</span>}
        </div>
      )}
    </div>
  );

  // ============================================
  // LOADING
  // ============================================
  if (loading) return (
    <div style={{ fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", background: 'linear-gradient(135deg,#0f172a,#1e293b)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e2e8f0' }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div><div>Carregando dados...</div></div>
    </div>
  );

  // ============================================
  // RENDER
  // ============================================
  const base = { fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", background: 'linear-gradient(135deg,#0f172a,#1e293b)', minHeight: '100vh', padding: '32px', color: '#e2e8f0' };
  const card = { background: '#1e293b', borderRadius: '16px', padding: '24px', marginBottom: '24px', border: '1px solid #334155' };
  const inner = { background: '#0f172a', borderRadius: '12px', padding: '16px', border: '1px solid #334155' };

  return (
    <div style={base}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#f8fafc', margin: 0, letterSpacing: '-0.5px' }}>Certta Performance Hub</h1>
          <span style={{ background: '#10b98120', color: '#10b981', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>LIVE</span>
          <span style={{ background: dataSource === 'sheets' ? '#3b82f620' : '#f59e0b20', color: dataSource === 'sheets' ? '#3b82f6' : '#f59e0b', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>
            {dataSource === 'sheets' ? '📊 Google Sheets' : '📁 Dados Locais'}
          </span>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Smarketing & SEO Performance Dashboard • Updated: {lastUpdated}</p>
      </div>

      {/* ── GA4 ── */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>Website Analytics</span>
              <span style={{ background: ga4Source === 'sheets' ? '#10b98120' : '#f59e0b20', color: ga4Source === 'sheets' ? '#10b981' : '#f59e0b', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '500' }}>
                {ga4Source === 'sheets' ? '🔗 Live' : '📁 Fallback'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Google Analytics 4 • certta.ai</div>
          </div>
          <MonthSelector months={availableMonths} selected={selectedMonth} onChange={setSelectedMonth} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px' }}>
            <GA4Card label="Sessions"     value={fmt(ga4Data.metrics.sessions.value)}      trend={ga4Data.metrics.sessions.trend}      sub="vs. mês ant." />
            <GA4Card label="Page Views"   value={fmt(ga4Data.metrics.pageViews.value)}     trend={ga4Data.metrics.pageViews.trend}     sub="vs. mês ant." />
            <GA4Card label="Active Users" value={fmt(ga4Data.metrics.activeUsers.value)}   trend={ga4Data.metrics.activeUsers.trend}   sub="vs. mês ant." />
            <GA4Card label="New Users %"  value={`${ga4Data.metrics.newUserPercent.value}%`} trend={ga4Data.metrics.newUserPercent.trend} sub="vs. mês ant." />
          </div>
          <div style={inner}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sessions Trend • {selectedMonth}</div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '3px', background: '#3b82f6', borderRadius: '2px' }} /><span style={{ color: '#94a3b8' }}>Current</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '3px', background: '#64748b', borderRadius: '2px' }} /><span style={{ color: '#64748b' }}>Previous</span></div>
              </div>
            </div>
            <SparklineChart data={ga4Data.dailyData} width={500} height={140} />
          </div>
        </div>
      </div>

      {/* ── Migration ── */}
      <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', borderRadius: '16px', padding: '24px', marginBottom: '24px', border: '1px solid #4338ca40', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '24px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#a5b4fc', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Domain Migration Status</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#f8fafc', marginBottom: '4px' }}>{migrationPct}%</div>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Traffic on certta.ai</div>
          <div style={{ marginTop: '12px', background: '#1e293b', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${migrationPct}%`, height: '100%', background: 'linear-gradient(90deg,#10b981,#34d399)', borderRadius: '8px' }} />
          </div>
        </div>
        <div style={{ borderLeft: '1px solid #4338ca40', paddingLeft: '24px' }}>
          <div style={{ fontSize: '12px', color: '#fca5a5', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⚠️ Legacy Decay (caf.io)</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#ef4444', marginBottom: '4px' }}>{cafRow.trafficTrend||0}%</div>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Organic traffic MoM</div>
        </div>
        <div style={{ borderLeft: '1px solid #4338ca40', paddingLeft: '24px' }}>
          <div style={{ fontSize: '12px', color: '#86efac', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🚀 New Domain (certta.ai)</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>+{certtaRow.trafficTrend||0}%</div>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Organic traffic MoM</div>
        </div>
      </div>

      {/* ── Spider ── */}
      <div style={card}>
        <div style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '20px' }}>Competitive Positioning Radar</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px,400px) 1fr', gap: '32px', alignItems: 'start' }}>
          <svg width="100%" viewBox="0 0 440 400" style={{ maxWidth: '440px' }}>
            {[20,40,60,80,100].map((p,i) => <circle key={i} cx={cx} cy={cy} r={(p/100)*R} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray={i===4?"none":"4,4"} />)}
            {axes.map((_,i) => { const p=pt(100,i); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#334155" strokeWidth="1" />; })}
            {axes.map((label,i) => { const p=pt(120,i); return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline={i===0?"auto":i===Math.floor(axes.length/2)?"hanging":"middle"} fill="#94a3b8" fontSize="11" fontWeight="500">{label}</text>; })}
            {spiderData.map((c,idx) => { const vals=norm(c); return <polygon key={c.name} points={poly(vals)} fill={`${c.color}15`} stroke={c.color} strokeWidth={hoveredCompetitor===idx||hoveredCompetitor===null?"2":"1"} opacity={hoveredCompetitor===null||hoveredCompetitor===idx?1:0.3} style={{transition:'all 0.2s'}} />; })}
            {spiderData.map((c,idx) => norm(c).map((v,i) => { const p=pt(v,i); return <circle key={`${c.name}-${i}`} cx={p.x} cy={p.y} r={hoveredCompetitor===idx?5:4} fill={c.color} opacity={hoveredCompetitor===null||hoveredCompetitor===idx?1:0.3} style={{transition:'all 0.2s'}} />; }))}
            {[25,50,75,100].map((p,i) => <text key={i} x={cx+5} y={cy-(p/100)*R} fill="#64748b" fontSize="9" dominantBaseline="middle">{p}%</text>)}
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '24px', alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Competitors</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {spiderData.map((c,i) => (
                    <div key={c.name} onMouseEnter={() => setHoveredCompetitor(i)} onMouseLeave={() => setHoveredCompetitor(null)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', borderRadius: '6px', background: hoveredCompetitor===i?'#33415530':'transparent', cursor: 'pointer' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: c.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', fontWeight: c.name.includes('Certta')?'600':'400', color: c.name.includes('Certta')?'#10b981':'#e2e8f0' }}>{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🎯 Certta Combined</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: '12px' }}>
                  <KpiCard icon="🔑" label="Keywords"   value={fmt(certtaCombined.organicKeywords)} trend={certtaRow.keywordsTrend||0} sub="MoM" />
                  <KpiCard icon="📈" label="Org Traffic" value={fmt(certtaCombined.organicTraffic)}  trend={certtaRow.trafficTrend||0}  sub="MoM" />
                  <KpiCard icon="🔗" label="Ref Domains" value={fmt(certtaCombined.refDomains)}      trend={certtaRow.refTrend||0}      sub="MoM" />
                  <KpiCard icon="⭐" label="Authority"   value={certtaCombined.authorityScore}       trend={certtaRow.authorityChange||0} sub="pts" />
                </div>
              </div>
            </div>
            <div style={inner}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📊 Radar Analysis</div>
              <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.7' }}>
                <p style={{ margin: '0 0 10px 0' }}><strong style={{ color: '#10b981' }}>Certta's strength:</strong> Ref Domains ({fmt(certtaCombined.refDomains)} combined) competitive with market leaders due to caf.io legacy backlinks.</p>
                <p style={{ margin: '0 0 10px 0' }}><strong style={{ color: '#ef4444' }}>Critical gaps:</strong> Organic Traffic {Math.round(maxV.organicTraffic/(certtaCombined.organicTraffic||1))}x below market leader. Volume metrics take 6-12 months to build.</p>
                <p style={{ margin: 0 }}><strong style={{ color: '#f59e0b' }}>Opportunity:</strong> Jumio has high authority (42) but low BR traffic — international player without local SEO. Certta can capture BR-specific demand.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Table + Brief ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: '#1e293b', borderRadius: '16px', overflow: 'hidden', border: '1px solid #334155' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155' }}>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>Detailed Competitive Metrics</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '140px repeat(5,1fr)', gap: '4px', padding: '12px 20px', background: '#0f172a', borderBottom: '1px solid #334155', fontSize: '10px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <div>Domain</div><div style={{textAlign:'right'}}>KWs</div><div style={{textAlign:'right'}}>Traffic</div><div style={{textAlign:'right'}}>Paid</div><div style={{textAlign:'right'}}>Refs</div><div style={{textAlign:'center'}}>Auth</div>
          </div>
          {competitors.map((c, idx) => {
            const ts = tierBadge(c.tier);
            return (
              <div key={c.domain} onMouseEnter={() => setHoveredRow(idx)} onMouseLeave={() => setHoveredRow(null)} style={{ display: 'grid', gridTemplateColumns: '140px repeat(5,1fr)', gap: '4px', padding: '12px 20px', borderBottom: idx < competitors.length-1 ? '1px solid #334155' : 'none', background: c.highlight ? 'linear-gradient(90deg,#10b98110,transparent)' : c.isOwn&&!c.highlight ? 'linear-gradient(90deg,#ef444410,transparent)' : hoveredRow===idx ? '#334155' : 'transparent', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '600', color: c.highlight?'#10b981':c.isOwn?'#f87171':'#f8fafc', fontSize: '13px' }}>{c.name}</div>
                  <span style={{ background: ts.bg, color: ts.color, padding: '1px 6px', borderRadius: '8px', fontSize: '9px', fontWeight: '500' }}>{ts.label}</span>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:'600',color:'#f8fafc',fontSize:'13px'}}>{fmt(c.organicKeywords)}</div>
                  <div style={{fontSize:'10px',color:trendColor(c.keywordsTrend),fontWeight:'500'}}>{trendIcon(c.keywordsTrend)} {Math.abs(c.keywordsTrend).toFixed(1)}%</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:'600',color:'#f8fafc',fontSize:'13px'}}>{fmt(c.organicTraffic)}</div>
                  <div style={{fontSize:'10px',color:trendColor(c.trafficTrend),fontWeight:'500'}}>{trendIcon(c.trafficTrend)} {Math.abs(c.trafficTrend).toFixed(1)}%</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:'600',color:c.paidTraffic===0?'#475569':'#f8fafc',fontSize:'13px'}}>{c.paidTraffic===0?'—':fmt(c.paidTraffic)}</div>
                  {c.paidTraffic>0&&<div style={{fontSize:'10px',color:trendColor(c.paidTrafficTrend),fontWeight:'500'}}>{trendIcon(c.paidTrafficTrend)} {Math.abs(c.paidTrafficTrend).toFixed(0)}%</div>}
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:'600',color:'#f8fafc',fontSize:'13px'}}>{fmt(c.refDomains)}</div>
                  <div style={{fontSize:'10px',color:trendColor(c.refTrend),fontWeight:'500'}}>{trendIcon(c.refTrend)} {Math.abs(c.refTrend).toFixed(1)}%</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
                  <div style={{width:'36px',height:'36px',borderRadius:'50%',background:`conic-gradient(${authColor(c.authorityScore)} ${c.authorityScore*3.6}deg,#334155 0deg)`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'#1e293b',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'700',fontSize:'11px',color:authColor(c.authorityScore)}}>{c.authorityScore}</div>
                  </div>
                  {c.authorityChange!==0&&<div style={{fontSize:'9px',fontWeight:'600',color:c.authorityChange>0?'#10b981':'#ef4444'}}>{c.authorityChange>0?'+':''}{c.authorityChange}</div>}
                </div>
              </div>
            );
          })}
        </div>
        <ExecutiveBrief data={executiveBrief} />
      </div>

      {/* ══════════════════════════════════════════
          SMARKETING — 100% STATIC FROM FUNNEL_DATA
          ══════════════════════════════════════════ */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '4px' }}>Smarketing Performance</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Full-funnel results: from lead generation to closed revenue</div>
          </div>
          <span style={{ background: '#06b6d420', color: '#06b6d4', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '500' }}>{fd.period}</span>
        </div>

        {/* Score cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'linear-gradient(135deg,#065f46,#047857)', borderRadius: '12px', padding: '20px', border: '1px solid #10b98140' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>💼</span>
              <span style={{ fontSize: '11px', color: '#a7f3d0', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '500' }}>Open Opportunities</span>
            </div>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>R$ 285.755</div>
            <div style={{ fontSize: '13px', color: '#a7f3d0' }}>Pipeline total em aberto</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', borderRadius: '12px', padding: '20px', border: '1px solid #3b82f640' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>📈</span>
              <span style={{ fontSize: '11px', color: '#bfdbfe', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '500' }}>Potencial MRR</span>
            </div>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>R$ 142.877</div>
            <div style={{ fontSize: '13px', color: '#bfdbfe' }}>Receita recorrente potencial</div>
          </div>
        </div>

        {/* Funil + KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

          {/* KPI cards + taxas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px' }}>
              {[
                { label: 'Leads', value: fd.leads, color: '#3b82f6', sub: 'Total gerado' },
                { label: 'MQL',   value: fd.mql,   color: '#f97316', sub: `${((fd.mql/fd.leads)*100).toFixed(1)}% dos leads` },
                { label: 'SQL',   value: fd.sql,   color: '#8b5cf6', sub: `${((fd.sql/fd.mql)*100).toFixed(1)}% dos MQL` },
                { label: 'Deals', value: fd.deals, color: '#10b981', sub: `Win rate ${((fd.deals/fd.leads)*100).toFixed(2)}%` },
              ].map(k => (
                <div key={k.label} style={{ background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{k.label}</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: k.color, marginBottom: '2px' }}>{k.value}</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Taxas de conversão */}
            <div style={inner}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Taxas de Conversão</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {convRates.map(r => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', width: '90px', flexShrink: 0 }}>{r.label}</span>
                    <div style={{ flex: 1, background: '#1e293b', borderRadius: '4px', height: '20px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(parseFloat(r.value), 100)}%`, height: '100%', background: r.color, borderRadius: '4px', display: 'flex', alignItems: 'center', paddingLeft: '8px', minWidth: '40px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap' }}>{r.value}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Funil visual */}
          <div style={inner}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Sales Funnel</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {funnelStages.map((stage, i) => {
                const pct = (stage.value / funnelStages[0].value) * 100;
                const conv = i > 0 ? ((stage.value / funnelStages[i-1].value)*100).toFixed(1) : '100';
                return (
                  <div key={stage.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>{stage.name}</span>
                      <span style={{ fontSize: '14px', color: '#f8fafc', fontWeight: '600' }}>{stage.value}</span>
                    </div>
                    <div style={{ height: '28px', background: '#1e293b', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg,${stage.color},${stage.color}cc)`, borderRadius: '6px', display: 'flex', alignItems: 'center', paddingLeft: '10px', minWidth: stage.value > 0 ? '50px' : '0' }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#fff' }}>{conv}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rodapé resumo */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #334155', display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Lead → Deal</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>{((fd.deals/fd.leads)*100).toFixed(2)}%</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Open Opp</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc' }}>R$ 285.7K</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Deals Fechados</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>{fd.deals}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Pot. MRR</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#3b82f6' }}>R$ 142.9K</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ textAlign: 'center', fontSize: '12px', color: '#475569' }}>
        Built by AdRoq • Data source: GA4 + Semrush + HubSpot • Last update: {lastUpdated}
      </div>
    </div>
  );
}

export default App;
