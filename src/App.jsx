import React, { useState, useEffect } from 'react';
import { 
  Settings, BarChart3, Users, Plus, Trash2, ArrowUp, ArrowDown, 
  ExternalLink, QrCode, Copy, CheckCircle, Check, Play, User, 
  AlertCircle, ChevronDown, ChevronUp, MessageSquare 
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDesW9k9QxZlDZL0Bo1796UQDloso3bfbg",
  authDomain: "voting-system-63b55.firebaseapp.com",
  projectId: "voting-system-63b55",
  storageBucket: "voting-system-63b55.firebasestorage.app",
  messagingSenderId: "989137612133",
  appId: "1:989137612133:web:fe219555a9ae6ab9d7058c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  const [view, setView] = useState('setup');
  const [sessionCode, setSessionCode] = useState(null);
  const [user] = useState({ uid: 'host-' + Math.random().toString(36).substring(2, 9) });
  const [joinCodeInput, setJoinCodeInput] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('session');
    if (code) {
      setSessionCode(code.trim().toUpperCase());
      setView('voting');
    }
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    if (joinCodeInput.trim()) {
      setSessionCode(joinCodeInput.trim().toUpperCase());
      setView('voting');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
            <BarChart3 className="text-indigo-500" />
            <span className="hidden sm:inline">課程即時評分系統</span>
          </div>
          <div className="flex items-center gap-4">
            {view === 'setup' && (
              <form onSubmit={handleJoin} className="flex items-center">
                <input 
                  type="text" 
                  placeholder="輸入代碼加入活動" 
                  className="border border-slate-300 rounded-l-md px-3 py-1.5 text-sm w-36 focus:outline-none focus:border-indigo-500 uppercase"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                />
                <button type="submit" className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-r-md text-sm font-medium border border-l-0 border-slate-300 hover:bg-indigo-100 transition-colors">
                  加入
                </button>
              </form>
            )}
            {view !== 'setup' && (
              <button 
                onClick={() => {
                  setView('setup');
                  window.history.pushState({}, '', window.location.pathname);
                }}
                className="text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center gap-1"
              >
                <Settings size={16} /> 返回首頁
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
        {view === 'setup' && <AdminSetup user={user} setView={setView} setSessionCode={setSessionCode} />}
        {view === 'dashboard' && <AdminDashboard user={user} sessionCode={sessionCode} setView={setView} />}
        {view === 'voting' && <VoterInterface user={user} sessionCode={sessionCode} />}
      </main>
    </div>
  );
}

function AdminSetup({ user, setView, setSessionCode }) {
  const [title, setTitle] = useState("期末專案發表評分");
  const [mode, setMode] = useState('group');
  const [participantCount, setParticipantCount] = useState(5);
  const [customNames, setCustomNames] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [criteria, setCriteria] = useState([
    { id: 'c1', name: '內容與創意', maxScore: 10, weight: 50 },
    { id: 'c2', name: '表達與台風', maxScore: 10, weight: 30 },
    { id: 'c3', name: '投影片設計', maxScore: 5, weight: 20 },
  ]);

  useEffect(() => {
    const newNames = {};
    for (let i = 1; i <= participantCount; i++) {
      newNames[i] = customNames[i] || (mode === 'group' ? `第 ${i} 組` : `第 ${i} 位`);
    }
    setCustomNames(newNames);
  }, [participantCount, mode]);

  const addCriterion = () => {
    setCriteria([...criteria, { 
      id: `c${Date.now()}`, 
      name: `新指標 ${criteria.length + 1}`, 
      maxScore: 10, 
      weight: 0 
    }]);
  };

  const updateCriterion = (id, field, value) => {
    setCriteria(criteria.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCriterion = (id) => {
    if (criteria.length <= 1) return;
    setCriteria(criteria.filter(c => c.id !== id));
  };

  const moveCriterion = (index, direction) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === criteria.length - 1)) return;
    const newCriteria = [...criteria];
    const temp = newCriteria[index];
    newCriteria[index] = newCriteria[index + direction];
    newCriteria[index + direction] = temp;
    setCriteria(newCriteria);
  };

  const handleCustomNameChange = (index, value) => {
    setCustomNames({ ...customNames, [index]: value });
  };

  const createSession = async () => {
    setIsSubmitting(true);
    const totalWeight = criteria.reduce((sum, c) => sum + Number(c.weight), 0);
    const normalizedCriteria = criteria.map(c => ({
      ...c,
      weight: totalWeight > 0 ? Math.round((Number(c.weight) / totalWeight) * 100) : 0
    }));

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const targets = [];
    for (let i = 1; i <= participantCount; i++) {
      targets.push({
        id: `t${i}`,
        name: customNames[i] || (mode === 'group' ? `第 ${i} 組` : `第 ${i} 位`),
        order: i
      });
    }

    const sessionData = {
      title,
      hostId: user.uid,
      mode,
      createdAt: new Date().toISOString(),
      criteria: normalizedCriteria,
      targets,
      status: 'active'
    };

    try {
      const sessionRef = doc(db, 'sessions', code);
      await setDoc(sessionRef, sessionData);
      setSessionCode(code);
      setView('dashboard');
    } catch (err) {
      console.error("Error creating session:", err);
      alert("建立活動時發生錯誤，請確認 Firebase 規則是否允許寫入。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalWeight = criteria.reduce((sum, c) => sum + Number(c.weight), 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Settings className="text-indigo-500" />
          1. 基本設定
        </h2>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">活動名稱</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-lg"
              placeholder="例如：期末專案發表評分"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">評分對象模式</label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setMode('group')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'group' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >小組模式</button>
                <button 
                  onClick={() => setMode('individual')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'individual' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >個人模式</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {mode === 'group' ? '總組數' : '總人數'}
              </label>
              <input 
                type="number" 
                min="2" max="50"
                value={participantCount}
                onChange={(e) => setParticipantCount(Math.max(2, parseInt(e.target.value) || 2))}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
          <div className="pt-2">
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center justify-between">
              <span>自訂名稱 (選填)</span>
              <span className="text-xs text-slate-400 font-normal">若留白則使用預設名稱</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
              {Array.from({ length: participantCount }, (_, i) => i + 1).map(num => (
                <input
                  key={num}
                  type="text"
                  value={customNames[num] || ''}
                  onChange={(e) => handleCustomNameChange(num, e.target.value)}
                  placeholder={mode === 'group' ? `第 ${num} 組` : `第 ${num} 位`}
                  className="w-full p-2 text-sm border border-slate-200 rounded-md focus:border-indigo-400 focus:ring-1 outline-none"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="text-indigo-500" />
            2. 評分指標設定
          </h2>
          <span className={`text-sm font-medium px-2 py-1 rounded-md ${totalWeight === 100 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            總權重: {totalWeight}% {totalWeight !== 100 && '(系統將自動換算為100%)'}
          </span>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <div className="col-span-1 text-center">排序</div>
            <div className="col-span-5">指標名稱</div>
            <div className="col-span-2 text-center">最高分</div>
            <div className="col-span-3 text-center">權重 (%)</div>
            <div className="col-span-1 text-center">刪除</div>
          </div>
          {criteria.map((c, index) => (
            <div key={c.id} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100 hover:border-indigo-200 transition-colors">
              <div className="col-span-1 flex flex-col items-center">
                <button onClick={() => moveCriterion(index, -1)} disabled={index === 0} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ArrowUp size={16} /></button>
                <button onClick={() => moveCriterion(index, 1)} disabled={index === criteria.length - 1} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ArrowDown size={16} /></button>
              </div>
              <div className="col-span-5">
                <input type="text" value={c.name} onChange={(e) => updateCriterion(c.id, 'name', e.target.value)}
                  className="w-full p-2 text-sm border-0 bg-white rounded shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="col-span-2">
                <select value={c.maxScore} onChange={(e) => updateCriterion(c.id, 'maxScore', Number(e.target.value))}
                  className="w-full p-2 text-sm border-0 bg-white rounded shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
                  <option value={5}>5 分制</option>
                  <option value={7}>7 分制</option>
                  <option value={10}>10 分制</option>
                  <option value={100}>100 分制</option>
                </select>
              </div>
              <div className="col-span-3 px-2">
                <input type="number" min="0" max="100" value={c.weight} onChange={(e) => updateCriterion(c.id, 'weight', Number(e.target.value))}
                  className="w-full p-2 text-sm border-0 bg-white rounded shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-center" />
              </div>
              <div className="col-span-1 flex justify-center">
                <button onClick={() => removeCriterion(c.id)} disabled={criteria.length <= 1} className="p-2 text-slate-400 hover:text-red-500 rounded-md disabled:opacity-50">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          <button onClick={addCriterion}
            className="w-full py-3 mt-4 border-2 border-dashed border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
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

function AdminDashboard({ user, sessionCode, setView }) {
  const [session, setSession] = useState(null);
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expandedTarget, setExpandedTarget] = useState(null);

  useEffect(() => {
    const sessionRef = doc(db, 'sessions', sessionCode);
    const unsubSession = onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists()) setSession(docSnap.data());
      setLoading(false);
    });

    const votesRef = collection(db, 'votes');
    const unsubVotes = onSnapshot(votesRef, (snapshot) => {
      const votesData = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.sessionId === sessionCode) votesData.push({ id: docSnap.id, ...data });
      });
      setVotes(votesData);
    });

    return () => { unsubSession(); unsubVotes(); };
  }, [sessionCode]);

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!session) return <div className="text-center p-12 text-slate-500">找不到此活動。</div>;

  const results = session.targets.map(target => {
    const receivedVotes = votes.filter(v => v.targetId === target.id);
    let totalWeightedScore = 0;
    const criteriaScores = {};
    session.criteria.forEach(c => criteriaScores[c.id] = { sum: 0, count: 0, avg: 0 });
    const feedbackList = [];

    receivedVotes.forEach(vote => {
      let voteTotal = 0;
      session.criteria.forEach(c => {
        const score = vote.scores[c.id];
        if (score !== undefined) {
          criteriaScores[c.id].sum += score;
          criteriaScores[c.id].count += 1;
          const percentageScore = (score / c.maxScore) * 100;
          voteTotal += percentageScore * (c.weight / 100);
        }
      });
      totalWeightedScore += voteTotal;
      if (vote.feedback && vote.feedback.trim() !== '') feedbackList.push(vote.feedback);
    });

    const voteCount = receivedVotes.length;
    const finalScore = voteCount > 0 ? (totalWeightedScore / voteCount) : 0;
    session.criteria.forEach(c => {
      if (criteriaScores[c.id].count > 0) criteriaScores[c.id].avg = criteriaScores[c.id].sum / criteriaScores[c.id].count;
    });

    return { ...target, voteCount, finalScore: Number(finalScore.toFixed(2)), criteriaScores, feedbackList };
  });

  results.sort((a, b) => b.finalScore - a.finalScore);

  const currentHref = window.location.href.split('?')[0];
  const votingUrl = `${currentHref}?session=${sessionCode}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(votingUrl)}`;

  const fallbackCopy = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert("複製失敗，請手動選取網址複製：" + text);
    }
    document.body.removeChild(textArea);
  };

  const copyLink = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(votingUrl)
        .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
        .catch(() => fallbackCopy(votingUrl));
    } else {
      fallbackCopy(votingUrl);
    }
  };

  const toggleExpand = (targetId) => setExpandedTarget(expandedTarget === targetId ? null : targetId);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900">{session.title}</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-600 font-medium">即時結果儀表板</span>
            <span className="text-slate-400 text-sm ml-2">| 共收到 {votes.length} 筆評分</span>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="px-4 py-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-4">
              <div>
                <div className="text-xs text-indigo-800 font-bold mb-1 uppercase tracking-wider">活動參與代碼</div>
                <div className="text-4xl font-black text-indigo-600 tracking-widest">{sessionCode}</div>
              </div>
            </div>
            <button onClick={() => setView('voting')} 
              className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium rounded-xl transition-colors h-[68px]">
              <User size={20} className="text-slate-400" />
              <div className="text-left leading-tight">
                <div>模擬學生投票</div>
                <div className="text-xs text-slate-500">不用跳轉即可測試</div>
              </div>
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 bg-slate-50 p-5 rounded-2xl border border-slate-200 w-full md:w-64 shrink-0">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
            <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32" />
          </div>
          <div className="flex gap-2 w-full mt-1">
            <button onClick={copyLink} className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors text-slate-700">
              {copied ? <Check size={16} className="text-emerald-500"/> : <Copy size={16} className="text-slate-400"/>}
              {copied ? '已複製' : '複製連結'}
            </button>
            <a href={qrCodeUrl} download={`QRCode_${sessionCode}.png`} target="_blank" rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              <QrCode size={16} /> 下載 QR
            </a>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800">總分排行榜</h3>
          <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">滿分 100 (依權重計算)</span>
        </div>
        <div className="divide-y divide-slate-100">
          {results.map((r, index) => (
            <div key={r.id} className="transition-colors hover:bg-slate-50/50">
              <div className="p-4 sm:p-6 flex items-center cursor-pointer select-none" onClick={() => toggleExpand(r.id)}>
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
                <div className="text-right flex items-center gap-4">
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
                        <div>
                          <div className="text-sm font-medium text-slate-800">{c.name}</div>
                          <div className="text-xs text-slate-500">權重 {c.weight}% | 滿分 {c.maxScore}</div>
                        </div>
                        <div className="text-lg font-bold text-slate-700">
                          {r.criteriaScores[c.id].avg.toFixed(1)} <span className="text-xs font-normal text-slate-400">分</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {r.feedbackList.length > 0 && (
                    <>
                      <h5 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2 uppercase tracking-wider">匿名文字回饋</h5>
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

function VoterInterface({ user, sessionCode }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voterIdentity, setVoterIdentity] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  // 使用者自行選擇要評的對象 id，null 表示尚未選擇
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [scores, setScores] = useState({});
  const [feedback, setFeedback] = useState('');
  const [votedTargetIds, setVotedTargetIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionCode) return;
    const fetchSession = async () => {
      try {
        const sessionRef = doc(db, 'sessions', sessionCode);
        const docSnap = await getDoc(sessionRef);
        if (docSnap.exists()) {
          setSession(docSnap.data());
          const savedVotes = localStorage.getItem(`voted_${sessionCode}`);
          if (savedVotes) setVotedTargetIds(JSON.parse(savedVotes));
        } else {
          setError("找不到此評分活動，請確認代碼或連結是否正確。");
        }
      } catch (err) {
        setError("讀取活動資料時發生錯誤，請稍後再試。");
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [sessionCode]);

  // 可評分的對象：排除自己（小組模式）、已評過的
  const availableTargets = session
    ? session.targets.filter(t => t.id !== voterIdentity && !votedTargetIds.includes(t.id))
    : [];

  const handleStart = (e) => {
    e.preventDefault();
    if (!voterIdentity && session.mode === 'group') { alert("請選擇您的組別"); return; }
    if (session.mode === 'individual' && !voterIdentity) {
      setVoterIdentity('indv_' + Math.random().toString(36).substring(2, 9));
    }
    setHasStarted(true);
  };

  const handleScoreChange = (criterionId, val) => setScores(prev => ({ ...prev, [criterionId]: Number(val) }));

  const handleSelectTarget = (targetId) => {
    setSelectedTargetId(targetId);
    setScores({});
    setFeedback('');
  };

  const submitVote = async () => {
    if (!selectedTargetId) { alert("請先選擇要評分的對象"); return; }
    const missingScores = session.criteria.some(c => scores[c.id] === undefined);
    if (missingScores) { alert("請完成所有指標的評分"); return; }

    setIsSubmitting(true);
    const target = session.targets.find(t => t.id === selectedTargetId);
    try {
      const voteId = `${sessionCode}_${voterIdentity || 'anon'}_${target.id}_${Date.now()}`;
      const voteRef = doc(db, 'votes', voteId);
      await setDoc(voteRef, {
        sessionId: sessionCode,
        voterId: voterIdentity || 'anonymous',
        targetId: target.id,
        scores: scores,
        feedback: feedback.trim(),
        timestamp: new Date().toISOString()
      });
      const newVotedList = [...votedTargetIds, target.id];
      setVotedTargetIds(newVotedList);
      localStorage.setItem(`voted_${sessionCode}`, JSON.stringify(newVotedList));
      // 評完後清空，讓使用者重新選下一組
      setSelectedTargetId(null);
      setScores({});
      setFeedback('');
    } catch (err) {
      alert("送出評分時發生錯誤，請檢查網路連線。");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-[60vh] flex flex-col items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div><p className="text-slate-500">載入活動中...</p></div>;
  if (error) return (
    <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center">
      <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-slate-800 mb-2">無法加入活動</h3>
      <p className="text-slate-600 mb-6">{error}</p>
      <button onClick={() => window.location.href = window.location.pathname} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2 rounded-lg font-medium transition-colors">回首頁</button>
    </div>
  );

  // 第一步：確認身分
  if (!hasStarted) {
    return (
      <div className="max-w-md mx-auto mt-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-in zoom-in-95 duration-300">
        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 mx-auto">
          <Users className="text-indigo-600" size={24} />
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">{session.title}</h2>
        <p className="text-center text-slate-500 mb-8">準備開始進行評分，請先確認您的身分。</p>
        <form onSubmit={handleStart} className="space-y-6">
          {session.mode === 'group' ? (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3 text-center">請問您是哪一組？</label>
              <div className="grid grid-cols-2 gap-3">
                {session.targets.map(t => (
                  <button key={t.id} type="button" onClick={() => setVoterIdentity(t.id)}
                    className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${voterIdentity === t.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-slate-50'}`}>
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
          <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-md transition-all active:scale-[0.98]">
            進入評分
          </button>
        </form>
      </div>
    );
  }

  // 全部評完
  if (availableTargets.length === 0) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white p-10 rounded-3xl shadow-sm border border-emerald-100 text-center animate-in zoom-in duration-500">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="text-emerald-500 w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">評分完成！</h2>
        <p className="text-slate-500 mb-8">您已經完成所有可評估對象的評分，感謝您的參與。</p>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-sm text-slate-600 font-medium">您可以關閉此視窗，或觀看現場大螢幕的即時結果。</p>
        </div>
      </div>
    );
  }

  const totalVotable = session.mode === 'group' ? session.targets.length - 1 : session.targets.length;
  const votedCount = totalVotable - availableTargets.length;
  const progress = totalVotable > 0 ? (votedCount / totalVotable) * 100 : 0;
  const selectedTarget = selectedTargetId ? session.targets.find(t => t.id === selectedTargetId) : null;
  const isComplete = selectedTarget && session.criteria.every(c => scores[c.id] !== undefined);

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-300 space-y-6">

      {/* 進度條 */}
      <div>
        <div className="flex justify-between text-sm font-bold text-slate-500 mb-2">
          <span>評分進度</span>
          <span className="text-indigo-600">{votedCount} / {totalVotable} 完成</span>
        </div>
        <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* 選擇評分對象 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-base font-bold text-slate-700 mb-4">
          {session.mode === 'group' ? '請選擇要評分的組別' : '請選擇要評分的人員'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {availableTargets.map(t => (
            <button key={t.id} onClick={() => handleSelectTarget(t.id)}
              className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${selectedTargetId === t.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700 scale-105' : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-slate-50'}`}>
              {t.name}
            </button>
          ))}
          {votedTargetIds.filter(id => id !== voterIdentity).map(id => {
            const t = session.targets.find(t => t.id === id);
            if (!t) return null;
            return (
              <div key={id} className="p-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-sm font-bold text-slate-300 flex items-center justify-center gap-1">
                <Check size={14} /> {t.name}
              </div>
            );
          })}
        </div>
      </div>

      {/* 評分表單（只有選了對象才顯示） */}
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
                          className={`flex-1 min-w-[40px] py-3 rounded-xl font-bold text-lg transition-all ${scores[c.id] === val ? 'bg-indigo-600 text-white shadow-md transform scale-105' : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'}`}>
                          {val}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <input type="range" min="0" max={c.maxScore} value={scores[c.id] || 0}
                        onChange={(e) => handleScoreChange(c.id, e.target.value)}
                        className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      <input type="number" min="0" max={c.maxScore} value={scores[c.id] || ''}
                        onChange={(e) => handleScoreChange(c.id, e.target.value)}
                        placeholder="輸入"
                        className="w-24 p-3 text-center font-bold text-lg border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-dashed border-slate-200">
              <label className="block text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
                <MessageSquare size={18} className="text-slate-400" />
                給他們的回饋 (選填)
              </label>
              <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)}
                className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-slate-50 focus:bg-white transition-colors"
                rows="3" placeholder="寫下您的鼓勵或具體建議，將會匿名顯示給主辦單位..."></textarea>
            </div>
            <button onClick={submitVote} disabled={!isComplete || isSubmitting}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2">
              {isSubmitting ? '送出中...' : '送出評分，選擇下一位'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
