'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Send, ShieldCheck } from 'lucide-react';
import type { Translations } from '@/lib/i18n';
import type {
  AirQualitySnapshot,
  ChatMessage,
  HouseholdProfile,
  LanguageCode,
} from '@/lib/types';

interface AssistantViewProps {
  snapshot: AirQualitySnapshot;
  profile: HouseholdProfile;
  language: LanguageCode;
  t: Translations;
  messages: ChatMessage[];
  onMessagesChange: (next: ChatMessage[]) => void;
}

const SUGGESTED_QUESTIONS_EN = [
  'Can my 6-year-old play outside at 5 PM?',
  'Is it safe to open windows right now?',
  'Which mask works best for a two-wheeler commute?',
  'How can we clean bedroom air on a low budget?',
];

const SUGGESTED_QUESTIONS_HI = [
  'क्या मेरा 6 साल का बच्चा शाम 5 बजे बाहर खेल सकता है?',
  'क्या अभी खिड़कियाँ खोलना सुरक्षित है?',
  'दो-पहिया सफ़र के लिए कौन सा मास्क सबसे सही है?',
  'कम बजट में बेडरूम की हवा कैसे साफ़ रखें?',
];

export function AssistantView({
  snapshot,
  profile,
  language,
  t,
  messages,
  onMessagesChange,
}: AssistantViewProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const msgSeqRef = useRef(0);

  const isHi = language === 'hi';
  const suggestions = isHi ? SUGGESTED_QUESTIONS_HI : SUGGESTED_QUESTIONS_EN;

  async function submitQuestion(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setErrorMsg(null);
    msgSeqRef.current += 1;
    const userMsg: ChatMessage = {
      id: `user-${msgSeqRef.current}`,
      role: 'user',
      content: trimmed,
      timestampIso: new Date().toISOString(),
    };
    const nextHistory = [...messages, userMsg];
    onMessagesChange(nextHistory);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          language,
          history: nextHistory.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          snapshot,
          profile,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not reach assistant.');
      }

      msgSeqRef.current += 1;
      const replyMsg: ChatMessage = {
        id: `assistant-${msgSeqRef.current}`,
        role: 'assistant',
        content: data.reply,
        timestampIso: new Date().toISOString(),
        source: data.source,
        groundedAqi: data.groundedAqi,
      };
      onMessagesChange([...nextHistory, replyMsg]);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to send question right now.'
      );
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void submitQuestion(input);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#131C26]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              {t.assistantTitle}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {t.assistantSubtitle}
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums dark:text-slate-400">
            {snapshot.locationName} · AQI {snapshot.aqi} · PM2.5 {snapshot.pm25} µg/m³
          </div>
        </div>

        {/* Suggested prompts */}
        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((q) => (
            <button
              key={q}
              type="button"
              disabled={sending}
              onClick={() => void submitQuestion(q)}
              className="min-h-[40px] rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:border-teal-600 hover:text-teal-800 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-teal-400 dark:hover:text-teal-300"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation thread */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#131C26]">
        <div
          className="max-h-[440px] min-h-[280px] space-y-5 overflow-y-auto p-6"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              {isHi
                ? 'ऊपर दिए गए किसी प्रश्न को चुनें या नीचे अपना सवाल लिखें। उत्तर आपके लाइव AQI और परिवार प्रोफ़ाइल के आधार पर होगा।'
                : 'Select a suggested question above or type your own below. Every answer uses your live AQI forecast and household profile.'}
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div className="mb-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium">
                    {msg.role === 'user' ? (isHi ? 'आप' : 'You') : 'AirWise'}
                  </span>
                  {msg.groundedAqi !== undefined && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        Grounded in AQI {msg.groundedAqi}
                      </span>
                    </>
                  )}
                  {msg.source === 'rule-fallback' && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{isHi ? 'नियम-आधारित' : 'Rule-based fallback'}</span>
                    </>
                  )}
                </div>
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-teal-700 text-white dark:bg-teal-600'
                      : 'border border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{isHi ? 'लाइव AQI डेटा जाँचा जा रहा है...' : 'Checking live AQI forecast and household context...'}</span>
            </div>
          )}
        </div>

        {errorMsg && (
          <div role="alert" className="border-t border-rose-200 bg-rose-50 px-6 py-3 text-xs font-medium text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
            {errorMsg}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-3 border-t border-slate-200 p-4 dark:border-slate-800"
        >
          <label htmlFor="assistant-input" className="sr-only">
            {t.assistantPlaceholder}
          </label>
          <input
            id="assistant-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={500}
            placeholder={t.assistantPlaceholder}
            className="min-h-[44px] flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-50 whitespace-nowrap shrink-0 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            <span>{t.assistantSend}</span>
          </button>
        </form>
      </div>

      <div className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" aria-hidden="true" />
        <p>
          {isHi
            ? 'AirWise सामान्य पर्यावरण मार्गदर्शन देता है, चिकित्सा सलाह नहीं। अस्थमा या हृदय लक्षण बढ़ने पर डॉक्टर से मिलें।'
            : 'AirWise provides general environmental guidance, not medical advice. Consult a doctor for respiratory or heart symptoms.'}
        </p>
      </div>
    </div>
  );
}
