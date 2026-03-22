import { useState, useEffect } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft, ChevronDown } from 'lucide-react';
import globeBg from '@/assets/globe-bg.png';
import { COUNTRIES, validatePhone } from '@/lib/countries';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const refCode = searchParams.get('ref') || '';
  const [isLogin, setIsLogin] = useState(mode !== 'register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryList, setShowCountryList] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login, register, user } = usePlatform();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  useEffect(() => {
    setIsLogin(mode !== 'register');
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!email.trim() || !password.trim()) { toast.error('Preencha todos os campos'); return; }
    if (password.length < 6) { toast.error('Senha deve ter no mínimo 6 caracteres'); return; }
    if (!isLogin && password !== confirmPassword) { toast.error('As senhas não coincidem'); return; }
    setSubmitting(true);
    try {
      if (isLogin) {
        const success = await login(email, password);
        if (success) {
          toast.success('Login realizado!');
          navigate('/dashboard');
        } else {
          toast.error('Credenciais inválidas');
        }
      } else {
        if (!name.trim()) { toast.error('Preencha o nome'); setSubmitting(false); return; }
        if (!phone.trim()) { toast.error('Preencha o telefone'); setSubmitting(false); return; }
        if (!validatePhone(phone, selectedCountry.code)) {
          toast.error(`Número de telefone inválido para ${selectedCountry.name}. Inclua o DDD.`);
          setSubmitting(false);
          return;
        }
        const fullPhone = `${selectedCountry.dial} ${phone}`;
        const success = await register(name, email, password, refCode, fullPhone, selectedCountry.code);
        if (success) {
          toast.success('Conta criada com sucesso!');
          navigate('/dashboard');
        } else {
          toast.error('Email já cadastrado');
        }
      }
    } catch (err) {
      toast.error('Erro ao processar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
        <img src={globeBg} alt="" className="w-[60vw] max-w-[500px] opacity-[0.05] animate-[spin_120s_linear_infinite]" />
      </div>

      <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full opacity-20 blur-3xl" style={{ background: 'hsl(var(--neon-green))' }} />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full opacity-15 blur-3xl" style={{ background: 'hsl(var(--neon-blue))' }} />

      <div className="w-full max-w-sm animate-fade-up relative z-10">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text-neon" style={{ lineHeight: '1.2' }}>VORTEX</h1>
          <p className="text-muted-foreground text-sm mt-2">Plataforma de investimentos VX1</p>
        </div>

        <form onSubmit={handleSubmit} className="neon-card glow-border-green space-y-4">
          <h2 className="text-lg font-semibold">{isLogin ? 'Entrar' : 'Criar conta'}</h2>

          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="Nome completo"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all text-sm"
              />

              {/* Phone with country selector */}
              <div className="space-y-1">
                <div className="flex gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCountryList(!showCountryList)}
                      className="flex items-center gap-1 px-3 py-3 rounded-lg bg-muted border border-border hover:border-primary/50 transition-all text-sm min-w-[100px]"
                    >
                      <span className="text-base">{selectedCountry.flag}</span>
                      <span className="text-xs text-muted-foreground">{selectedCountry.dial}</span>
                      <ChevronDown className="w-3 h-3 text-muted-foreground ml-auto" />
                    </button>
                    {showCountryList && (
                      <div className="absolute top-full left-0 mt-1 w-64 max-h-48 overflow-y-auto rounded-xl bg-card border border-border shadow-xl z-50">
                        {COUNTRIES.map(c => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => { setSelectedCountry(c); setShowCountryList(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left text-sm"
                          >
                            <span>{c.flag}</span>
                            <span className="text-foreground flex-1">{c.name}</span>
                            <span className="text-muted-foreground text-xs">{c.dial}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="tel"
                    placeholder="DDD + Número"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/[^\d]/g, ''))}
                    className="flex-1 px-4 py-3 rounded-lg bg-muted border border-border focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all text-sm"
                  />
                </div>
              </div>
            </>
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all text-sm"
          />
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-10 rounded-lg bg-muted border border-border focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all text-sm"
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {!isLogin && (
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Confirmar senha"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 pr-10 rounded-lg bg-muted border border-border focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all text-sm"
              />
            </div>
          )}

          {!isLogin && refCode && (
            <div className="text-xs text-primary bg-primary/10 rounded-lg px-3 py-2">
              Código de referência: <span className="font-mono-data">{refCode}</span>
            </div>
          )}

          <button type="submit" disabled={submitting} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all active:scale-[0.97] glow-green disabled:opacity-50">
            {submitting ? 'Processando...' : (isLogin ? 'Entrar' : 'Criar conta')}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? 'Não tem conta?' : 'Já tem conta?'}{' '}
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline">
              {isLogin ? 'Cadastre-se' : 'Faça login'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
