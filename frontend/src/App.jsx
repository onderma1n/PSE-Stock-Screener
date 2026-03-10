import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { fetchScreenedStocks, fetchAllStocks } from './services/api';
import { STRATEGIES, COMMON_FILTERS } from './config/strategies';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell,
  ScatterChart, Scatter, ZAxis, ReferenceLine, ReferenceArea,
  LineChart, Line, ComposedChart, Area
} from 'recharts';
import {
  Info, BarChart2, TrendingUp, Settings2, Calendar,
  LayoutGrid, AlertCircle, ArrowUpDown, ChevronUp, ChevronDown,
  Hash, DollarSign, Percent, Activity, Filter, ChevronRight,
  ShieldCheck, Target, Zap, Award, PiggyBank, Scale,
  Download, X, GitCompare, Star, StarOff, Eye,
  Search, RotateCcw, Bookmark, BookmarkCheck, ChevronLeft,
  ArrowUp, ChevronsLeft, ChevronsRight,
  Sun, Moon, SlidersHorizontal, Home
} from 'lucide-react';

// ==================== SMART TOOLTIP COMPONENT ====================

function SmartTooltip({ children, content, width = 208 }) {
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const timeoutRef = useRef(null);

  const show = () => {
    if (!triggerRef.current) return;
    clearTimeout(timeoutRef.current);
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipH = 80;
    const gap = 8;
    let top, left;
    if (rect.top >= tooltipH + gap) { top = rect.top - tooltipH - gap; } else { top = rect.bottom + gap; }
    left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    if (top + tooltipH > window.innerHeight - 8) top = window.innerHeight - tooltipH - 8;
    if (top < 8) top = 8;
    setPos({ top, left });
  };

  const hide = () => { timeoutRef.current = setTimeout(() => setPos(null), 100); };

  return (
    <>
      <div ref={triggerRef} onMouseEnter={show} onMouseLeave={hide} className="inline-flex items-center">{children}</div>
      {pos && ReactDOM.createPortal(
        <div className="fixed w-72 p-3 bg-slate-800 text-white rounded-xl shadow-2xl z-[99999] pointer-events-none animate-in fade-in duration-150" style={{ top: pos.top, left: pos.left }}>{content}</div>,
        document.body
      )}
    </>
  );
}

// ==================== CONSTANTS ====================

const STRATEGY_ICONS = {
  value: <DollarSign size={16} />,
  growth: <TrendingUp size={16} />,
  dividend: <PiggyBank size={16} />,
  quality: <Award size={16} />,
  defensive: <ShieldCheck size={16} />,
  garp: <Scale size={16} />,
};

const STRATEGY_DESCRIPTIONS = {
  value: 'Tìm cổ phiếu có định giá thấp nhưng nền tảng cơ bản tốt (P/E, P/B thấp, ROE từ 10% trở lên), có thanh khoản tốt.',
  growth: 'Tìm cổ phiếu có tốc độ tăng trưởng EPS và doanh thu vượt trội, ROE cao, PEG hợp lý.',
  dividend: 'Tìm cổ phiếu trả cổ tức đều đặn và ổn định, hướng đến tạo dòng thu nhập thụ động và bảo toàn vốn dài hạn.',
  quality: 'Tìm doanh nghiệp có hiệu suất vận hành xuất sắc: ROE cao, biên lợi nhuận ròng, lợi nhuận thực chất (OCF/NI).',
  defensive: 'Tìm cổ phiếu an toàn theo tiêu chí Benjamin Graham: nợ thấp, thanh khoản cao, lãi ổn định nhiều năm.',
  garp: 'Cân bằng giữa tăng trưởng và định giá hợp lý. PEG ≤ 1, P/E hợp lý, EPS tăng bền vững.',
};

const STRATEGY_ORIGINS = {
  value: 'Nguồn gốc: Benjamin Graham, "The Intelligent Investor" (1949).',
  growth: 'Nguồn gốc: Philip Fisher, "Common Stocks and Uncommon Profits" (1958).',
  dividend: 'Nguồn gốc: John Burr Williams với mô hình DDM (1938).',
  quality: 'Nguồn gốc: Warren Buffett & Charlie Munger.',
  defensive: 'Nguồn gốc: Benjamin Graham, "Security Analysis" (1934).',
  garp: 'Nguồn gốc: Peter Lynch, "One Up on Wall Street" (1989).',
};

const COLUMN_LABELS = {
  Ticker: 'Mã CK',
  sector: 'Ngành',
  sub_sector: 'Phân ngành',
  price_close: 'Giá',
  pe_ratio: 'P/E',
  pb_ratio: 'P/B',
  current_ratio: 'Current Ratio',
  debt_to_current_asset: 'Nợ/TS NH',
  eps_growth_yoy: 'EPS Growth YoY (%)',
  rev_growth_cagr_3y: 'DT CAGR 3Y (%)',
  roe: 'ROE (%)',
  peg_ratio: 'PEG',
  net_profit_margin: 'Biên LN Ròng (%)',
  dividend_yield: 'Cổ tức Yield (%)',
  payout_ratio: 'Payout (%)',
  div_streak_years: 'Năm trả liên tục',
  debt_equity_ratio: 'D/E',
  gross_profit_margin: 'Biên LN Gộp (%)',
  earnings_quality_ratio: 'OCF/NI',
  interest_coverage: 'ICR',
  market_cap: 'Vốn hóa',
  graham_multiplier: 'Graham (PE*PB)',
  eps_growth_total_5y: 'EPS Growth 5Y (%)',
  eps_growth_cagr_3y: 'EPS CAGR 3Y (%)',
  profit_streak_years: 'Năm có lãi liên tục',
  bvps: 'BVPS',
  free_cash_flow: 'FCF',
  dividend_per_share: 'DPS',
  score: 'Điểm',
};

function formatValue(key, val) {
  if (val === null || val === undefined) return '—';
  if (key === 'Ticker' || key === 'sector' || key === 'sub_sector') return val;
  if (key === 'price_close') return Number(val).toLocaleString('en-PH');
  if (key === 'market_cap') return Number(val).toLocaleString('en-PH', { maximumFractionDigits: 1 });
  if (key === 'score') return Number(val).toFixed(1);
  if (typeof val === 'number') return val.toFixed(2);
  return val;
}

function getValueColor(key, val) {
  if (val === null || val === undefined) return 'text-slate-400 dark:text-slate-500';
  if (key === 'score') return val >= 70 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : val >= 50 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-red-500 dark:text-red-400';
  if (key === 'roe' || key === 'eps_growth_yoy' || key === 'dividend_yield' || key === 'rev_growth_cagr_3y' || key === 'eps_growth_cagr_3y')
    return val >= 15 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : val >= 0 ? 'text-slate-700 dark:text-slate-300' : 'text-red-500 dark:text-red-400';
  if (key === 'pe_ratio') return val <= 10 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : val <= 20 ? 'text-slate-700 dark:text-slate-300' : 'text-amber-600 dark:text-amber-400';
  if (key === 'debt_equity_ratio' || key === 'debt_to_current_asset') return val <= 0.5 ? 'text-emerald-600 dark:text-emerald-400' : val <= 1 ? 'text-slate-700 dark:text-slate-300' : 'text-red-500 dark:text-red-400';
  return 'text-slate-700 dark:text-slate-300';
}

function normalizeForRadar(value, min, max, invert = false) {
  if (value === null || value === undefined || isNaN(value)) return 0;
  const clamped = Math.max(min, Math.min(max, value));
  const normalized = ((clamped - min) / (max - min)) * 100;
  return invert ? 100 - normalized : normalized;
}

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];
const COMPARE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

const DEFAULT_COMMON_FILTERS = {
  sectors: [],
  only_psei: false,
  exclude_high_debt: false,
  exclude_negative_equity: true,
  exclude_loss_making: false,
  only_with_dividend: false,
  only_positive_fcf: false,
};

const PSEI_30 = [
  'AC.PS', 'AEV.PS', 'AGI.PS', 'ALI.PS', 'AP.PS',
  'BDO.PS', 'BLOOM.PS', 'BPI.PS', 'CNVRG.PS', 'DMC.PS',
  'DMCI.PS', 'EMI.PS', 'GLO.PS', 'GTCAP.PS', 'ICT.PS',
  'JFC.PS', 'JGS.PS', 'LTG.PS', 'MBT.PS', 'MEG.PS',
  'MER.PS', 'MPI.PS', 'NIKL.PS', 'PGOLD.PS', 'RLC.PS',
  'SECB.PS', 'SM.PS', 'SMPH.PS', 'TEL.PS', 'URC.PS'
];

// ==================== HOOKS ====================

function useChartTheme() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return {
    gridColor: isDark ? '#334155' : '#f1f5f9',
    tickColor: isDark ? '#94a3b8' : '#64748b',
    labelColor: isDark ? '#64748b' : '#94a3b8',
    polarGridColor: isDark ? '#334155' : '#e2e8f0',
    tooltipStyle: { borderRadius: '10px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', fontSize: '12px', backgroundColor: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#e2e8f0' : '#334155' },
  };
}

function useWatchlist() {
  const [watchlist, setWatchlist] = useState(() => {
    try { const saved = localStorage.getItem('pse_watchlist'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const toggle = useCallback((ticker) => {
    setWatchlist(prev => {
      const updated = prev.includes(ticker) ? prev.filter(t => t !== ticker) : [...prev, ticker];
      localStorage.setItem('pse_watchlist', JSON.stringify(updated));
      return updated;
    });
  }, []);
  const isInWatchlist = useCallback((ticker) => watchlist.includes(ticker), [watchlist]);
  const clear = useCallback(() => { setWatchlist([]); localStorage.setItem('pse_watchlist', JSON.stringify([])); }, []);
  return { watchlist, toggle, isInWatchlist, clear };
}

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { const saved = localStorage.getItem('pse_dark_mode'); if (saved !== null) return JSON.parse(saved); return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; }
  });
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add('dark'); else root.classList.remove('dark');
    localStorage.setItem('pse_dark_mode', JSON.stringify(dark));
  }, [dark]);
  return [dark, setDark];
}

// ==================== SCROLL TO TOP ====================

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  if (!visible) return null;
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-40 p-3 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-500/30 transition-all hover:scale-110 active:scale-95"
      title="Scroll to top">
      <ArrowUp size={20} />
    </button>
  );
}

// ==================== WATCHLIST PANEL ====================

function WatchlistPanel({ watchlist, results, onClear, onToggle, onStockClick }) {
  const [isOpen, setIsOpen] = useState(false);
  const watchlistStocks = useMemo(() => results.filter(r => watchlist.includes(r.Ticker)), [results, watchlist]);

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
          watchlist.length > 0
            ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/20'
            : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}>
        <Bookmark size={16} />
        <span className="hidden sm:inline">Watchlist</span>
        {watchlist.length > 0 && <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{watchlist.length}</span>}
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-40 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-amber-50/50 dark:bg-amber-500/5">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <BookmarkCheck size={16} className="text-amber-500" /> Watchlist ({watchlist.length})
              </h4>
              {watchlist.length > 0 && (
                <button onClick={onClear} className="text-[10px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10">Clear all</button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {watchlist.length === 0 ? (
                <div className="p-6 text-center text-slate-400 dark:text-slate-500">
                  <Bookmark size={24} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No stocks yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                  {watchlist.map(ticker => {
                    const stock = watchlistStocks.find(s => s.Ticker === ticker);
                    return (
                      <div key={ticker} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <div className="flex-1 cursor-pointer" onClick={() => { if (stock) { onStockClick(stock); setIsOpen(false); } }}>
                          <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{ticker}</p>
                          {stock ? <p className="text-[10px] text-slate-400 dark:text-slate-500">{Number(stock.price_close || 0).toLocaleString()} | {stock.sector || '—'}</p>
                            : <p className="text-[10px] text-slate-300 dark:text-slate-600 italic">Not in current results</p>}
                        </div>
                        <button onClick={() => onToggle(ticker)} className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Remove"><X size={14} /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ==================== EXPORT CSV ====================

function ExportButton({ results, strategyName }) {
  const handleExport = () => {
    if (results.length === 0) return;
    const headers = Object.keys(results[0]).filter(h => h !== 'score_breakdown');
    const csvContent = [
      headers.map(h => COLUMN_LABELS[h] || h).join(','),
      ...results.map(row => headers.map(h => { const val = row[h]; if (typeof val === 'string') return '"' + val.replace(/"/g, '""') + '"'; return val ?? ''; }).join(','))
    ].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'PSE_' + strategyName + '_' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return (
    <button onClick={handleExport} disabled={results.length === 0}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed">
      <Download size={16} /> CSV ({results.length})
    </button>
  );
}

// ==================== STOCK DETAIL MODAL ====================

function StockDetailModal({ stock, onClose, activeStrategy, isInWatchlist, onToggleWatchlist }) {
  if (!stock) return null;
  const chart = useChartTheme();
  const radarData = [
    { metric: 'Valuation', value: normalizeForRadar(stock.pe_ratio, 0, 30, true) },
    { metric: 'Growth', value: normalizeForRadar(stock.eps_growth_yoy, -20, 60) },
    { metric: 'Profitability', value: normalizeForRadar(stock.roe, 0, 35) },
    { metric: 'Safety', value: normalizeForRadar(stock.current_ratio, 0, 5) },
    { metric: 'Dividend', value: normalizeForRadar(stock.dividend_yield, 0, 10) },
    { metric: 'Quality', value: normalizeForRadar(stock.earnings_quality_ratio, 0, 3) },
  ];
  const avgScore = (stock.score != null && !isNaN(Number(stock.score)))
    ? Math.round(Number(stock.score))
    : Math.round(radarData.reduce((a, b) => a + b.value, 0) / radarData.length);
  const scoreColor = avgScore >= 80 ? 'text-emerald-400' : avgScore >= 60 ? 'text-blue-400' : avgScore >= 40 ? 'text-amber-400' : 'text-red-400';
  const scoreBg = avgScore >= 80 ? 'bg-emerald-500/20 border-emerald-500/30' : avgScore >= 60 ? 'bg-blue-500/20 border-blue-500/30' : avgScore >= 40 ? 'bg-amber-500/20 border-amber-500/30' : 'bg-red-500/20 border-red-500/30';
  const excludeKeys = ['Ticker', 'sector', 'sub_sector', 'score', 'score_breakdown'];
  const metrics = Object.entries(stock).filter(([k]) => !excludeKeys.includes(k));

  const quickAssessment = useMemo(() => {
    const a = [];
    if (stock.pe_ratio != null && stock.pe_ratio <= 15) a.push({ text: 'P/E attractive', color: 'emerald' });
    if (stock.pe_ratio != null && stock.pe_ratio > 25) a.push({ text: 'P/E high', color: 'red' });
    if (stock.roe != null && stock.roe >= 15) a.push({ text: 'Good ROE', color: 'emerald' });
    if (stock.debt_equity_ratio != null && stock.debt_equity_ratio <= 0.5) a.push({ text: 'Low debt', color: 'emerald' });
    if (stock.debt_equity_ratio != null && stock.debt_equity_ratio > 2) a.push({ text: 'High debt', color: 'red' });
    if (stock.dividend_yield != null && stock.dividend_yield >= 3) a.push({ text: 'Good yield', color: 'emerald' });
    if (stock.current_ratio != null && stock.current_ratio >= 2) a.push({ text: 'Good liquidity', color: 'emerald' });
    if (stock.eps_growth_yoy != null && stock.eps_growth_yoy >= 20) a.push({ text: 'Strong EPS growth', color: 'emerald' });
    if (stock.eps_growth_yoy != null && stock.eps_growth_yoy < 0) a.push({ text: 'EPS declining', color: 'red' });
    return a.slice(0, 6);
  }, [stock]);

  const tagColorMap = {
    emerald: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
    red: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 text-white p-6 rounded-t-2xl relative">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button onClick={() => onToggleWatchlist(stock.Ticker)}
              className={`p-1.5 rounded-full transition-colors ${isInWatchlist(stock.Ticker) ? 'bg-amber-500/30 text-amber-400 hover:bg-amber-500/40' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
              {isInWatchlist(stock.Ticker) ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"><X size={18} /></button>
          </div>
          <div className="flex justify-between items-start pr-20">
            <div>
              <h2 className="text-2xl font-bold">{stock.Ticker}</h2>
              <p className="text-sm text-slate-300 mt-1">{stock.sector || 'N/A'} — {stock.sub_sector || 'N/A'}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{Number(stock.price_close || 0).toLocaleString()}</p>
              {activeStrategy && (
                <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full border text-sm font-bold ${scoreBg} ${scoreColor}`}>
                  <Activity size={14} /> Score: {avgScore}/100
                </div>
              )}
            </div>
          </div>
          {quickAssessment.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {quickAssessment.map((tag, i) => (
                <span key={i} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tagColorMap[tag.color]}`}>{tag.text}</span>
              ))}
            </div>
          )}
        </div>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2"><Eye size={16} className="text-indigo-500" /> Investment Profile</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke={chart.polarGridColor} />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: chart.tickColor }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" fill="#6366f1" fillOpacity={0.25} stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="p-6">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Detailed Metrics</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {metrics.map(([key, val]) => (
              <div key={key} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide leading-tight">{COLUMN_LABELS[key] || key}</p>
                <p className={`text-sm font-bold mt-1 ${getValueColor(key, val)}`}>{formatValue(key, val)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

// ==================== COMPARE PANEL ====================

function ComparePanel({ selectedStocks, onRemove, onClear }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const chart = useChartTheme();
  if (selectedStocks.length === 0) return null;

  const metrics = [
    { key: 'pe_ratio', label: 'P/E', min: 0, max: 30, invert: true },
    { key: 'pb_ratio', label: 'P/B', min: 0, max: 5, invert: true },
    { key: 'roe', label: 'ROE', min: 0, max: 35, invert: false },
    { key: 'eps_growth_yoy', label: 'EPS Growth', min: -20, max: 60, invert: false },
    { key: 'dividend_yield', label: 'Div Yield', min: 0, max: 10, invert: false },
    { key: 'debt_equity_ratio', label: 'D/E', min: 0, max: 3, invert: true },
    { key: 'current_ratio', label: 'Current Ratio', min: 0, max: 5, invert: false },
    { key: 'net_profit_margin', label: 'Net Margin', min: 0, max: 30, invert: false },
  ];
  const radarData = metrics.map(m => {
    const point = { metric: m.label };
    selectedStocks.forEach(stock => { point[stock.Ticker] = normalizeForRadar(stock[m.key], m.min, m.max, m.invert); });
    return point;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border-2 border-indigo-200 dark:border-indigo-500/30 mt-6 overflow-hidden transition-colors">
      <div className="flex items-center justify-between p-4 bg-indigo-50/50 dark:bg-indigo-500/5 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <GitCompare className="text-indigo-500 dark:text-indigo-400" size={20} /> Compare {selectedStocks.length} stocks
        </h3>
        <div className="flex items-center gap-3">
          <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10">Clear all</button>
          {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>
      {isExpanded && (
        <div className="p-6">
          <div className="flex flex-wrap gap-2 mb-5">
            {selectedStocks.map((s, i) => (
              <span key={s.Ticker} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-sm" style={{ backgroundColor: COMPARE_COLORS[i % COMPARE_COLORS.length] }}>
                {s.Ticker}
                <button onClick={() => onRemove(s.Ticker)} className="hover:opacity-70 ml-0.5"><X size={12} /></button>
              </span>
            ))}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">Radar Comparison</h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={chart.polarGridColor} />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: chart.tickColor }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    {selectedStocks.map((stock, i) => (
                      <Radar key={stock.Ticker} name={stock.Ticker} dataKey={stock.Ticker} stroke={COMPARE_COLORS[i % COMPARE_COLORS.length]} fill={COMPARE_COLORS[i % COMPARE_COLORS.length]} fillOpacity={0.1} strokeWidth={2} dot={{ r: 3 }} />
                    ))}
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">Comparison Table</h4>
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800">
                      <th className="p-2.5 text-left text-slate-500 dark:text-slate-400 font-semibold">Metric</th>
                      {selectedStocks.map((s, i) => <th key={s.Ticker} className="p-2.5 text-center font-bold" style={{ color: COMPARE_COLORS[i % COMPARE_COLORS.length] }}>{s.Ticker}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map(m => {
                      const vals = selectedStocks.map(s => s[m.key]).filter(v => v != null && !isNaN(v));
                      const best = m.invert ? Math.min(...vals) : Math.max(...vals);
                      return (
                        <tr key={m.key} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <td className="p-2.5 text-slate-600 dark:text-slate-300 font-medium">{COLUMN_LABELS[m.key] || m.key}</td>
                          {selectedStocks.map(s => {
                            const val = s[m.key];
                            const isBest = val === best && vals.length > 1;
                            return <td key={s.Ticker} className={`p-2.5 text-center ${isBest ? 'font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-500/10' : 'text-slate-600 dark:text-slate-300'}`}>{formatValue(m.key, val)} {isBest && '\ud83c\udfc6'}</td>;
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== SCORE TOOLTIP ====================

function ScoreTooltipContent({ strategy }) {
  const SCORING_INFO = {
    value: { name: 'Value', criteria: [{ label: 'P/E low', weight: '30%', direction: '\u2193' }, { label: 'P/B low', weight: '25%', direction: '\u2193' }, { label: 'D/E low', weight: '15%', direction: '\u2193' }, { label: 'Current Ratio', weight: '15%', direction: '\u2191' }, { label: 'Yield', weight: '15%', direction: '\u2191' }] },
    growth: { name: 'Growth', criteria: [{ label: 'EPS Growth', weight: '30%', direction: '\u2191' }, { label: 'Rev CAGR 3Y', weight: '25%', direction: '\u2191' }, { label: 'ROE', weight: '20%', direction: '\u2191' }, { label: 'PEG low', weight: '15%', direction: '\u2193' }, { label: 'Net Margin', weight: '10%', direction: '\u2191' }] },
    dividend: { name: 'Dividend', criteria: [{ label: 'Yield', weight: '30%', direction: '\u2191' }, { label: 'Streak years', weight: '25%', direction: '\u2191' }, { label: 'Payout', weight: '20%', direction: '\u2696' }, { label: 'FCF', weight: '15%', direction: '\u2191' }, { label: 'D/E low', weight: '10%', direction: '\u2193' }] },
    quality: { name: 'Quality', criteria: [{ label: 'ROE', weight: '30%', direction: '\u2191' }, { label: 'Gross Margin', weight: '20%', direction: '\u2191' }, { label: 'Net Margin', weight: '20%', direction: '\u2191' }, { label: 'OCF/NI', weight: '15%', direction: '\u2191' }, { label: 'D/E low', weight: '15%', direction: '\u2193' }] },
    defensive: { name: 'Defensive', criteria: [{ label: 'Graham', weight: '25%', direction: '\u2193' }, { label: 'D/E', weight: '20%', direction: '\u2193' }, { label: 'CR', weight: '15%', direction: '\u2191' }, { label: 'P/E', weight: '15%', direction: '\u2193' }, { label: 'Profit years', weight: '15%', direction: '\u2191' }, { label: 'Div years', weight: '10%', direction: '\u2191' }] },
    garp: { name: 'GARP', criteria: [{ label: 'EPS CAGR 3Y', weight: '25%', direction: '\u2191' }, { label: 'ROE', weight: '25%', direction: '\u2191' }, { label: 'PEG', weight: '20%', direction: '\u2193' }, { label: 'P/E', weight: '20%', direction: '\u2193' }, { label: 'CR', weight: '10%', direction: '\u2191' }] },
  };
  const info = SCORING_INFO[strategy];
  if (!info) return null;
  return (
    <div className="space-y-2">
      <p className="font-bold text-indigo-300 text-[11px]">Scoring: {info.name}</p>
      <div className="space-y-1 mt-1">
        {info.criteria.map((cr, i) => (
          <div key={i} className="flex items-center justify-between text-[10px]">
            <span className="text-slate-300">{cr.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">{cr.direction}</span>
              <span className="font-bold text-amber-400 w-8 text-right">{cr.weight}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== SCORE BADGE ====================

function ScoreBadge({ score, strategy, showTooltip = false }) {
  const [tooltipPos, setTooltipPos] = useState(null);
  const badgeRef = useRef(null);
  const timeoutRef = useRef(null);
  if (score === null || score === undefined || isNaN(score)) return <span className="text-slate-300 dark:text-slate-600">—</span>;
  const numScore = Number(score);
  let colorClass, bgClass, emoji;
  if (numScore >= 80) { colorClass = 'text-emerald-700 dark:text-emerald-300'; bgClass = 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30'; emoji = '\ud83d\udfe2'; }
  else if (numScore >= 60) { colorClass = 'text-blue-700 dark:text-blue-300'; bgClass = 'bg-blue-100 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/30'; emoji = '\ud83d\udfe2'; }
  else if (numScore >= 40) { colorClass = 'text-amber-700 dark:text-amber-300'; bgClass = 'bg-amber-100 dark:bg-amber-500/20 border-amber-200 dark:border-amber-500/30'; emoji = '\ud83d\udfe1'; }
  else { colorClass = 'text-red-700 dark:text-red-300'; bgClass = 'bg-red-100 dark:bg-red-500/20 border-red-200 dark:border-red-500/30'; emoji = '\ud83d\udd34'; }

  const handleMouseEnter = () => {
    if (!showTooltip || !strategy || !badgeRef.current) return;
    clearTimeout(timeoutRef.current);
    const rect = badgeRef.current.getBoundingClientRect();
    const tooltipW = 288, tooltipH = 280;
    let top = rect.top >= tooltipH + 8 ? rect.top - tooltipH - 8 : rect.bottom + 8;
    top = Math.max(8, top);
    let left = rect.left + rect.width / 2 - tooltipW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipW - 8));
    setTooltipPos({ top, left });
  };
  const handleMouseLeave = () => { timeoutRef.current = setTimeout(() => setTooltipPos(null), 100); };

  return (
    <>
      <div ref={badgeRef} className="inline-flex" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border cursor-help ${bgClass} ${colorClass}`}>{emoji} {numScore.toFixed(1)}</span>
      </div>
      {tooltipPos && ReactDOM.createPortal(
        <div className="fixed w-72 p-3 bg-slate-800 text-white rounded-xl shadow-2xl z-[99999] pointer-events-none" style={{ top: tooltipPos.top, left: tooltipPos.left }}>
          <ScoreTooltipContent strategy={strategy} />
        </div>, document.body
      )}
    </>
  );
}

// ==================== SORTABLE TABLE ====================

function SortableTable({ results, onStockClick, compareList, onToggleCompare, isInWatchlist, onToggleWatchlist, activeStrategy }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  useEffect(() => { setCurrentPage(1); }, [results, searchTerm]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filteredResults = useMemo(() => {
    if (!searchTerm.trim()) return results;
    const term = searchTerm.toLowerCase();
    return results.filter(r => r.Ticker?.toLowerCase().includes(term) || r.sector?.toLowerCase().includes(term) || r.sub_sector?.toLowerCase().includes(term));
  }, [results, searchTerm]);

  const sortedResults = useMemo(() => {
    if (!sortKey) return filteredResults;
    return [...filteredResults].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (sortDir === 'asc') return va > vb ? 1 : -1;
      return va < vb ? 1 : -1;
    });
  }, [filteredResults, sortKey, sortDir]);

  const totalPages = Math.ceil(sortedResults.length / rowsPerPage);
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedResults.slice(start, start + rowsPerPage);
  }, [sortedResults, currentPage]);

  if (results.length === 0) return null;
  const columns = Object.keys(results[0]).filter(k => k !== 'score_breakdown');

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input type="text" placeholder="Search ticker, sector..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all bg-slate-50/50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500" />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 hover:text-slate-500"><X size={14} /></button>}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
          {searchTerm && <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-full font-medium">{filteredResults.length} / {results.length}</span>}
          <span>Page {currentPage}/{totalPages || 1}</span>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800 dark:bg-slate-950 text-white text-xs uppercase sticky top-0 z-10">
            <tr>
              <th className="px-1.5 py-3 text-center w-7"><Bookmark size={12} className="mx-auto text-slate-400" /></th>
              <th className="px-1.5 py-3 text-center w-7"><GitCompare size={12} className="mx-auto text-slate-400" /></th>
              <th className="px-3 py-3 text-center w-10">#</th>
              {columns.map(key => (
                <th key={key} className="px-4 py-3 cursor-pointer hover:bg-slate-700 transition-colors select-none whitespace-nowrap" onClick={() => handleSort(key)}>
                  <div className="flex items-center gap-1.5">
                    {COLUMN_LABELS[key] || key}
                    {sortKey === key ? (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={12} className="opacity-30" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedResults.length === 0 ? (
              <tr><td colSpan={columns.length + 3} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500"><Search size={24} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />No results for "{searchTerm}"</td></tr>
            ) : paginatedResults.map((row, idx) => {
              const isCompared = compareList.some(c => c.Ticker === row.Ticker);
              const isWatched = isInWatchlist(row.Ticker);
              const globalIdx = (currentPage - 1) * rowsPerPage + idx + 1;
              return (
                <tr key={row.Ticker || idx} className={`transition-colors ${isCompared ? 'bg-indigo-50/50 dark:bg-indigo-500/10' : isWatched ? 'bg-amber-50/30 dark:bg-amber-500/10' : 'hover:bg-indigo-50/40 dark:hover:bg-slate-800/50'}`}>
                  <td className="px-1.5 py-3 text-center">
                    <button onClick={() => onToggleWatchlist(row.Ticker)} className={`p-0.5 rounded transition-all ${isWatched ? 'text-amber-500 hover:text-amber-600' : 'text-slate-200 dark:text-slate-600 hover:text-amber-400'}`}>
                      {isWatched ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                    </button>
                  </td>
                  <td className="px-1.5 py-3 text-center">
                    <button onClick={() => onToggleCompare(row)}
                      className={`p-0.5 rounded transition-all ${isCompared ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-200 dark:text-slate-600 hover:text-indigo-400'} ${compareList.length >= 5 && !isCompared ? 'opacity-30 cursor-not-allowed' : ''}`}
                      disabled={compareList.length >= 5 && !isCompared}>
                      {isCompared ? <Star size={15} fill="currentColor" /> : <StarOff size={15} />}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-center text-slate-400 dark:text-slate-500 font-mono text-xs">{globalIdx}</td>
                  {columns.map((key, i) => (
                    <td key={i}
                      className={`px-4 py-3 whitespace-nowrap ${i === 0 ? 'font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline' : key === 'score' ? '' : getValueColor(key, row[key])}`}
                      onClick={i === 0 ? () => onStockClick(row) : undefined}>
                      {key === 'score' ? <ScoreBadge score={row[key]} strategy={activeStrategy} showTooltip={true} /> : formatValue(key, row[key])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <p className="text-xs text-slate-400 dark:text-slate-500">Showing {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, sortedResults.length)} / {sortedResults.length}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"><ChevronsLeft size={16} className="text-slate-500" /></button>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"><ChevronLeft size={16} className="text-slate-500" /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page;
              if (totalPages <= 5) page = i + 1;
              else if (currentPage <= 3) page = i + 1;
              else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
              else page = currentPage - 2 + i;
              return <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${currentPage === page ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{page}</button>;
            })}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"><ChevronRight size={16} className="text-slate-500" /></button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"><ChevronsRight size={16} className="text-slate-500" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== COMMON FILTERS MODAL ====================

function CommonFiltersModal({ isOpen, onClose, commonFilters, onChange }) {
  if (!isOpen) return null;

  const handleSectorToggle = (sectorValue) => {
    const current = commonFilters.sectors || [];
    const updated = current.includes(sectorValue) ? current.filter(s => s !== sectorValue) : [...current, sectorValue];
    onChange({ ...commonFilters, sectors: updated });
  };

  const handleSelectAllSectors = () => {
    const allValues = COMMON_FILTERS.sector.options.map(o => o.value);
    const current = commonFilters.sectors || [];
    onChange({ ...commonFilters, sectors: current.length === allValues.length ? [] : allValues });
  };

  const selectedSectors = commonFilters.sectors || [];

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-5 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Filter size={20} className="text-indigo-500" /> Common Filters
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5 mb-2">
              {COMMON_FILTERS.sector.label}
            </label>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2">
              {selectedSectors.length === 0 ? 'All sectors (no filter)' : selectedSectors.length + ' sectors selected'}
            </p>
            <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors mb-2">
              <input type="checkbox" checked={selectedSectors.length === COMMON_FILTERS.sector.options.length} onChange={handleSelectAllSectors} className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Select / Deselect all</span>
            </label>
            <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-1">
              {COMMON_FILTERS.sector.options.map(option => (
                <label key={option.value} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all text-xs ${
                  selectedSectors.includes(option.value)
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-transparent'
                }`}>
                  <input type="checkbox" checked={selectedSectors.includes(option.value)} onChange={() => handleSectorToggle(option.value)} className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer" />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-2 block">Filter options</label>
            <div className="space-y-1">
              {COMMON_FILTERS.checkboxes.map(cb => (
                <label key={cb.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                  commonFilters[cb.id]
                    ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                }`}>
                  <input type="checkbox" checked={commonFilters[cb.id] || false} onChange={() => onChange({ ...commonFilters, [cb.id]: !commonFilters[cb.id] })} className="w-3.5 h-3.5 accent-amber-500 cursor-pointer" />
                  <span className="text-xs text-slate-600 dark:text-slate-400 flex-1">{cb.label}</span>
                  <SmartTooltip content={cb.tooltip} width={220}>
                    <Info size={10} className="text-slate-300 dark:text-slate-500 hover:text-indigo-500 cursor-help transition-colors" />
                  </SmartTooltip>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-4 flex justify-end">
          <button onClick={onClose} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition-all">Done</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ==================== STRATEGY PARAMS MODAL ====================

function StrategyParamsModal({ isOpen, onClose, activeStrategy, filters, onFilterChange, onReset, onApply, loading }) {
  if (!isOpen || !activeStrategy) return null;
  const strategy = STRATEGIES[activeStrategy];

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-5 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span className="text-indigo-500">{STRATEGY_ICONS[activeStrategy]}</span>
            {strategy.name} Parameters
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={onReset} className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-500 px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
              <RotateCcw size={12} /> Reset
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X size={18} className="text-slate-400" /></button>
          </div>
        </div>
        <div className="p-5 space-y-5">
          {strategy.controls.map(ctrl => (
            <div key={ctrl.id}>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 tracking-wide">
                  {ctrl.label}
                  <SmartTooltip content={ctrl.tooltip} width={220}>
                    <Info size={10} className="text-slate-300 dark:text-slate-500 hover:text-indigo-500 cursor-help transition-colors" />
                  </SmartTooltip>
                </label>
                {ctrl.type === 'slider' && (
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-0.5 rounded-md font-mono">{filters[ctrl.id]}</span>
                )}
              </div>
              {ctrl.type === 'slider' ? (
                <div>
                  <input type="range" min={ctrl.min} max={ctrl.max} step={ctrl.step} value={filters[ctrl.id] ?? ctrl.default}
                    onChange={e => onFilterChange(ctrl.id, parseFloat(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none" />
                  <div className="flex justify-between text-[10px] text-slate-300 dark:text-slate-600 mt-0.5"><span>{ctrl.min}</span><span>{ctrl.max}</span></div>
                </div>
              ) : (
                <label className="flex items-center cursor-pointer gap-2.5 mt-1 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <input type="checkbox" checked={filters[ctrl.id] || false} onChange={e => onFilterChange(ctrl.id, e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer accent-indigo-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Enable</span>
                </label>
              )}
            </div>
          ))}
        </div>
        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-4 flex justify-between">
          <button onClick={onClose} className="px-4 py-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium rounded-xl transition-colors">Cancel</button>
          <button onClick={() => { onApply(); onClose(); }} disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center gap-2">
            {loading ? <><span className="animate-spin">&#9203;</span> Filtering...</> : <><LayoutGrid size={16} /> Apply & Filter</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ==================== STRATEGY MEGA MENU (HOVER) ====================

function StrategyMegaMenu({ activeStrategy, onSelect, loading, isStrategyView }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredStrategy, setHoveredStrategy] = useState(null);
  const menuRef = useRef(null);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => { clearTimeout(timeoutRef.current); setIsOpen(true); };
  const handleMouseLeave = () => { timeoutRef.current = setTimeout(() => { setIsOpen(false); setHoveredStrategy(null); }, 200); };

  const handleSelect = (stratId) => {
    onSelect(stratId);
    setIsOpen(false);
    setHoveredStrategy(null);
  };

  const current = STRATEGIES[activeStrategy];

  return (
    <div ref={menuRef} className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
          isStrategyView
            ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/20'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
        } ${loading ? 'opacity-60 cursor-wait' : ''}`}>
        {isStrategyView ? STRATEGY_ICONS[activeStrategy] : <LayoutGrid size={16} />}
        <span className="hidden lg:inline">{isStrategyView ? current?.name : 'Trường phái đầu tư'}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 flex">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-96 overflow-hidden">
            <div className="p-2 border-b border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Investment Strategy</p>
            </div>
            <div className="p-1.5">
              {Object.values(STRATEGIES).map(strat => {
                const isActive = isStrategyView && activeStrategy === strat.id;
                return (
                  <div key={strat.id}
                    onClick={() => handleSelect(strat.id)}
                    onMouseEnter={() => setHoveredStrategy(strat.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                    }`}>
                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                      {STRATEGY_ICONS[strat.id]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>{strat.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">{STRATEGY_DESCRIPTIONS[strat.id]}</p>
                    </div>
                    {isActive && <span className="text-[9px] font-bold text-indigo-500 bg-indigo-100 dark:bg-indigo-500/20 px-1.5 py-0.5 rounded-full shrink-0">✓</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {hoveredStrategy && (
            <div className="ml-1 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-72 overflow-hidden">
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">{STRATEGY_ICONS[hoveredStrategy]}</div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{STRATEGIES[hoveredStrategy].name}</p>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{STRATEGY_DESCRIPTIONS[hoveredStrategy]}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">{STRATEGY_ORIGINS[hoveredStrategy]}</p>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <p className="text-[10px] font-bold text-indigo-400 mb-2">Default Parameters</p>
                  <div className="space-y-1">
                    {STRATEGIES[hoveredStrategy].controls.map(ctrl => (
                      <div key={ctrl.id} className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 dark:text-slate-400 truncate mr-2">{ctrl.label}</span>
                        <span className="font-bold text-amber-500 shrink-0">
                          {ctrl.type === 'slider' ? ctrl.default : ctrl.default ? '\u2705' : '\u274c'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ==================== STRATEGY CHARTS ====================

function SectorPieChart({ results }) {
  const chart = useChartTheme();
  const sectorCounts = useMemo(() => {
    const counts = {};
    results.forEach(r => { const s = r.sector || 'Unknown'; counts[s] = (counts[s] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [results]);
  if (sectorCounts.length === 0) return null;
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2"><Hash className="text-emerald-500" size={20} /> Sector Distribution</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart><Pie data={sectorCounts} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name.substring(0, 12)}: ${value}`}>{sectorCounts.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip contentStyle={chart.tooltipStyle} /><Legend wrapperStyle={{ fontSize: '11px' }} /></PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PriceDistributionChart({ results }) {
  const chart = useChartTheme();
  const ranges = [
    { name: '< 1', min: 0, max: 1, color: '#6366f1' }, { name: '1-5', min: 1, max: 5, color: '#22c55e' },
    { name: '5-20', min: 5, max: 20, color: '#f59e0b' }, { name: '20-100', min: 20, max: 100, color: '#ec4899' },
    { name: '100-500', min: 100, max: 500, color: '#8b5cf6' }, { name: '> 500', min: 500, max: 999999999, color: '#14b8a6' },
  ];
  const data = ranges.map(r => ({ name: r.name, value: results.filter(s => s.price_close >= r.min && s.price_close < r.max).length, color: r.color })).filter(d => d.value > 0);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{data.map((entry, i) => <Cell key={i} fill={entry.color} />)}</Pie><Tooltip contentStyle={chart.tooltipStyle} /><Legend wrapperStyle={{ fontSize: '11px' }} /></PieChart>
    </ResponsiveContainer>
  );
}

function ValueGrahamScatter({ results }) {
  const chart = useChartTheme();
  const data = useMemo(() => results.filter(r => r.pe_ratio > 0 && r.pb_ratio > 0 && r.pe_ratio < 50 && r.pb_ratio < 10).map(r => ({ ...r, graham: (r.pe_ratio * r.pb_ratio).toFixed(1) })), [results]);
  const grahamLine = useMemo(() => { const p = []; for (let pe = 1; pe <= 30; pe += 0.5) p.push({ pe_ratio: pe, pb_limit: Math.min(22.5 / pe, 10) }); return p; }, []);
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2"><Target className="text-indigo-500" size={20} /> Graham Matrix (P/E * P/B)</h3>
      <p className="text-xs text-slate-400 mb-4">Green zone: Graham &le; 22.5</p>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} />
            <XAxis type="number" dataKey="pe_ratio" name="P/E" domain={[0, 25]} tick={{ fontSize: 11, fill: chart.tickColor }} />
            <YAxis type="number" dataKey="pb_ratio" name="P/B" domain={[0, 5]} tick={{ fontSize: 11, fill: chart.tickColor }} />
            <ZAxis type="number" dataKey="market_cap" range={[40, 400]} />
            <ReferenceArea x1={0} x2={22.5} y1={0} y2={1} fill="#22c55e" fillOpacity={0.08} />
            <Tooltip content={({ payload }) => { if (!payload?.[0]) return null; const d = payload[0].payload; return <div className="bg-slate-800 text-white p-3 rounded-lg text-xs shadow-xl"><p className="font-bold text-indigo-300">{d.Ticker}</p><p>P/E: {d.pe_ratio?.toFixed(2)} | P/B: {d.pb_ratio?.toFixed(2)}</p><p>Graham: {d.graham} {parseFloat(d.graham) <= 22.5 ? '\u2705' : '\u26a0\ufe0f'}</p></div>; }} />
            <Scatter name="Stocks" data={data} fill="#6366f1" fillOpacity={0.7} stroke="#4f46e5" strokeWidth={1} />
            <Scatter name="Graham Limit" data={grahamLine} dataKey="pb_limit" fill="none" line={{ stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5 5' }} legendType="line">{grahamLine.map((_, i) => <Cell key={i} fill="transparent" />)}</Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ValueMarginOfSafetyBar({ results }) {
  const chart = useChartTheme();
  const data = useMemo(() => results.slice(0, 15).map(r => ({ Ticker: r.Ticker, price: r.price_close || 0, bvps: r.bvps || 0 })), [results]);
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2"><ShieldCheck className="text-emerald-500" size={20} /> Margin of Safety (Price vs BVPS)</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} vertical={false} /><XAxis dataKey="Ticker" tick={{ fill: chart.tickColor, fontSize: 10 }} /><YAxis tick={{ fill: chart.tickColor, fontSize: 11 }} /><Tooltip contentStyle={chart.tooltipStyle} /><Legend wrapperStyle={{ fontSize: '12px' }} /><Bar dataKey="price" name="Price" fill="#ef4444" radius={[4, 4, 0, 0]} /><Bar dataKey="bvps" name="BVPS" fill="#22c55e" radius={[4, 4, 0, 0]} /></BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GrowthPegScatter({ results }) {
  const chart = useChartTheme();
  const data = useMemo(() => results.filter(r => r.eps_growth_yoy > 0 && r.eps_growth_yoy < 200 && r.pe_ratio > 0 && r.pe_ratio < 60), [results]);
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2"><Zap className="text-amber-500" size={20} /> PEG (EPS Growth vs P/E)</h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} />
            <XAxis type="number" dataKey="eps_growth_yoy" name="EPS Growth" domain={[0, 'auto']} tick={{ fontSize: 11, fill: chart.tickColor }} />
            <YAxis type="number" dataKey="pe_ratio" name="P/E" domain={[0, 'auto']} tick={{ fontSize: 11, fill: chart.tickColor }} />
            <ReferenceArea x1={0} x2={50} y1={3} y2={15} fill="#22c55e" fillOpacity={0.08} />
            <Tooltip content={({ payload }) => { if (!payload?.[0]) return null; const d = payload[0].payload; return <div className="bg-slate-800 text-white p-3 rounded-lg text-xs shadow-xl"><p className="font-bold text-green-300">{d.Ticker}</p><p>EPS: {d.eps_growth_yoy?.toFixed(1)}% | P/E: {d.pe_ratio?.toFixed(2)}</p><p>PEG: {d.peg_ratio?.toFixed(2)}</p></div>; }} />
            <Scatter name="Stocks" data={data} fill="#22c55e" fillOpacity={0.7} stroke="#16a34a" strokeWidth={1} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GrowthMetricsBar({ results }) {
  const chart = useChartTheme();
  const data = useMemo(() => results.slice(0, 15), [results]);
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2"><TrendingUp className="text-indigo-500" size={20} /> Growth Comparison</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} vertical={false} /><XAxis dataKey="Ticker" tick={{ fill: chart.tickColor, fontSize: 10 }} /><YAxis tick={{ fill: chart.tickColor, fontSize: 11 }} /><Tooltip contentStyle={chart.tooltipStyle} /><Legend wrapperStyle={{ fontSize: '11px' }} /><Bar dataKey="rev_growth_cagr_3y" name="Rev CAGR 3Y (%)" fill="#6366f1" radius={[4, 4, 0, 0]} /><Bar dataKey="eps_growth_yoy" name="EPS Growth (%)" fill="#22c55e" radius={[4, 4, 0, 0]} /><Bar dataKey="roe" name="ROE (%)" fill="#f59e0b" radius={[4, 4, 0, 0]} /></BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DividendYieldPayoutScatter({ results }) {
  const chart = useChartTheme();
  const data = useMemo(() => results.filter(r => r.dividend_yield > 0 && r.payout_ratio >= 0 && r.payout_ratio <= 120), [results]);
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2"><PiggyBank className="text-pink-500" size={20} /> Yield vs Payout</h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} />
            <XAxis type="number" dataKey="payout_ratio" name="Payout" domain={[0, 100]} tick={{ fontSize: 11, fill: chart.tickColor }} />
            <YAxis type="number" dataKey="dividend_yield" name="Yield" domain={[0, 'auto']} tick={{ fontSize: 11, fill: chart.tickColor }} />
            <ReferenceArea x1={0} x2={50} y1={3} y2={15} fill="#22c55e" fillOpacity={0.08} />
            <Tooltip content={({ payload }) => { if (!payload?.[0]) return null; const d = payload[0].payload; return <div className="bg-slate-800 text-white p-3 rounded-lg text-xs shadow-xl"><p className="font-bold text-pink-300">{d.Ticker}</p><p>Yield: {d.dividend_yield?.toFixed(2)}% | Payout: {d.payout_ratio?.toFixed(1)}%</p></div>; }} />
            <Scatter name="Stocks" data={data} fill="#ec4899" fillOpacity={0.7} stroke="#db2777" strokeWidth={1} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DividendStreakBar({ results }) {
  const chart = useChartTheme();
  const data = useMemo(() => [...results].filter(r => r.div_streak_years > 0).sort((a, b) => b.div_streak_years - a.div_streak_years).slice(0, 20), [results]);
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2"><Calendar className="text-purple-500" size={20} /> Dividend Streak (Years)</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} horizontal={false} /><XAxis type="number" tick={{ fontSize: 11, fill: chart.tickColor }} /><YAxis type="category" dataKey="Ticker" tick={{ fontSize: 11, fill: chart.tickColor }} width={50} /><Tooltip contentStyle={chart.tooltipStyle} />
            <Bar dataKey="div_streak_years" name="Years" radius={[0, 6, 6, 0]}>{data.map((entry, i) => <Cell key={i} fill={entry.div_streak_years >= 5 ? '#22c55e' : entry.div_streak_years >= 3 ? '#f59e0b' : '#94a3b8'} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function QualityRadarChart({ results }) {
  const chart = useChartTheme();
  const top5 = results.slice(0, 5);
  const radarColors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
  const radarData = useMemo(() => {
    const axes = [{ key: 'roe', label: 'ROE', min: 0, max: 40 }, { key: 'gross_profit_margin', label: 'Gross Margin', min: 0, max: 60 }, { key: 'net_profit_margin', label: 'Net Margin', min: 0, max: 30 }, { key: 'earnings_quality_ratio', label: 'OCF/NI', min: 0, max: 3 }, { key: 'interest_coverage', label: 'ICR', min: 0, max: 20 }];
    return axes.map(axis => { const point = { metric: axis.label }; top5.forEach(stock => { point[stock.Ticker] = normalizeForRadar(stock[axis.key], axis.min, axis.max); }); return point; });
  }, [results]);
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2"><Award className="text-amber-500" size={20} /> Quality Radar (Top 5)</h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}><PolarGrid stroke={chart.polarGridColor} /><PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: chart.tickColor }} /><PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: chart.labelColor }} />
            {top5.map((stock, i) => <Radar key={stock.Ticker} name={stock.Ticker} dataKey={stock.Ticker} stroke={radarColors[i]} fill={radarColors[i]} fillOpacity={0.15} strokeWidth={2} />)}
            <Legend wrapperStyle={{ fontSize: '11px' }} /><Tooltip /></RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function QualityDupontBar({ results }) {
  const chart = useChartTheme();
  const data = useMemo(() => results.slice(0, 12).map(r => ({ Ticker: r.Ticker, roe: r.roe || 0, net_profit_margin: r.net_profit_margin || 0, gross_profit_margin: r.gross_profit_margin || 0 })), [results]);
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2"><BarChart2 className="text-indigo-500" size={20} /> Profitability</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} vertical={false} /><XAxis dataKey="Ticker" tick={{ fill: chart.tickColor, fontSize: 10 }} /><YAxis tick={{ fill: chart.tickColor, fontSize: 11 }} /><Tooltip contentStyle={chart.tooltipStyle} /><Legend wrapperStyle={{ fontSize: '11px' }} /><Bar dataKey="gross_profit_margin" name="Gross Margin (%)" fill="#14b8a6" radius={[4, 4, 0, 0]} /><Bar dataKey="net_profit_margin" name="Net Margin (%)" fill="#6366f1" radius={[4, 4, 0, 0]} /><Bar dataKey="roe" name="ROE (%)" fill="#f59e0b" radius={[4, 4, 0, 0]} /></BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DefensiveRiskMatrix({ results }) {
  const chart = useChartTheme();
  const data = useMemo(() => results.filter(r => r.current_ratio > 0 && r.debt_equity_ratio >= 0 && r.debt_equity_ratio < 5), [results]);
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2"><ShieldCheck className="text-blue-500" size={20} /> Safety Matrix</h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} />
            <XAxis type="number" dataKey="debt_equity_ratio" name="D/E" domain={[0, 3]} tick={{ fontSize: 11, fill: chart.tickColor }} />
            <YAxis type="number" dataKey="current_ratio" name="CR" domain={[0, 'auto']} tick={{ fontSize: 11, fill: chart.tickColor }} />
            <ReferenceArea x1={0} x2={1} y1={2} y2={10} fill="#22c55e" fillOpacity={0.08} />
            <Tooltip content={({ payload }) => { if (!payload?.[0]) return null; const d = payload[0].payload; return <div className="bg-slate-800 text-white p-3 rounded-lg text-xs shadow-xl"><p className="font-bold text-blue-300">{d.Ticker}</p><p>CR: {d.current_ratio?.toFixed(2)} | D/E: {d.debt_equity_ratio?.toFixed(2)}</p></div>; }} />
            <Scatter name="Stocks" data={data} fill="#3b82f6" fillOpacity={0.7} stroke="#2563eb" strokeWidth={1} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DefensiveEarningsBar({ results }) {
  const chart = useChartTheme();
  const data = useMemo(() => [...results].sort((a, b) => (b.profit_streak_years || 0) - (a.profit_streak_years || 0)).slice(0, 15).map(r => ({ Ticker: r.Ticker, profit_years: r.profit_streak_years || 0, div_years: r.div_streak_years || 0 })), [results]);
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2"><Activity className="text-emerald-500" size={20} /> Profit & Dividend Streak</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} vertical={false} /><XAxis dataKey="Ticker" tick={{ fill: chart.tickColor, fontSize: 10 }} /><YAxis tick={{ fill: chart.tickColor, fontSize: 11 }} /><Tooltip contentStyle={chart.tooltipStyle} /><Legend wrapperStyle={{ fontSize: '11px' }} /><Bar dataKey="profit_years" name="Profit Years" fill="#22c55e" radius={[4, 4, 0, 0]} /><Bar dataKey="div_years" name="Div Years" fill="#6366f1" radius={[4, 4, 0, 0]} /></BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GarpSweetSpotScatter({ results }) {
  const chart = useChartTheme();
  const data = useMemo(() => results.filter(r => r.eps_growth_cagr_3y > 0 && r.eps_growth_cagr_3y < 80 && r.pe_ratio > 0 && r.pe_ratio < 40), [results]);
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2"><Scale className="text-rose-500" size={20} /> GARP Zone</h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} />
            <XAxis type="number" dataKey="eps_growth_cagr_3y" domain={[0, 60]} tick={{ fontSize: 11, fill: chart.tickColor }} />
            <YAxis type="number" dataKey="pe_ratio" domain={[0, 30]} tick={{ fontSize: 11, fill: chart.tickColor }} />
            <ReferenceArea x1={10} x2={50} y1={0} y2={20} fill="#22c55e" fillOpacity={0.08} />
            <Tooltip content={({ payload }) => { if (!payload?.[0]) return null; const d = payload[0].payload; return <div className="bg-slate-800 text-white p-3 rounded-lg text-xs shadow-xl"><p className="font-bold text-rose-300">{d.Ticker}</p><p>EPS CAGR: {d.eps_growth_cagr_3y?.toFixed(1)}% | P/E: {d.pe_ratio?.toFixed(2)}</p><p>PEG: {d.peg_ratio?.toFixed(2)}</p></div>; }} />
            <Scatter name="Stocks" data={data} fill="#f43f5e" fillOpacity={0.7} stroke="#e11d48" strokeWidth={1} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GarpBalanceBar({ results }) {
  const chart = useChartTheme();
  const data = useMemo(() => results.slice(0, 12).map(r => ({ Ticker: r.Ticker, eps_growth_cagr_3y: r.eps_growth_cagr_3y || 0, pe_ratio: r.pe_ratio || 0, roe: r.roe || 0, peg_ratio: Math.min(r.peg_ratio || 0, 3) })), [results]);
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2"><BarChart2 className="text-indigo-500" size={20} /> Growth vs Valuation</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} vertical={false} /><XAxis dataKey="Ticker" tick={{ fill: chart.tickColor, fontSize: 10 }} /><YAxis tick={{ fill: chart.tickColor, fontSize: 11 }} /><Tooltip contentStyle={chart.tooltipStyle} /><Legend wrapperStyle={{ fontSize: '11px' }} /><Bar dataKey="eps_growth_cagr_3y" name="EPS CAGR 3Y (%)" fill="#22c55e" radius={[4, 4, 0, 0]} /><Bar dataKey="roe" name="ROE (%)" fill="#6366f1" radius={[4, 4, 0, 0]} /><Bar dataKey="pe_ratio" name="P/E" fill="#f59e0b" radius={[4, 4, 0, 0]} /><Bar dataKey="peg_ratio" name="PEG" fill="#f43f5e" radius={[4, 4, 0, 0]} /></BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StrategyCharts({ results, activeStrategy }) {
  if (results.length === 0) return null;
  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {activeStrategy === 'value' && <><ValueGrahamScatter results={results} /><ValueMarginOfSafetyBar results={results} /></>}
        {activeStrategy === 'growth' && <><GrowthPegScatter results={results} /><GrowthMetricsBar results={results} /></>}
        {activeStrategy === 'dividend' && <><DividendYieldPayoutScatter results={results} /><DividendStreakBar results={results} /></>}
        {activeStrategy === 'quality' && <><QualityRadarChart results={results} /><QualityDupontBar results={results} /></>}
        {activeStrategy === 'defensive' && <><DefensiveRiskMatrix results={results} /><DefensiveEarningsBar results={results} /></>}
        {activeStrategy === 'garp' && <><GarpSweetSpotScatter results={results} /><GarpBalanceBar results={results} /></>}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectorPieChart results={results} />
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2"><DollarSign className="text-purple-500" size={20} /> Price Distribution</h3>
          <div className="h-72 w-full"><PriceDistributionChart results={results} /></div>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN APP ====================

export default function App() {
  const [dark, setDark] = useDarkMode();
  const [view, setView] = useState('home');
  const [activeStrategy, setActiveStrategy] = useState('value');
  const [filters, setFilters] = useState({});
  const [results, setResults] = useState([]);
  const [allStocks, setAllStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [compareList, setCompareList] = useState([]);
  const [showCommonFilters, setShowCommonFilters] = useState(false);
  const [showStrategyParams, setShowStrategyParams] = useState(false);

  const { watchlist, toggle: toggleWatchlist, isInWatchlist, clear: clearWatchlist } = useWatchlist();
  const [commonFilters, setCommonFilters] = useState({ ...DEFAULT_COMMON_FILTERS });

  useEffect(() => {
    (async () => {
      setLoadingAll(true);
      try {
        const data = await fetchAllStocks('annual');
        setAllStocks(data.data || []);
      } catch { setAllStocks([]); }
      setLoadingAll(false);
    })();
  }, []);

  const fetchResults = useCallback(async (strategyKey, strategyFilters, commonF) => {
    setLoading(true);
    setError(null);
    try {
      const payload = { ...strategyFilters, common_filters: commonF };
      const data = await fetchScreenedStocks(STRATEGIES[strategyKey].endpoint, payload, 'annual');
      setResults(data.data || []);
      setCompareList([]);
    } catch {
      setError("Cannot connect to Backend. Check server port 8000.");
      setResults([]);
    }
    setLoading(false);
  }, []);

  const handleSelectStrategy = useCallback((stratId) => {
    setActiveStrategy(stratId);
    setView('strategy');
    const defaultFilters = {};
    STRATEGIES[stratId].controls.forEach(ctrl => { defaultFilters[ctrl.id] = ctrl.default; });
    setFilters(defaultFilters);
    setCommonFilters({ ...DEFAULT_COMMON_FILTERS });
    fetchResults(stratId, defaultFilters, DEFAULT_COMMON_FILTERS);
  }, [fetchResults]);

  const handleGoHome = () => {
    setView('home');
    setResults([]);
    setError(null);
    setCompareList([]);
  };

  const handleFilterChange = (id, value) => setFilters(prev => ({ ...prev, [id]: value }));

  const handleResetFilters = () => {
    const defaultFilters = {};
    STRATEGIES[activeStrategy].controls.forEach(ctrl => { defaultFilters[ctrl.id] = ctrl.default; });
    setFilters(defaultFilters);
    setCommonFilters({ ...DEFAULT_COMMON_FILTERS });
  };

  const handleApplyFilter = () => fetchResults(activeStrategy, filters, commonFilters);

  const handleToggleCompare = (stock) => {
    setCompareList(prev => {
      const exists = prev.some(c => c.Ticker === stock.Ticker);
      if (exists) return prev.filter(c => c.Ticker !== stock.Ticker);
      if (prev.length >= 5) return prev;
      return [...prev, stock];
    });
  };

  const filteredHomeStocks = useMemo(() => {
    let list = allStocks;
    const f = commonFilters;
    if (f.sectors?.length > 0) list = list.filter(s => f.sectors.includes(s.sector));
    if (f.only_psei) list = list.filter(s => PSEI_30.includes(s.Ticker));
    if (f.exclude_high_debt) list = list.filter(s => s.debt_equity_ratio == null || s.debt_equity_ratio <= 3.0);
    if (f.exclude_negative_equity) list = list.filter(s => s.total_equity == null || s.total_equity > 0);
    if (f.exclude_loss_making) list = list.filter(s => s.net_income == null || s.net_income > 0);
    if (f.only_with_dividend) list = list.filter(s => s.dividend_per_share != null && s.dividend_per_share > 0);
    if (f.only_positive_fcf) list = list.filter(s => {
      if (s.fcf != null) return s.fcf > 0;
      if (s.operating_cash_flow != null && s.capital_expenditures != null) return s.operating_cash_flow - Math.abs(s.capital_expenditures) > 0;
      return true;
    });
    return list;
  }, [allStocks, commonFilters]);

  const activeCommonFilterCount = [
    (commonFilters.sectors?.length > 0),
    commonFilters.only_psei,
    commonFilters.exclude_high_debt,
    commonFilters.exclude_negative_equity,
    commonFilters.exclude_loss_making,
    commonFilters.only_with_dividend,
    commonFilters.only_positive_fcf,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
      {/* ===== TOP NAVIGATION BAR ===== */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <button onClick={handleGoHome} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                  <TrendingUp className="text-emerald-500" size={20} />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-wide leading-tight">PSE SCREENER</h1>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 tracking-wider">Philippine Stock Exchange</p>
                </div>
              </button>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

              <button onClick={handleGoHome}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  view === 'home'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}>
                <Home size={15} />
                <span className="hidden md:inline">Overview</span>
              </button>

              <StrategyMegaMenu activeStrategy={activeStrategy} onSelect={handleSelectStrategy} loading={loading} isStrategyView={view === 'strategy'} />

              <button onClick={() => setShowCommonFilters(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <Filter size={15} />
                <span className="hidden md:inline">Filters</span>
                {activeCommonFilterCount > 0 && (
                  <span className="bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">{activeCommonFilterCount}</span>
                )}
              </button>

              {view === 'strategy' && (
                <button onClick={() => setShowStrategyParams(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/20">
                  <SlidersHorizontal size={15} />
                  <span className="hidden md:inline">Parameters</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <WatchlistPanel watchlist={watchlist} results={view === 'home' ? filteredHomeStocks : results} onClear={clearWatchlist} onToggle={toggleWatchlist} onStockClick={setSelectedStock} />

              <button onClick={() => setDark(!dark)}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                title={dark ? 'Light mode' : 'Dark mode'}>
                <div className="relative w-4 h-4">
                  <Sun size={16} className={`absolute inset-0 text-amber-400 transition-all duration-300 ${dark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100'}`} />
                  <Moon size={16} className={`absolute inset-0 text-blue-300 transition-all duration-300 ${dark ? 'opacity-100' : 'opacity-0 -rotate-90 scale-0'}`} />
                </div>
              </button>

              <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                <Calendar size={12} />
                <span>31/12/2024</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertCircle size={20} /><span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* ===== HOME VIEW ===== */}
        {view === 'home' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Market Overview</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {loadingAll ? 'Loading...' : `${filteredHomeStocks.length} stocks${activeCommonFilterCount > 0 ? ` (filtered from ${allStocks.length})` : ''}`} | Annual Report 2024
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ExportButton results={filteredHomeStocks} strategyName="all" />
              </div>
            </div>

            {loadingAll ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="animate-spin text-3xl mb-3">&#9203;</div>
                  <p className="text-sm text-slate-400">Loading data...</p>
                </div>
              </div>
            ) : (
              <SortableTable
                results={filteredHomeStocks}
                onStockClick={setSelectedStock}
                compareList={compareList}
                onToggleCompare={handleToggleCompare}
                isInWatchlist={isInWatchlist}
                onToggleWatchlist={toggleWatchlist}
                activeStrategy={null}
              />
            )}

            <ComparePanel selectedStocks={compareList} onRemove={(t) => setCompareList(prev => prev.filter(c => c.Ticker !== t))} onClear={() => setCompareList([])} />
          </div>
        )}

        {/* ===== STRATEGY VIEW ===== */}
        {view === 'strategy' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <button onClick={handleGoHome} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Back">
                  <ChevronLeft size={18} className="text-slate-400" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span className="text-indigo-500">{STRATEGY_ICONS[activeStrategy]}</span>
                    {STRATEGIES[activeStrategy].name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {loading ? 'Filtering...' : `${results.length} stocks matched`}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-xl leading-relaxed">{STRATEGY_DESCRIPTIONS[activeStrategy]}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {compareList.length > 0 && (
                  <span className="text-xs text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-full font-medium border border-indigo-200 dark:border-indigo-500/30">
                    <GitCompare size={12} className="inline mr-1" />{compareList.length}/5
                  </span>
                )}
                <ExportButton results={results} strategyName={activeStrategy} />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="animate-spin text-3xl mb-3">&#9203;</div>
                  <p className="text-sm text-slate-400">Scanning stocks...</p>
                </div>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-6">
                <SortableTable
                  results={results}
                  onStockClick={setSelectedStock}
                  compareList={compareList}
                  onToggleCompare={handleToggleCompare}
                  isInWatchlist={isInWatchlist}
                  onToggleWatchlist={toggleWatchlist}
                  activeStrategy={activeStrategy}
                />
                <ComparePanel selectedStocks={compareList} onRemove={(t) => setCompareList(prev => prev.filter(c => c.Ticker !== t))} onClear={() => setCompareList([])} />
                <StrategyCharts results={results} activeStrategy={activeStrategy} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
                <Search size={48} className="mb-4 opacity-30" />
                <p className="text-lg font-semibold">No stocks found</p>
                <p className="text-sm mt-1">Try relaxing filter parameters</p>
                <button onClick={() => setShowStrategyParams(true)} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
                  <SlidersHorizontal size={14} /> Adjust Parameters
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ===== MODALS ===== */}
      <CommonFiltersModal isOpen={showCommonFilters} onClose={() => setShowCommonFilters(false)} commonFilters={commonFilters} onChange={setCommonFilters} />

      <StrategyParamsModal
        isOpen={showStrategyParams}
        onClose={() => setShowStrategyParams(false)}
        activeStrategy={activeStrategy}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onApply={handleApplyFilter}
        loading={loading}
      />

      {selectedStock && (
        <StockDetailModal stock={selectedStock} onClose={() => setSelectedStock(null)} activeStrategy={view === 'strategy' ? activeStrategy : null} isInWatchlist={isInWatchlist} onToggleWatchlist={toggleWatchlist} />
      )}

      <ScrollToTopButton />

      <footer className="bg-slate-800 dark:bg-slate-900 text-center text-xs text-slate-500 py-3 border-t border-slate-700 dark:border-slate-800 mt-8">
        PSE Stock Screener v2.0 — Reference data only, not investment advice.
      </footer>
    </div>
  );
}
