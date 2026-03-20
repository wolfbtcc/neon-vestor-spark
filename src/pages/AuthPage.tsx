import { useState } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const { login, register } = usePlatform();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') || '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { toast.error('Preencha todos os campos'); return; }
    if (password.length < 6) { toast.error('Senha deve ter no mínimo 6 caracteres'); return; }

    if (isLogin) {
      if (login(email, password)) {
        toast.success('Login realizado!');
        navigate('/dashboard');
      } else {
        toast.error('Credenciais inválidas');
      }
    } else {
      if (!name.trim()) { toast.error('Preencha o nome'); return; }
      if (register(name, email, password, refCode)) {
        toast.success('Conta criada com sucesso!');
        navigate('/dashboard');
      } else {
        toast.error('Email já cadastrado');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full opacity-20 blur-3xl" style={{ background: 'hsl(152 70% 45%)' }} />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full opacity-15 blur-3xl" style={{ background: 'hsl(200 80% 50%)' }} />

      <div className="w-full max-w-sm animate-fade-up">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text-neon" style={{ lineHeight: '1.2' }}>NeonVest</h1>
          <p className="text-muted-foreground text-sm mt-2">Plataforma de investimentos</p>
        </div>

        <form onSubmit={handleSubmit} className="neon-card glow-border-green space-y-4">
          <h2 className="text-lg font-semibold">{isLogin ? 'Entrar' : 'Criar conta'}</h2>

          {!isLogin && (
            <input
              type="text"
              placeholder="Nome completo"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:border-neon-green/50 focus:outline-none focus:ring-1 focus:ring-neon-green/30 transition-all text-sm"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:border-neon-green/50 focus:outline-none focus:ring-1 focus:ring-neon-green/30 transition-all text-sm"
          />
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-10 rounded-lg bg-muted border border-border focus:border-neon-green/50 focus:outline-none focus:ring-1 focus:ring-neon-green/30 transition-all text-sm"
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {!isLogin && refCode && (
            <div className="text-xs text-neon-green bg-neon-green/10 rounded-lg px-3 py-2">
              Código de referência: <span className="font-mono-data">{refCode}</span>
            </div>
          )}

          <button type="submit" className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all active:scale-[0.98] glow-green">
            {isLogin ? 'Entrar' : 'Criar conta'}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? 'Não tem conta?' : 'Já tem conta?'}{' '}
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-neon-green hover:underline">
              {isLogin ? 'Cadastre-se' : 'Faça login'}
            </button>
          </p>

          {isLogin && (
            <p className="text-center text-xs text-muted-foreground">
              Admin: admin@platform.com / admin123
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
