import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowLeft, ArrowUpLeft, Check, ChevronLeft, CircleHelp, Clipboard, Clock3, Copy, Gamepad2, Globe2, Info, LayoutDashboard, LockKeyhole, Menu, Plus, Radio, RefreshCw, Server, Shield, ShieldCheck, Signal, Trash2, Wifi, X, Zap } from 'lucide-react';

type Profile = { id: string; name: string; protocol: string; uri: string; createdAt: number };
type Page = 'home' | 'profiles' | 'guide';
type TestState = { status: 'idle' | 'loading' | 'success' | 'error'; ms?: number; message?: string };

const STORAGE_KEY = 'gamepath_profiles_v1';
const SELECTED_KEY = 'gamepath_selected_v1';
const supported = ['vless', 'vmess', 'trojan', 'ss', 'hysteria2', 'hy2', 'tuic'];

function loadProfiles(): Profile[] {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored.filter((item): item is Profile => typeof item?.id === 'string' && typeof item?.uri === 'string' && typeof item?.name === 'string' && typeof item?.protocol === 'string') : [];
  } catch { return []; }
}

function protocolOf(uri: string) {
  const match = uri.match(/^([a-z0-9]+):\/\//i);
  return match && supported.includes(match[1].toLowerCase()) ? match[1].toLowerCase() : null;
}

function nameFromUri(uri: string, protocol: string) {
  const hash = uri.indexOf('#');
  if (hash !== -1) {
    try { const name = decodeURIComponent(uri.slice(hash + 1).replace(/\+/g, ' ')).trim(); if (name) return name.slice(0, 60); } catch { /* use protocol fallback */ }
  }
  return `${protocol.toUpperCase()} جدید`;
}

const nav: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'home', label: 'خانه', icon: LayoutDashboard },
  { id: 'profiles', label: 'کانفیگ‌ها', icon: Server },
  { id: 'guide', label: 'راهنما', icon: CircleHelp },
];

function App() {
  const [page, setPage] = useState<Page>('home');
  const [profiles, setProfiles] = useState<Profile[]>(loadProfiles);
  const [selectedId, setSelectedId] = useState(() => localStorage.getItem(SELECTED_KEY) || '');
  const [showAdd, setShowAdd] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [uriInput, setUriInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const [test, setTest] = useState<TestState>({ status: 'idle' });
  const selected = useMemo(() => profiles.find(p => p.id === selectedId) || null, [profiles, selectedId]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles)); }, [profiles]);
  useEffect(() => { localStorage.setItem(SELECTED_KEY, selectedId); }, [selectedId]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function addProfile(event: React.FormEvent) {
    event.preventDefault();
    const lines = uriInput.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) { setFormError('لینک کانفیگ را وارد کنید.'); return; }
    if (lines.length > 30) { setFormError('هر بار حداکثر ۳۰ کانفیگ وارد کنید.'); return; }
    const invalid = lines.find(line => !protocolOf(line) || /\s/.test(line) || line.length < 12);
    if (invalid) { setFormError('لینک معتبر نیست. از لینک‌های VLESS، VMess، Trojan، SS، Hysteria2 یا TUIC استفاده کنید.'); return; }
    const existing = new Set(profiles.map(p => p.uri));
    const fresh = lines.filter(line => !existing.has(line) && (existing.add(line), true));
    if (!fresh.length) { setFormError('این کانفیگ‌ها قبلاً اضافه شده‌اند.'); return; }
    const created = fresh.map((uri, index) => {
      const protocol = protocolOf(uri)!;
      return { id: crypto.randomUUID(), name: nameInput.trim() && fresh.length === 1 ? nameInput.trim().slice(0, 60) : nameFromUri(uri, protocol), protocol, uri, createdAt: Date.now() + index };
    });
    setProfiles(prev => [...created, ...prev]);
    if (!selectedId) setSelectedId(created[0].id);
    setShowAdd(false); setUriInput(''); setNameInput(''); setFormError('');
    setToast(`${created.length.toLocaleString('fa-IR')} کانفیگ اضافه شد`);
  }

  async function copyProfile(profile: Profile) {
    try {
      await navigator.clipboard.writeText(profile.uri);
      setToast('لینک کپی شد؛ آن را در برنامهٔ فیلترشکن خود وارد کنید.');
    } catch {
      try {
        const input = document.createElement('textarea');
        input.value = profile.uri; input.style.position = 'fixed'; input.style.opacity = '0';
        document.body.appendChild(input); input.select();
        const copied = document.execCommand('copy'); input.remove();
        setToast(copied ? 'لینک کپی شد؛ آن را در برنامهٔ فیلترشکن خود وارد کنید.' : 'کپی ممکن نشد؛ دوباره تلاش کنید.');
      } catch { setToast('کپی ممکن نشد؛ دوباره تلاش کنید.'); }
    }
  }

  function deleteProfile(id: string) {
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (selectedId === id) setSelectedId('');
    setToast('کانفیگ حذف شد');
  }

  async function runTest() {
    setTest({ status: 'loading' });
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    const start = performance.now();
    try {
      await fetch(`https://www.cloudflare.com/cdn-cgi/trace?check=${Date.now()}`, { mode: 'no-cors', cache: 'no-store', signal: controller.signal });
      setTest({ status: 'success', ms: Math.round(performance.now() - start) });
    } catch {
      setTest({ status: 'error', message: 'سنجش انجام نشد. اینترنت خود را بررسی کنید و دوباره تلاش کنید.' });
    } finally { window.clearTimeout(timeout); }
  }

  function navigate(next: Page) { setPage(next); setShowMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function openAdd() { setShowAdd(true); setFormError(''); }

  return (
    <div dir="rtl" className="min-h-screen bg-[#0b0d14] text-[#f4f4f8] selection:bg-violet-500/30" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true"><div className="absolute -top-40 right-[20%] h-[450px] w-[450px] rounded-full bg-violet-700/[0.07] blur-[110px]" /><div className="absolute bottom-0 left-0 h-[350px] w-[350px] rounded-full bg-indigo-600/[0.05] blur-[100px]" /></div>
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-[254px] shrink-0 flex-col border-l border-white/[0.07] bg-[#10121b]/70 px-5 py-7 lg:flex">
          <div className="flex items-center gap-3 px-2"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-[0_8px_30px_rgba(139,92,246,.25)]"><Gamepad2 size={23} strokeWidth={2.2} /></div><div><div className="text-lg font-extrabold tracking-tight">گیم‌پَث</div><div className="text-[11px] font-medium text-[#777b90]">همراه اتصال گیمرها</div></div></div>
          <div className="mt-14 px-3 text-xs font-bold text-[#5f6378]">فضای کار</div>
          <nav className="mt-4 space-y-2" aria-label="ناوبری اصلی">{nav.map(item => <button key={item.id} data-testid={`nav-${item.id}`} onClick={() => navigate(item.id)} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-right text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 ${page === item.id ? 'bg-violet-500/15 text-[#bc9dff]' : 'text-[#9195a8] hover:bg-white/[0.05] hover:text-white'}`}><item.icon size={19} />{item.label}{page === item.id && <span className="mr-auto h-1.5 w-1.5 rounded-full bg-violet-400" />}</button>)}</nav>
          <div className="mt-auto rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"><Shield size={20} className="text-violet-400" /><p className="mt-3 text-sm font-bold">کنترل دست خودته</p><p className="mt-1 text-xs leading-6 text-[#878a9d]">کانفیگ‌های شما فقط روی همین دستگاه ذخیره می‌شوند.</p></div>
          <p className="mt-5 px-2 text-[11px] text-[#595d70]">GAMEPATH · VERSION 1.0</p>
        </aside>

        <div className="min-w-0 flex-1 pb-24 lg:pb-0">
          <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0b0d14]/90 backdrop-blur-xl" style={{ paddingTop: 'env(safe-area-inset-top)' }}><div className="mx-auto flex h-[70px] w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500 text-white lg:hidden"><Gamepad2 size={20} /></div><div className="lg:hidden"><div className="text-base font-extrabold">گیم‌پَث</div><div className="text-[10px] text-[#82869a]">همراه اتصال گیمرها</div></div><div className="hidden text-sm text-[#888c9f] lg:block">داشبورد / <span className="font-semibold text-white">{nav.find(n => n.id === page)?.label}</span></div></div><div className="flex items-center gap-3"><span className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-[#a8aabd] sm:flex"><span className="h-2 w-2 rounded-full bg-[#777b90]" /> وضعیت اتصال: نامشخص</span><button data-testid="header-add-profile" onClick={openAdd} className="hidden min-h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-bold text-white transition-colors hover:bg-violet-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 sm:flex"><Plus size={17} /> افزودن کانفیگ</button><button data-testid="mobile-menu-button" aria-label="باز کردن فهرست" onClick={() => setShowMenu(!showMenu)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-[#b5b6c5] sm:hidden"><Menu size={20} /></button></div></div></header>
          {showMenu && <div className="absolute left-4 right-4 top-[76px] z-30 rounded-2xl border border-white/10 bg-[#202230] p-2 shadow-2xl sm:hidden">{nav.map(item => <button key={item.id} data-testid={`mobile-menu-${item.id}`} onClick={() => navigate(item.id)} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-sm text-white hover:bg-white/10"><item.icon size={18} />{item.label}</button>)}<button data-testid="mobile-menu-add" onClick={() => { setShowMenu(false); openAdd(); }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-sm text-violet-300 hover:bg-white/10"><Plus size={18} />افزودن کانفیگ</button></div>}

          <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
            {page === 'home' && <>
              <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-3 flex items-center gap-2 text-xs font-bold text-violet-300"><span className="h-1.5 w-1.5 rounded-full bg-violet-400" /> فضای گیمینگ شما</div><h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">مسیر بهتر برای <span className="text-[#ac89ff]">بازی آنلاین</span></h1><p className="mt-3 text-sm leading-7 text-[#9295a8]">کانفیگ‌هایت را مرتب نگه دار و وضعیت پاسخ اینترنتت را بسنج.</p></div><span className="flex w-fit items-center gap-2 rounded-full border border-violet-400/15 bg-violet-400/[0.07] px-3 py-2 text-xs text-violet-200"><ShieldCheck size={15} />بدون ادعای کاهش پینگ غیرواقعی</span></div>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
                <section className="relative overflow-hidden rounded-[28px] border border-violet-400/20 bg-gradient-to-br from-[#292041] via-[#1d1b30] to-[#151823] p-6 shadow-[0_24px_80px_rgba(0,0,0,.18)] sm:p-8"><div className="absolute -left-14 -top-24 h-64 w-64 rounded-full border border-violet-300/[0.07]" /><div className="absolute -left-4 -top-12 h-44 w-44 rounded-full border border-violet-300/[0.08]" /><div className="relative"><div className="flex items-start justify-between gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-400/15 text-[#b99aff]"><Shield size={25} /></div><span data-testid="connection-status" className="flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-2 text-xs font-semibold text-[#b9b5c7]"><span className="h-2 w-2 rounded-full bg-[#858395]" />اتصال در این برنامه فعال نیست</span></div><div className="mt-12 text-xs font-bold text-[#b8a9d5]">کانفیگ انتخاب‌شده</div><h2 data-testid="selected-profile-name" className="mt-2 break-words text-2xl font-extrabold sm:text-3xl">{selected ? selected.name : 'هنوز کانفیگی نداری'}</h2><p className="mt-2 text-sm text-[#aaa6bc]">{selected ? `${selected.protocol.toUpperCase()} · آماده برای انتقال به برنامهٔ فیلترشکن` : 'برای شروع، لینک کانفیگ خودت را اضافه کن.'}</p><div className="mt-10 flex flex-col gap-3 sm:flex-row">{selected ? <button data-testid="copy-selected-profile" onClick={() => copyProfile(selected)} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 text-sm font-bold text-white transition-colors hover:bg-violet-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"><Copy size={17} /> کپی برای برنامهٔ فیلترشکن</button> : <button data-testid="hero-add-profile" onClick={openAdd} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 text-sm font-bold text-white transition-colors hover:bg-violet-400"><Plus size={18} /> افزودن اولین کانفیگ</button>}<button data-testid="hero-guide" onClick={() => navigate('guide')} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10">راهنمای اتصال <ArrowUpLeft size={16} /></button></div></div></section>
                <section className="rounded-[28px] border border-white/[0.08] bg-[#151720] p-6 sm:p-7"><div className="flex items-center justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300"><Activity size={22} /></div><span className="text-xs text-[#777b90]">سنجش درخواستی</span></div><h2 className="mt-6 text-lg font-extrabold">زمان پاسخ اینترنت</h2><p className="mt-2 text-sm leading-7 text-[#9497a9]">زمان رسیدن درخواست به یک وب‌سایت را بسنج؛ این عدد پینگ سرور بازی نیست.</p><div className="mt-7 flex items-end gap-2"><strong data-testid="latency-result" className="text-4xl font-extrabold tabular-nums text-white">{test.status === 'success' ? test.ms?.toLocaleString('fa-IR') : '—'}</strong><span className="pb-1 text-sm text-[#8e91a5]">{test.status === 'success' ? 'میلی‌ثانیه' : ''}</span></div>{test.status === 'error' && <p data-testid="latency-error" className="mt-3 text-xs leading-6 text-rose-300">{test.message}</p>}<button data-testid="run-latency-test" disabled={test.status === 'loading'} onClick={runTest} className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] text-sm font-bold text-white transition-colors hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"><RefreshCw size={16} className={test.status === 'loading' ? 'animate-spin' : ''} />{test.status === 'loading' ? 'در حال سنجش…' : test.status === 'success' ? 'سنجش دوباره' : 'شروع سنجش'}</button></section>
              </div>
              <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2"><section className="rounded-[24px] border border-white/[0.08] bg-[#151720] p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-extrabold">کانفیگ‌های من</h2><p className="mt-1 text-sm text-[#85899d]">دسترسی سریع به لینک‌های ذخیره‌شده</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-violet-300"><Server size={20} /></div></div>{profiles.length ? <div className="mt-5 space-y-2">{profiles.slice(0, 3).map(p => <button key={p.id} data-testid={`home-profile-${p.id}`} onClick={() => setSelectedId(p.id)} className={`flex min-h-16 w-full items-center gap-3 rounded-xl border px-3 text-right transition-colors ${selectedId === p.id ? 'border-violet-400/30 bg-violet-400/[0.08]' : 'border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.05]'}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-400/10 text-violet-300"><Globe2 size={18} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{p.name}</span><span className="block text-xs text-[#898ca0]">{p.protocol.toUpperCase()}</span></span>{selectedId === p.id ? <Check size={17} className="text-violet-300" /> : <ChevronLeft size={16} className="text-[#74788b]" />}</button>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-white/10 px-4 py-7 text-center text-sm text-[#85899d]">هنوز کانفیگی ثبت نشده است.</div>}<button data-testid="view-all-profiles" onClick={() => navigate('profiles')} className="mt-5 flex min-h-11 items-center gap-2 text-sm font-bold text-violet-300 transition-colors hover:text-violet-200">مشاهده همه کانفیگ‌ها <ArrowLeft size={16} /></button></section>
              <section className="rounded-[24px] border border-white/[0.08] bg-[#151720] p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-extrabold">برای بازی روان‌تر</h2><p className="mt-1 text-sm text-[#85899d]">چند نکته کاربردی، بدون وعدهٔ غیرواقعی</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-violet-300"><Zap size={20} /></div></div><div className="mt-6 space-y-5">{[{ icon: Wifi, title: 'اتصال پایدارتر', text: 'اگر ممکن است از وای‌فای پایدار یا کابل شبکه استفاده کن.' }, { icon: Globe2, title: 'سرور نزدیک‌تر', text: 'سرور نزدیک به موقعیت خودت و سرور بازی را امتحان کن.' }, { icon: Signal, title: 'نتیجه را در خود بازی بسنج', text: 'پینگ واقعی را از داخل بازی ببین و چند مسیر را مقایسه کن.' }].map((tip, i) => <div key={i} className="flex gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-400/[0.08] text-violet-300"><tip.icon size={17} /></div><div><h3 className="text-sm font-bold">{tip.title}</h3><p className="mt-1 text-xs leading-6 text-[#9295a7]">{tip.text}</p></div></div>)}</div></section></div>
              <div className="mt-8 flex items-start gap-3 rounded-2xl border border-violet-300/10 bg-violet-300/[0.04] p-4 text-sm leading-7 text-[#a7a6b7]"><Info size={19} className="mt-1 shrink-0 text-violet-300" /><p>این برنامه تونل VPN ایجاد نمی‌کند و به ترافیک بازی دسترسی ندارد. برای اتصال واقعی، کانفیگ را در یک برنامهٔ فیلترشکن سازگار وارد کن.</p></div>
            </>}
            {page === 'profiles' && <><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><span className="text-xs font-bold text-violet-300">مدیریت اتصال‌ها</span><h1 className="mt-2 text-3xl font-extrabold">کانفیگ‌های من</h1><p className="mt-3 text-sm leading-7 text-[#9295a8]">لینک‌ها فقط روی این دستگاه نگهداری می‌شوند و به جایی ارسال نمی‌شوند.</p></div><button data-testid="profiles-add" onClick={openAdd} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 text-sm font-bold text-white transition-colors hover:bg-violet-400"><Plus size={18} />افزودن کانفیگ</button></div><div className="mt-8 rounded-[24px] border border-white/[0.08] bg-[#151720] p-4 sm:p-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-base font-bold">لیست کانفیگ‌ها</h2><span data-testid="profile-count" className="rounded-lg bg-white/[0.05] px-3 py-1.5 text-xs text-[#a2a4b4]">{profiles.length.toLocaleString('fa-IR')} مورد</span></div>{profiles.length === 0 ? <div data-testid="profiles-empty" className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300"><Server size={28} /></div><h3 className="mt-5 font-bold">اینجا هنوز خالیه</h3><p className="mt-2 max-w-sm text-sm leading-7 text-[#8f92a5]">لینک کانفیگ‌هات را اضافه کن تا همیشه دم دست باشند.</p><button data-testid="empty-add-profile" onClick={openAdd} className="mt-6 min-h-11 rounded-xl bg-violet-500 px-5 text-sm font-bold text-white hover:bg-violet-400">افزودن کانفیگ</button></div> : <div className="space-y-3">{profiles.map(p => <div key={p.id} data-testid={`profile-row-${p.id}`} className={`flex flex-col gap-4 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center ${selectedId === p.id ? 'border-violet-400/30 bg-violet-400/[0.06]' : 'border-white/[0.07] bg-white/[0.02]'}`}><div className="flex min-w-0 flex-1 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300"><Globe2 size={20} /></div><div className="min-w-0"><div className="truncate text-sm font-bold">{p.name}</div><div className="mt-1 flex items-center gap-2 text-xs text-[#8b8ea1]"><span className="font-mono">{p.protocol.toUpperCase()}</span><span>·</span><span>{new Date(p.createdAt).toLocaleDateString('fa-IR')}</span></div></div></div><div className="flex flex-wrap items-center gap-2"><button data-testid={`select-profile-${p.id}`} onClick={() => { setSelectedId(p.id); setToast('کانفیگ انتخاب شد'); }} className={`min-h-10 flex-1 rounded-xl px-3 text-xs font-bold transition-colors sm:flex-none ${selectedId === p.id ? 'bg-violet-400/15 text-violet-300' : 'bg-white/[0.05] text-[#c1c2ce] hover:bg-white/10'}`}>{selectedId === p.id ? 'انتخاب‌شده' : 'انتخاب'}</button><button data-testid={`copy-profile-${p.id}`} onClick={() => copyProfile(p)} className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-500 px-3 text-xs font-bold text-white hover:bg-violet-400 sm:flex-none"><Copy size={14} />کپی لینک</button><button data-testid={`delete-profile-${p.id}`} onClick={() => deleteProfile(p.id)} aria-label={`حذف ${p.name}`} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-[#999bad] hover:border-rose-400/20 hover:text-rose-300"><Trash2 size={16} /></button></div></div>)}</div>}</div><div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-xs leading-6 text-[#989bac]"><LockKeyhole size={18} className="mt-0.5 shrink-0 text-violet-300" /><span>لینک کانفیگ ممکن است حاوی اطلاعات دسترسی باشد؛ آن را فقط با افراد مورداعتماد به اشتراک بگذار. حذف داده‌های مرورگر، کانفیگ‌های ذخیره‌شده را هم پاک می‌کند.</span></div></>}
            {page === 'guide' && <><span className="text-xs font-bold text-violet-300">شروع سریع</span><h1 className="mt-2 text-3xl font-extrabold">راهنمای استفاده</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[#9295a8]">این برنامه برای نظم‌دادن به کانفیگ‌ها و سنجش پاسخ وب ساخته شده است. اتصال واقعی را برنامهٔ فیلترشکن انجام می‌دهد.</p><div className="mt-9 grid grid-cols-1 gap-4 md:grid-cols-3">{[{ number: '۰۱', icon: Clipboard, title: 'کانفیگ را اضافه کن', text: 'لینک کانفیگ شخصی‌ات را از سرویس‌دهنده بگیر و در بخش کانفیگ‌ها بچسبان. می‌توانی چند لینک را در خط‌های جدا وارد کنی.' }, { number: '۰۲', icon: Copy, title: 'لینک را کپی کن', text: 'کانفیگ دلخواهت را انتخاب کن و دکمهٔ کپی لینک را بزن.' }, { number: '۰۳', icon: ArrowUpLeft, title: 'در برنامهٔ سازگار وارد کن', text: 'برنامهٔ فیلترشکن سازگار با نوع لینک را باز کن، از حافظهٔ موقت وارد کن و اتصال را همان‌جا برقرار کن.' }].map(step => <div key={step.number} className="rounded-[24px] border border-white/[0.08] bg-[#151720] p-6"><div className="flex items-center justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300"><step.icon size={22} /></div><span className="text-2xl font-extrabold text-white/10">{step.number}</span></div><h2 className="mt-7 text-base font-extrabold">{step.title}</h2><p className="mt-2 text-sm leading-7 text-[#9295a8]">{step.text}</p></div>)}</div><div className="mt-8 rounded-[24px] border border-white/[0.08] bg-[#151720] p-6 sm:p-8"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300"><Radio size={20} /></div><h2 className="text-lg font-extrabold">دربارهٔ پینگ بازی</h2></div><p className="mt-5 text-sm leading-8 text-[#a5a7b7]">زمان پاسخ نمایش‌داده‌شده در صفحهٔ خانه فقط مدت یک درخواست وب به Cloudflare است؛ نه پینگ سرور بازی، نه سرعت VPN و نه تضمین کاهش تأخیر. برای بررسی نتیجه، پس از اتصال در برنامهٔ فیلترشکن، پینگ را از داخل خود بازی ببین. مسیر و کیفیت سرویس‌دهنده می‌تواند تأخیر را کمتر یا حتی بیشتر کند.</p><button data-testid="guide-test" onClick={() => navigate('home')} className="mt-5 flex min-h-11 items-center gap-2 text-sm font-bold text-violet-300 hover:text-violet-200">رفتن به صفحهٔ اصلی <ArrowLeft size={16} /></button></div><div className="mt-6 rounded-[24px] border border-violet-400/15 bg-violet-400/[0.05] p-6"><h2 className="flex items-center gap-2 text-base font-extrabold"><Info size={19} className="text-violet-300" />چرا دکمهٔ اتصال وجود ندارد؟</h2><p className="mt-3 text-sm leading-8 text-[#aaa9b9]">ایجاد VPN واقعی به دسترسی سیستمی نیاز دارد که این برنامه در اختیار ندارد. نشان‌دادن «متصل شد» بدون ساخت تونل واقعی گمراه‌کننده است؛ برای همین اینجا فقط لینک را آمادهٔ انتقال می‌کنیم.</p></div><button data-testid="guide-add-profile" onClick={openAdd} className="mt-7 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-500 px-6 text-sm font-bold text-white hover:bg-violet-400"><Plus size={18} />افزودن کانفیگ</button></>}
          </main>
          <footer className="mx-auto w-full max-w-6xl border-t border-white/[0.06] px-4 py-6 text-center text-xs leading-6 text-[#64687b] sm:px-6 lg:px-8">گیم‌پَث · همراه مدیریت کانفیگ برای بازی آنلاین</footer>
        </div>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex min-h-[68px] items-center justify-around border-t border-white/10 bg-[#141620]/95 px-2 backdrop-blur-xl lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="ناوبری پایین">{nav.map(item => <button key={item.id} data-testid={`bottom-nav-${item.id}`} onClick={() => navigate(item.id)} className={`flex min-h-14 min-w-[72px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold transition-colors ${page === item.id ? 'text-violet-300' : 'text-[#777b8f] hover:text-white'}`}><item.icon size={20} strokeWidth={page === item.id ? 2.3 : 1.8} />{item.label}</button>)}</nav>
      {showAdd && <div data-testid="add-profile-modal" className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={e => { if (e.target === e.currentTarget) setShowAdd(false); }}><div role="dialog" aria-modal="true" aria-labelledby="add-title" className="w-full max-w-lg rounded-t-[28px] border border-white/10 bg-[#1b1d28] p-5 shadow-2xl sm:rounded-[28px] sm:p-7" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300"><Plus size={21} /></div><div><h2 id="add-title" className="text-lg font-extrabold">افزودن کانفیگ</h2><p className="text-xs text-[#85899d]">لینک خودت را اینجا وارد کن</p></div></div><button data-testid="close-add-modal" aria-label="بستن" onClick={() => setShowAdd(false)} className="flex h-10 w-10 items-center justify-center rounded-xl text-[#a3a5b5] hover:bg-white/10"><X size={20} /></button></div><form onSubmit={addProfile} className="mt-7 space-y-5"><div><label htmlFor="profile-name" className="mb-2 block text-sm font-bold">نام دلخواه <span className="font-normal text-[#777b8e]">(اختیاری)</span></label><input data-testid="profile-name-input" id="profile-name" value={nameInput} onChange={e => setNameInput(e.target.value)} maxLength={60} placeholder="مثلاً سرور بازی من" className="min-h-12 w-full rounded-xl border border-white/10 bg-[#10121b] px-4 text-sm text-white outline-none placeholder:text-[#666a7d] focus:border-violet-400" /></div><div><label htmlFor="profile-uri" className="mb-2 block text-sm font-bold">لینک کانفیگ</label><textarea data-testid="profile-uri-input" id="profile-uri" dir="ltr" value={uriInput} onChange={e => { setUriInput(e.target.value); if (formError) setFormError(''); }} rows={5} spellCheck={false} placeholder="vless://..." className="w-full resize-y rounded-xl border border-white/10 bg-[#10121b] px-4 py-3 text-left font-mono text-sm leading-7 text-white outline-none placeholder:text-[#666a7d] focus:border-violet-400" /><p className="mt-2 text-xs leading-6 text-[#85899d]">پشتیبانی از VLESS، VMess، Trojan، SS، Hysteria2 و TUIC. برای افزودن چند کانفیگ، هر لینک را در یک خط بنویس.</p>{formError && <p data-testid="profile-form-error" role="alert" className="mt-2 text-xs leading-6 text-rose-300">{formError}</p>}</div><button data-testid="save-profile" type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-500 text-sm font-bold text-white transition-colors hover:bg-violet-400"><Plus size={18} />ذخیرهٔ کانفیگ</button></form></div></div>}
      {toast && <div data-testid="toast" role="status" className="fixed bottom-24 left-4 right-4 z-[60] mx-auto w-fit max-w-[calc(100%-2rem)] rounded-xl border border-violet-400/25 bg-[#29243b] px-5 py-3 text-center text-sm font-semibold leading-6 text-white shadow-2xl lg:bottom-6">{toast}</div>}
    </div>
  );
}

export default App;
