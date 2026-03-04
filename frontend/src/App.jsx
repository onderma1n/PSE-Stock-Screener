import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { fetchScreenedStocks } from './services/api';
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
  Sun, Moon
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
    const tooltipH = 80; // estimated
    const gap = 8;

    let top, left;

    // Vertical: ưu tiên trên, nếu không đủ thì dưới
    if (rect.top >= tooltipH + gap) {
      top = rect.top - tooltipH - gap;
    } else {
      top = rect.bottom + gap;
    }

    // Horizontal: căn giữa, giữ trong viewport
    left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

    // Đảm bảo không vượt quá bottom viewport
    if (top + tooltipH > window.innerHeight - 8) {
      top = window.innerHeight - tooltipH - 8;
    }
    if (top < 8) top = 8;

    setPos({ top, left });
  };

  const hide = () => {
    timeoutRef.current = setTimeout(() => setPos(null), 100);
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        className="inline-flex items-center"
      >
        {children}
      </div>
      {pos && ReactDOM.createPortal(
        <div
          className="fixed p-2 bg-slate-800 dark:bg-slate-700 text-white text-[10px] rounded-lg shadow-xl z-[99999] pointer-events-none leading-relaxed"
          style={{ top: pos.top, left: pos.left, width: width }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}

// ==================== HELPER FUNCTIONS ====================

const COLUMN_LABELS = {
  Ticker: 'Mã CK',
  sector: 'Ngành',
  sub_sector: 'Phân ngành',
  price_close: 'Giá (₱)',
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
  market_cap: 'Vốn hóa (Tỷ)',
  graham_multiplier: 'Graham (PE×PB)',
  eps_growth_total_5y: 'EPS Growth 5Y (%)',
  eps_growth_cagr_3y: 'EPS CAGR 3Y (%)',
  profit_streak_years: 'Năm có lãi liên tục',
  bvps: 'BVPS (₱)',
  free_cash_flow: 'FCF',
  dividend_per_share: 'DPS (₱)',
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

// ==================== DARK-AWARE CHART HELPERS ====================

function useChartTheme() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return {
    gridColor: isDark ? '#334155' : '#f1f5f9',
    tickColor: isDark ? '#94a3b8' : '#64748b',
    labelColor: isDark ? '#64748b' : '#94a3b8',
    polarGridColor: isDark ? '#334155' : '#e2e8f0',
    tooltipBg: isDark ? '#1e293b' : '#1e293b',
    tooltipStyle: {
      borderRadius: '10px',
      border: 'none',
      boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      fontSize: '12px',
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      color: isDark ? '#e2e8f0' : '#334155',
    },
  };
}

// ==================== WATCHLIST HOOK (localStorage) ====================

function useWatchlist() {
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const saved = localStorage.getItem('pse_watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const toggle = useCallback((ticker) => {
    setWatchlist(prev => {
      const updated = prev.includes(ticker)
        ? prev.filter(t => t !== ticker)
        : [...prev, ticker];
      localStorage.setItem('pse_watchlist', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isInWatchlist = useCallback((ticker) => watchlist.includes(ticker), [watchlist]);

  const clear = useCallback(() => {
    setWatchlist([]);
    localStorage.setItem('pse_watchlist', JSON.stringify([]));
  }, []);

  return { watchlist, toggle, isInWatchlist, clear };
}

// ==================== DARK MODE HOOK ====================

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem('pse_dark_mode');
      if (saved !== null) return JSON.parse(saved);
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch { return false; }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('pse_dark_mode', JSON.stringify(dark));
  }, [dark]);

  return [dark, setDark];
}

// ==================== SCROLL TO TOP BUTTON ====================

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = document.getElementById('main-content');
    if (!container) return;

    const handleScroll = () => {
      setVisible(container.scrollTop > 400);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    const container = document.getElementById('main-content');
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-40 p-3 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-500/30 transition-all hover:scale-110 active:scale-95"
      title="Lên đầu trang"
    >
      <ArrowUp size={20} />
    </button>
  );
}

// ==================== WATCHLIST PANEL ====================

function WatchlistPanel({ watchlist, results, onClear, onToggle, onStockClick }) {
  const [isOpen, setIsOpen] = useState(false);

  const watchlistStocks = useMemo(() =>
    results.filter(r => watchlist.includes(r.Ticker))
  , [results, watchlist]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
          watchlist.length > 0
            ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/20'
            : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
      >
        <Bookmark size={16} />
        Watchlist
        {watchlist.length > 0 && (
          <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
            {watchlist.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-40 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-amber-50/50 dark:bg-amber-500/5">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <BookmarkCheck size={16} className="text-amber-500" />
                Danh sách Theo dõi ({watchlist.length})
              </h4>
              {watchlist.length > 0 && (
                <button
                  onClick={() => { onClear(); }}
                  className="text-[10px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto">
              {watchlist.length === 0 ? (
                <div className="p-6 text-center text-slate-400 dark:text-slate-500">
                  <Bookmark size={24} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Chưa có mã nào.</p>
                  <p className="text-[10px] mt-1">Click <BookmarkCheck size={10} className="inline" /> trong bảng để thêm.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                  {watchlist.map(ticker => {
                    const stock = watchlistStocks.find(s => s.Ticker === ticker);
                    return (
                      <div key={ticker} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => { if (stock) { onStockClick(stock); setIsOpen(false); } }}
                        >
                          <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{ticker}</p>
                          {stock ? (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                              ₱{Number(stock.price_close || 0).toLocaleString()} • {stock.sector || '—'}
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-300 dark:text-slate-600 italic">Chưa có trong kết quả lọc</p>
                          )}
                        </div>
                        <button
                          onClick={() => onToggle(ticker)}
                          className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          title="Xóa khỏi watchlist"
                        >
                          <X size={14} />
                        </button>
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

// ==================== EXPORT CSV BUTTON ====================

function ExportButton({ results, strategyName }) {
  const handleExport = () => {
    if (results.length === 0) return;

    // Lọc bỏ score_breakdown khỏi export
    const headers = Object.keys(results[0]).filter(h => h !== 'score_breakdown');
    const csvContent = [
      headers.map(h => COLUMN_LABELS[h] || h).join(','),
      ...results.map(row =>
        headers.map(h => {
          const val = row[h];
          if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
          return val ?? '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PSE_${strategyName}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <button
      onClick={handleExport}
      disabled={results.length === 0}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Download size={16} />
      Xuất CSV ({results.length})
    </button>
  );
}

// ==================== STOCK DETAIL MODAL ====================

function StockDetailModal({ stock, onClose, activeStrategy, isInWatchlist, onToggleWatchlist }) {
  if (!stock) return null;
  const chart = useChartTheme();

  const radarData = [
    { metric: 'Định giá', value: normalizeForRadar(stock.pe_ratio, 0, 30, true) },
    { metric: 'Tăng trưởng', value: normalizeForRadar(stock.eps_growth_yoy, -20, 60) },
    { metric: 'Sinh lời', value: normalizeForRadar(stock.roe, 0, 35) },
    { metric: 'An toàn', value: normalizeForRadar(stock.current_ratio, 0, 5) },
    { metric: 'Cổ tức', value: normalizeForRadar(stock.dividend_yield, 0, 10) },
    { metric: 'Chất lượng', value: normalizeForRadar(stock.earnings_quality_ratio, 0, 3) },
  ];

  const avgScore = (stock.score != null && !isNaN(Number(stock.score)))
    ? Math.round(Number(stock.score))
    : Math.round(radarData.reduce((a, b) => a + b.value, 0) / radarData.length);

  const scoreColor = avgScore >= 80 ? 'text-emerald-400' : avgScore >= 60 ? 'text-blue-400' : avgScore >= 40 ? 'text-amber-400' : 'text-red-400';
  const scoreBg = avgScore >= 80 ? 'bg-emerald-500/20 border-emerald-500/30' : avgScore >= 60 ? 'bg-blue-500/20 border-blue-500/30' : avgScore >= 40 ? 'bg-amber-500/20 border-amber-500/30' : 'bg-red-500/20 border-red-500/30';

  const excludeKeys = ['Ticker', 'sector', 'sub_sector', 'score', 'score_breakdown'];
  const metrics = Object.entries(stock).filter(([k]) => !excludeKeys.includes(k));

  const quickAssessment = useMemo(() => {
    const assessments = [];
    if (stock.pe_ratio != null && stock.pe_ratio <= 15) assessments.push({ text: 'P/E hấp dẫn', color: 'emerald' });
    if (stock.pe_ratio != null && stock.pe_ratio > 25) assessments.push({ text: 'P/E cao', color: 'red' });
    if (stock.roe != null && stock.roe >= 15) assessments.push({ text: 'ROE tốt', color: 'emerald' });
    if (stock.roe != null && stock.roe < 5) assessments.push({ text: 'ROE thấp', color: 'amber' });
    if (stock.debt_equity_ratio != null && stock.debt_equity_ratio <= 0.5) assessments.push({ text: 'Nợ thấp', color: 'emerald' });
    if (stock.debt_equity_ratio != null && stock.debt_equity_ratio > 2) assessments.push({ text: 'Nợ cao', color: 'red' });
    if (stock.dividend_yield != null && stock.dividend_yield >= 3) assessments.push({ text: 'Cổ tức hấp dẫn', color: 'emerald' });
    if (stock.current_ratio != null && stock.current_ratio >= 2) assessments.push({ text: 'Thanh khoản tốt', color: 'emerald' });
    if (stock.current_ratio != null && stock.current_ratio < 1) assessments.push({ text: 'Thanh khoản yếu', color: 'red' });
    if (stock.eps_growth_yoy != null && stock.eps_growth_yoy >= 20) assessments.push({ text: 'EPS tăng mạnh', color: 'emerald' });
    if (stock.eps_growth_yoy != null && stock.eps_growth_yoy < 0) assessments.push({ text: 'EPS suy giảm', color: 'red' });
    return assessments.slice(0, 6);
  }, [stock]);

  const tagColorMap = {
    emerald: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
    red: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 text-white p-6 rounded-t-2xl relative">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={() => onToggleWatchlist(stock.Ticker)}
              className={`p-1.5 rounded-full transition-colors ${
                isInWatchlist(stock.Ticker)
                  ? 'bg-amber-500/30 text-amber-400 hover:bg-amber-500/40'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
              title={isInWatchlist(stock.Ticker) ? 'Xóa khỏi Watchlist' : 'Thêm vào Watchlist'}
            >
              {isInWatchlist(stock.Ticker) ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="flex justify-between items-start pr-20">
            <div>
              <h2 className="text-2xl font-bold">{stock.Ticker}</h2>
              <p className="text-sm text-slate-300 mt-1">
                {stock.sector || 'N/A'} — {stock.sub_sector || 'N/A'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">₱{Number(stock.price_close || 0).toLocaleString()}</p>
              <div className="relative group/modal-score">
                <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full border text-sm font-bold cursor-help ${scoreBg} ${scoreColor}`}>
                  <Activity size={14} />
                  Điểm: {avgScore}/100
                </div>
                <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-slate-800 text-white rounded-xl shadow-2xl opacity-0 invisible group-hover/modal-score:opacity-100 group-hover/modal-score:visible transition-all z-[9999] pointer-events-none">
                  <ScoreTooltipContent strategy={activeStrategy} />
                  <div className="absolute right-6 bottom-full w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-slate-800"></div>
                </div>
              </div>
            </div>
          </div>

          {quickAssessment.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {quickAssessment.map((tag, i) => (
                <span key={i} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tagColorMap[tag.color]}`}>
                  {tag.text}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Radar Chart */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
            <Eye size={16} className="text-indigo-500" /> Hồ sơ Đầu tư
          </h3>
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

        {/* Key Metrics Grid */}
        <div className="p-6">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">📊 Chỉ số Chi tiết</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {metrics.map(([key, val]) => (
              <div key={key} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide leading-tight">{COLUMN_LABELS[key] || key}</p>
                <p className={`text-sm font-bold mt-1 ${getValueColor(key, val)}`}>
                  {formatValue(key, val)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <button
            onClick={() => onToggleWatchlist(stock.Ticker)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isInWatchlist(stock.Ticker)
                ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {isInWatchlist(stock.Ticker) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            {isInWatchlist(stock.Ticker) ? 'Đã lưu Watchlist' : 'Thêm vào Watchlist'}
          </button>
          <button onClick={onClose} className="px-6 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">
            Đóng
          </button>
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
    { key: 'net_profit_margin', label: 'Biên LN Ròng', min: 0, max: 30, invert: false },
  ];

  const radarData = metrics.map(m => {
    const point = { metric: m.label };
    selectedStocks.forEach(stock => {
      point[stock.Ticker] = normalizeForRadar(stock[m.key], m.min, m.max, m.invert);
    });
    return point;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border-2 border-indigo-200 dark:border-indigo-500/30 mt-6 overflow-hidden transition-colors">
      <div
        className="flex items-center justify-between p-4 bg-indigo-50/50 dark:bg-indigo-500/5 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <GitCompare className="text-indigo-500 dark:text-indigo-400" size={20} />
          So sánh {selectedStocks.length} cổ phiếu
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            Xóa tất cả
          </button>
          {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-6">
          <div className="flex flex-wrap gap-2 mb-5">
            {selectedStocks.map((s, i) => (
              <span
                key={s.Ticker}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-sm"
                style={{ backgroundColor: COMPARE_COLORS[i % COMPARE_COLORS.length] }}
              >
                {s.Ticker}
                <button onClick={() => onRemove(s.Ticker)} className="hover:opacity-70 ml-0.5">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">📡 Radar So sánh</h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={chart.polarGridColor} />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: chart.tickColor }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    {selectedStocks.map((stock, i) => (
                      <Radar
                        key={stock.Ticker}
                        name={stock.Ticker}
                        dataKey={stock.Ticker}
                        stroke={COMPARE_COLORS[i % COMPARE_COLORS.length]}
                        fill={COMPARE_COLORS[i % COMPARE_COLORS.length]}
                        fillOpacity={0.1}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    ))}
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">📋 Bảng So sánh Chi tiết</h4>
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800">
                      <th className="p-2.5 text-left text-slate-500 dark:text-slate-400 font-semibold">Chỉ số</th>
                      {selectedStocks.map((s, i) => (
                        <th key={s.Ticker} className="p-2.5 text-center font-bold" style={{ color: COMPARE_COLORS[i % COMPARE_COLORS.length] }}>
                          {s.Ticker}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                      <td className="p-2.5 text-slate-600 dark:text-slate-300 font-medium">Giá (₱)</td>
                      {selectedStocks.map(s => (
                        <td key={s.Ticker} className="p-2.5 text-center font-semibold text-slate-700 dark:text-slate-200">
                          {formatValue('price_close', s.price_close)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                      <td className="p-2.5 text-slate-600 dark:text-slate-300 font-medium">Ngành</td>
                      {selectedStocks.map(s => (
                        <td key={s.Ticker} className="p-2.5 text-center text-slate-600 dark:text-slate-400 text-[10px]">
                          {s.sector || '—'}
                        </td>
                      ))}
                    </tr>
                    {metrics.map(m => {
                      const vals = selectedStocks.map(s => s[m.key]).filter(v => v != null && !isNaN(v));
                      const best = m.invert ? Math.min(...vals) : Math.max(...vals);
                      return (
                        <tr key={m.key} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <td className="p-2.5 text-slate-600 dark:text-slate-300 font-medium">{COLUMN_LABELS[m.key] || m.key}</td>
                          {selectedStocks.map(s => {
                            const val = s[m.key];
                            const isBest = val === best && vals.length > 1;
                            return (
                              <td key={s.Ticker} className={`p-2.5 text-center ${isBest ? 'font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-500/10' : 'text-slate-600 dark:text-slate-300'}`}>
                                {formatValue(m.key, val)} {isBest && '🏆'}
                              </td>
                            );
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

// ==================== SUMMARY CARDS ====================

function SummaryCards({ results, activeStrategy }) {
  if (results.length === 0) return null;

  const avg = (key) => {
    const vals = results.map(r => r[key]).filter(v => v !== null && v !== undefined && v !== 999 && v !== -999);
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : '—';
  };
  const count = results.length;

  const CARDS_CONFIG = {
    value: [
      { label: 'Số mã lọc được', value: count, icon: <Hash size={20} />, color: 'slate' },
      { label: 'P/E Trung bình', value: avg('pe_ratio'), icon: <DollarSign size={20} />, color: 'indigo' },
      { label: 'P/B Trung bình', value: avg('pb_ratio'), icon: <Activity size={20} />, color: 'emerald' },
      { label: 'Current Ratio TB', value: avg('current_ratio'), icon: <ShieldCheck size={20} />, color: 'amber' },
    ],
    growth: [
      { label: 'Số mã lọc được', value: count, icon: <Hash size={20} />, color: 'slate' },
      { label: 'EPS Growth YoY TB', value: avg('eps_growth_yoy') + '%', icon: <TrendingUp size={20} />, color: 'indigo' },
      { label: 'ROE Trung bình', value: avg('roe') + '%', icon: <Activity size={20} />, color: 'amber' },
      { label: 'PEG Trung bình', value: avg('peg_ratio'), icon: <Target size={20} />, color: 'emerald' },
    ],
    dividend: [
      { label: 'Số mã lọc được', value: count, icon: <Hash size={20} />, color: 'slate' },
      { label: 'Yield Trung bình', value: avg('dividend_yield') + '%', icon: <PiggyBank size={20} />, color: 'pink' },
      { label: 'Payout Trung bình', value: avg('payout_ratio') + '%', icon: <Percent size={20} />, color: 'purple' },
      { label: 'Năm trả liên tục TB', value: avg('div_streak_years'), icon: <Calendar size={20} />, color: 'blue' },
    ],
    quality: [
      { label: 'Số mã lọc được', value: count, icon: <Hash size={20} />, color: 'slate' },
      { label: 'ROE Trung bình', value: avg('roe') + '%', icon: <Award size={20} />, color: 'amber' },
      { label: 'Biên LN Gộp TB', value: avg('gross_profit_margin') + '%', icon: <Percent size={20} />, color: 'teal' },
      { label: 'OCF/NI Trung bình', value: avg('earnings_quality_ratio'), icon: <Activity size={20} />, color: 'indigo' },
    ],
    defensive: [
      { label: 'Số mã lọc được', value: count, icon: <Hash size={20} />, color: 'slate' },
      { label: 'Vốn hóa TB (Tỷ)', value: avg('market_cap'), icon: <DollarSign size={20} />, color: 'blue' },
      { label: 'Graham TB', value: avg('graham_multiplier'), icon: <Scale size={20} />, color: 'emerald' },
      { label: 'Current Ratio TB', value: avg('current_ratio'), icon: <ShieldCheck size={20} />, color: 'amber' },
    ],
    garp: [
      { label: 'Số mã lọc được', value: count, icon: <Hash size={20} />, color: 'slate' },
      { label: 'PEG Trung bình', value: avg('peg_ratio'), icon: <Target size={20} />, color: 'rose' },
      { label: 'EPS CAGR 3Y TB', value: avg('eps_growth_cagr_3y') + '%', icon: <TrendingUp size={20} />, color: 'indigo' },
      { label: 'ROE Trung bình', value: avg('roe') + '%', icon: <Activity size={20} />, color: 'amber' },
    ],
  };

  const cards = CARDS_CONFIG[activeStrategy] || [];
  const colorMap = {
    slate: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20',
    pink: 'bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-100 dark:border-pink-500/20',
    purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-500/20',
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20',
    teal: 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-500/20',
    rose: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20',
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((card, i) => (
        <div key={i} className={`rounded-xl border p-4 transition-colors ${colorMap[card.color]}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium opacity-70 uppercase tracking-wider">{card.label}</p>
              <p className="text-xl font-bold mt-1">{card.value}</p>
            </div>
            <div className="opacity-30">{card.icon}</div>
          </div>
        </div>
      ))}
    </div>
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
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredResults = useMemo(() => {
    if (!searchTerm.trim()) return results;
    const term = searchTerm.toLowerCase();
    return results.filter(r =>
      r.Ticker?.toLowerCase().includes(term) ||
      r.sector?.toLowerCase().includes(term) ||
      r.sub_sector?.toLowerCase().includes(term)
    );
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
      {/* Search + Stats Bar */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Tìm mã CK, ngành..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all bg-slate-50/50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
          {searchTerm && (
            <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-full font-medium">
              {filteredResults.length} / {results.length} kết quả
            </span>
          )}
          <span>Trang {currentPage}/{totalPages || 1}</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800 dark:bg-slate-950 text-white text-xs uppercase sticky top-0 z-10">
            <tr>
              <th className="px-1.5 py-3 text-center w-7">
                <Bookmark size={12} className="mx-auto text-slate-400" />
              </th>
              <th className="px-1.5 py-3 text-center w-7">
                <GitCompare size={12} className="mx-auto text-slate-400" />
              </th>
              <th className="px-3 py-3 text-center w-10">#</th>
              {columns.map(key => (
                <th
                  key={key}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-700 dark:hover:bg-slate-800 transition-colors select-none whitespace-nowrap"
                  onClick={() => handleSort(key)}
                >
                  <div className="flex items-center gap-1.5">
                    {COLUMN_LABELS[key] || key}
                    {sortKey === key ? (
                      sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    ) : (
                      <ArrowUpDown size={12} className="opacity-30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedResults.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 3} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                  <Search size={24} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  Không tìm thấy "{searchTerm}"
                </td>
              </tr>
            ) : (
              paginatedResults.map((row, idx) => {
                const isCompared = compareList.some(c => c.Ticker === row.Ticker);
                const isWatched = isInWatchlist(row.Ticker);
                const globalIdx = (currentPage - 1) * rowsPerPage + idx + 1;
                return (
                  <tr key={row.Ticker || idx} className={`transition-colors ${isCompared ? 'bg-indigo-50/50 dark:bg-indigo-500/10' : isWatched ? 'bg-amber-50/30 dark:bg-amber-500/10' : 'hover:bg-indigo-50/40 dark:hover:bg-slate-800/50'}`}>
                    <td className="px-1.5 py-3 text-center">
                      <button
                        onClick={() => onToggleWatchlist(row.Ticker)}
                        className={`p-0.5 rounded transition-all ${isWatched ? 'text-amber-500 hover:text-amber-600' : 'text-slate-200 dark:text-slate-600 hover:text-amber-400'}`}
                        title={isWatched ? 'Xóa khỏi Watchlist' : 'Thêm Watchlist'}
                      >
                        {isWatched ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                      </button>
                    </td>
                    <td className="px-1.5 py-3 text-center">
                      <button
                        onClick={() => onToggleCompare(row)}
                        className={`p-0.5 rounded transition-all ${isCompared
                          ? 'text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300'
                          : 'text-slate-200 dark:text-slate-600 hover:text-indigo-400'
                        } ${compareList.length >= 5 && !isCompared ? 'opacity-30 cursor-not-allowed' : ''}`}
                        disabled={compareList.length >= 5 && !isCompared}
                        title={isCompared ? 'Bỏ so sánh' : compareList.length >= 5 ? 'Tối đa 5 mã' : 'Thêm so sánh'}
                      >
                        {isCompared ? <Star size={15} fill="currentColor" /> : <StarOff size={15} />}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-center text-slate-400 dark:text-slate-500 font-mono text-xs">{globalIdx}</td>
                    {columns.map((key, i) => (
                      <td
                        key={i}
                        className={`px-4 py-3 whitespace-nowrap ${
                          i === 0
                            ? 'font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline'
                            : key === 'score' ? '' : getValueColor(key, row[key])
                        }`}
                        onClick={i === 0 ? () => onStockClick(row) : undefined}
                      >
                        {key === 'score'
                          ? <ScoreBadge score={row[key]} strategy={activeStrategy} showTooltip={true} />
                          : formatValue(key, row[key])
                        }
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Hiển thị {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, sortedResults.length)} / {sortedResults.length} mã
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronsLeft size={16} className="text-slate-500 dark:text-slate-400" />
            </button>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={16} className="text-slate-500 dark:text-slate-400" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page;
              if (totalPages <= 5) { page = i + 1; }
              else if (currentPage <= 3) { page = i + 1; }
              else if (currentPage >= totalPages - 2) { page = totalPages - 4 + i; }
              else { page = currentPage - 2 + i; }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    currentPage === page
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight size={16} className="text-slate-500 dark:text-slate-400" />
            </button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronsRight size={16} className="text-slate-500 dark:text-slate-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== COMMON FILTERS COMPONENT ====================

function CommonFiltersPanel({ commonFilters, onChange }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSectorToggle = (sectorValue) => {
    const current = commonFilters.sectors || [];
    const updated = current.includes(sectorValue)
      ? current.filter(s => s !== sectorValue)
      : [...current, sectorValue];
    onChange({ ...commonFilters, sectors: updated });
  };

  const handleSelectAllSectors = () => {
    const allValues = COMMON_FILTERS.sector.options.map(o => o.value);
    const current = commonFilters.sectors || [];
    const isAllSelected = allValues.length === current.length;
    onChange({ ...commonFilters, sectors: isAllSelected ? [] : allValues });
  };

  const handleCheckboxChange = (id) => {
    onChange({ ...commonFilters, [id]: !commonFilters[id] });
  };

  const activeCount = [
    (commonFilters.sectors?.length > 0),
    commonFilters.only_psei,
    commonFilters.exclude_high_debt,
    commonFilters.exclude_negative_equity,
    commonFilters.exclude_loss_making,
    commonFilters.only_with_dividend,
    commonFilters.only_positive_fcf,
  ].filter(Boolean).length;

  const selectedSectors = commonFilters.sectors || [];

  return (
    <div className="border-b border-slate-100 dark:border-slate-800">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-indigo-500 dark:text-indigo-400" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Bộ lọc chung
          </span>
          {activeCount > 0 && (
            <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full font-bold">
              {activeCount}
            </span>
          )}
        </div>
        <ChevronRight
          size={14}
          className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="px-5 pb-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5 mb-2">
              {COMMON_FILTERS.sector.label}
              <SmartTooltip content={COMMON_FILTERS.sector.tooltip} width={220}>
                <Info size={10} className="text-slate-300 dark:text-slate-500 hover:text-indigo-500 cursor-help transition-colors" />
              </SmartTooltip>
            </label>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2">
              {selectedSectors.length === 0
                ? '📋 Tất cả ngành (không lọc)'
                : `✅ Đã chọn ${selectedSectors.length} ngành`}
            </p>
            <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors mb-2">
              <input type="checkbox" checked={selectedSectors.length === COMMON_FILTERS.sector.options.length} onChange={handleSelectAllSectors} className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Chọn / Bỏ tất cả</span>
            </label>
            <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-1">
              {COMMON_FILTERS.sector.options.map(option => (
                <label key={option.value} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all text-xs ${selectedSectors.includes(option.value)
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
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-2 block">Tùy chọn lọc</label>
            <div className="space-y-1">
              {COMMON_FILTERS.checkboxes.map(cb => (
                <label key={cb.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ${commonFilters[cb.id]
                  ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                }`}>
                  <input type="checkbox" checked={commonFilters[cb.id] || false} onChange={() => handleCheckboxChange(cb.id)} className="w-3.5 h-3.5 accent-amber-500 cursor-pointer" />
                  <span className="text-xs text-slate-600 dark:text-slate-400 flex-1">{cb.label}</span>
                  <SmartTooltip content={cb.tooltip} width={220}>
                    <Info size={10} className="text-slate-300 dark:text-slate-500 hover:text-indigo-500 cursor-help transition-colors" />
                  </SmartTooltip>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== SECTOR PIE CHART ====================

function SectorPieChart({ results }) {
  const chart = useChartTheme();
  const sectorCounts = useMemo(() => {
    const counts = {};
    results.forEach(r => {
      const s = r.sector || 'Chưa phân loại';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [results]);

  if (sectorCounts.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
        <Hash className="text-emerald-500 dark:text-emerald-400" size={20} />
        Phân bố theo Ngành
      </h3>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Tỷ lệ các ngành trong kết quả lọc</p>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={sectorCounts} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name.substring(0, 12)}: ${value}`}>
              {sectorCounts.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
            </Pie>
            <Tooltip contentStyle={chart.tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ==================== PRICE DISTRIBUTION ====================

function PriceDistributionChart({ results }) {
  const chart = useChartTheme();
  const ranges = [
    { name: '< 1₱', min: 0, max: 1, color: '#6366f1' },
    { name: '1-5₱', min: 1, max: 5, color: '#22c55e' },
    { name: '5-20₱', min: 5, max: 20, color: '#f59e0b' },
    { name: '20-100₱', min: 20, max: 100, color: '#ec4899' },
    { name: '100-500₱', min: 100, max: 500, color: '#8b5cf6' },
    { name: '> 500₱', min: 500, max: Infinity, color: '#14b8a6' },
  ];

  const data = ranges
    .map(r => ({
      name: r.name,
      value: results.filter(s => s.price_close >= r.min && s.price_close < r.max).length,
      color: r.color,
    }))
    .filter(d => d.value > 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
          {data.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
        </Pie>
        <Tooltip contentStyle={chart.tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: '11px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ======================================================================
// ==================== BIỂU ĐỒ CHUYÊN BIỆT THEO TRƯỜNG PHÁI =========
// ======================================================================

function ValueGrahamScatter({ results }) {
  const chart = useChartTheme();
  const data = useMemo(() =>
    results
      .filter(r => r.pe_ratio > 0 && r.pb_ratio > 0 && r.pe_ratio < 50 && r.pb_ratio < 10)
      .map(r => ({ ...r, graham: (r.pe_ratio * r.pb_ratio).toFixed(1) }))
  , [results]);

  const grahamLine = useMemo(() => {
    const points = [];
    for (let pe = 1; pe <= 30; pe += 0.5) {
      points.push({ pe_ratio: pe, pb_limit: Math.min(22.5 / pe, 10) });
    }
    return points;
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
        <Target className="text-indigo-500 dark:text-indigo-400" size={20} /> Ma trận Graham (P/E × P/B)
      </h3>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Vùng xanh: Graham Multiplier ≤ 22.5. Bong bóng càng lớn = vốn hóa càng cao.</p>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} />
            <XAxis type="number" dataKey="pe_ratio" name="P/E" domain={[0, 25]} tick={{ fontSize: 11, fill: chart.tickColor }} label={{ value: 'P/E Ratio', position: 'bottom', offset: -5, style: { fontSize: 11, fill: chart.labelColor } }} />
            <YAxis type="number" dataKey="pb_ratio" name="P/B" domain={[0, 5]} tick={{ fontSize: 11, fill: chart.tickColor }} label={{ value: 'P/B Ratio', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: chart.labelColor } }} />
            <ZAxis type="number" dataKey="market_cap" range={[40, 400]} name="Vốn hóa" />
            <ReferenceArea x1={0} x2={22.5} y1={0} y2={1} fill="#22c55e" fillOpacity={0.08} />
            <ReferenceArea x1={0} x2={9} y1={0} y2={2.5} fill="#22c55e" fillOpacity={0.06} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
              if (!payload || !payload[0]) return null;
              const d = payload[0].payload;
              return (<div className="bg-slate-800 text-white p-3 rounded-lg text-xs shadow-xl">
                <p className="font-bold text-indigo-300">{d.Ticker}</p>
                <p>P/E: {d.pe_ratio?.toFixed(2)} • P/B: {d.pb_ratio?.toFixed(2)}</p>
                <p>Graham: {d.graham} {parseFloat(d.graham) <= 22.5 ? '✅' : '⚠️'}</p>
              </div>);
            }} />
            <Scatter name="Cổ phiếu" data={data} fill="#6366f1" fillOpacity={0.7} stroke="#4f46e5" strokeWidth={1} />
            <Scatter name="Graham Limit" data={grahamLine} dataKey="pb_limit" fill="none" line={{ stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5 5' }} legendType="line">
              {grahamLine.map((_, i) => <Cell key={i} fill="transparent" />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ValueMarginOfSafetyBar({ results }) {
  const chart = useChartTheme();
  const data = useMemo(() => results.slice(0, 15).map(r => ({
    Ticker: r.Ticker, price: r.price_close || 0, bvps: r.bvps || 0,
  })), [results]);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
        <ShieldCheck className="text-emerald-500 dark:text-emerald-400" size={20} /> Biên An Toàn (Giá vs BVPS)
      </h3>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Giá (đỏ) THẤP hơn BVPS (xanh) → có biên an toàn.</p>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} vertical={false} />
            <XAxis dataKey="Ticker" tick={{ fill: chart.tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: chart.tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={chart.tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="price" name="Giá (₱)" fill="#ef4444" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
            <Bar dataKey="bvps" name="BVPS (₱)" fill="#22c55e" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GrowthPegScatter({ results }) {
  const chart = useChartTheme();
  const data = useMemo(() => results.filter(r => r.eps_growth_yoy > 0 && r.eps_growth_yoy < 200 && r.pe_ratio > 0 && r.pe_ratio < 60), [results]);
  const pegLine = useMemo(() => { const p = []; for (let g = 5; g <= 100; g += 5) p.push({ eps_growth_yoy: g, pe_line: g }); return p; }, []);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
        <Zap className="text-amber-500 dark:text-amber-400" size={20} /> Hiệu quả PEG (EPS Growth vs P/E)
      </h3>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Dưới đường PEG=1: tăng trưởng cao nhưng giá hợp lý.</p>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} />
            <XAxis type="number" dataKey="eps_growth_yoy" name="EPS Growth YoY" domain={[0, 'auto']} tick={{ fontSize: 11, fill: chart.tickColor }} label={{ value: 'EPS Growth YoY (%)', position: 'bottom', offset: -5, style: { fontSize: 11, fill: chart.labelColor } }} />
            <YAxis type="number" dataKey="pe_ratio" name="P/E" domain={[0, 'auto']} tick={{ fontSize: 11, fill: chart.tickColor }} label={{ value: 'P/E', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: chart.labelColor } }} />
            <ZAxis type="number" dataKey="rev_growth_cagr_3y" range={[40, 400]} />
            <Tooltip content={({ payload }) => {
              if (!payload || !payload[0]) return null;
              const d = payload[0].payload;
              return (<div className="bg-slate-800 text-white p-3 rounded-lg text-xs shadow-xl">
                <p className="font-bold text-green-300">{d.Ticker}</p>
                <p>EPS: {d.eps_growth_yoy?.toFixed(1)}% • P/E: {d.pe_ratio?.toFixed(2)}</p>
                <p>PEG: {d.peg_ratio?.toFixed(2)} {d.peg_ratio <= 1 ? '✅' : '⚠️'}</p>
              </div>);
            }} />
            <Scatter name="Cổ phiếu" data={data} fill="#22c55e" fillOpacity={0.7} stroke="#16a34a" strokeWidth={1} />
            <Scatter name="PEG = 1" data={pegLine} dataKey="pe_line" fill="none" line={{ stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5 5' }} legendType="line">
              {pegLine.map((_, i) => <Cell key={i} fill="transparent" />)}
            </Scatter>
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
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
        <TrendingUp className="text-indigo-500 dark:text-indigo-400" size={20} /> So sánh Tăng trưởng
      </h3>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Rev CAGR 3Y, EPS Growth YoY và ROE</p>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} vertical={false} />
            <XAxis dataKey="Ticker" tick={{ fill: chart.tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: chart.tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={chart.tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="rev_growth_cagr_3y" name="DT CAGR 3Y (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="eps_growth_yoy" name="EPS Growth YoY (%)" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="roe" name="ROE (%)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DividendYieldPayoutScatter({ results }) {
  const chart = useChartTheme();
  const data = useMemo(() => results.filter(r => r.dividend_yield > 0 && r.payout_ratio >= 0 && r.payout_ratio <= 120), [results]);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
        <PiggyBank className="text-pink-500 dark:text-pink-400" size={20} /> Vùng Cổ tức Lý tưởng
      </h3>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Góc trên-trái 🟢: Yield cao + Payout thấp = bền vững.</p>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} />
            <XAxis type="number" dataKey="payout_ratio" name="Payout" domain={[0, 100]} tick={{ fontSize: 11, fill: chart.tickColor }} label={{ value: 'Payout Ratio (%)', position: 'bottom', offset: -5, style: { fontSize: 11, fill: chart.labelColor } }} />
            <YAxis type="number" dataKey="dividend_yield" name="Yield" domain={[0, 'auto']} tick={{ fontSize: 11, fill: chart.tickColor }} label={{ value: 'Dividend Yield (%)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: chart.labelColor } }} />
            <ZAxis type="number" dataKey="div_streak_years" range={[40, 400]} />
            <ReferenceArea x1={0} x2={50} y1={3} y2={15} fill="#22c55e" fillOpacity={0.08} label={{ value: '🟢 Lý tưởng', position: 'insideTopLeft', style: { fontSize: 10, fill: '#16a34a' } }} />
            <ReferenceArea x1={70} x2={100} y1={5} y2={15} fill="#ef4444" fillOpacity={0.06} label={{ value: '🔴 Rủi ro', position: 'insideTopRight', style: { fontSize: 10, fill: '#dc2626' } }} />
            <ReferenceLine y={3} stroke="#22c55e" strokeDasharray="3 3" />
            <ReferenceLine x={60} stroke="#f59e0b" strokeDasharray="3 3" />
            <Tooltip content={({ payload }) => {
              if (!payload || !payload[0]) return null;
              const d = payload[0].payload;
              return (<div className="bg-slate-800 text-white p-3 rounded-lg text-xs shadow-xl">
                <p className="font-bold text-pink-300">{d.Ticker}</p>
                <p>Yield: {d.dividend_yield?.toFixed(2)}% • Payout: {d.payout_ratio?.toFixed(1)}%</p>
                <p>Năm liên tục: {d.div_streak_years}</p>
              </div>);
            }} />
            <Scatter name="Cổ phiếu" data={data} fill="#ec4899" fillOpacity={0.7} stroke="#db2777" strokeWidth={1} />
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
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
        <Calendar className="text-purple-500 dark:text-purple-400" size={20} /> Số năm trả Cổ tức Liên tục
      </h3>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Càng nhiều năm liên tục → càng đáng tin cậy</p>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: chart.tickColor }} axisLine={false} />
            <YAxis type="category" dataKey="Ticker" tick={{ fontSize: 11, fill: chart.tickColor }} axisLine={false} width={50} />
            <Tooltip contentStyle={chart.tooltipStyle} />
            <Bar dataKey="div_streak_years" name="Năm liên tục" radius={[0, 6, 6, 0]}>
              {data.map((entry, i) => (<Cell key={i} fill={entry.div_streak_years >= 5 ? '#22c55e' : entry.div_streak_years >= 3 ? '#f59e0b' : '#94a3b8'} />))}
            </Bar>
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
    const axes = [
      { key: 'roe', label: 'ROE', min: 0, max: 40 },
      { key: 'gross_profit_margin', label: 'Biên LN Gộp', min: 0, max: 60 },
      { key: 'net_profit_margin', label: 'Biên LN Ròng', min: 0, max: 30 },
      { key: 'earnings_quality_ratio', label: 'OCF/NI', min: 0, max: 3 },
      { key: 'interest_coverage', label: 'ICR', min: 0, max: 20 },
    ];
    return axes.map(axis => {
      const point = { metric: axis.label };
      top5.forEach(stock => { point[stock.Ticker] = normalizeForRadar(stock[axis.key], axis.min, axis.max); });
      return point;
    });
  }, [results]);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
        <Award className="text-amber-500 dark:text-amber-400" size={20} /> Radar Chất lượng (Top 5)
      </h3>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Radar càng rộng → càng tốt</p>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke={chart.polarGridColor} />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: chart.tickColor }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: chart.labelColor }} />
            {top5.map((stock, i) => (<Radar key={stock.Ticker} name={stock.Ticker} dataKey={stock.Ticker} stroke={radarColors[i]} fill={radarColors[i]} fillOpacity={0.15} strokeWidth={2} />))}
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function QualityDupontBar({ results }) {
  const chart = useChartTheme();
  const data = useMemo(() => results.slice(0, 12).map(r => ({ Ticker: r.Ticker, roe: r.roe || 0, net_profit_margin: r.net_profit_margin || 0, gross_profit_margin: r.gross_profit_margin || 0 })), [results]);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
        <BarChart2 className="text-indigo-500 dark:text-indigo-400" size={20} /> Phân tích Profitability
      </h3>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">So sánh ROE, Biên LN Gộp và Biên LN Ròng</p>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} vertical={false} />
            <XAxis dataKey="Ticker" tick={{ fill: chart.tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: chart.tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={chart.tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="gross_profit_margin" name="Biên LN Gộp (%)" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="net_profit_margin" name="Biên LN Ròng (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="roe" name="ROE (%)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DefensiveRiskMatrix({ results }) {
  const chart = useChartTheme();
  const data = useMemo(() => results.filter(r => r.current_ratio > 0 && r.debt_equity_ratio >= 0 && r.debt_equity_ratio < 5), [results]);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
        <ShieldCheck className="text-blue-500 dark:text-blue-400" size={20} /> Ma trận An Toàn Tài Chính
      </h3>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Góc trên-trái 🟢: Current Ratio cao + D/E thấp = an toàn nhất.</p>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} />
            <XAxis type="number" dataKey="debt_equity_ratio" name="D/E" domain={[0, 3]} tick={{ fontSize: 11, fill: chart.tickColor }} label={{ value: 'D/E (thấp = tốt)', position: 'bottom', offset: -5, style: { fontSize: 11, fill: chart.labelColor } }} />
            <YAxis type="number" dataKey="current_ratio" name="Current Ratio" domain={[0, 'auto']} tick={{ fontSize: 11, fill: chart.tickColor }} label={{ value: 'Current Ratio (cao = tốt)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: chart.labelColor } }} />
            <ZAxis type="number" dataKey="market_cap" range={[40, 400]} />
            <ReferenceArea x1={0} x2={1} y1={2} y2={10} fill="#22c55e" fillOpacity={0.08} label={{ value: '🟢 An toàn', position: 'insideTopLeft', style: { fontSize: 10, fill: '#16a34a' } }} />
            <ReferenceArea x1={2} x2={3} y1={0} y2={1.5} fill="#ef4444" fillOpacity={0.06} label={{ value: '🔴 Rủi ro', position: 'insideBottomRight', style: { fontSize: 10, fill: '#dc2626' } }} />
            <ReferenceLine y={2} stroke="#22c55e" strokeDasharray="3 3" />
            <ReferenceLine x={1} stroke="#f59e0b" strokeDasharray="3 3" />
            <Tooltip content={({ payload }) => {
              if (!payload || !payload[0]) return null;
              const d = payload[0].payload;
              return (<div className="bg-slate-800 text-white p-3 rounded-lg text-xs shadow-xl">
                <p className="font-bold text-blue-300">{d.Ticker}</p>
                <p>CR: {d.current_ratio?.toFixed(2)} • D/E: {d.debt_equity_ratio?.toFixed(2)}</p>
                <p>Graham: {d.graham_multiplier?.toFixed(1)}</p>
              </div>);
            }} />
            <Scatter name="Cổ phiếu" data={data} fill="#3b82f6" fillOpacity={0.7} stroke="#2563eb" strokeWidth={1} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DefensiveEarningsBar({ results }) {
  const chart = useChartTheme();
  const data = useMemo(() => [...results].sort((a, b) => (b.profit_streak_years || 0) - (a.profit_streak_years || 0)).slice(0, 15).map(r => ({
    Ticker: r.Ticker, profit_years: r.profit_streak_years || 0, div_years: r.div_streak_years || 0,
  })), [results]);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
        <Activity className="text-emerald-500 dark:text-emerald-400" size={20} /> Lãi & Cổ tức Liên tục
      </h3>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">So sánh số năm có lãi vs trả cổ tức liên tục</p>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} vertical={false} />
            <XAxis dataKey="Ticker" tick={{ fill: chart.tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: chart.tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={chart.tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="profit_years" name="Năm có lãi" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="div_years" name="Năm trả cổ tức" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GarpSweetSpotScatter({ results }) {
  const chart = useChartTheme();
  const data = useMemo(() => results.filter(r => r.eps_growth_cagr_3y > 0 && r.eps_growth_cagr_3y < 80 && r.pe_ratio > 0 && r.pe_ratio < 40), [results]);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
        <Scale className="text-rose-500 dark:text-rose-400" size={20} /> Vùng GARP Lý tưởng
      </h3>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Vùng xanh: EPS CAGR 10-50% + P/E &lt; 20.</p>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} />
            <XAxis type="number" dataKey="eps_growth_cagr_3y" name="EPS CAGR 3Y" domain={[0, 60]} tick={{ fontSize: 11, fill: chart.tickColor }} label={{ value: 'EPS CAGR 3Y (%)', position: 'bottom', offset: -5, style: { fontSize: 11, fill: chart.labelColor } }} />
            <YAxis type="number" dataKey="pe_ratio" name="P/E" domain={[0, 30]} tick={{ fontSize: 11, fill: chart.tickColor }} label={{ value: 'P/E', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: chart.labelColor } }} />
            <ZAxis type="number" dataKey="roe" range={[40, 400]} />
            <ReferenceArea x1={10} x2={50} y1={0} y2={20} fill="#22c55e" fillOpacity={0.08} label={{ value: '🟢 GARP Zone', position: 'insideTopLeft', style: { fontSize: 10, fill: '#16a34a' } }} />
            <ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="3 3" />
            <Tooltip content={({ payload }) => {
              if (!payload || !payload[0]) return null;
              const d = payload[0].payload;
              return (<div className="bg-slate-800 text-white p-3 rounded-lg text-xs shadow-xl">
                <p className="font-bold text-rose-300">{d.Ticker}</p>
                <p>EPS CAGR: {d.eps_growth_cagr_3y?.toFixed(1)}% • P/E: {d.pe_ratio?.toFixed(2)}</p>
                <p>PEG: {d.peg_ratio?.toFixed(2)} {d.peg_ratio <= 1 ? '✅' : '⚠️'}</p>
              </div>);
            }} />
            <Scatter name="Cổ phiếu" data={data} fill="#f43f5e" fillOpacity={0.7} stroke="#e11d48" strokeWidth={1} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GarpBalanceBar({ results }) {
  const chart = useChartTheme();
  const data = useMemo(() => results.slice(0, 12).map(r => ({
    Ticker: r.Ticker, eps_growth_cagr_3y: r.eps_growth_cagr_3y || 0, pe_ratio: r.pe_ratio || 0, roe: r.roe || 0, peg_ratio: Math.min(r.peg_ratio || 0, 3),
  })), [results]);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
        <BarChart2 className="text-indigo-500 dark:text-indigo-400" size={20} /> Growth vs Valuation
      </h3>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">EPS tăng tốt, ROE cao, P/E và PEG hợp lý</p>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridColor} vertical={false} />
            <XAxis dataKey="Ticker" tick={{ fill: chart.tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: chart.tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={chart.tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="eps_growth_cagr_3y" name="EPS CAGR 3Y (%)" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="roe" name="ROE (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pe_ratio" name="P/E" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="peg_ratio" name="PEG" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ======================================================================
// ==================== STRATEGY CHARTS RENDERER ========================
// ======================================================================

function StrategyCharts({ results, activeStrategy }) {
  if (results.length === 0) return null;

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {activeStrategy === 'value' && (<><ValueGrahamScatter results={results} /><ValueMarginOfSafetyBar results={results} /></>)}
        {activeStrategy === 'growth' && (<><GrowthPegScatter results={results} /><GrowthMetricsBar results={results} /></>)}
        {activeStrategy === 'dividend' && (<><DividendYieldPayoutScatter results={results} /><DividendStreakBar results={results} /></>)}
        {activeStrategy === 'quality' && (<><QualityRadarChart results={results} /><QualityDupontBar results={results} /></>)}
        {activeStrategy === 'defensive' && (<><DefensiveRiskMatrix results={results} /><DefensiveEarningsBar results={results} /></>)}
        {activeStrategy === 'garp' && (<><GarpSweetSpotScatter results={results} /><GarpBalanceBar results={results} /></>)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectorPieChart results={results} />
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
            <DollarSign className="text-purple-500 dark:text-purple-400" size={20} /> Phân bố theo Giá
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Phân bổ các cổ phiếu theo khoảng giá</p>
          <div className="h-72 w-full">
            <PriceDistributionChart results={results} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== WELCOME SCREEN ====================

function WelcomeScreen({ activeStrategy, strategyIcons }) {
  const tips = {
    value: ['P/E thấp < 15 cho thấy cổ phiếu được định giá rẻ', 'P/B < 1.5 nghĩa là giá dưới giá trị sổ sách', 'Graham Number (PE×PB ≤ 22.5) là ngưỡng an toàn kinh điển'],
    growth: ['EPS Growth > 20% cho thấy tăng trưởng mạnh', 'PEG < 1 = giá hợp lý so với tốc độ tăng trưởng', 'Revenue CAGR 3Y đánh giá sự bền vững'],
    dividend: ['Dividend Yield > 3% là mức hấp dẫn', 'Payout Ratio 30-60% là bền vững', 'Số năm trả liên tục > 5 = đáng tin cậy'],
    quality: ['ROE > 15% cho thấy sử dụng vốn hiệu quả', 'OCF/NI > 1 = lợi nhuận đi kèm dòng tiền thực', 'Biên LN Gộp cao = lợi thế cạnh tranh'],
    defensive: ['Graham Multiplier ≤ 22.5 = an toàn theo Graham', 'Current Ratio ≥ 2 = khả năng thanh toán tốt', 'Lãi liên tục ≥ 5 năm = ổn định'],
    garp: ['PEG ≤ 1 = cân bằng giá và tăng trưởng', 'EPS CAGR 3Y > 10% = tăng trưởng bền', 'Kết hợp tốt nhất của Value + Growth'],
  };

  const strategyTips = tips[activeStrategy] || [];

  return (
    <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-6 max-w-lg mx-auto">
      <div className="p-8 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
        <TrendingUp size={56} className="text-slate-300 dark:text-slate-600" />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-slate-500 dark:text-slate-400">Chưa có dữ liệu</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Điều chỉnh bộ lọc và nhấn <strong className="text-slate-600 dark:text-slate-300">"Lọc Cổ Phiếu"</strong></p>
      </div>

      <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm transition-colors">
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
          <span className="text-indigo-500 dark:text-indigo-400">{strategyIcons[activeStrategy]}</span>
          Mẹo cho {STRATEGIES[activeStrategy].name}
        </h4>
        <ul className="space-y-2">
          {strategyTips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="text-emerald-500 mt-0.5">💡</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 transition-colors">
        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Hướng dẫn nhanh</h4>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-2"><Star size={12} className="text-indigo-400" fill="currentColor" /> So sánh (max 5 mã)</div>
          <div className="flex items-center gap-2"><Bookmark size={12} className="text-amber-400" /> Lưu Watchlist</div>
          <div className="flex items-center gap-2"><Search size={12} className="text-slate-400" /> Tìm kiếm trong bảng</div>
          <div className="flex items-center gap-2"><Download size={12} className="text-emerald-400" /> Xuất file CSV</div>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN APP ====================

export default function App() {
  const [dark, setDark] = useDarkMode();
  const [activeStrategy, setActiveStrategy] = useState('value');
  const [filters, setFilters] = useState({});
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [compareList, setCompareList] = useState([]);

  const { watchlist, toggle: toggleWatchlist, isInWatchlist, clear: clearWatchlist } = useWatchlist();

  const [commonFilters, setCommonFilters] = useState({
    sectors: [],
    only_psei: false,
    exclude_high_debt: false,
    exclude_negative_equity: true,
    exclude_loss_making: false,
    only_with_dividend: false,
    only_positive_fcf: false,
  });

  const DEFAULT_COMMON_FILTERS = {
    sectors: [],
    only_psei: false,
    exclude_high_debt: false,
    exclude_negative_equity: true,
    exclude_loss_making: false,
    only_with_dividend: false,
    only_positive_fcf: false,
  };

  useEffect(() => {
    const defaultFilters = {};
    STRATEGIES[activeStrategy].controls.forEach(ctrl => {
      defaultFilters[ctrl.id] = ctrl.default;
    });
    setFilters(defaultFilters);
    setResults([]);
    setError(null);
    setCompareList([]);
  }, [activeStrategy]);

  const handleFilterChange = (id, value) => {
    setFilters(prev => ({ ...prev, [id]: value }));
  };

  const handleResetFilters = () => {
    const defaultFilters = {};
    STRATEGIES[activeStrategy].controls.forEach(ctrl => {
      defaultFilters[ctrl.id] = ctrl.default;
    });
    setFilters(defaultFilters);
    setCommonFilters(DEFAULT_COMMON_FILTERS);
  };

  const handleApplyFilter = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = { ...filters, common_filters: commonFilters };
      const data = await fetchScreenedStocks(STRATEGIES[activeStrategy].endpoint, payload, 'annual');
      setResults(data.data || []);
      setCompareList([]);
    } catch (err) {
      setError("Không thể kết nối Backend. Hãy kiểm tra server đang chạy tại port 8000.");
      setResults([]);
    }
    setLoading(false);
  };

  const handleToggleCompare = (stock) => {
    setCompareList(prev => {
      const exists = prev.some(c => c.Ticker === stock.Ticker);
      if (exists) return prev.filter(c => c.Ticker !== stock.Ticker);
      if (prev.length >= 5) return prev;
      return [...prev, stock];
    });
  };

  const handleRemoveCompare = (ticker) => {
    setCompareList(prev => prev.filter(c => c.Ticker !== ticker));
  };

  const STRATEGY_ICONS = {
    value: <DollarSign size={16} />,
    growth: <TrendingUp size={16} />,
    dividend: <PiggyBank size={16} />,
    quality: <Award size={16} />,
    defensive: <ShieldCheck size={16} />,
    garp: <Scale size={16} />,
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
      {/* ===== HEADER ===== */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 text-white p-4 shadow-lg flex justify-between items-center z-20 border-b border-transparent dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <TrendingUp className="text-emerald-400" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide">PSE STOCK SCREENER</h1>
            <p className="text-[10px] text-slate-400 tracking-widest uppercase">Philippine Stock Exchange — Sàng lọc Cổ phiếu Chuyên sâu</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <WatchlistPanel
            watchlist={watchlist}
            results={results}
            onClear={clearWatchlist}
            onToggle={toggleWatchlist}
            onStockClick={setSelectedStock}
          />

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDark(!dark)}
            className="relative p-2.5 rounded-lg bg-slate-800/80 dark:bg-slate-700/80 border border-slate-700 dark:border-slate-600 hover:bg-slate-700 dark:hover:bg-slate-600 transition-all group"
            title={dark ? 'Chế độ sáng' : 'Chế độ tối'}
          >
            <div className="relative w-5 h-5">
              <Sun
                size={18}
                className={`absolute inset-0 text-amber-400 transition-all duration-300 ${
                  dark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
                }`}
              />
              <Moon
                size={18}
                className={`absolute inset-0 text-blue-300 transition-all duration-300 ${
                  dark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
                }`}
              />
            </div>
          </button>

          <div className="hidden md:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20">
            <Calendar size={14} />
            <span>Cập nhật: 31/12/2024</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ===== SIDEBAR ===== */}
        <div className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-sm flex flex-col transition-colors">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Settings2 size={14} /> Trường Phái Đầu Tư
            </h2>
            <div className="space-y-1.5">
              {Object.values(STRATEGIES).map(strat => (
                <button
                  key={strat.id}
                  onClick={() => setActiveStrategy(strat.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    activeStrategy === strat.id
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  <span className={activeStrategy === strat.id ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}>
                    {STRATEGY_ICONS[strat.id]}
                  </span>
                  {strat.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 leading-relaxed border-l-2 border-indigo-200 dark:border-indigo-500/40 pl-3 italic">
              {STRATEGIES[activeStrategy].description}
            </p>
          </div>

          <CommonFiltersPanel commonFilters={commonFilters} onChange={setCommonFilters} />

          <div className="p-5 flex-1 overflow-y-auto space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Settings2 size={12} /> Tham số {STRATEGIES[activeStrategy].name}
              </h3>
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                title="Đặt lại mặc định"
              >
                <RotateCcw size={10} />
                Reset
              </button>
            </div>
            {STRATEGIES[activeStrategy].controls.map(ctrl => (
              <div key={ctrl.id}>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 tracking-wide">
                    {ctrl.label}
                    <SmartTooltip content={ctrl.tooltip} width={220}>
                      <Info size={10} className="text-slate-300 dark:text-slate-500 hover:text-indigo-500 cursor-help transition-colors" />
                    </SmartTooltip>
                  </label>
                  {ctrl.type === 'slider' && (
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-0.5 rounded-md font-mono">
                      {filters[ctrl.id]}
                    </span>
                  )}
                </div>

                {ctrl.type === 'slider' ? (
                  <div>
                    <input
                      type="range" min={ctrl.min} max={ctrl.max} step={ctrl.step}
                      value={filters[ctrl.id] ?? ctrl.default}
                      onChange={(e) => handleFilterChange(ctrl.id, parseFloat(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">
                      <span>{ctrl.min}</span>
                      <span>{ctrl.max}</span>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center cursor-pointer gap-2.5 mt-1 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <input
                      type="checkbox"
                      checked={filters[ctrl.id] || false}
                      onChange={(e) => handleFilterChange(ctrl.id, e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer accent-indigo-500"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Bật tiêu chí</span>
                  </label>
                )}
              </div>
            ))}
          </div>

          {/* Apply Button */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <button
              onClick={handleApplyFilter}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {loading ? (
                <><span className="animate-spin">⏳</span> Đang quét...</>
              ) : (
                <><LayoutGrid size={18} /> Lọc Cổ Phiếu</>
              )}
            </button>
          </div>
        </div>

        {/* ===== MAIN CONTENT ===== */}
        <div id="main-content" className="flex-1 p-6 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400">
              <AlertCircle size={20} />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {results.length > 0 ? (
            <div className="space-y-6">
              {/* Header + Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                    <span className="text-indigo-500 dark:text-indigo-400">{STRATEGY_ICONS[activeStrategy]}</span>
                    {STRATEGIES[activeStrategy].name}
                  </h2>

                </div>
                <div className="flex items-center gap-3">
                  {compareList.length > 0 && (
                    <span className="text-xs text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-full font-medium border border-indigo-200 dark:border-indigo-500/30">
                      <GitCompare size={12} className="inline mr-1" />
                      {compareList.length}/5 so sánh
                    </span>
                  )}
                  <ExportButton results={results} strategyName={activeStrategy} />
                </div>
              </div>

              {/* Summary Cards */}
              <SummaryCards results={results} activeStrategy={activeStrategy} />

              {/* Hướng dẫn nhanh */}
              <div className="bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-lg px-4 py-2.5 flex items-center gap-3 text-xs text-indigo-600 dark:text-indigo-400">
                <Info size={14} />
                <span>
                  <strong>Mẹo:</strong> Click <strong>Mã CK</strong> để xem chi tiết •
                  <Star size={11} className="inline text-indigo-400 mx-0.5" fill="currentColor" /> So sánh (max 5) •
                  <Bookmark size={11} className="inline text-amber-400 mx-0.5" /> Lưu Watchlist •
                  Tìm kiếm ở thanh tìm phía trên bảng
                </span>
              </div>

              {/* Table */}
              <SortableTable
                results={results}
                onStockClick={setSelectedStock}
                compareList={compareList}
                onToggleCompare={handleToggleCompare}
                isInWatchlist={isInWatchlist}
                onToggleWatchlist={toggleWatchlist}
                activeStrategy={activeStrategy}
              />

              {/* Compare Panel */}
              <ComparePanel
                selectedStocks={compareList}
                onRemove={handleRemoveCompare}
                onClear={() => setCompareList([])}
              />

              {/* Charts */}
              <StrategyCharts results={results} activeStrategy={activeStrategy} />
            </div>
          ) : (
            <WelcomeScreen activeStrategy={activeStrategy} strategyIcons={STRATEGY_ICONS} />
          )}
        </div>
      </div>

      {/* Stock Detail Modal */}
      {selectedStock && (
        <StockDetailModal
          stock={selectedStock}
          onClose={() => setSelectedStock(null)}
          activeStrategy={activeStrategy}
          isInWatchlist={isInWatchlist}
          onToggleWatchlist={toggleWatchlist}
        />
      )}

      {/* Scroll to Top */}
      <ScrollToTopButton />

      {/* Footer */}
      <footer className="bg-slate-800 dark:bg-slate-900 text-center text-xs text-slate-500 py-3 border-t border-slate-700 dark:border-slate-800">
        PSE Stock Screener v2.0 — Dữ liệu mang tính chất tham khảo, không phải khuyến nghị đầu tư.
      </footer>
    </div>
  );
}

// ==================== SCORE TOOLTIP COMPONENT ====================

function ScoreTooltipContent({ strategy }) {
  const SCORING_INFO = {
    value: {
      name: 'Đầu tư Giá trị',
      criteria: [
        { label: 'P/E thấp', weight: '30%', direction: '↓ Thấp = tốt' },
        { label: 'P/B thấp', weight: '25%', direction: '↓ Thấp = tốt' },
        { label: 'D/E thấp', weight: '15%', direction: '↓ Thấp = tốt' },
        { label: 'Current Ratio cao', weight: '15%', direction: '↑ Cao = tốt' },
        { label: 'Cổ tức Yield cao', weight: '15%', direction: '↑ Cao = tốt' },
      ]
    },
    growth: {
      name: 'Tăng trưởng',
      criteria: [
        { label: 'EPS Growth YoY cao', weight: '30%', direction: '↑ Cao = tốt' },
        { label: 'DT CAGR 3Y cao', weight: '25%', direction: '↑ Cao = tốt' },
        { label: 'ROE cao', weight: '20%', direction: '↑ Cao = tốt' },
        { label: 'PEG thấp', weight: '15%', direction: '↓ Thấp = tốt' },
        { label: 'Biên LN Ròng cao', weight: '10%', direction: '↑ Cao = tốt' },
      ]
    },
    dividend: {
      name: 'Cổ tức',
      criteria: [
        { label: 'Cổ tức Yield cao', weight: '30%', direction: '↑ Cao = tốt' },
        { label: 'Năm trả liên tục', weight: '25%', direction: '↑ Cao = tốt' },
        { label: 'Payout vừa phải', weight: '20%', direction: '⚖ 30-60% tối ưu' },
        { label: 'FCF dương & cao', weight: '15%', direction: '↑ Cao = tốt' },
        { label: 'D/E thấp', weight: '10%', direction: '↓ Thấp = tốt' },
      ]
    },
    quality: {
      name: 'Chất lượng',
      criteria: [
        { label: 'ROE cao', weight: '30%', direction: '↑ Cao = tốt' },
        { label: 'Biên LN Gộp cao', weight: '20%', direction: '↑ Cao = tốt' },
        { label: 'Biên LN Ròng cao', weight: '20%', direction: '↑ Cao = tốt' },
        { label: 'OCF/NI cao (LN thực)', weight: '15%', direction: '↑ Cao = tốt' },
        { label: 'D/E thấp', weight: '15%', direction: '↓ Thấp = tốt' },
      ]
    },
    defensive: {
      name: 'Phòng thủ',
      criteria: [
        { label: 'Graham (PE×PB) thấp', weight: '25%', direction: '↓ Thấp = tốt' },
        { label: 'D/E thấp', weight: '20%', direction: '↓ Thấp = tốt' },
        { label: 'Current Ratio cao', weight: '15%', direction: '↑ Cao = tốt' },
        { label: 'P/E thấp', weight: '15%', direction: '↓ Thấp = tốt' },
        { label: 'Năm có lãi liên tục', weight: '15%', direction: '↑ Cao = tốt' },
        { label: 'Năm trả cổ tức', weight: '10%', direction: '↑ Cao = tốt' },
      ]
    },
    garp: {
      name: 'GARP',
      criteria: [
        { label: 'EPS CAGR 3Y cao', weight: '25%', direction: '↑ Cao = tốt' },
        { label: 'ROE cao', weight: '25%', direction: '↑ Cao = tốt' },
        { label: 'PEG thấp', weight: '20%', direction: '↓ Thấp = tốt' },
        { label: 'P/E hợp lý', weight: '20%', direction: '↓ Thấp = tốt' },
        { label: 'Current Ratio', weight: '10%', direction: '↑ Cao = tốt' },
      ]
    },
  };

  const info = SCORING_INFO[strategy];
  if (!info) return null;

  return (
    <div className="space-y-2">
      <p className="font-bold text-indigo-300 text-[11px]">📊 Cách chấm điểm: {info.name}</p>
      <p className="text-[10px] text-slate-400 leading-relaxed">
        Dùng <strong className="text-slate-300">Percentile Ranking</strong> — so sánh tương đối giữa các mã trong kết quả lọc.
        Mã tốt nhất ở tiêu chí đó = 100đ, kém nhất = 0đ.
        Điểm tổng = trung bình có trọng số.
      </p>
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

// ==================== SCORE BADGE COMPONENT ====================

function ScoreBadge({ score, strategy, showTooltip = false }) {
  const [tooltipPos, setTooltipPos] = useState(null);
  const badgeRef = useRef(null);
  const timeoutRef = useRef(null);

  if (score === null || score === undefined || isNaN(score)) {
    return <span className="text-slate-300 dark:text-slate-600">—</span>;
  }

  const numScore = Number(score);

  let colorClass, bgClass, emoji;
  if (numScore >= 80) {
    colorClass = 'text-emerald-700 dark:text-emerald-300';
    bgClass = 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30';
    emoji = '🟢';
  } else if (numScore >= 60) {
    colorClass = 'text-blue-700 dark:text-blue-300';
    bgClass = 'bg-blue-100 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/30';
    emoji = '🔵';
  } else if (numScore >= 40) {
    colorClass = 'text-amber-700 dark:text-amber-300';
    bgClass = 'bg-amber-100 dark:bg-amber-500/20 border-amber-200 dark:border-amber-500/30';
    emoji = '🟡';
  } else {
    colorClass = 'text-red-700 dark:text-red-300';
    bgClass = 'bg-red-100 dark:bg-red-500/20 border-red-200 dark:border-red-500/30';
    emoji = '🔴';
  }

  const handleMouseEnter = () => {
    if (!showTooltip || !strategy || !badgeRef.current) return;
    clearTimeout(timeoutRef.current);
    const rect = badgeRef.current.getBoundingClientRect();
    const tooltipW = 288; // w-72 = 18rem = 288px
    const tooltipH = 280; // estimated height

    // Tính vị trí: ưu tiên hiện phía trên, nếu không đủ chỗ thì hiện phía dưới
    let top, left;
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    if (spaceAbove >= tooltipH + 8) {
      // Hiện phía trên
      top = rect.top - tooltipH - 8;
    } else if (spaceBelow >= tooltipH + 8) {
      // Hiện phía dưới
      top = rect.bottom + 8;
    } else {
      // Hiện phía trên dù sao (scroll sẽ ổn)
      top = Math.max(8, rect.top - tooltipH - 8);
    }

    // Căn giữa theo badge, nhưng giữ trong viewport
    left = rect.left + rect.width / 2 - tooltipW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipW - 8));

    setTooltipPos({ top, left, arrowLeft: rect.left + rect.width / 2 });
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setTooltipPos(null), 100);
  };

  return (
    <>
      <div
        ref={badgeRef}
        className="inline-flex"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border cursor-help ${bgClass} ${colorClass}`}>
          {emoji} {numScore.toFixed(1)}
        </span>
      </div>

      {tooltipPos && ReactDOM.createPortal(
        <div
          className="fixed w-72 p-3 bg-slate-800 text-white rounded-xl shadow-2xl z-[99999] pointer-events-none animate-in fade-in duration-150"
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
          onMouseEnter={() => clearTimeout(timeoutRef.current)}
          onMouseLeave={handleMouseLeave}
        >
          <ScoreTooltipContent strategy={strategy} />
        </div>,
        document.body
      )}
    </>
  );
}
