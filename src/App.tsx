/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  LayoutDashboard, 
  GraduationCap, 
  AlertCircle, 
  Search, 
  ChevronRight, 
  CheckCircle2, 
  XCircle,
  ArrowLeft,
  Trophy,
  History,
  BarChart3,
  X,
  Download,
  Upload
} from 'lucide-react';
import { TERMS } from './data/terms';
import { Term, UserData, View, PracticeMode, WrongQuestion } from './types';

// --- Utils ---
const getInitialUserData = (): UserData => {
  const saved = localStorage.getItem('coding_vocab_user_data');
  if (saved) {
    const data = JSON.parse(saved);
    if (!data.customTerms) data.customTerms = [];
    return data;
  }
  return {
    wrongQuestions: {},
    masteryLevels: {},
    practiceHistory: [],
    customTerms: []
  };
};

const saveUserData = (data: UserData) => {
  localStorage.setItem('coding_vocab_user_data', JSON.stringify(data));
};

// --- Components ---

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [userData, setUserData] = useState<UserData>(getInitialUserData());
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);
  const [practiceMode, setPracticeMode] = useState<PracticeMode | null>(null);

  const allTerms = useMemo(() => [...TERMS, ...userData.customTerms], [userData.customTerms]);

  useEffect(() => {
    saveUserData(userData);
  }, [userData]);

  const updateWrongQuestion = (termId: string, wrongAnswer: string, correctAnswer: string) => {
    setUserData(prev => {
      const existing = prev.wrongQuestions[termId];
      const updated: WrongQuestion = existing ? {
        ...existing,
        errorCount: existing.errorCount + 1,
        lastErrorTime: Date.now(),
        wrongAnswer
      } : {
        termId,
        wrongAnswer,
        correctAnswer,
        errorCount: 1,
        lastErrorTime: Date.now()
      };
      return {
        ...prev,
        wrongQuestions: { ...prev.wrongQuestions, [termId]: updated }
      };
    });
  };

  const markAsMastered = (termId: string) => {
    setUserData(prev => {
      const newWrongQuestions = { ...prev.wrongQuestions };
      delete newWrongQuestions[termId];
      return {
        ...prev,
        wrongQuestions: newWrongQuestions,
        masteryLevels: { ...prev.masteryLevels, [termId]: 3 }
      };
    });
  };

  const handleUploadTerms = (newTerms: Term[]) => {
    setUserData(prev => ({
      ...prev,
      customTerms: [...prev.customTerms, ...newTerms]
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar / Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center z-50 md:top-0 md:bottom-auto md:flex-col md:w-24 md:h-full md:border-t-0 md:border-r md:py-8">
        <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={24} />} label="首页" />
        <NavButton active={view === 'practice'} onClick={() => setView('practice')} icon={<GraduationCap size={24} />} label="练习" />
        <NavButton active={view === 'error-book'} onClick={() => setView('error-book')} icon={<AlertCircle size={24} />} label="错题" />
        <NavButton active={view === 'glossary'} onClick={() => setView('glossary')} icon={<BookOpen size={24} />} label="词库" />
        <NavButton active={view === 'upload'} onClick={() => setView('upload')} icon={<History size={24} />} label="上传" />
      </nav>

      {/* Main Content */}
      <main className="pb-24 pt-6 px-4 max-w-4xl mx-auto md:pl-32 md:pt-12 md:pb-12">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <DashboardView 
              userData={userData} 
              allTerms={allTerms}
              onStartPractice={() => setView('practice')} 
              onViewErrors={() => setView('error-book')}
            />
          )}
          {view === 'practice' && !practiceMode && (
            <PracticeModeSelector onSelect={(mode) => setPracticeMode(mode)} />
          )}
          {view === 'practice' && practiceMode && (
            <PracticeEngine 
              mode={practiceMode} 
              userData={userData}
              allTerms={allTerms}
              onComplete={(score, total) => {
                setUserData(prev => ({
                  ...prev,
                  practiceHistory: [...prev.practiceHistory, { date: new Date().toISOString(), score, total }]
                }));
                setPracticeMode(null);
                setView('dashboard');
              }}
              onWrongAnswer={updateWrongQuestion}
              onCancel={() => setPracticeMode(null)}
            />
          )}
          {view === 'error-book' && (
            <ErrorBookView 
              userData={userData} 
              allTerms={allTerms}
              onMarkMastered={markAsMastered}
              onPracticeTerm={(termId) => {
                // Future: implementation for single term practice
              }}
            />
          )}
          {view === 'glossary' && (
            <GlossaryView 
              allTerms={allTerms}
              selectedTerm={selectedTerm} 
              onSelectTerm={setSelectedTerm} 
            />
          )}
          {view === 'upload' && (
            <UploadView 
              onUpload={handleUploadTerms}
              onBack={() => setView('dashboard')}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors w-full py-3 ${active ? 'text-indigo-600 bg-indigo-50/50 md:bg-transparent' : 'text-slate-400 hover:text-slate-600'}`}
    >
      {icon}
      <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'text-indigo-600' : 'text-slate-400'}`}>{label}</span>
    </button>
  );
}

// --- Dashboard View ---
function DashboardView({ userData, allTerms, onStartPractice, onViewErrors }: { userData: UserData, allTerms: Term[], onStartPractice: () => void, onViewErrors: () => void }) {
  const wrongCount = Object.keys(userData.wrongQuestions).length;
  const masteryCount = Object.keys(userData.masteryLevels).filter(id => userData.masteryLevels[id] === 3).length;
  const totalTerms = allTerms.length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">欢迎回来！</h1>
        <p className="text-slate-500 mt-1">准备好今天掌握一些编程术语了吗？</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          icon={<BarChart3 className="text-indigo-600" />} 
          label="掌握度" 
          value={totalTerms > 0 ? `${Math.round((masteryCount / totalTerms) * 100)}%` : '0%'} 
          subtext={`已掌握 ${masteryCount} / ${totalTerms} 个词汇`}
        />
        <StatCard 
          icon={<AlertCircle className="text-rose-600" />} 
          label="错题本" 
          value={wrongCount.toString()} 
          subtext="需要复习"
          onClick={onViewErrors}
        />
        <StatCard 
          icon={<History className="text-emerald-600" />} 
          label="练习次数" 
          value={userData.practiceHistory.length.toString()} 
          subtext="累计完成"
        />
      </div>

      <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold">今日推荐练习</h2>
            <p className="text-slate-500 mt-1">快速进行 10 道混合题，保持你的技能敏锐度。</p>
          </div>
          <button 
            onClick={onStartPractice}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
          >
            开始练习 <ChevronRight size={20} />
          </button>
        </div>
      </section>

      {userData.practiceHistory.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-4">最近活动</h3>
          <div className="space-y-3">
            {userData.practiceHistory.slice(-3).reverse().map((h, i) => (
              <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Trophy size={20} />
                  </div>
                  <div>
                    <p className="font-medium">练习环节</p>
                    <p className="text-xs text-slate-400">{new Date(h.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-indigo-600">{h.score}/{h.total}</p>
                  <p className="text-xs text-slate-400">得分</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
}

function StatCard({ icon, label, value, subtext, onClick }: { icon: React.ReactNode, label: string, value: string, subtext: string, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm ${onClick ? 'cursor-pointer hover:border-indigo-300 transition-colors' : ''}`}
    >
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <span className="text-sm font-medium text-slate-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{subtext}</div>
    </div>
  );
}

// --- Practice Mode Selector ---
function PracticeModeSelector({ onSelect }: { onSelect: (mode: PracticeMode) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <header>
        <h1 className="text-2xl font-bold">选择练习模式</h1>
        <p className="text-slate-500">你今天想如何学习？</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        <ModeCard 
          title="术语 → 作用" 
          description="单选题：给定一个术语，识别其主要用途或功能。"
          onClick={() => onSelect('term-to-function')}
          color="indigo"
        />
        <ModeCard 
          title="作用 → 术语" 
          description="单选题：给定功能的描述，识别正确的术语。"
          onClick={() => onSelect('function-to-term')}
          color="emerald"
        />
        <ModeCard 
          title="术语 → 类目" 
          description="多选题：识别属于或不属于特定类目的多个术语。"
          onClick={() => onSelect('term-to-category')}
          color="amber"
        />
      </div>
    </motion.div>
  );
}

function ModeCard({ title, description, onClick, color }: { title: string, description: string, onClick: () => void, color: 'indigo' | 'emerald' | 'amber' }) {
  const colors = {
    indigo: 'border-indigo-100 hover:border-indigo-400 bg-indigo-50/30',
    emerald: 'border-emerald-100 hover:border-emerald-400 bg-emerald-50/30',
    amber: 'border-amber-100 hover:border-amber-400 bg-amber-50/30'
  };

  return (
    <button 
      onClick={onClick}
      className={`text-left p-6 rounded-2xl border-2 transition-all group ${colors[color]}`}
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold mb-1">{title}</h3>
          <p className="text-slate-600 text-sm">{description}</p>
        </div>
        <ChevronRight className="text-slate-300 group-hover:text-slate-600 transition-colors" />
      </div>
    </button>
  );
}

// --- Practice Engine ---
function PracticeEngine({ mode, userData, allTerms, onComplete, onWrongAnswer, onCancel }: { 
  mode: PracticeMode, 
  userData: UserData, 
  allTerms: Term[],
  onComplete: (score: number, total: number) => void,
  onWrongAnswer: (termId: string, wrong: string, correct: string) => void,
  onCancel: () => void
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[] | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  // Generate 10 questions
  const questions = useMemo(() => {
    // Shuffle terms
    const shuffled = [...allTerms].sort(() => Math.random() - 0.5).slice(0, 10);
    return shuffled.map(term => {
      let question = "";
      let correctAnswer: string | string[] = "";
      let options: string[] = [];
      let isMulti = false;

      if (mode === 'term-to-function') {
        question = `"${term.term}" 的主要作用是什么？`;
        correctAnswer = term.function;
        const distractors = allTerms
          .filter(t => t.id !== term.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map(t => t.function);
        options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
      } else if (mode === 'function-to-term') {
        question = `以下描述对应哪个术语：\n"${term.function}"？`;
        correctAnswer = term.term;
        const distractors = allTerms
          .filter(t => t.id !== term.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map(t => t.term);
        options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
      } else {
        // Term to Category - Multi Choice
        isMulti = true;
        const isPositive = Math.random() > 0.5;
        const targetCategory = term.category;
        
        if (isPositive) {
          question = `以下哪些词属于 "${targetCategory}" 类目？`;
          const correctTerms = allTerms.filter(t => t.category === targetCategory).map(t => t.term);
          const incorrectTerms = allTerms.filter(t => t.category !== targetCategory).map(t => t.term);
          
          // Pick 2-3 correct ones
          const selectedCorrect = correctTerms.sort(() => Math.random() - 0.5).slice(0, Math.min(3, correctTerms.length));
          const selectedIncorrect = incorrectTerms.sort(() => Math.random() - 0.5).slice(0, 4 - selectedCorrect.length);
          
          correctAnswer = selectedCorrect;
          options = [...selectedCorrect, ...selectedIncorrect].sort(() => Math.random() - 0.5);
        } else {
          question = `以下哪些词不属于 "${targetCategory}" 类目？`;
          const correctTerms = allTerms.filter(t => t.category !== targetCategory).map(t => t.term);
          const incorrectTerms = allTerms.filter(t => t.category === targetCategory).map(t => t.term);
          
          const selectedCorrect = correctTerms.sort(() => Math.random() - 0.5).slice(0, 2);
          const selectedIncorrect = incorrectTerms.sort(() => Math.random() - 0.5).slice(0, 2);
          
          correctAnswer = selectedCorrect;
          options = [...selectedCorrect, ...selectedIncorrect].sort(() => Math.random() - 0.5);
        }
      }

      return { term, question, correctAnswer, options, isMulti };
    });
  }, [mode, allTerms]);

  const currentQuestion = questions[currentIndex];

  const handleSingleAnswer = (answer: string) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
    setIsAnswered(true);
    if (answer === currentQuestion.correctAnswer) {
      setScore(s => s + 1);
    } else {
      onWrongAnswer(currentQuestion.term.id, answer, currentQuestion.correctAnswer as string);
    }
  };

  const handleMultiToggle = (option: string) => {
    if (isAnswered) return;
    setSelectedAnswer(prev => {
      const current = (prev as string[]) || [];
      if (current.includes(option)) {
        return current.filter(o => o !== option);
      } else {
        return [...current, option];
      }
    });
  };

  const handleMultiSubmit = () => {
    if (isAnswered) return;
    setIsAnswered(true);
    const selected = (selectedAnswer as string[]) || [];
    const correct = currentQuestion.correctAnswer as string[];
    
    const isCorrect = selected.length === correct.length && selected.every(s => correct.includes(s));
    if (isCorrect) {
      setScore(s => s + 1);
    } else {
      onWrongAnswer(currentQuestion.term.id, selected.join(', '), correct.join(', '));
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      onComplete(score, questions.length);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 flex items-center gap-1">
          <ArrowLeft size={18} /> 取消
        </button>
        <div className="text-sm font-medium text-slate-500">
          第 {currentIndex + 1} 题，共 {questions.length} 题
        </div>
        <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-600 transition-all duration-300" 
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
        <h2 className="text-2xl font-bold mb-8 text-center whitespace-pre-wrap">{currentQuestion.question}</h2>
        
        <div className="grid grid-cols-1 gap-3">
          {currentQuestion.options.map((option, i) => {
            const isCorrect = Array.isArray(currentQuestion.correctAnswer) 
              ? currentQuestion.correctAnswer.includes(option)
              : option === currentQuestion.correctAnswer;
            
            const isSelected = Array.isArray(selectedAnswer)
              ? selectedAnswer.includes(option)
              : option === selectedAnswer;
            
            let buttonClass = "p-5 rounded-2xl border-2 text-left transition-all flex items-center justify-between ";
            if (!isAnswered) {
              if (isSelected) {
                buttonClass += "border-indigo-500 bg-indigo-50 text-indigo-700";
              } else {
                buttonClass += "border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/30";
              }
            } else {
              if (isCorrect) {
                buttonClass += "border-emerald-500 bg-emerald-50 text-emerald-700";
              } else if (isSelected) {
                buttonClass += "border-rose-500 bg-rose-50 text-rose-700";
              } else {
                buttonClass += "border-slate-50 opacity-50";
              }
            }

            return (
              <button 
                key={i} 
                onClick={() => currentQuestion.isMulti ? handleMultiToggle(option) : handleSingleAnswer(option)}
                disabled={isAnswered}
                className={buttonClass}
              >
                <span className="font-medium">{option}</span>
                {isAnswered && isCorrect && <CheckCircle2 size={20} className="text-emerald-500" />}
                {isAnswered && isSelected && !isCorrect && <XCircle size={20} className="text-rose-500" />}
                {!isAnswered && currentQuestion.isMulti && (
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'}`}>
                    {isSelected && <CheckCircle2 size={16} className="text-white" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {currentQuestion.isMulti && !isAnswered && (
          <button 
            onClick={handleMultiSubmit}
            disabled={!selectedAnswer || (selectedAnswer as string[]).length === 0}
            className="w-full mt-8 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            提交答案
          </button>
        )}

        {isAnswered && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 flex flex-col items-center gap-4"
          >
            {!Array.isArray(currentQuestion.correctAnswer) && selectedAnswer !== currentQuestion.correctAnswer && (
              <p className="text-sm text-slate-500 italic">
                提示：{currentQuestion.term.keyword_hint}
              </p>
            )}
            <button 
              onClick={handleNext}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-colors shadow-lg"
            >
              {currentIndex === questions.length - 1 ? '完成' : '下一题'}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// --- Error Book View ---
function ErrorBookView({ userData, allTerms, onMarkMastered, onPracticeTerm }: { 
  userData: UserData, 
  allTerms: Term[],
  onMarkMastered: (id: string) => void,
  onPracticeTerm: (id: string) => void
}) {
  const wrongList = Object.values(userData.wrongQuestions).sort((a, b) => b.errorCount - a.errorCount);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <header>
        <h1 className="text-2xl font-bold">错题本</h1>
        <p className="text-slate-500">回顾你曾经答错的术语。</p>
      </header>

      {wrongList.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-lg font-semibold">暂无错题</h3>
          <p className="text-slate-400 mt-1">太棒了！继续保持。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {wrongList.map((q) => {
            const term = allTerms.find(t => t.id === q.termId);
            if (!term) return null;

            return (
              <div key={q.termId} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-indigo-600">{term.term}</h3>
                    <p className="text-xs text-slate-400 mt-1">{term.category}</p>
                  </div>
                  <div className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs font-bold">
                    错误 {q.errorCount} 次
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                    <p className="text-rose-400 text-[10px] font-bold uppercase mb-1">你的错误回答</p>
                    <p className="text-rose-700 font-medium">{q.wrongAnswer}</p>
                  </div>
                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                    <p className="text-emerald-400 text-[10px] font-bold uppercase mb-1">正确回答</p>
                    <p className="text-emerald-700 font-medium">{q.correctAnswer}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => onMarkMastered(q.termId)}
                    className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
                  >
                    标记为已掌握
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// --- Glossary View ---
function GlossaryView({ allTerms, selectedTerm, onSelectTerm }: { 
  allTerms: Term[],
  selectedTerm: Term | null, 
  onSelectTerm: (term: Term | null) => void 
}) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    return Array.from(new Set(allTerms.map(t => t.category)));
  }, [allTerms]);

  const filteredTerms = useMemo(() => {
    return allTerms.filter(t => {
      const matchesSearch = t.term.toLowerCase().includes(search.toLowerCase()) || 
                          t.definition.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory ? t.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [allTerms, search, selectedCategory]);

  const handleTermClick = (termName: string) => {
    const found = allTerms.find(t => t.term.toLowerCase() === termName.toLowerCase());
    if (found) {
      onSelectTerm(found);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">词库浏览</h1>
          <p className="text-slate-500">
            {selectedCategory ? `类目：${selectedCategory}` : '按类目探索编程术语'}
          </p>
        </div>
        {selectedCategory && (
          <button 
            onClick={() => setSelectedCategory(null)}
            className="text-indigo-600 font-medium flex items-center gap-1"
          >
            <ArrowLeft size={16} /> 返回类目
          </button>
        )}
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="搜索术语或定义..." 
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {!selectedCategory && !search ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-400 transition-all text-left flex justify-between items-center group"
            >
              <div>
                <h3 className="text-lg font-bold text-slate-800">{cat}</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {allTerms.filter(t => t.category === cat).length} 个词汇
                </p>
              </div>
              <ChevronRight className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredTerms.map((term) => (
            <button 
              key={term.id}
              onClick={() => onSelectTerm(term)}
              className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-300 transition-all text-left flex justify-between items-center group"
            >
              <div>
                <h3 className="font-bold text-slate-800">{term.term}</h3>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{term.definition}</p>
              </div>
              <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
            </button>
          ))}
          {filteredTerms.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              未找到匹配搜索的术语。
            </div>
          )}
        </div>
      )}

      {selectedTerm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
              <div>
                <h2 className="text-2xl font-bold">{selectedTerm.term}</h2>
                <p className="text-indigo-100 text-sm">{selectedTerm.category}</p>
              </div>
              <button onClick={() => onSelectTerm(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-8">
              <section>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">定义</h4>
                <p className="text-slate-700 leading-relaxed text-lg">{selectedTerm.definition}</p>
              </section>

              <section>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">主要作用</h4>
                <p className="text-slate-700 leading-relaxed">{selectedTerm.function}</p>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">相关术语</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTerm.related_terms.map(t => (
                      <button 
                        key={t} 
                        onClick={() => handleTermClick(t)}
                        className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-medium hover:bg-indigo-100 transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">易混淆词</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTerm.confusion_terms.map(t => (
                      <button 
                        key={t} 
                        onClick={() => handleTermClick(t)}
                        className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs font-medium hover:bg-rose-100 transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">使用示例</h4>
                <p className="text-slate-600 italic leading-relaxed">"{selectedTerm.example}"</p>
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// --- Upload View ---
function UploadView({ onUpload, onBack }: { onUpload: (terms: Term[]) => void, onBack: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const downloadTemplate = () => {
    const headers = "term,category,definition,function,related_terms,confusion_terms,example,keyword_hint";
    const example = "React,前端,一个用于构建用户界面的 JavaScript 库,构建组件化 UI,Vue;Angular,HTML;CSS,使用 React 构建单页应用,组件化";
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + example;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "coding_vocab_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const newTerms: Term[] = [];
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length < 8) continue;

          const term: Term = {
            id: `custom-${Date.now()}-${i}`,
            term: values[0],
            category: values[1],
            definition: values[2],
            function: values[3],
            related_terms: values[4].split(';').filter(t => t),
            confusion_terms: values[5].split(';').filter(t => t),
            example: values[6],
            keyword_hint: values[7]
          };
          newTerms.push(term);
        }

        if (newTerms.length > 0) {
          onUpload(newTerms);
          setSuccess(true);
        } else {
          setError("未能识别到有效的词汇数据，请检查文件格式。");
        }
      } catch (err) {
        setError("解析文件时出错，请确保使用的是正确的 CSV 格式。");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8"
    >
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">上传新词汇</h1>
          <p className="text-slate-500">通过 CSV 文件批量导入你的学习资料。</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Download size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold">1. 下载模版</h3>
            <p className="text-slate-500 text-sm mt-1">使用我们的标准 CSV 模版，确保数据能够被正确读取。</p>
          </div>
          <button 
            onClick={downloadTemplate}
            className="w-full py-3 border-2 border-indigo-600 text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
          >
            下载 CSV 模版
          </button>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <Upload size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold">2. 上传文件</h3>
            <p className="text-slate-500 text-sm mt-1">填写好模版后，将其上传到这里即可完成导入。</p>
          </div>
          <label className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
            {isUploading ? '正在上传...' : '选择并上传文件'}
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-3 text-rose-700">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-800">上传成功！</h3>
            <p className="text-emerald-600 text-sm">你的新词汇已成功添加到词库中。</p>
          </div>
          <button 
            onClick={onBack}
            className="text-emerald-700 font-bold hover:underline"
          >
            返回首页查看
          </button>
        </div>
      )}

      <section className="bg-slate-100 p-6 rounded-2xl border border-slate-200">
        <h4 className="font-bold text-slate-700 mb-2">填写说明：</h4>
        <ul className="text-sm text-slate-500 space-y-2 list-disc pl-5">
          <li><strong>related_terms</strong> 和 <strong>confusion_terms</strong> 请使用分号 (;) 分隔多个词。</li>
          <li>请确保 CSV 编码为 UTF-8，以避免中文乱码。</li>
          <li>导入后的词汇将保存在本地浏览器缓存中。</li>
        </ul>
      </section>
    </motion.div>
  );
}
