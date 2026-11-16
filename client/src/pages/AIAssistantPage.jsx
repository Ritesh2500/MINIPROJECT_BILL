import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Zap,
  TrendingUp,
  BrainCircuit,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  DollarSign,
  HelpCircle
} from 'lucide-react';
import { aiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';

export default function AIAssistantPage() {
  const { currencySymbol } = useAuth();
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: `Hello! I am your **BillMate Financial Assistant**. I can analyze your bills, predict upcoming costs, calculate category totals, and compare month-over-month expenses. What would you like to know today?`,
      engine: 'System'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loadingInsights, setLoadingInsights] = useState(true);

  useEffect(() => {
    async function loadAIData() {
      try {
        setLoadingInsights(true);
        const [insRes, predRes] = await Promise.all([
          aiService.getInsights(),
          aiService.getPredictions()
        ]);
        if (insRes.data?.success) setInsights(insRes.data.insights || []);
        if (predRes.data?.success) setPredictions(predRes.data.predictions || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingInsights(false);
      }
    }
    loadAIData();
  }, []);

  const handleSend = async (questionText) => {
    const q = (questionText || input).trim();
    if (!q || loading) return;

    // Add user message
    const newMsgList = [...messages, { sender: 'user', text: q }];
    setMessages(newMsgList);
    setInput('');
    setLoading(true);

    try {
      const res = await aiService.ask(q);
      if (res.data?.success) {
        setMessages([
          ...newMsgList,
          {
            sender: 'assistant',
            text: res.data.answer,
            engine: res.data.engine || 'Intelligence Engine',
            mode: res.data.mode
          }
        ]);
      } else {
        setMessages([
          ...newMsgList,
          {
            sender: 'assistant',
            text: 'I was unable to retrieve that insight right now. Please try again.',
            engine: 'Fallback'
          }
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages([
        ...newMsgList,
        {
          sender: 'assistant',
          text: 'Server error analyzing financial data. Please try again shortly.',
          engine: 'Error'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    'How much did I spend on electricity this month?',
    'Which category has the highest expenses?',
    'Predict my expenses for next month',
    'Compare this month\'s expenses with last month'
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
      {/* Title */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5" /> AI Financial Assistant & Insights
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          Smart Expense Advisor
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Ask questions in plain English or review automated predictions and risk audits.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive Chat Assistant */}
        <div className="lg:col-span-2 flex flex-col h-[580px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          {/* Chat Header */}
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-sm">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">BillMate Intelligence</h3>
                <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Financial Model
                </span>
              </div>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200/50 dark:border-slate-700/50'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>
                {m.engine && m.sender !== 'user' && (
                  <span className="text-[10px] font-semibold text-slate-400 mt-1 pl-1">
                    Powered by: {m.engine}
                  </span>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit text-xs text-slate-400 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                Analyzing your payment ledger...
              </div>
            )}
          </div>

          {/* Sample Prompts Bar */}
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none bg-slate-50/30 dark:bg-slate-900/40">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                className="px-2.5 py-1 text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-full whitespace-nowrap transition-colors shrink-0"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything about your bills and expenses..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Column: Automated Insights & Next 3 Months Forecast */}
        <div className="space-y-6">
          {/* Smart Insights Cards */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Smart Financial Audits</h2>
            </div>

            {loadingInsights ? (
              <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
                Auditing records...
              </div>
            ) : insights.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No critical spending flags detected.</p>
            ) : (
              <div className="space-y-2.5">
                {insights.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border text-xs ${
                      item.type === 'danger'
                        ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300'
                        : item.type === 'warning'
                        ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300'
                        : item.type === 'success'
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                        : 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 text-blue-800 dark:text-blue-300'
                    }`}
                  >
                    <div className="font-bold mb-0.5">{item.title}</div>
                    <p className="opacity-90 leading-relaxed text-[11px]">{item.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3-Month Projection Table */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">3-Month Bill Forecast</h2>
            </div>

            <div className="space-y-2 text-xs">
              {predictions.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">{p.period}</span>
                    <span className="text-[10px] text-slate-400">
                      Fixed: {formatCurrency(p.fixedRecurring, currencySymbol)} • Var: ~{formatCurrency(p.estimatedVariable, currencySymbol)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-slate-900 dark:text-slate-100 text-sm block">
                      {formatCurrency(p.totalProjected, currencySymbol)}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Forecast</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
