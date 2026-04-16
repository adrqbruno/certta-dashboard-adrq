import React, { useState, useEffect } from 'react';

// ============================================
// CONFIGURAÇÃO - URLs DO GOOGLE SHEETS
// ============================================
const SHEETS_CONFIG = {
  competitorsUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlkIr00Ua6EYb3DLBehpFqWvdXd0LSexCXHLaIfRLCOIpG5nm5vOlZ4hKZqWwLXg/pub?gid=1560647113&single=true&output=csv',
  configUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlkIr00Ua6EYb3DLBehpFqWvdXd0LSexCXHLaIfRLCOIpG5nm5vOlZ4hKZqWwLXg/pub?gid=109836250&single=true&output=csv',
  ga4Url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT8Pxasw_GpaTaTuoCnYyYobveoEsI4OB2SHPx5S77AhomwrTEHYfzt7xQ440hdq9kSmcVI-kyHRhRR/pub?gid=730913988&single=true&output=csv',
  smarketingUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSIMqy3JIcjK5fi9BkPrTzskfgQs9BrZAwIk1UFZ4IBbqoFXYIOXhWSokH4JzUORg/pub?gid=1987761827&single=true&output=csv',
  executiveBriefUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlkIr00Ua6EYb3DLBehpFqWvdXd0LSexCXHLaIfRLCOIpG5nm5vOlZ4hKZqWwLXg/pub?gid=1672972077&single=true&output=csv',
  useFallback: false
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
  if (lines.length < 2) { console.warn('[GA4] CSV has less than 2 lines:', lines); return []; }
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').replace(/^\uFEFF/, ''));
  console.log('[GA4] Headers detected:', headers);
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
  console.log('[GA4] Header mapping:', headerMap);
  if (headerMap.date === undefined || headerMap.sessions === undefined) { console.error('[GA4] Missing required columns. Found headers:', headers); return []; }
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    let dateStr = values[headerMap.date] || '';
    if (/^\d{8}$/.test(dateStr)) { dateStr = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`; }
    else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) { const [dd, mm, yyyy] = dateStr.split('/'); dateStr = `${yyyy}-${mm}-${dd}`; }
    else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) { const parts = dateStr.split('/'); const mm = parts[0].padStart(2, '0'); const dd = parts[1].padStart(2, '0'); dateStr = `${parts[2]}-${mm}-${dd}`; }
    if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) { if (i <= 3) console.warn(`[GA4] Skipping row ${i}, invalid date: "${values[headerMap.date]}"`); continue; }
    const getNum = (key) => {
      if (headerMap[key] === undefined) return 0;
      const raw = values[headerMap[key]] || '0';
      const normalized = raw.replace(/\./g, '').replace(',', '.');
      return parseFloat(normalized) || 0;
    };
    rows.push({ date: dateStr, activeUsers: Math.round(getNum('activeUsers')), newUsers: Math.round(getNum('newUsers')), engagementRate: getNum('engagementRate'), sessions: Math.round(getNum('sessions')), screenPageViews: Math.round(getNum('screenPageViews')) });
  }
  console.log(`[GA4] Parsed ${rows.length} rows from ${lines.length - 1} data lines`);
  if (rows.length > 0) { console.log('[GA4] Date range:', rows[0].date, '→', rows[rows.length - 1].date); }
  return rows;
}

function getMonthKey(dateStr) {
  const [year, month] = dateStr.split('-');
  const monthName = MONTH_NAMES_PT[month] || month;
  return `${monthName} ${year}`;
}

function getMonthIndex(dateStr) {
  const [year, month] = dateStr.split('-');
  return `${year}-${month}`;
}

function processGA4Data(rows) {
  const monthGroups = {};
  rows.forEach(row => {
    const monthKey = getMonthKey(row.date);
    const monthIdx = getMonthIndex(row.date);
    if (!monthGroups[monthIdx]) { monthGroups[monthIdx] = { key: monthKey, idx: monthIdx, days: [] }; }
    monthGroups[monthIdx].days.push(row);
  });
  const sortedMonthKeys = Object.keys(monthGroups).sort();
  const ga4Monthly = {};
  const availableMonths = [];
  sortedMonthKeys.forEach((monthIdx, i) => {
    const group = monthGroups[monthIdx];
    const monthKey = group.key;
    const days = group.days.sort((a, b) => a.date.localeCompare(b.date));
    const totalSessions = days.reduce((sum, d) => sum + d.sessions, 0);
    const totalPageViews = days.reduce((sum, d) => sum + d.screenPageViews, 0);
    const totalActiveUsers = days.reduce((sum, d) => sum + d.activeUsers, 0);
    const totalNewUsers = days.reduce((sum, d) => sum + d.newUsers, 0);
    const newUserPercent = totalActiveUsers > 0 ? Math.round((totalNewUsers / totalActiveUsers) * 100) : 0;
    let prevSessions = 0, prevPageViews = 0, prevActiveUsers = 0, prevNewUserPercent = 0;
    let hasPrev = false;
    if (i > 0) {
      const prevMonthIdx = sortedMonthKeys[i - 1];
      const prevGroup = monthGroups[prevMonthIdx];
      const prevDays = prevGroup.days;
      prevSessions = prevDays.reduce((sum, d) => sum + d.sessions, 0);
      prevPageViews = prevDays.reduce((sum, d) => sum + d.screenPageViews, 0);
      prevActiveUsers = prevDays.reduce((sum, d) => sum + d.activeUsers, 0);
      const prevTotalNewUsers = prevDays.reduce((sum, d) => sum + d.newUsers, 0);
      prevNewUserPercent = prevActiveUsers > 0 ? Math.round((prevTotalNewUsers / prevActiveUsers) * 100) : 0;
      hasPrev = true;
    }
    const calcTrend = (current, previous) => { if (!hasPrev || previous === 0) return 0; return ((current - previous) / previous) * 100; };
    const prevMonthDays = i > 0 ? monthGroups[sortedMonthKeys[i - 1]].days.sort((a, b) => a.date.localeCompare(b.date)) : [];
    const dailyData = days.map((day, dayIdx) => {
      const dayNum = day.date.split('-')[2];
      const prevDay = prevMonthDays[dayIdx];
      return { date: dayNum, sessions: day.sessions, sessionsPrev: prevDay ? prevDay.sessions : 0 };
    });
    ga4Monthly[monthKey] = {
      metrics: {
        sessions: { value: totalSessions, trend: parseFloat(calcTrend(totalSessions, prevSessions).toFixed(1)) },
        pageViews: { value: totalPageViews, trend: parseFloat(calcTrend(totalPageViews, prevPageViews).toFixed(1)) },
        activeUsers: { value: totalActiveUsers, trend: parseFloat(calcTrend(totalActiveUsers, prevActiveUsers).toFixed(1)) },
        newUserPercent: { value: newUserPercent, trend: parseFloat(calcTrend(newUserPercent, prevNewUserPercent).toFixed(1)) }
      },
      dailyData
    };
    availableMonths.push(monthKey);
  });
  return { ga4Monthly, availableMonths };
}

// ============================================
// FALLBACK DATA
// ============================================

const FALLBACK_DATA = {
  lastUpdated: "Mar 2026",
  competitors: [
    { domain: 'unico.io', name: 'Unico', tier: 'leader', organicKeywords: 5400, keywordsTrend: 1.11, organicTraffic: 39300, trafficTrend: 0.29, paidKeywords: 0, paidTrend: 0, paidTraffic: 0, paidTrafficTrend: 0, refDomains: 2900, refTrend: -3.5, authorityScore: 36, authorityChange: -3, isOwn: false, highlight: false },
    { domain: 'idwall.co', name: 'idwall', tier: 'competitor', organicKeywords: 2700, keywordsTrend: 0.3, organicTraffic: 12400, trafficTrend: -5.87, paidKeywords: 0, paidTrend: 0, paidTraffic: 0, paidTrafficTrend: 0, refDomains: 1500, refTrend: -2.61, authorityScore: 33, authorityChange: 0, isOwn: false, highlight: false },
    { domain: 'jumio.com', name: 'Jumio', tier: 'global', organicKeywords: 171, keywordsTrend: -1.16, organicTraffic: 512, trafficTrend: 0, paidKeywords: 1, paidTrend: -50, paidTraffic: 2, paidTrafficTrend: -71.43, refDomains: 8600, refTrend: -2.92, authorityScore: 42, authorityChange: 0, isOwn: false, highlight: false },
    { domain: 'caf.io', name: 'CAF (legacy)', tier: 'legacy', organicKeywords: 515, keywordsTrend: -5.16, organicTraffic: 1200, trafficTrend: -2.57, paidKeywords: 2, paidTrend: -33.33, paidTraffic: 54, paidTrafficTrend: -37.93, refDomains: 3300, refTrend: -1.65, authorityScore: 29, authorityChange: 0, isOwn: true, highlight: false },
    { domain: 'clear.sale', name: 'ClearSale', tier: 'leader', organicKeywords: 4000, keywordsTrend: 0.86, organicTraffic: 22500, trafficTrend: 3.73, paidKeywords: 5, paidTrend: 25, paidTraffic: 994, paidTrafficTrend: 26.14, refDomains: 3300, refTrend: -3.64, authorityScore: 42, authorityChange: -1, isOwn: false, highlight: false },
    { domain: 'certta.ai', name: 'Certta', tier: 'new', organicKeywords: 101, keywordsTrend: 2.02, organicTraffic: 56, trafficTrend: 0, paidKeywords: 0, paidTrend: 0, paidTraffic: 0, paidTrafficTrend: 0, refDomains: 762, refTrend: 3.81, authorityScore: 20, authorityChange: 16, isOwn: true, highlight: true }
  ]
};

// ============================================
// FUNNEL DATA — STATIC (valores reais Certta)
// ============================================
const FUNNEL_DATA = {
  period: "YTD 2026",
  // Score cards superiores
  openOpp: { value: 285755, trend: 0 },
  potencialMrr: { value: 142877, trend: 0 },
  // Funil
  leads: { value: 304, trend: 0 },
  mql: { value: 173, trend: 0 },
  sql: { value: 143, trend: 0 },
  wonDeals: { value: 3, trend: 0 },
  winRate: { value: parseFloat(((3 / 304) * 100).toFixed(1)), trend: 0 },
  // Eficiência
  adsSpend: { value: 0, trend: 0 },
  cac: { value: 0, trend: 0 },
  cpa: { value: 0, trend: 0 },
  roas: { value: 0, trend: 0 }
};

// GA4 fallback
const GA4_MONTHLY_FALLBACK = {
  'Fev 2026': {
    metrics: {
      sessions: { value: 36600, trend: -25.2 },
      pageViews: { value: 42300, trend: -30.5 },
      activeUsers: { value: 27096, trend: -25.6 },
      newUserPercent: { value: 127, trend: 3.6 }
    },
    dailyData: [
      { date: '01', sessions: 2113, sessionsPrev: 1800 },
      { date: '03', sessions: 2805, sessionsPrev: 2200 },
      { date: '05', sessions: 4499, sessionsPrev: 3500 },
      { date: '07', sessions: 1102, sessionsPrev: 1400 },
      { date: '10', sessions: 2098, sessionsPrev: 1900 },
      { date: '12', sessions: 1805, sessionsPrev: 1600 },
      { date: '15', sessions: 662, sessionsPrev: 1200 },
      { date: '18', sessions: 857, sessionsPrev: 1100 },
      { date: '20', sessions: 784, sessionsPrev: 1000 },
      { date: '22', sessions: 414, sessionsPrev: 800 },
      { date: '24', sessions: 869, sessionsPrev: 950 },
      { date: '27', sessions: 699, sessionsPrev: 850 },
      { date: '28', sessions: 394, sessionsPrev: 700 }
    ]
  }
};

const EXECUTIVE_BRIEF_FALLBACK = {
  title: 'Authority +16 pts',
  highlight1: 'Backlinks: Forbes, MIT, UOL, LinkedIn',
  highlight2: 'Ref domains supera Unico (4.1K vs 2.9K)',
  gap: 'Tráfego 31x abaixo do líder',
  next1: 'Manter produção de conteúdo',
  next2: 'Acelerar migração backlinks',
  next3: 'Monitorar crossover de tráfego',
  updatedAt: 'Mar 2026'
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
    headers.forEach((header, index) => {
      let value = values[index] || '';
      if (['organicKeywords', 'organicTraffic', 'paidKeywords', 'paidTraffic', 'refDomains', 'authorityScore', 'authorityChange'].includes(header)) { value = parseInt(value) || 0; }
      else if (['keywordsTrend', 'trafficTrend', 'paidTrend', 'paidTrafficTrend', 'refTrend'].includes(header)) { value = parseFloat(value) || 0; }
      else if (['isOwn', 'highlight'].includes(header)) { value = value.toUpperCase() === 'TRUE'; }
      row[header] = value;
    });
    data.push(row);
  }
  return data;
}

function parseSmarketingCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const data = {};
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#') || line.startsWith('"#')) continue;
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const metric = values[0];
    const value = values[1];
    const trend = values[2];
    const period = values[3];
    if (!metric || metric.startsWith('#')) continue;
    let parsedValue = value;
    let parsedTrend = parseFloat(trend) || 0;
    if (!isNaN(parseFloat(value))) { parsedValue = parseFloat(value); }
    data[metric] = { value: parsedValue, trend: parsedTrend, period: period || '' };
  }
  return data;
}

function parseExecutiveBriefCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const data = {};
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const field = values[0];
    const content = values[1];
    if (field) { data[field] = content || ''; }
  }
  return data;
}

// ============================================
// CHART COMPONENTS
// ============================================

const SparklineChart = ({ data, width = 500, height = 140 }) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '13px' }}>
        Dados não disponíveis para este período
      </div>
    );
  }
  const maxValue = Math.max(...data.map(d => Math.max(d.sessions, d.sessionsPrev)));
  const minValue = 0;
  const padding = { top: 20, right: 20, bottom: 30, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const getX = (index) => padding.left + (index / (data.length - 1)) * chartWidth;
  const getY = (value) => padding.top + chartHeight - ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;
  const createPath = (key) => data.map((d, i) => { const x = getX(i); const y = getY(d[key]); return `${i === 0 ? 'M' : 'L'} ${x} ${y}`; }).join(' ');
  const createArea = (key) => {
    const linePath = data.map((d, i) => { const x = getX(i); const y = getY(d[key]); return `${i === 0 ? 'M' : 'L'} ${x} ${y}`; }).join(' ');
    const lastX = getX(data.length - 1); const firstX = getX(0); const bottomY = padding.top + chartHeight;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };
  const labelInterval = Math.max(1, Math.floor(data.length / 14));
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {[0, 0.5, 1].map((ratio, i) => (
        <line key={i} x1={padding.left} y1={padding.top + chartHeight * (1 - ratio)} x2={width - padding.right} y2={padding.top + chartHeight * (1 - ratio)} stroke="#334155" strokeWidth="1" strokeDasharray="4,4" />
      ))}
      <path d={createArea('sessionsPrev')} fill="#64748b" opacity="0.15" />
      <path d={createPath('sessionsPrev')} fill="none" stroke="#64748b" strokeWidth="2" opacity="0.5" />
      <path d={createArea('sessions')} fill="#3b82f6" opacity="0.2" />
      <path d={createPath('sessions')} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
      {data.map((d, i) => (<circle key={`current-${i}`} cx={getX(i)} cy={getY(d.sessions)} r="3.5" fill="#3b82f6" />))}
      {data.map((d, i) => (i % labelInterval === 0 || i === data.length - 1 ? (<text key={`label-${i}`} x={getX(i)} y={height - 8} textAnchor="middle" fill="#64748b" fontSize="10">{d.date}</text>) : null))}
      <text x={padding.left + 5} y={padding.top + 5} fill="#64748b" fontSize="9">{(maxValue / 1000).toFixed(1)}K</text>
      <text x={padding.left + 5} y={padding.top + chartHeight - 5} fill="#64748b" fontSize="9">0</text>
    </svg>
  );
};

const MonthSelector = ({ months, selected, onChange }) => (
  <div style={{ display: 'flex', gap: '4px', background: '#0f172a', padding: '4px', borderRadius: '10px', border: '1px solid #334155', flexWrap: 'wrap' }}>
    {months.map(month => (
      <button key={month} onClick={() => onChange(month)} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s ease', background: selected === month ? '#3b82f6' : 'transparent', color: selected === month ? '#fff' : '#94a3b8' }}>
        {month.split(' ')[0]}
      </button>
    ))}
  </div>
);

const ExecutiveBrief = ({ data }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    const text = `📊 *Certta SEO Update - ${data.updatedAt}*\n\n✅ *${data.title}*\n• ${data.highlight1}\n• ${data.highlight2}\n\n⚠️ *Gap principal:*\n${data.gap}\n\n🎯 *Próximos passos:*\n• ${data.next1}\n• ${data.next2}\n• ${data.next3}`;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px', border: '1px solid #334155', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>📋 Executive Brief</div>
        <button onClick={handleCopy} style={{ background: copied ? '#10b981' : '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s ease' }}>
          {copied ? '✓ Copiado!' : '📤 Copiar'}
        </button>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ background: '#10b98120', borderLeft: '3px solid #10b981', padding: '12px', borderRadius: '0 8px 8px 0', marginBottom: '16px' }}>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981', marginBottom: '8px' }}>{data.title}</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>• {data.highlight1}<br />• {data.highlight2}</div>
        </div>
        <div style={{ background: '#ef444420', borderLeft: '3px solid #ef4444', padding: '12px', borderRadius: '0 8px 8px 0', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#ef4444', marginBottom: '4px', textTransform: 'uppercase' }}>Gap Principal</div>
          <div style={{ fontSize: '13px', color: '#fca5a5' }}>{data.gap}</div>
        </div>
        <div style={{ background: '#3b82f620', borderLeft: '3px solid #3b82f6', padding: '12px', borderRadius: '0 8px 8px 0' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#3b82f6', marginBottom: '8px', textTransform: 'uppercase' }}>Próximos Passos</div>
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
  const [hoveredRow, setHoveredRow] = useState(null);
  const [hoveredCompetitor, setHoveredCompetitor] = useState(null);
  const [competitors, setCompetitors] = useState(FALLBACK_DATA.competitors);
  const [lastUpdated, setLastUpdated] = useState(FALLBACK_DATA.lastUpdated);
  const [funnelData] = useState(FUNNEL_DATA);
  const [executiveBrief, setExecutiveBrief] = useState(EXECUTIVE_BRIEF_FALLBACK);
  const [dataSource, setDataSource] = useState('fallback');
  const [loading, setLoading] = useState(true);

  const [ga4MonthlyData, setGa4MonthlyData] = useState(GA4_MONTHLY_FALLBACK);
  const [availableMonths, setAvailableMonths] = useState(['Fev 2026']);
  const [selectedMonth, setSelectedMonth] = useState('Fev 2026');
  const [ga4Source, setGa4Source] = useState('fallback');

  const ga4Data = ga4MonthlyData[selectedMonth] || {
    metrics: {
      sessions: { value: 0, trend: 0 },
      pageViews: { value: 0, trend: 0 },
      activeUsers: { value: 0, trend: 0 },
      newUserPercent: { value: 0, trend: 0 }
    },
    dailyData: []
  };

  useEffect(() => {
    async function fetchData() {
      let loadedSomething = false;

      // GA4
      try {
        console.log('[GA4] Fetching from:', SHEETS_CONFIG.ga4Url);
        const ga4Response = await fetch(SHEETS_CONFIG.ga4Url);
        if (!ga4Response.ok) throw new Error(`HTTP ${ga4Response.status}: ${ga4Response.statusText}`);
        const ga4CSV = await ga4Response.text();
        console.log('[GA4] CSV length:', ga4CSV.length, '| First 200 chars:', ga4CSV.substring(0, 200));
        const ga4Rows = parseGA4CSV(ga4CSV);
        if (ga4Rows.length > 0) {
          const { ga4Monthly, availableMonths: months } = processGA4Data(ga4Rows);
          console.log('[GA4] Months found:', months);
          if (Object.keys(ga4Monthly).length > 0 && months.length > 0) {
            setGa4MonthlyData(ga4Monthly);
            setAvailableMonths(months);
            setSelectedMonth(months[months.length - 1]);
            setGa4Source('sheets');
            loadedSomething = true;
            console.log('[GA4] ✅ Loaded successfully. Months:', months.join(', '));
          } else { console.warn('[GA4] Processing returned empty results'); }
        } else { console.warn('[GA4] Parser returned 0 rows'); }
      } catch (error) { console.error('[GA4] ❌ Failed to load:', error); setGa4Source('fallback'); }

      // Competitors
      try {
        if (!SHEETS_CONFIG.competitorsUrl.includes('COLE_AQUI')) {
          const competitorsResponse = await fetch(SHEETS_CONFIG.competitorsUrl);
          const competitorsCSV = await competitorsResponse.text();
          const competitorsData = parseCSV(competitorsCSV);
          if (competitorsData.length > 0) { setCompetitors(competitorsData); setDataSource('sheets'); loadedSomething = true; }
        }
      } catch (error) { console.error('Erro ao carregar competitors:', error); }

      // Config
      try {
        if (!SHEETS_CONFIG.configUrl.includes('COLE_AQUI')) {
          const configResponse = await fetch(SHEETS_CONFIG.configUrl);
          const configCSV = await configResponse.text();
          const configData = parseCSV(configCSV);
          const lastUpdatedRow = configData.find(row => row.key === 'lastUpdated');
          if (lastUpdatedRow) setLastUpdated(lastUpdatedRow.value);
        }
      } catch (error) { console.error('Erro ao carregar config:', error); }

      // Executive Brief
      try {
        if (SHEETS_CONFIG.executiveBriefUrl && !SHEETS_CONFIG.executiveBriefUrl.includes('COLE_AQUI')) {
          const briefResponse = await fetch(SHEETS_CONFIG.executiveBriefUrl);
          const briefCSV = await briefResponse.text();
          const briefData = parseExecutiveBriefCSV(briefCSV);
          if (Object.keys(briefData).length > 0) { setExecutiveBrief({ ...EXECUTIVE_BRIEF_FALLBACK, ...briefData }); }
        }
      } catch (error) { console.error('Erro ao carregar executive brief:', error); }

      if (!loadedSomething) setDataSource('fallback');
      setLoading(false);
    }
    fetchData();
  }, []);

  // ============================================
  // COMPUTED DATA
  // ============================================

  const certtaData = competitors.find(c => c.domain === 'certta.ai') || {};
  const cafData = competitors.find(c => c.domain === 'caf.io') || {};

  const certtaCombined = {
    organicKeywords: (certtaData.organicKeywords || 0) + (cafData.organicKeywords || 0),
    organicTraffic: (certtaData.organicTraffic || 0) + (cafData.organicTraffic || 0),
    refDomains: (certtaData.refDomains || 0) + (cafData.refDomains || 0),
    authorityScore: Math.max(certtaData.authorityScore || 0, cafData.authorityScore || 0),
    paidPresence: (certtaData.paidTraffic || 0) + (cafData.paidTraffic || 0)
  };

  const spiderCompetitors = [
    { name: 'Certta (combined)', color: '#10b981', ...certtaCombined },
    ...competitors.filter(c => !c.isOwn && c.tier !== 'enterprise').slice(0, 4).map((c, idx) => ({
      name: c.name, color: ['#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'][idx],
      organicKeywords: c.organicKeywords, organicTraffic: c.organicTraffic, refDomains: c.refDomains, authorityScore: c.authorityScore, paidPresence: c.paidTraffic + c.paidKeywords
    }))
  ];

  const maxValues = {
    organicKeywords: Math.max(...spiderCompetitors.map(c => c.organicKeywords)),
    organicTraffic: Math.max(...spiderCompetitors.map(c => c.organicTraffic)),
    refDomains: Math.max(...spiderCompetitors.map(c => c.refDomains)),
    authorityScore: 100,
    paidPresence: Math.max(...spiderCompetitors.map(c => c.paidPresence)) || 1
  };

  const normalizeData = (competitor) => ({
    name: competitor.name, color: competitor.color,
    values: [
      (competitor.organicKeywords / maxValues.organicKeywords) * 100,
      (competitor.organicTraffic / maxValues.organicTraffic) * 100,
      (competitor.refDomains / maxValues.refDomains) * 100,
      competitor.authorityScore,
      (competitor.paidPresence / maxValues.paidPresence) * 100
    ]
  });

  const normalizedData = spiderCompetitors.map(normalizeData);
  const axes = ['Organic Keywords', 'Organic Traffic', 'Ref Domains', 'Authority Score', 'Paid Presence'];
  const numAxes = axes.length;
  const centerX = 220; const centerY = 200; const radius = 140;

  const getPoint = (value, axisIndex) => {
    const angle = (Math.PI * 2 * axisIndex) / numAxes - Math.PI / 2;
    const r = (value / 100) * radius;
    return { x: centerX + r * Math.cos(angle), y: centerY + r * Math.sin(angle) };
  };

  const getPolygonPoints = (values) => values.map((value, i) => { const point = getPoint(value, i); return `${point.x},${point.y}`; }).join(' ');

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (num) => {
    if (num >= 1000000) return `R$ ${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `R$ ${(num / 1000).toFixed(1)}K`;
    return `R$ ${num.toFixed(0)}`;
  };

  const getTrendColor = (value) => {
    if (value > 10) return '#10b981';
    if (value > 0) return '#6ee7b7';
    if (value > -10) return '#fbbf24';
    return '#ef4444';
  };

  const getTrendIcon = (value) => { if (value > 0) return '↑'; if (value < 0) return '↓'; return '—'; };

  const getAuthorityColor = (score) => {
    if (score >= 60) return '#7c3aed';
    if (score >= 40) return '#3b82f6';
    if (score >= 25) return '#06b6d4';
    return '#94a3b8';
  };

  const getTierBadge = (tier) => {
    const styles = {
      enterprise: { bg: '#7c3aed20', color: '#7c3aed', label: 'Enterprise' },
      leader: { bg: '#3b82f620', color: '#3b82f6', label: 'Market Leader' },
      competitor: { bg: '#06b6d420', color: '#06b6d4', label: 'Direct Competitor' },
      global: { bg: '#f59e0b20', color: '#f59e0b', label: 'Global Player' },
      legacy: { bg: '#ef444420', color: '#ef4444', label: 'Legacy Domain' },
      new: { bg: '#10b98120', color: '#10b981', label: 'New Domain' }
    };
    return styles[tier] || styles.competitor;
  };

  const migrationProgress = certtaData && cafData
    ? Math.round(((certtaData.organicTraffic || 0) / ((certtaData.organicTraffic || 0) + (cafData.organicTraffic || 1))) * 100)
    : 0;

  // ── Funil: 4 estágios com valores reais ──
  const funnelStages = [
    { name: 'Leads',   value: funnelData.leads.value,    color: '#3b82f6' },
    { name: 'MQL',     value: funnelData.mql.value,      color: '#f97316' },
    { name: 'SQL',     value: funnelData.sql.value,      color: '#8b5cf6' },
    { name: 'Deals',   value: funnelData.wonDeals.value, color: '#10b981' },
  ];

  // ============================================
  // KPI CARD COMPONENTS
  // ============================================

  const KpiCard = ({ label, value, trend, trendLabel, icon }) => (
    <div style={{ background: '#0f172a', borderRadius: '12px', padding: '16px', border: '1px solid #334155', minWidth: '140px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      </div>
      <div style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc', marginBottom: '4px' }}>{value}</div>
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: getTrendColor(trend), fontWeight: '500' }}>
          <span>{getTrendIcon(trend)}</span>
          <span>{Math.abs(trend).toFixed(1)}%</span>
          {trendLabel && <span style={{ color: '#64748b', marginLeft: '4px' }}>{trendLabel}</span>}
        </div>
      )}
    </div>
  );

  const GA4KpiCard = ({ label, value, trend, trendLabel }) => (
    <div style={{ background: '#0f172a', borderRadius: '10px', padding: '16px', border: '1px solid #334155' }}>
      <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: '700', color: '#f8fafc', marginBottom: '6px' }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
        <span style={{ color: getTrendColor(trend), fontWeight: '600' }}>{getTrendIcon(trend)} {Math.abs(trend).toFixed(1)}%</span>
        <span style={{ color: '#64748b' }}>{trendLabel}</span>
      </div>
    </div>
  );

  const FunnelKpiCard = ({ label, value, color, sublabel }) => (
    <div style={{ background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155' }}>
      <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '26px', fontWeight: '700', color: color || '#f8fafc', marginBottom: '2px' }}>{value}</div>
      {sublabel && <div style={{ fontSize: '11px', color: '#475569' }}>{sublabel}</div>}
    </div>
  );

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <div style={{ fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif", background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e2e8f0' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
          <div>Carregando dados...</div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif", background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', minHeight: '100vh', padding: '32px', color: '#e2e8f0' }}>

      {/* Header */}
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

      {/* GA4 */}
      <div style={{ background: '#1e293b', borderRadius: '16px', padding: '24px', marginBottom: '24px', border: '1px solid #334155' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <GA4KpiCard label="Sessions" value={formatNumber(ga4Data.metrics.sessions.value)} trend={ga4Data.metrics.sessions.trend} trendLabel="vs. mês anterior" />
            <GA4KpiCard label="Page Views" value={formatNumber(ga4Data.metrics.pageViews.value)} trend={ga4Data.metrics.pageViews.trend} trendLabel="vs. mês anterior" />
            <GA4KpiCard label="Active Users" value={formatNumber(ga4Data.metrics.activeUsers.value)} trend={ga4Data.metrics.activeUsers.trend} trendLabel="vs. mês anterior" />
            <GA4KpiCard label="New Users %" value={`${ga4Data.metrics.newUserPercent.value}%`} trend={ga4Data.metrics.newUserPercent.trend} trendLabel="vs. mês anterior" />
          </div>
          <div style={{ background: '#0f172a', borderRadius: '12px', padding: '16px', border: '1px solid #334155' }}>
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

      {/* Migration Alert */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', borderRadius: '16px', padding: '24px', marginBottom: '24px', border: '1px solid #4338ca40', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#a5b4fc', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Domain Migration Status</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#f8fafc', marginBottom: '4px' }}>{migrationProgress}%</div>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Traffic on certta.ai</div>
          <div style={{ marginTop: '12px', background: '#1e293b', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${migrationProgress}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: '8px', transition: 'width 0.5s ease' }} />
          </div>
        </div>
        <div style={{ borderLeft: '1px solid #4338ca40', paddingLeft: '24px' }}>
          <div style={{ fontSize: '12px', color: '#fca5a5', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⚠️ Legacy Decay (caf.io)</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#ef4444', marginBottom: '4px' }}>{cafData.trafficTrend || 0}%</div>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Organic traffic MoM</div>
        </div>
        <div style={{ borderLeft: '1px solid #4338ca40', paddingLeft: '24px' }}>
          <div style={{ fontSize: '12px', color: '#86efac', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🚀 New Domain Growth (certta.ai)</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>+{certtaData.trafficTrend || 0}%</div>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Organic traffic MoM</div>
        </div>
      </div>

      {/* Spider Chart */}
      <div style={{ background: '#1e293b', borderRadius: '16px', padding: '24px', marginBottom: '24px', border: '1px solid #334155' }}>
        <div style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '20px' }}>Competitive Positioning Radar</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 400px) 1fr', gap: '32px', alignItems: 'start' }}>
          <svg width="100%" viewBox="0 0 440 400" style={{ maxWidth: '440px' }}>
            {[20, 40, 60, 80, 100].map((percent, i) => (<circle key={i} cx={centerX} cy={centerY} r={(percent / 100) * radius} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray={i === 4 ? "none" : "4,4"} />))}
            {axes.map((_, i) => { const point = getPoint(100, i); return <line key={i} x1={centerX} y1={centerY} x2={point.x} y2={point.y} stroke="#334155" strokeWidth="1" />; })}
            {axes.map((label, i) => { const point = getPoint(120, i); const isTop = i === 0; const isBottom = i === Math.floor(numAxes / 2); return (<text key={i} x={point.x} y={point.y} textAnchor="middle" dominantBaseline={isTop ? "auto" : isBottom ? "hanging" : "middle"} fill="#94a3b8" fontSize="11" fontWeight="500">{label}</text>); })}
            {normalizedData.map((competitor, idx) => (<polygon key={competitor.name} points={getPolygonPoints(competitor.values)} fill={`${competitor.color}15`} stroke={competitor.color} strokeWidth={hoveredCompetitor === idx || hoveredCompetitor === null ? "2" : "1"} opacity={hoveredCompetitor === null || hoveredCompetitor === idx ? 1 : 0.3} style={{ transition: 'all 0.2s ease' }} />))}
            {normalizedData.map((competitor, idx) => (competitor.values.map((value, i) => { const point = getPoint(value, i); return <circle key={`${competitor.name}-${i}`} cx={point.x} cy={point.y} r={hoveredCompetitor === idx ? 5 : 4} fill={competitor.color} opacity={hoveredCompetitor === null || hoveredCompetitor === idx ? 1 : 0.3} style={{ transition: 'all 0.2s ease' }} />; })))}
            {[25, 50, 75, 100].map((percent, i) => (<text key={i} x={centerX + 5} y={centerY - (percent / 100) * radius} fill="#64748b" fontSize="9" dominantBaseline="middle">{percent}%</text>))}
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '24px', alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Competitors</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {normalizedData.map((competitor, idx) => (
                    <div key={competitor.name} onMouseEnter={() => setHoveredCompetitor(idx)} onMouseLeave={() => setHoveredCompetitor(null)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', borderRadius: '6px', background: hoveredCompetitor === idx ? '#33415530' : 'transparent', cursor: 'pointer', transition: 'background 0.15s ease' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: competitor.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', fontWeight: competitor.name.includes('Certta') ? '600' : '400', color: competitor.name.includes('Certta') ? '#10b981' : '#e2e8f0' }}>{competitor.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🎯 Certta Combined Metrics</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                  <KpiCard icon="🔑" label="Keywords" value={formatNumber(certtaCombined.organicKeywords)} trend={(certtaData.keywordsTrend || 0)} trendLabel="MoM" />
                  <KpiCard icon="📈" label="Org. Traffic" value={formatNumber(certtaCombined.organicTraffic)} trend={(certtaData.trafficTrend || 0)} trendLabel="MoM" />
                  <KpiCard icon="🔗" label="Ref Domains" value={formatNumber(certtaCombined.refDomains)} trend={(certtaData.refTrend || 0)} trendLabel="MoM" />
                  <KpiCard icon="⭐" label="Authority" value={certtaCombined.authorityScore} trend={certtaData.authorityChange || 0} trendLabel="pts" />
                </div>
              </div>
            </div>
            <div style={{ background: '#0f172a', borderRadius: '12px', padding: '16px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📊 Radar Analysis</div>
              <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.7' }}>
                <p style={{ margin: '0 0 10px 0' }}><strong style={{ color: '#10b981' }}>Certta's strength:</strong> Ref Domains ({formatNumber(certtaCombined.refDomains)} combined) competitive with market leaders due to caf.io legacy backlinks.</p>
                <p style={{ margin: '0 0 10px 0' }}><strong style={{ color: '#ef4444' }}>Critical gaps:</strong> Organic Traffic {Math.round(maxValues.organicTraffic / (certtaCombined.organicTraffic || 1))}x below market leader. Volume metrics take 6-12 months to build.</p>
                <p style={{ margin: 0 }}><strong style={{ color: '#f59e0b' }}>Opportunity:</strong> Jumio has high authority (42) but low BR traffic — international player without local SEO. Certta can capture BR-specific demand.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Competitive Table + Executive Brief */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: '#1e293b', borderRadius: '16px', overflow: 'hidden', border: '1px solid #334155' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155' }}>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>Detailed Competitive Metrics</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '140px repeat(5, 1fr)', gap: '4px', padding: '12px 20px', background: '#0f172a', borderBottom: '1px solid #334155', fontSize: '10px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <div>Domain</div>
            <div style={{ textAlign: 'right' }}>KWs</div>
            <div style={{ textAlign: 'right' }}>Traffic</div>
            <div style={{ textAlign: 'right' }}>Paid</div>
            <div style={{ textAlign: 'right' }}>Refs</div>
            <div style={{ textAlign: 'center' }}>Auth</div>
          </div>
          {competitors.map((company, index) => {
            const tierStyle = getTierBadge(company.tier);
            return (
              <div key={company.domain} onMouseEnter={() => setHoveredRow(index)} onMouseLeave={() => setHoveredRow(null)} style={{ display: 'grid', gridTemplateColumns: '140px repeat(5, 1fr)', gap: '4px', padding: '12px 20px', borderBottom: index < competitors.length - 1 ? '1px solid #334155' : 'none', background: company.highlight ? 'linear-gradient(90deg, #10b98110 0%, transparent 100%)' : company.isOwn && !company.highlight ? 'linear-gradient(90deg, #ef444410 0%, transparent 100%)' : hoveredRow === index ? '#334155' : 'transparent', transition: 'background 0.15s ease', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '600', color: company.highlight ? '#10b981' : company.isOwn ? '#f87171' : '#f8fafc', fontSize: '13px' }}>{company.name}</div>
                  <span style={{ background: tierStyle.bg, color: tierStyle.color, padding: '1px 6px', borderRadius: '8px', fontSize: '9px', fontWeight: '500' }}>{tierStyle.label}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '600', color: '#f8fafc', fontSize: '13px' }}>{formatNumber(company.organicKeywords)}</div>
                  <div style={{ fontSize: '10px', color: getTrendColor(company.keywordsTrend), fontWeight: '500' }}>{getTrendIcon(company.keywordsTrend)} {Math.abs(company.keywordsTrend).toFixed(1)}%</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '600', color: '#f8fafc', fontSize: '13px' }}>{formatNumber(company.organicTraffic)}</div>
                  <div style={{ fontSize: '10px', color: getTrendColor(company.trafficTrend), fontWeight: '500' }}>{getTrendIcon(company.trafficTrend)} {Math.abs(company.trafficTrend).toFixed(1)}%</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '600', color: company.paidTraffic === 0 ? '#475569' : '#f8fafc', fontSize: '13px' }}>{company.paidTraffic === 0 ? '—' : formatNumber(company.paidTraffic)}</div>
                  {company.paidTraffic > 0 && (<div style={{ fontSize: '10px', color: getTrendColor(company.paidTrafficTrend), fontWeight: '500' }}>{getTrendIcon(company.paidTrafficTrend)} {Math.abs(company.paidTrafficTrend).toFixed(0)}%</div>)}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '600', color: '#f8fafc', fontSize: '13px' }}>{formatNumber(company.refDomains)}</div>
                  <div style={{ fontSize: '10px', color: getTrendColor(company.refTrend), fontWeight: '500' }}>{getTrendIcon(company.refTrend)} {Math.abs(company.refTrend).toFixed(1)}%</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `conic-gradient(${getAuthorityColor(company.authorityScore)} ${company.authorityScore * 3.6}deg, #334155 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '11px', color: getAuthorityColor(company.authorityScore) }}>{company.authorityScore}</div>
                  </div>
                  {company.authorityChange !== 0 && (<div style={{ fontSize: '9px', fontWeight: '600', color: company.authorityChange > 0 ? '#10b981' : '#ef4444' }}>{company.authorityChange > 0 ? '+' : ''}{company.authorityChange}</div>)}
                </div>
              </div>
            );
          })}
        </div>
        <ExecutiveBrief data={executiveBrief} />
      </div>

      {/* ═══════════════════════════════════════════
          SMARKETING FUNNEL — VALORES REAIS CERTTA
          ═══════════════════════════════════════════ */}
      <div style={{ background: '#1e293b', borderRadius: '16px', padding: '24px', marginBottom: '24px', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '4px' }}>Smarketing Performance</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Full-funnel results: from lead generation to closed revenue</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ background: '#06b6d420', color: '#06b6d4', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '500' }}>{funnelData.period}</span>
          </div>
        </div>

        {/* Score Cards — Open Opp + Potencial MRR */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)', borderRadius: '12px', padding: '20px', border: '1px solid #10b98140' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>💼</span>
              <span style={{ fontSize: '11px', color: '#a7f3d0', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '500' }}>Open Opportunities</span>
            </div>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>R$ 285.755</div>
            <div style={{ fontSize: '13px', color: '#a7f3d0' }}>Pipeline total em aberto</div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', borderRadius: '12px', padding: '20px', border: '1px solid #3b82f640' }}>
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

          {/* KPI Cards do funil */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <FunnelKpiCard label="Leads" value="304" color="#3b82f6" sublabel="Total gerado" />
              <FunnelKpiCard label="MQL" value="173" color="#f97316" sublabel={`${((173/304)*100).toFixed(1)}% dos leads`} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <FunnelKpiCard label="SQL" value="143" color="#8b5cf6" sublabel={`${((143/173)*100).toFixed(1)}% dos MQL`} />
              <FunnelKpiCard label="Deals" value="3" color="#10b981" sublabel={`Win rate ${((3/304)*100).toFixed(1)}%`} />
            </div>

            {/* Conversões resumidas */}
            <div style={{ background: '#0f172a', borderRadius: '10px', padding: '16px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Taxas de Conversão</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Lead → MQL', value: ((173/304)*100).toFixed(1), color: '#f97316' },
                  { label: 'MQL → SQL',  value: ((143/173)*100).toFixed(1), color: '#8b5cf6' },
                  { label: 'SQL → Deal', value: ((3/143)*100).toFixed(1),   color: '#10b981' },
                  { label: 'Lead → Deal',value: ((3/304)*100).toFixed(1),   color: '#06b6d4' },
                ].map(r => (
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
          <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Sales Funnel</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {funnelStages.map((stage, idx) => {
                const maxVal = funnelStages[0].value;
                const percentage = (stage.value / maxVal) * 100;
                const conversionRate = idx > 0
                  ? ((stage.value / funnelStages[idx - 1].value) * 100).toFixed(1)
                  : '100';
                return (
                  <div key={stage.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>{stage.name}</span>
                      <span style={{ fontSize: '14px', color: '#f8fafc', fontWeight: '600' }}>{formatNumber(stage.value)}</span>
                    </div>
                    <div style={{ position: 'relative', height: '28px', background: '#1e293b', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentage}%`, height: '100%', background: `linear-gradient(90deg, ${stage.color}, ${stage.color}cc)`, borderRadius: '6px', display: 'flex', alignItems: 'center', paddingLeft: '10px', transition: 'width 0.5s ease', minWidth: stage.value > 0 ? '50px' : '0' }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#fff' }}>{conversionRate}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Resumo financeiro */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Lead → Deal</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>{((3 / 304) * 100).toFixed(2)}%</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Open Opp</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc' }}>R$ 285.7K</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Deals Fechados</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>3</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Pot. MRR</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#3b82f6' }}>R$ 142.9K</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '12px', color: '#475569' }}>
        Built by AdRoq • Data source: GA4 + Semrush + HubSpot • Last update: {lastUpdated}
      </div>
    </div>
  );
}

export default App;
