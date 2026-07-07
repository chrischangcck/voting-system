import React, { useState, useEffect } from 'react';
import {
  Settings, BarChart3, Users, Plus, Trash2, ArrowUp, ArrowDown,
  ExternalLink, QrCode, Copy, CheckCircle, Check, Play, User,
  AlertCircle, ChevronDown, ChevronUp, MessageSquare, History,
  Lock, Unlock, ChevronRight, SkipForward
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import {
  getFirestore, doc, collection, setDoc, getDoc,
  onSnapshot, getDocs, deleteDoc, updateDoc
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─── 錯誤邊界 ───────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', color: 'red' }}>
          <h2>系統錯誤</h2>
          <pre>{this.state.error.message}</pre>
          <pre>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── 主 App ────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('voter');
  const [sessionCode, setSessionCode] = useState(null);
  const [user] = useState({ uid: 'host-' + Math.random().toString(36).substring(2, 9) });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('session');
    const isHost = params.get('host');
    if (code) { setSessionCode(code.trim().toUpperCase()); setView('voting'); }
    else if (isHost === 'true') setView('host');
  }, []);

  const goBack = () => {
    const params = new URLSearchParams(window.location.search);
    setView(params.get('host') === 'true' ? 'host' : 'voter');
    window.history.pushState({}, '', window.location.pathname + (params.get('host') ? '?host=true' : ''));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
            <BarChart3 className="text-indigo-500" />
            <span className="hidden sm:inline">課程即時評分系統</span>
          </div>
          <div className="flex items-center gap-3">
            {(view === 'dashboard' || view === 'voting' || view === 'history') && (
              <button onClick={goBack} className="text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center gap-1">
                <Settings size={16} /> 返回首頁
              </button>
            )}
            {view === 'host' && (
              <button onClick={() => setView('history')} className="text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center gap-1">
                <History size={16} /> 歷史活動
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
        <ErrorBoundary>
          {view === 'voter'     && <VoterEntry setView={setView} setSessionCode={setSessionCode} />}
          {view === 'host'      && <AdminSetup user={user} setView={setView} setSessionCode={setSessionCode} />}
          {view === 'dashboard' && <AdminDashboard user={user} sessionCode={sessionCode} setView={setView} />}
          {view === 'voting'    && <VoterInterface user={user} sessionCode={sessionCode} />}
          {view === 'history'   && <HistoryList setView={setView} setSessionCode={setSessionCode} />}
        </ErrorBoundary>
      </main>
    </div>
  );
}

// ─── 評分人入口頁 ────────────────────────────────────────────
function VoterEntry({ setView, setSessionCode }) {
  const [code, setCode] = useState('');
  const handleJoin = (e) => {
    e.preventDefault();
    if (code.trim()) { setSessionCode(code.trim().toUpperCase()); setView('voting'); }
  };
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-slate-200 p-10 text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <BarChart3 className="text-indigo-600" size={32} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">課程即時評分系統</h1>
        <p className="text-slate-500 text-sm mb-8">請輸入主辦單位提供的活動代碼加入評分</p>
        <form onSubmit={handleJoin} className="space-y-4">
          <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="輸入活動代碼"
            className="w-full p-4 text-center text-2xl font-black tracking-widest border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none uppercase"
            maxLength={8} />
          <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-md transition-all active:scale-[0.98]">
            加入活動
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── 主辦單位設定頁 ──────────────────────────────────────────
function AdminSetup({ user, setView, setSessionCode }) {
  const [title, setTitle] = useState("期末專案發表評分");
  const [mode, setMode] = useState('group');
  const [participantCount, setParticipantCount] = useState(5);
  const [customNames, setCustomNames] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Round 模式：'free' = 自由評分, 'round' = 依序 Round 制
  const [votingMode, setVotingMode] = useState('free');
  // Round 順序（target id 陣列）
  const [roundOrder, setRoundOrder] = useState([]);
  const [criteria, setCriteria] = useState([
    { id: 'c1', name: '內容與創意', maxScore: 10, weight: 50 },
    { id: 'c2', name: '表達與台風', maxScore: 10, weight: 30 },
    { id: 'c3', name: '投影片設計', maxScore: 5, weight: 20 },
  ]);

  // 產生預設名稱列表
  const getTargets = () => Array.from({ length: participantCount }, (_, i) => ({
    id: `t${i + 1}`,
    name: customNames[i + 1] || (mode === 'group' ? `第 ${i + 1} 組` : `第 ${i + 1} 位`),
    order: i + 1
  }));

  useEffect(() => {
    const newNames = {};
    for (let i = 1; i <= participantCount; i++) {
      newNames[i] = customNames[i] || (mode === 'group' ? `第 ${i} 組` : `第 ${i} 位`);
    }
    setCustomNames(newNames);
    // 重設 round 順序
    setRoundOrder(Array.from({ length: participantCount }, (_, i) => `t${i + 1}`));
  }, [participantCount, mode]);

  const moveRound = (index, dir) => {
    if ((dir === -1 && index === 0) || (dir === 1 && index === roundOrder.length - 1)) return;
    const arr = [...roundOrder];
    const tmp = arr[index]; arr[index] = arr[index + dir]; arr[index + dir] = tmp;
    setRoundOrder(arr);
  };

  const addCriterion = () => setCriteria([...criteria, { id: `c${Date.now()}`, name: `新指標 ${criteria.length + 1}`, maxScore: 10, weight: 0 }]);
  const updateCriterion = (id, field, value) => setCriteria(criteria.map(c => c.id === id ? { ...c, [field]: value } : c));
  const removeCriterion = (id) => { if (criteria.length <= 1) return; setCriteria(criteria.filter(c => c.id !== id)); };
  const moveCriterion = (index, dir) => {
    if ((dir === -1 && index === 0) || (dir === 1 && index === criteria.length - 1)) return;
    const nc = [...criteria]; const tmp = nc[index]; nc[index] = nc[index + dir]; nc[index + dir] = tmp; setCriteria(nc);
  };

  const createSession = async () => {
    setIsSubmitting(true);
    const totalWeight = criteria.reduce((sum, c) => sum + Number(c.weight), 0);
    const nc = criteria.map(c => ({ ...c, weight: totalWeight > 0 ? Math.round((Number(c.weight) / totalWeight) * 100) : 0 }));
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const targets = getTargets();

    const sessionData = {
      title, hostId: user.uid, mode,
      createdAt: new Date().toISOString(),
      criteria: nc, targets, status: 'active',
      votingMode, // 'free' or 'round'
      // Round 制相關：currentRoundIndex = 目前開放的 round（0-based），roundOrder = 順序
      ...(votingMode === 'round' ? {
        roundOrder,          // target id 陣列，依序
        currentRoundIndex: 0, // 從第 0 個開始
        unlockedForSupp: [], // 補評特別開放的 target id
      } : {})
    };

    try {
      await setDoc(doc(db, 'sessions', code), sessionData);
      setSessionCode(code); setView('dashboard');
    } catch { alert("建立活動時發生錯誤，請確認 Firebase 規則。"); }
    finally { setIsSubmitting(false); }
  };

  const totalWeight = criteria.reduce((sum, c) => sum + Number(c.weight), 0);
  const targets = getTargets();

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* 基本設定 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Settings className="text-indigo-500" />1. 基本設定</h2>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">活動名稱</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">評分對象模式</label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setMode('group')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'group' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>小組模式</button>
                <button onClick={() => setMode('individual')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'individual' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>個人模式</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{mode === 'group' ? '總組數' : '總人數'}</label>
              <input type="number" min="2" max="50" value={participantCount}
                onChange={(e) => setParticipantCount(Math.max(2, parseInt(e.target.value) || 2))}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
          <div className="pt-2">
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center justify-between">
              <span>自訂名稱 (選填)</span><span className="text-xs text-slate-400">若留白則使用預設名稱</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
              {Array.from({ length: participantCount }, (_, i) => i + 1).map(num => (
                <input key={num} type="text" value={customNames[num] || ''}
                  onChange={(e) => setCustomNames({ ...customNames, [num]: e.target.value })}
                  placeholder={mode === 'group' ? `第 ${num} 組` : `第 ${num} 位`}
                  className="w-full p-2 text-sm border border-slate-200 rounded-md focus:border-indigo-400 outline-none" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 評分流程模式 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><SkipForward className="text-indigo-500" />2. 評分流程設定</h2>
        <div className="flex bg-slate-100 p-1 rounded-lg mb-5">
          <button onClick={() => setVotingMode('free')} className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-colors ${votingMode === 'free' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>
            自由評分（無限制順序）
          </button>
          <button onClick={() => setVotingMode('round')} className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-colors ${votingMode === 'round' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>
            Round 制（依序開放）
          </button>
        </div>

        {votingMode === 'round' && (
          <div>
            <p className="text-sm text-slate-500 mb-4">拖曳調整每一 Round 的評分順序，主辦方可在儀表板手動推進。</p>
            <div className="space-y-2">
              {roundOrder.map((tid, index) => {
                const t = targets.find(t => t.id === tid);
                return (
                  <div key={tid} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <span className="w-6 text-center text-sm font-black text-indigo-400">R{index + 1}</span>
                    <ChevronRight size={14} className="text-slate-300" />
                    <span className="flex-1 font-medium text-slate-700">{t?.name}</span>
                    <div className="flex gap-1">
                      <button onClick={() => moveRound(index, -1)} disabled={index === 0} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20"><ArrowUp size={15} /></button>
                      <button onClick={() => moveRound(index, 1)} disabled={index === roundOrder.length - 1} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20"><ArrowDown size={15} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {votingMode === 'free' && (
          <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-500 border border-slate-100">
            評分人可自由選擇要評的組別，不受順序限制。
          </div>
        )}
      </div>

      {/* 評分指標 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><BarChart3 className="text-indigo-500" />3. 評分指標設定</h2>
          <span className={`text-sm font-medium px-2 py-1 rounded-md ${totalWeight === 100 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            總權重: {totalWeight}% {totalWeight !== 100 && '(系統將自動換算)'}
          </span>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <div className="col-span-1 text-center">排序</div><div className="col-span-5">指標名稱</div>
            <div className="col-span-2 text-center">最高分</div><div className="col-span-3 text-center">權重(%)</div>
            <div className="col-span-1 text-center">刪除</div>
          </div>
          {criteria.map((c, index) => (
            <div key={c.id} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100 hover:border-indigo-200 transition-colors">
              <div className="col-span-1 flex flex-col items-center">
                <button onClick={() => moveCriterion(index, -1)} disabled={index === 0} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ArrowUp size={16} /></button>
                <button onClick={() => moveCriterion(index, 1)} disabled={index === criteria.length - 1} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ArrowDown size={16} /></button>
              </div>
              <div className="col-span-5"><input type="text" value={c.name} onChange={(e) => updateCriterion(c.id, 'name', e.target.value)} className="w-full p-2 text-sm border-0 bg-white rounded shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
              <div className="col-span-2">
                <select value={c.maxScore} onChange={(e) => updateCriterion(c.id, 'maxScore', Number(e.target.value))} className="w-full p-2 text-sm border-0 bg-white rounded shadow-sm outline-none cursor-pointer">
                  <option value={5}>5 分制</option><option value={7}>7 分制</option><option value={10}>10 分制</option><option value={100}>100 分制</option>
                </select>
              </div>
              <div className="col-span-3 px-2"><input type="number" min="0" max="100" value={c.weight} onChange={(e) => updateCriterion(c.id, 'weight', Number(e.target.value))} className="w-full p-2 text-sm border-0 bg-white rounded shadow-sm outline-none text-center" /></div>
              <div className="col-span-1 flex justify-center"><button onClick={() => removeCriterion(c.id)} disabled={criteria.length <= 1} className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-50"><Trash2 size={18} /></button></div>
            </div>
          ))}
          <button onClick={addCriterion} className="w-full py-3 mt-4 border-2 border-dashed border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
            <Plus size={18} /> 新增評分指標
          </button>
        </div>
      </div>

      <button onClick={createSession} disabled={isSubmitting}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2">
        {isSubmitting ? '建立中...' : <><Play size={20} fill="currentColor" /> 建立活動並開始</>}
      </button>
    </div>
  );
}

// ─── 主辦單位儀表板 ──────────────────────────────────────────
function AdminDashboard({ user, sessionCode, setView }) {
  const [session, setSession] = useState(null);
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expandedTarget, setExpandedTarget] = useState(null);
  const [showProgressDetail, setShowProgressDetail] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    const unsubSession = onSnapshot(doc(db, 'sessions', sessionCode), (snap) => {
      if (snap.exists()) setSession(snap.data());
      setLoading(false);
    });
    const unsubVotes = onSnapshot(collection(db, 'votes'), (snap) => {
      const data = [];
      snap.forEach(d => { if (d.data().sessionId === sessionCode) data.push({ id: d.id, ...d.data() }); });
      setVotes(data);
    });
    return () => { unsubSession(); unsubVotes(); };
  }, [sessionCode]);

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!session) return <div className="text-center p-12 text-slate-500">找不到此活動。</div>;

  // 計算排行榜
  const results = session.targets.map(target => {
    const rv = votes.filter(v => v.targetId === target.id);
    let totalW = 0;
    const cs = {};
    session.criteria.forEach(c => cs[c.id] = { sum: 0, count: 0, avg: 0 });
    const feedbackList = [];
    rv.forEach(vote => {
      let vt = 0;
      session.criteria.forEach(c => {
        const s = vote.scores[c.id];
        if (s !== undefined) { cs[c.id].sum += s; cs[c.id].count += 1; vt += (s / c.maxScore) * 100 * (c.weight / 100); }
      });
      totalW += vt;
      if (vote.feedback?.trim()) feedbackList.push(vote.feedback);
    });
    const voteCount = rv.length;
    const finalScore = voteCount > 0 ? totalW / voteCount : 0;
    session.criteria.forEach(c => { if (cs[c.id].count > 0) cs[c.id].avg = cs[c.id].sum / cs[c.id].count; });
    return { ...target, voteCount, finalScore: Number(finalScore.toFixed(2)), criteriaScores: cs, feedbackList };
  });
  results.sort((a, b) => b.finalScore - a.finalScore);

  // 評分進度
  const totalTargets = session.targets.length;
  const required = session.mode === 'group' ? totalTargets - 1 : totalTargets;
  const voterProgress = session.targets.map(target => {
    const count = votes.filter(v => v.voterId === target.id).length;
    const status = count === 0 ? 'none' : count >= required ? 'done' : 'partial';
    return { ...target, votedCount: count, required, status };
  });
  const doneCount = voterProgress.filter(v => v.status === 'done').length;
  const partialCount = voterProgress.filter(v => v.status === 'partial').length;

  // Round 制資訊
  const isRoundMode = session.votingMode === 'round';
  const currentRoundIndex = session.currentRoundIndex ?? 0;
  const roundOrder = session.roundOrder ?? [];
  const currentTargetId = roundOrder[currentRoundIndex];
  const roundActiveTarget = session.targets.find(t => t.id === currentTargetId);
  const isLastRound = currentRoundIndex >= roundOrder.length - 1;
  const unlockedForSupp = session.unlockedForSupp ?? [];

  // 當前 round 所有人的進度（針對 currentTargetId）
  const roundProgress = isRoundMode ? session.targets.map(t => {
    const hasVoted = votes.some(v => v.voterId === t.id && v.targetId === currentTargetId);
    return { ...t, hasVoted };
  }) : [];
  const roundDoneCount = roundProgress.filter(v => v.hasVoted || v.id === currentTargetId).length;
  // 扣掉自己（小組模式下自己不評自己）
  const roundTotal = session.mode === 'group' ? session.targets.length - 1 : session.targets.length;
  const roundCompletedCount = session.mode === 'group'
    ? roundProgress.filter(v => v.id !== currentTargetId && v.hasVoted).length
    : roundProgress.filter(v => v.hasVoted).length;

  // 推進到下一 round
  const advanceRound = async () => {
    if (isLastRound) return;
    setAdvancing(true);
    try {
      await updateDoc(doc(db, 'sessions', sessionCode), { currentRoundIndex: currentRoundIndex + 1 });
    } catch { alert('操作失敗，請再試一次'); }
    finally { setAdvancing(false); }
  };

  // 補評開放 / 關閉
  const toggleSupp = async (targetId) => {
    const current = unlockedForSupp.includes(targetId)
      ? unlockedForSupp.filter(id => id !== targetId)
      : [...unlockedForSupp, targetId];
    try {
      await updateDoc(doc(db, 'sessions', sessionCode), { unlockedForSupp: current });
    } catch { alert('操作失敗，請再試一次'); }
  };

  const baseUrl = window.location.href.split('?')[0];
  const votingUrl = `${baseUrl}?session=${sessionCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(votingUrl)}`;

  const copyLink = () => {
    const fallback = (text) => {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed';
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { alert('請手動複製：' + text); }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(votingUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => fallback(votingUrl));
    } else fallback(votingUrl);
  };

  const downloadCSV = () => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const BOM = '\uFEFF';
    const headers = ['名次', '名稱', '總分(100分制)', '收到票數', ...session.criteria.map(c => `${c.name}(平均/${c.maxScore}分)`), '文字回饋'];
    const rows = results.map((r, i) => [i + 1, r.name, r.finalScore, r.voteCount, ...session.criteria.map(c => r.criteriaScores[c.id].avg.toFixed(1)), r.feedbackList.join(' | ')]);
    const csv = BOM + [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `${session.title}_評分結果_${sessionCode}_${dateStr}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* 頂部資訊 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900">{session.title}</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-600 font-medium">即時結果儀表板</span>
            <span className="text-slate-400 text-sm ml-2">| 共收到 {votes.length} 筆評分</span>
            {isRoundMode && <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full ml-1">Round 制</span>}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="px-4 py-3 bg-indigo-50 rounded-xl border border-indigo-100">
              <div className="text-xs text-indigo-800 font-bold mb-1 uppercase tracking-wider">活動代碼</div>
              <div className="text-3xl font-black text-indigo-600 tracking-widest">{sessionCode}</div>
            </div>
            <button onClick={() => setView('voting')} className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium rounded-xl transition-colors">
              <User size={18} className="text-slate-400" />
              <div className="text-left leading-tight text-sm"><div>模擬投票</div><div className="text-xs text-slate-400">測試用</div></div>
            </button>
            <button onClick={downloadCSV} className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors">
              <ExternalLink size={18} />
              <div className="text-left leading-tight text-sm"><div>下載結果</div><div className="text-xs text-emerald-200">CSV / Excel</div></div>
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 bg-slate-50 p-5 rounded-2xl border border-slate-200 w-full md:w-56 shrink-0">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
            <img src={qrUrl} alt="QR Code" className="w-28 h-28" />
          </div>
          <div className="flex gap-2 w-full">
            <button onClick={copyLink} className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 bg-white border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors text-slate-700">
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-slate-400" />}
              {copied ? '已複製' : '複製連結'}
            </button>
            <a href={qrUrl} download={`QRCode_${sessionCode}.png`} target="_blank" rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">
              <QrCode size={14} /> 下載 QR
            </a>
          </div>
        </div>
      </div>

      {/* Round 控制區（只有 Round 制才顯示） */}
      {isRoundMode && (
        <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
          <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">目前 Round</div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-indigo-700">R{currentRoundIndex + 1}</span>
                <ChevronRight size={18} className="text-indigo-300" />
                <span className="text-xl font-bold text-indigo-900">{roundActiveTarget?.name ?? '—'}</span>
                <span className="text-sm text-indigo-500 ml-2">{roundCompletedCount} / {roundTotal} 人已評</span>
              </div>
            </div>
            <button
              onClick={advanceRound}
              disabled={advancing || isLastRound}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm">
              <SkipForward size={16} />
              {isLastRound ? '已是最後一 Round' : `開放下一 Round（R${currentRoundIndex + 2}）`}
            </button>
          </div>

          {/* 當前 round 各組進度 */}
          <div className="px-6 py-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">本 Round 評分進度</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {session.targets.map(t => {
                if (session.mode === 'group' && t.id === currentTargetId) return null; // 小組模式排除被評者
                const rp = roundProgress.find(r => r.id === t.id);
                return (
                  <div key={t.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${rp?.hasVoted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    {rp?.hasVoted ? <Check size={14} className="text-emerald-500 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0" />}
                    {t.name}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 補評區 */}
          <div className="px-6 pb-4 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-4 mb-3 flex items-center gap-2">
              <Unlock size={13} /> 補評管理（特別開放已結束的 Round）
            </div>
            <div className="flex flex-wrap gap-2">
              {roundOrder.slice(0, currentRoundIndex).map((tid, idx) => {
                const t = session.targets.find(t => t.id === tid);
                const isOpen = unlockedForSupp.includes(tid);
                return (
                  <button key={tid} onClick={() => toggleSupp(tid)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${isOpen ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-amber-300'}`}>
                    {isOpen ? <Unlock size={12} /> : <Lock size={12} />}
                    R{idx + 1} {t?.name} {isOpen ? '（補評開放中）' : ''}
                  </button>
                );
              })}
              {currentRoundIndex === 0 && <span className="text-xs text-slate-400 italic">尚無已結束的 Round</span>}
            </div>
          </div>
        </div>
      )}

      {/* 評分進度 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <button onClick={() => setShowProgressDetail(!showProgressDetail)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-lg text-slate-800">整體評分進度</h3>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-black ${doneCount === totalTargets ? 'text-emerald-600' : 'text-amber-500'}`}>{doneCount}</span>
              <span className="text-slate-400 font-bold">/</span>
              <span className="text-2xl font-black text-slate-400">{totalTargets}</span>
              <span className="text-sm text-slate-500 ml-1">全部完成</span>
              {partialCount > 0 && <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{partialCount} 進行中</span>}
              {doneCount === totalTargets && <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">全員完成</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${totalTargets > 0 ? (doneCount / totalTargets) * 100 : 0}%` }} />
            </div>
            {showProgressDetail ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
          </div>
        </button>

        {showProgressDetail && (
          <div className="px-6 pb-6 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              {[
                { key: 'done', label: '已完成', color: 'emerald' },
                { key: 'partial', label: '進行中', color: 'blue' },
                { key: 'none', label: '尚未開始', color: 'amber' },
              ].map(({ key, label, color }) => {
                const items = voterProgress.filter(v => v.status === key);
                return (
                  <div key={key}>
                    <div className={`text-xs font-bold text-${color}-600 uppercase tracking-wider mb-2`}>{label}（{items.length}）</div>
                    <div className="space-y-2">
                      {items.length === 0 && <div className="text-sm text-slate-400 italic">{key === 'none' ? '全員已開始' : '尚無'}</div>}
                      {items.map(v => (
                        <div key={v.id} className={`flex items-center gap-2 bg-${color}-50 border border-${color}-100 rounded-lg px-3 py-2`}>
                          <span className={`text-sm font-medium text-${color}-800 flex-1`}>{v.name}</span>
                          <span className={`text-xs text-${color}-500`}>{v.votedCount}/{v.required}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 排行榜 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800">總分排行榜</h3>
          <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">滿分 100（依權重計算）</span>
        </div>
        <div className="divide-y divide-slate-100">
          {results.map((r, index) => (
            <div key={r.id} className="transition-colors hover:bg-slate-50/50">
              <div className="p-4 sm:p-6 flex items-center cursor-pointer select-none" onClick={() => setExpandedTarget(expandedTarget === r.id ? null : r.id)}>
                <div className="w-10 sm:w-16 text-center font-black text-2xl text-slate-300 shrink-0">{index + 1}</div>
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="text-lg font-bold text-slate-900 truncate">{r.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-slate-500">獲得 {r.voteCount} 票</span>
                    {r.feedbackList.length > 0 && (
                      <span className="flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        <MessageSquare size={12} /> {r.feedbackList.length} 則回饋
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-black text-indigo-600 tracking-tight">{r.finalScore}</div>
                  <div className="text-slate-400">{expandedTarget === r.id ? <ChevronUp /> : <ChevronDown />}</div>
                </div>
              </div>
              {expandedTarget === r.id && (
                <div className="px-6 pb-6 pt-2 ml-10 sm:ml-16 border-t border-dashed border-slate-200 animate-in slide-in-from-top-2 duration-200">
                  <h5 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">指標得分詳情</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                    {session.criteria.map(c => (
                      <div key={c.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-center">
                        <div><div className="text-sm font-medium text-slate-800">{c.name}</div><div className="text-xs text-slate-500">權重 {c.weight}% | 滿分 {c.maxScore}</div></div>
                        <div className="text-lg font-bold text-slate-700">{r.criteriaScores[c.id].avg.toFixed(1)} <span className="text-xs font-normal text-slate-400">分</span></div>
                      </div>
                    ))}
                  </div>
                  {r.feedbackList.length > 0 && (
                    <><h5 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">匿名文字回饋</h5>
                      <div className="space-y-2">
                        {r.feedbackList.map((fb, idx) => (
                          <div key={idx} className="bg-indigo-50/50 p-3 rounded-lg text-sm text-slate-700 border border-indigo-100/50 relative">
                            <div className="absolute top-3 left-3 text-indigo-200"><MessageSquare size={16} fill="currentColor" /></div>
                            <div className="pl-6">{fb}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {r.voteCount === 0 && <div className="text-sm text-slate-400 italic py-2">尚無評分資料</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 歷史活動列表 ────────────────────────────────────────────
function HistoryList({ setView, setSessionCode }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const snap = await getDocs(collection(db, 'sessions'));
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setSessions(list);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleDelete = async (code, title) => {
    if (!window.confirm(`確定要刪除「${title}」（${code}）的所有資料嗎？此操作無法復原。`)) return;
    setDeleting(code);
    try {
      const snap = await getDocs(collection(db, 'votes'));
      const del = [];
      snap.forEach(d => { if (d.data().sessionId === code) del.push(deleteDoc(doc(db, 'votes', d.id))); });
      await Promise.all(del);
      await deleteDoc(doc(db, 'sessions', code));
      setSessions(prev => prev.filter(s => s.id !== code));
    } catch { alert('刪除失敗，請再試一次'); }
    finally { setDeleting(null); }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><History className="text-indigo-500" /> 歷史活動</h2>
        <span className="text-sm text-slate-500">共 {sessions.length} 筆</span>
      </div>
      {sessions.length === 0 && <div className="text-center py-16 text-slate-400">尚無歷史活動記錄</div>}
      {sessions.map(s => (
        <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4 hover:border-indigo-200 transition-colors">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-900 truncate">{s.title}</div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
              <span className="font-mono font-bold text-indigo-500">{s.id}</span>
              <span>{s.mode === 'group' ? '小組模式' : '個人模式'}</span>
              <span>{s.votingMode === 'round' ? 'Round 制' : '自由評分'}</span>
              <span>{s.targets?.length} 組／人</span>
              <span>{new Date(s.createdAt).toLocaleDateString('zh-TW')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => { setSessionCode(s.id); setView('dashboard'); }}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-bold rounded-lg transition-colors">
              查看結果
            </button>
            <button onClick={() => handleDelete(s.id, s.title)} disabled={deleting === s.id}
              className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-500 text-sm font-bold rounded-lg transition-colors disabled:opacity-50">
              {deleting === s.id ? '...' : <Trash2 size={16} />}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 評分人介面 ──────────────────────────────────────────────
function VoterInterface({ user, sessionCode }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voterIdentity, setVoterIdentity] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [scores, setScores] = useState({});
  const [feedback, setFeedback] = useState('');
  const [votedTargetIds, setVotedTargetIds] = useState([]);
  const [myVoteRecords, setMyVoteRecords] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 即時監聽 session（Round 狀態變更要即時反映）
  useEffect(() => {
    if (!sessionCode) return;
    const unsub = onSnapshot(doc(db, 'sessions', sessionCode), (snap) => {
      if (snap.exists()) {
        setSession(snap.data());
        setLoading(false);
      } else {
        setError("找不到此評分活動，請確認代碼或連結是否正確。");
        setLoading(false);
      }
    }, () => { setError("讀取活動資料時發生錯誤，請稍後再試。"); setLoading(false); });

    const saved = localStorage.getItem(`voted_${sessionCode}`);
    if (saved) setVotedTargetIds(JSON.parse(saved));
    const savedRec = localStorage.getItem(`records_${sessionCode}`);
    if (savedRec) setMyVoteRecords(JSON.parse(savedRec));

    return () => unsub();
  }, [sessionCode]);

  if (loading) return <div className="min-h-[60vh] flex flex-col items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div><p className="text-slate-500">載入活動中...</p></div>;
  if (error) return (
    <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center">
      <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-slate-800 mb-2">無法加入活動</h3>
      <p className="text-slate-600 mb-6">{error}</p>
      <button onClick={() => window.location.href = window.location.pathname} className="bg-slate-100 text-slate-700 px-6 py-2 rounded-lg font-medium">回首頁</button>
    </div>
  );

  const isRoundMode = session.votingMode === 'round';
  const currentRoundIndex = session.currentRoundIndex ?? 0;
  const roundOrder = session.roundOrder ?? [];
  const currentTargetId = isRoundMode ? roundOrder[currentRoundIndex] : null;
  const unlockedForSupp = session.unlockedForSupp ?? [];

  // 可評分的對象
  const availableTargets = session.targets.filter(t => {
    if (t.id === voterIdentity) return false; // 不能評自己（小組模式）
    if (votedTargetIds.includes(t.id)) return false; // 已評過
    if (isRoundMode) {
      // Round 制：只開放當前 round 或補評開放的
      return t.id === currentTargetId || unlockedForSupp.includes(t.id);
    }
    return true;
  });

  // 已評過但補評開放的（可再評？不行，已評就不能重複）
  // 已評的全部顯示打勾

  const handleStart = (e) => {
    e.preventDefault();
    if (!voterIdentity && session.mode === 'group') { alert("請選擇您的組別"); return; }
    if (session.mode === 'individual' && !voterIdentity) setVoterIdentity('indv_' + Math.random().toString(36).substring(2, 9));
    setHasStarted(true);
  };

  const handleSelectTarget = (id) => { setSelectedTargetId(id); setScores({}); setFeedback(''); };
  const handleScoreChange = (cid, val) => setScores(prev => ({ ...prev, [cid]: Number(val) }));

  const submitVote = async () => {
    if (!selectedTargetId) { alert("請先選擇要評分的對象"); return; }
    if (session.criteria.some(c => scores[c.id] === undefined)) { alert("請完成所有指標的評分"); return; }
    setIsSubmitting(true);
    const target = session.targets.find(t => t.id === selectedTargetId);
    try {
      const voteId = `${sessionCode}_${voterIdentity || 'anon'}_${target.id}_${Date.now()}`;
      await setDoc(doc(db, 'votes', voteId), {
        sessionId: sessionCode, voterId: voterIdentity || 'anonymous',
        targetId: target.id, scores, feedback: feedback.trim(), timestamp: new Date().toISOString()
      });
      const newVoted = [...votedTargetIds, target.id];
      setVotedTargetIds(newVoted);
      localStorage.setItem(`voted_${sessionCode}`, JSON.stringify(newVoted));
      const record = { targetId: target.id, targetName: target.name, scores: { ...scores }, feedback: feedback.trim(), timestamp: new Date().toISOString() };
      const newRec = [...myVoteRecords, record];
      setMyVoteRecords(newRec);
      localStorage.setItem(`records_${sessionCode}`, JSON.stringify(newRec));
      setSelectedTargetId(null); setScores({}); setFeedback('');
    } catch { alert("送出評分時發生錯誤，請檢查網路連線。"); }
    finally { setIsSubmitting(false); }
  };

  const downloadPDF = () => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const voterName = session.targets.find(t => t.id === voterIdentity)?.name || '匿名';
    const pdfTitle = `${session.title}_我的評分記錄_${voterName}_${dateStr}`;
    const recordsHTML = session.targets.filter(t => t.id !== voterIdentity).map(t => {
      const rec = myVoteRecords.find(r => r.targetId === t.id);
      if (!rec) return `<div class="card"><div class="tname">${t.name}</div><div class="none">未評分</div></div>`;
      const rows = session.criteria.map(c => `<div class="row"><span>${c.name}（滿分 ${c.maxScore}）</span><span class="score">${rec.scores[c.id] ?? '-'} 分</span></div>`).join('');
      const fb = rec.feedback ? `<div class="fb"><div class="fbl">回饋內容</div>${rec.feedback}</div>` : '';
      return `<div class="card"><div class="tname">${t.name}</div>${rows}${fb}</div>`;
    }).join('');
    const html = `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8"><title>${pdfTitle}</title>
    <style>body{font-family:sans-serif;padding:32px;color:#1e293b;max-width:680px;margin:0 auto}
    h1{font-size:20px;font-weight:700;margin-bottom:4px}.meta{color:#64748b;font-size:12px;margin-bottom:24px;padding-bottom:12px;border-bottom:1px solid #e2e8f0}
    .card{border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:14px}.tname{font-size:16px;font-weight:700;color:#4f46e5;margin-bottom:10px}
    .row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed #f1f5f9;font-size:13px}.row:last-of-type{border-bottom:none}
    .score{font-weight:700}.fb{background:#f8fafc;border-radius:6px;padding:8px 10px;margin-top:10px;font-size:12px;color:#475569}
    .fbl{font-weight:600;margin-bottom:3px;font-size:11px;text-transform:uppercase;color:#94a3b8}.none{color:#94a3b8;font-size:12px;font-style:italic}
    .footer{margin-top:24px;color:#94a3b8;font-size:11px;text-align:center}@media print{body{padding:16px}}</style>
    </head><body><h1>${session.title} — 我的評分記錄</h1>
    <div class="meta">評分人：${voterName}　｜　活動代碼：${sessionCode}　｜　列印時間：${new Date().toLocaleString('zh-TW')}</div>
    ${recordsHTML}<div class="footer">此記錄由課程即時評分系統自動產生</div></body></html>`;
    const win = window.open('', '_blank');
    win.document.write(html); win.document.close(); win.focus();
    setTimeout(() => win.print(), 500);
  };

  // 身分確認
  if (!hasStarted) {
    return (
      <div className="max-w-md mx-auto mt-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-in zoom-in-95 duration-300">
        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 mx-auto"><Users className="text-indigo-600" size={24} /></div>
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">{session.title}</h2>
        <p className="text-center text-slate-500 mb-8">準備開始進行評分，請先確認您的身分。</p>
        <form onSubmit={handleStart} className="space-y-6">
          {session.mode === 'group' ? (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3 text-center">請問您是哪一組？</label>
              <div className="grid grid-cols-2 gap-3">
                {session.targets.map(t => (
                  <button key={t.id} type="button" onClick={() => setVoterIdentity(t.id)}
                    className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${voterIdentity === t.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-indigo-200'}`}>
                    {t.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3 text-center">系統會自動隱藏您的組別，讓您對其他組別進行評分。</p>
            </div>
          ) : (
            <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
              <p className="text-slate-600 font-medium">本次為個人匿名評分模式</p>
              <p className="text-sm text-slate-400 mt-1">您可以直接點擊下方按鈕開始</p>
            </div>
          )}
          <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-md transition-all active:scale-[0.98]">進入評分</button>
        </form>
      </div>
    );
  }

  // 全部評完（Round 制：目前 round 評完，等待主辦推進）
  if (isRoundMode && availableTargets.length === 0) {
    const allDone = votedTargetIds.filter(id => id !== voterIdentity).length >= (session.mode === 'group' ? session.targets.length - 1 : session.targets.length);
    if (allDone) {
      return (
        <div className="max-w-md mx-auto mt-12 bg-white p-10 rounded-3xl shadow-sm border border-emerald-100 text-center animate-in zoom-in duration-500">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle className="text-emerald-500 w-10 h-10" /></div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">全部評分完成！</h2>
          <p className="text-slate-500 mb-6">感謝您的參與。</p>
          <button onClick={downloadPDF} className="w-full py-3 mb-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2">
            <ExternalLink size={18} /> 下載我的評分記錄（PDF）
          </button>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100"><p className="text-sm text-slate-600">您可以關閉此視窗，或觀看現場大螢幕的即時結果。</p></div>
        </div>
      );
    }
    // 這一 round 已評完，等待主辦推進
    return (
      <div className="max-w-md mx-auto mt-12 bg-white p-10 rounded-3xl shadow-sm border border-indigo-100 text-center animate-in zoom-in duration-500">
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <SkipForward className="text-indigo-500 w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">本 Round 評分完成！</h2>
        <p className="text-slate-500 mb-4">請等待主辦方開放下一 Round。</p>
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <p className="text-sm text-indigo-700 font-medium">頁面會自動更新，開放後即可繼續評分。</p>
        </div>
      </div>
    );
  }

  // 自由模式全部評完
  if (!isRoundMode && availableTargets.length === 0) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white p-10 rounded-3xl shadow-sm border border-emerald-100 text-center animate-in zoom-in duration-500">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle className="text-emerald-500 w-10 h-10" /></div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">評分完成！</h2>
        <p className="text-slate-500 mb-6">您已完成所有可評估對象的評分，感謝您的參與。</p>
        <button onClick={downloadPDF} className="w-full py-3 mb-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2">
          <ExternalLink size={18} /> 下載我的評分記錄（PDF）
        </button>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100"><p className="text-sm text-slate-600 font-medium">您可以關閉此視窗，或觀看現場大螢幕的即時結果。</p></div>
      </div>
    );
  }

  const totalVotable = session.mode === 'group' ? session.targets.length - 1 : session.targets.length;
  const votedCount = votedTargetIds.filter(id => id !== voterIdentity).length;
  const progress = totalVotable > 0 ? (votedCount / totalVotable) * 100 : 0;
  const selectedTarget = selectedTargetId ? session.targets.find(t => t.id === selectedTargetId) : null;
  const isComplete = selectedTarget && session.criteria.every(c => scores[c.id] !== undefined);

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-300 space-y-6">
      <div>
        <div className="flex justify-between text-sm font-bold text-slate-500 mb-2">
          <span>整體評分進度</span><span className="text-indigo-600">{votedCount} / {totalVotable} 完成</span>
        </div>
        <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* Round 提示 */}
      {isRoundMode && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-3 flex items-center gap-3">
          <SkipForward size={18} className="text-indigo-400 shrink-0" />
          <div>
            <span className="text-sm font-bold text-indigo-700">Round {currentRoundIndex + 1}　</span>
            <span className="text-sm text-indigo-600">目前開放評分：{roundActiveTarget?.name}</span>
            {unlockedForSupp.length > 0 && <span className="text-xs text-amber-600 ml-2">（另有補評開放）</span>}
          </div>
        </div>
      )}

      {/* 選擇對象 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-base font-bold text-slate-700 mb-4">{session.mode === 'group' ? '請選擇要評分的組別' : '請選擇要評分的人員'}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* 可評（當前開放）*/}
          {availableTargets.map(t => (
            <button key={t.id} onClick={() => handleSelectTarget(t.id)}
              className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${selectedTargetId === t.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700 scale-105' : 'border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
              {t.name}
              {isRoundMode && unlockedForSupp.includes(t.id) && <span className="block text-xs font-normal text-amber-500 mt-0.5">補評</span>}
            </button>
          ))}
          {/* 已評（打勾）*/}
          {votedTargetIds.filter(id => id !== voterIdentity).map(id => {
            const t = session.targets.find(t => t.id === id); if (!t) return null;
            return <div key={id} className="p-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-sm font-bold text-slate-300 flex items-center justify-center gap-1"><Check size={14} /> {t.name}</div>;
          })}
          {/* Round 制：鎖定的組別 */}
          {isRoundMode && session.targets.filter(t => {
            if (t.id === voterIdentity) return false;
            if (votedTargetIds.includes(t.id)) return false;
            if (t.id === currentTargetId) return false;
            if (unlockedForSupp.includes(t.id)) return false;
            return true;
          }).map(t => (
            <div key={t.id} className="p-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-sm font-bold text-slate-300 flex items-center justify-center gap-1.5">
              <Lock size={13} className="text-slate-300" /> {t.name}
            </div>
          ))}
        </div>
      </div>

      {/* 評分表單 */}
      {selectedTarget && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-indigo-600 p-6 text-center text-white">
            <p className="text-indigo-200 font-medium text-sm mb-1 uppercase tracking-widest">目前評分對象</p>
            <h2 className="text-3xl font-black">{selectedTarget.name}</h2>
          </div>
          <div className="p-6 sm:p-8 space-y-8">
            <div className="space-y-6">
              {session.criteria.map((c, idx) => (
                <div key={c.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 relative">
                  <div className="absolute -left-3 -top-3 w-8 h-8 bg-indigo-100 text-indigo-700 font-bold rounded-full flex items-center justify-center border-4 border-white shadow-sm">{idx + 1}</div>
                  <div className="flex justify-between items-end mb-4 ml-2">
                    <label className="block text-lg font-bold text-slate-800">{c.name}</label>
                    <span className="text-sm font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">滿分 {c.maxScore}</span>
                  </div>
                  {c.maxScore <= 10 ? (
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: c.maxScore }, (_, i) => i + 1).map(val => (
                        <button key={val} onClick={() => handleScoreChange(c.id, val)}
                          className={`flex-1 min-w-[40px] py-3 rounded-xl font-bold text-lg transition-all ${scores[c.id] === val ? 'bg-indigo-600 text-white shadow-md scale-105' : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
                          {val}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <input type="range" min="0" max={c.maxScore} value={scores[c.id] || 0} onChange={(e) => handleScoreChange(c.id, e.target.value)} className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      <input type="number" min="0" max={c.maxScore} value={scores[c.id] || ''} onChange={(e) => handleScoreChange(c.id, e.target.value)} placeholder="輸入" className="w-24 p-3 text-center font-bold text-lg border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-dashed border-slate-200">
              <label className="block text-base font-bold text-slate-800 mb-2 flex items-center gap-2"><MessageSquare size={18} className="text-slate-400" /> 給他們的回饋（選填）</label>
              <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)}
                className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-slate-50 focus:bg-white transition-colors"
                rows="3" placeholder="寫下您的鼓勵或具體建議，將會匿名顯示給主辦單位..."></textarea>
            </div>
            <button onClick={submitVote} disabled={!isComplete || isSubmitting}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting ? '送出中...' : '送出評分'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
