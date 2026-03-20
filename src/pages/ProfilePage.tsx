import { useState } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Calendar, Edit3, Check } from 'lucide-react';
import { toast } from 'sonner';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function ProfilePage() {
  const { user, updateUserName } = usePlatform();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');

  if (!user) { navigate('/'); return null; }

  const handleSave = () => {
    if (!newName.trim()) { toast.error('Nome não pode ser vazio'); return; }
    updateUserName(newName.trim());
    setEditing(false);
    toast.success('Nome atualizado!');
  };

  const created = new Date(user.createdAt);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center h-14 px-4 gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-foreground transition-colors active:scale-95">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-display font-bold gradient-text-cyan tracking-wider">MEU PERFIL</h1>
        </div>
      </header>

      <main className="container px-4 py-6 max-w-lg mx-auto space-y-5">
        {/* Greeting */}
        <div className="neon-card text-center py-6">
          <p className="text-muted-foreground text-sm mb-1">{getGreeting()},</p>
          <h2 className="text-2xl font-display font-bold text-neon-cyan">{user.name}</h2>
        </div>

        {/* Profile info */}
        <div className="neon-card space-y-4">
          <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Dados da Conta</h3>

          {/* Name - editable */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
            <User className="w-5 h-5 text-neon-cyan shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Nome</p>
              {editing ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="flex-1 px-2 py-1 rounded-lg bg-background border border-border focus:border-neon-cyan/50 focus:outline-none text-sm"
                    autoFocus
                  />
                  <button onClick={handleSave} className="p-1.5 rounded-lg bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 transition-colors">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{user.name}</p>
                  <button onClick={() => { setNewName(user.name); setEditing(true); }} className="p-1 text-muted-foreground hover:text-neon-cyan transition-colors">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
            <Mail className="w-5 h-5 text-neon-cyan shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Email</p>
              <p className="text-sm text-foreground">{user.email}</p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
            <Phone className="w-5 h-5 text-neon-cyan shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Telefone</p>
              <p className="text-sm text-foreground">{user.phone || 'Não informado'}</p>
            </div>
          </div>

          {/* Created at */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
            <Calendar className="w-5 h-5 text-neon-cyan shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Membro desde</p>
              <p className="text-sm text-foreground">{created.toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </div>

        {/* Referral code */}
        <div className="neon-card">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Código de Referência</p>
          <p className="text-sm font-mono-data text-neon-cyan">{user.referralCode}</p>
        </div>
      </main>
    </div>
  );
}
