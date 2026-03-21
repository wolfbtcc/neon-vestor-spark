import React, { createContext, useContext, useState, useCallback } from 'react';

export type Language = 'pt' | 'en' | 'es';

interface LanguageContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Language, string>> = {
  // Landing page
  'landing.badge': { pt: 'ALGORITMO HFT DE ALTA FREQUÊNCIA', en: 'HIGH FREQUENCY HFT ALGORITHM', es: 'ALGORITMO HFT DE ALTA FRECUENCIA' },
  'landing.subtitle': { pt: 'A origem do', en: 'The origin of', es: 'El origen del' },
  'landing.desc': { pt: 'Tecnologia de elite acessível. Resultados na velocidade da internet moderna.', en: 'Accessible elite technology. Results at the speed of modern internet.', es: 'Tecnología de élite accesible. Resultados a la velocidad de internet moderna.' },
  'landing.login': { pt: 'Entrar', en: 'Login', es: 'Entrar' },
  'landing.register': { pt: 'Cadastre-se', en: 'Sign Up', es: 'Regístrate' },
  'landing.story_title': { pt: 'A História da VORTEX', en: 'The VORTEX Story', es: 'La Historia de VORTEX' },
  'landing.ready': { pt: 'Pronto para começar?', en: 'Ready to start?', es: '¿Listo para empezar?' },
  'landing.footer': { pt: '© 2026 VORTEX — Tecnologia VX1', en: '© 2026 VORTEX — VX1 Technology', es: '© 2026 VORTEX — Tecnología VX1' },

  // Story cards
  'story.1.title': { pt: 'O Ponto de Ruptura em Singapura', en: 'The Breaking Point in Singapore', es: 'El Punto de Ruptura en Singapur' },
  'story.1.text': {
    pt: 'Tudo começou nos servidores de alta vizinhança do centro financeiro de Singapura. Um grupo de engenheiros de sistemas, ex-colaboradores de grandes bolsas de valores, percebeu que o sistema financeiro tradicional era "lento". Enquanto o mundo esperava 24 horas para ver lucros, os grandes bancos ganhavam milhões em milissegundos através de micro-oscilações de câmbio e liquidez.',
    en: 'It all started on the high-proximity servers in Singapore\'s financial center. A group of systems engineers, former contributors to major stock exchanges, realized the traditional financial system was "slow." While the world waited 24 hours to see profits, major banks were making millions in milliseconds through micro-fluctuations in exchange rates and liquidity.',
    es: 'Todo comenzó en los servidores de alta proximidad del centro financiero de Singapur. Un grupo de ingenieros de sistemas, ex-colaboradores de grandes bolsas de valores, se dio cuenta de que el sistema financiero tradicional era "lento". Mientras el mundo esperaba 24 horas para ver ganancias, los grandes bancos ganaban millones en milisegundos a través de micro-oscilaciones de cambio y liquidez.',
  },
  'story.2.title': { pt: 'O Nascimento do VX1', en: 'The Birth of VX1', es: 'El Nacimiento del VX1' },
  'story.2.subtitle': { pt: 'O "Motor de Fluxo"', en: 'The "Flow Engine"', es: 'El "Motor de Flujo"' },
  'story.2.text': {
    pt: 'Eles decidiram que não precisavam mais de bancos. Eles criaram o BOT VX1, um algoritmo de Alta Frequência (HFT) projetado para não dormir. O VX1 não espera o dia acabar para calcular o lucro; ele varre o mercado global em busca de frações de centavos a cada batida de coração. Ele foi apelidado de VX1 porque ele cria um redemoinho de dados que atrai pequenas margens de lucro de milhares de transações que acontecem ao redor do mundo a cada instante.',
    en: 'They decided they no longer needed banks. They created BOT VX1, a High Frequency Trading (HFT) algorithm designed to never sleep. VX1 doesn\'t wait for the day to end to calculate profit; it scans the global market for fractions of cents with every heartbeat. It was nicknamed VX1 because it creates a data vortex that attracts small profit margins from thousands of transactions happening around the world every instant.',
    es: 'Decidieron que ya no necesitaban bancos. Crearon el BOT VX1, un algoritmo de Alta Frecuencia (HFT) diseñado para no dormir. El VX1 no espera a que termine el día para calcular ganancias; recorre el mercado global en busca de fracciones de centavos con cada latido. Fue apodado VX1 porque crea un torbellino de datos que atrae pequeños márgenes de ganancia de miles de transacciones en todo el mundo a cada instante.',
  },
  'story.3.title': { pt: 'A Revolução dos 30 Segundos', en: 'The 30-Second Revolution', es: 'La Revolución de los 30 Segundos' },
  'story.3.text': {
    pt: 'A grande inovação do VX1 foi a quebra da barreira do tempo. Enquanto outras plataformas "Demoram" para te entrega lucros, o VX1 processa as operações em tempo real. A cada 30 segundos, o VX1 finaliza uma micro-operação global e injeta o lucro diretamente na sua conta. Você não precisa esperar horas e horas; você vê a sua evolução financeira acontecer ao vivo, segundo a segundo, na palma da sua mão.',
    en: 'The great innovation of VX1 was breaking the time barrier. While other platforms "take forever" to deliver your profits, VX1 processes operations in real time. Every 30 seconds, VX1 completes a global micro-operation and injects the profit directly into your account. You don\'t need to wait hours; you see your financial evolution happen live, second by second, in the palm of your hand.',
    es: 'La gran innovación del VX1 fue romper la barrera del tiempo. Mientras otras plataformas "tardan" en entregarte ganancias, el VX1 procesa las operaciones en tiempo real. Cada 30 segundos, el VX1 finaliza una micro-operación global e inyecta la ganancia directamente en tu cuenta. No necesitas esperar horas; ves tu evolución financiera en vivo, segundo a segundo, en la palma de tu mano.',
  },
  'story.4.title': { pt: 'O Poder da Escala Global', en: 'The Power of Global Scale', es: 'El Poder de la Escala Global' },
  'story.4.text': {
    pt: 'O VORTEX VX1 conecta o capital de investidores comuns em um único "super-fluxo". Ao colocar apenas $5, o seu saldo se junta ao poder computacional do VX1 para capturar oportunidades que seriam impossíveis sozinho. É a tecnologia de elite, finalmente acessível, entregando resultados na velocidade da internet moderna.',
    en: 'VORTEX VX1 connects the capital of ordinary investors into a single "super-flow." By investing just $5, your balance joins VX1\'s computational power to capture opportunities that would be impossible alone. It\'s elite technology, finally accessible, delivering results at the speed of modern internet.',
    es: 'VORTEX VX1 conecta el capital de inversores comunes en un único "super-flujo". Al colocar solo $5, tu saldo se une al poder computacional del VX1 para capturar oportunidades que serían imposibles solo. Es tecnología de élite, finalmente accesible, entregando resultados a la velocidad de internet moderna.',
  },

  // Dashboard
  'dash.deposit': { pt: 'Depositar', en: 'Deposit', es: 'Depositar' },
  'dash.withdraw': { pt: 'Sacar', en: 'Withdraw', es: 'Retirar' },
  'dash.redeem': { pt: 'Resgatar', en: 'Redeem', es: 'Rescatar' },
  'dash.logout': { pt: 'Sair', en: 'Logout', es: 'Salir' },
  'dash.profile': { pt: 'Meu Perfil', en: 'My Profile', es: 'Mi Perfil' },
  'dash.team': { pt: 'Minha Equipe', en: 'My Team', es: 'Mi Equipo' },
  'dash.history': { pt: 'Histórico de Saques', en: 'Withdrawal History', es: 'Historial de Retiros' },
  'dash.cycles': { pt: 'Ciclos', en: 'Cycles', es: 'Ciclos' },

  // Cards
  'card.balance': { pt: 'Saldo Disponível', en: 'Available Balance', es: 'Saldo Disponible' },
  'card.invested': { pt: 'Capital Aplicado', en: 'Invested Capital', es: 'Capital Invertido' },
  'card.profits': { pt: 'Lucros Acumulados', en: 'Accumulated Profits', es: 'Ganancias Acumuladas' },
  'card.commission': { pt: 'Comissão', en: 'Commission', es: 'Comisión' },
  'card.motor': { pt: 'Motor VX1', en: 'VX1 Engine', es: 'Motor VX1' },
  'card.operational': { pt: 'Operacional', en: 'Operational', es: 'Operacional' },
  'card.active_cycles': { pt: 'Ciclos Ativos', en: 'Active Cycles', es: 'Ciclos Activos' },

  // Profit history
  'profit.title': { pt: 'Histórico de Lucros', en: 'Profit History', es: 'Historial de Ganancias' },
  'profit.gross': { pt: 'Bruto', en: 'Gross', es: 'Bruto' },
  'profit.fee': { pt: 'Taxa', en: 'Fee', es: 'Tasa' },
  'profit.net': { pt: 'Líquido', en: 'Net', es: 'Neto' },
  'profit.empty': { pt: 'Nenhum rendimento registrado ainda.', en: 'No earnings recorded yet.', es: 'Aún no hay ganancias registradas.' },

  // Active cycles
  'cycles.title': { pt: 'Ciclos Ativos', en: 'Active Cycles', es: 'Ciclos Activos' },
  'cycles.none': { pt: 'Nenhum ciclo ativo.', en: 'No active cycles.', es: 'Ningún ciclo activo.' },
  'cycles.day': { pt: 'dia', en: 'day', es: 'día' },
  'cycles.days': { pt: 'dias', en: 'days', es: 'días' },
  'cycles.remaining': { pt: 'restantes', en: 'remaining', es: 'restantes' },
  'cycles.return': { pt: 'Retorno', en: 'Return', es: 'Retorno' },

  // Loyalty pool
  'loyalty.title': { pt: 'Pool de Lealdade', en: 'Loyalty Pool', es: 'Pool de Lealtad' },
  'loyalty.days': { pt: 'dias de lealdade', en: 'loyalty days', es: 'días de lealtad' },

  // Affiliate
  'affiliate.title': { pt: 'VX1 Global Network', en: 'VX1 Global Network', es: 'VX1 Global Network' },
  'affiliate.referrals': { pt: 'Total de Indicados', en: 'Total Referrals', es: 'Total Referidos' },
  'affiliate.earnings': { pt: 'Ganhos de Rede', en: 'Network Earnings', es: 'Ganancias de Red' },
  'affiliate.copy': { pt: 'Copiar Link de Convite', en: 'Copy Invite Link', es: 'Copiar Enlace de Invitación' },
  'affiliate.copied': { pt: 'Link copiado!', en: 'Link copied!', es: '¡Enlace copiado!' },
  'affiliate.level': { pt: 'Nível', en: 'Level', es: 'Nivel' },

  // Withdraw modal
  'withdraw.profits': { pt: 'Sacar Lucros', en: 'Withdraw Profits', es: 'Retirar Ganancias' },
  'withdraw.commission': { pt: 'Sacar Comissão', en: 'Withdraw Commission', es: 'Retirar Comisión' },
  'withdraw.name': { pt: 'Nome', en: 'Name', es: 'Nombre' },
  'withdraw.pix_key': { pt: 'Chave Pix', en: 'Pix Key', es: 'Clave Pix' },
  'withdraw.amount': { pt: 'Valor', en: 'Amount', es: 'Monto' },
  'withdraw.min': { pt: 'Valor mínimo $100', en: 'Minimum value $100', es: 'Valor mínimo $100' },
  'withdraw.confirm': { pt: 'Confirmar Saque', en: 'Confirm Withdrawal', es: 'Confirmar Retiro' },
  'withdraw.method': { pt: 'Método', en: 'Method', es: 'Método' },

  // Deposit modal
  'deposit.title': { pt: 'Depositar', en: 'Deposit', es: 'Depositar' },
  'deposit.choose': { pt: 'Escolha o valor', en: 'Choose amount', es: 'Elige el monto' },
  'deposit.method': { pt: 'Método de pagamento', en: 'Payment method', es: 'Método de pago' },
  'deposit.confirm': { pt: 'Confirmar Depósito', en: 'Confirm Deposit', es: 'Confirmar Depósito' },

  // Redeem
  'redeem.title': { pt: 'Resgatar Capital', en: 'Redeem Capital', es: 'Rescatar Capital' },
  'redeem.no_cycles': { pt: 'Nenhum ciclo ativo para resgatar.', en: 'No active cycles to redeem.', es: 'Ningún ciclo activo para rescatar.' },
  'redeem.early_fee': { pt: 'Taxa de resgate antecipado', en: 'Early redemption fee', es: 'Tasa de rescate anticipado' },
  'redeem.receive': { pt: 'Você receberá', en: 'You will receive', es: 'Recibirás' },
  'redeem.confirm': { pt: 'Confirmar Resgate', en: 'Confirm Redemption', es: 'Confirmar Rescate' },
  'redeem.wait': { pt: 'Aguarde mais para reduzir a taxa', en: 'Wait longer to reduce the fee', es: 'Espera más para reducir la tasa' },

  // Profile
  'profile.title': { pt: 'Meu Perfil', en: 'My Profile', es: 'Mi Perfil' },
  'profile.edit_name': { pt: 'Alterar Nome', en: 'Change Name', es: 'Cambiar Nombre' },
  'profile.save': { pt: 'Salvar', en: 'Save', es: 'Guardar' },
  'profile.email': { pt: 'E-mail', en: 'Email', es: 'Correo' },
  'profile.phone': { pt: 'Telefone', en: 'Phone', es: 'Teléfono' },
  'profile.since': { pt: 'Membro desde', en: 'Member since', es: 'Miembro desde' },
  'profile.referral': { pt: 'Código de indicação', en: 'Referral code', es: 'Código de referencia' },

  // Team
  'team.title': { pt: 'Minha Equipe', en: 'My Team', es: 'Mi Equipo' },
  'team.referred': { pt: 'Indicados', en: 'Referrals', es: 'Referidos' },
  'team.no_referrals': { pt: 'Nenhum indicado ainda.', en: 'No referrals yet.', es: 'Aún no hay referidos.' },

  // Cycles page
  'cycles.page_title': { pt: 'Escolher Ciclo', en: 'Choose Cycle', es: 'Elegir Ciclo' },
  'cycles.no_balance': { pt: 'Saldo insuficiente. Faça um depósito primeiro.', en: 'Insufficient balance. Make a deposit first.', es: 'Saldo insuficiente. Haz un depósito primero.' },
  'cycles.activate': { pt: 'Ativar Protocolo', en: 'Activate Protocol', es: 'Activar Protocolo' },

  // Withdrawal history
  'wh.title': { pt: 'Histórico de Saques', en: 'Withdrawal History', es: 'Historial de Retiros' },
  'wh.pending': { pt: 'Pendente', en: 'Pending', es: 'Pendiente' },
  'wh.completed': { pt: 'Realizado', en: 'Completed', es: 'Realizado' },
  'wh.empty': { pt: 'Nenhum saque realizado.', en: 'No withdrawals made.', es: 'Ningún retiro realizado.' },
  'wh.profits': { pt: 'Saque de Lucros', en: 'Profit Withdrawal', es: 'Retiro de Ganancias' },
  'wh.commission': { pt: 'Saque de Comissão', en: 'Commission Withdrawal', es: 'Retiro de Comisión' },
  'wh.capital': { pt: 'Resgate de Capital', en: 'Capital Redemption', es: 'Rescate de Capital' },

  // Greetings
  'greeting.morning': { pt: 'Bom dia', en: 'Good morning', es: 'Buenos días' },
  'greeting.afternoon': { pt: 'Boa tarde', en: 'Good afternoon', es: 'Buenas tardes' },
  'greeting.evening': { pt: 'Boa noite', en: 'Good evening', es: 'Buenas noches' },

  // Auth
  'auth.login': { pt: 'Entrar', en: 'Login', es: 'Entrar' },
  'auth.register': { pt: 'Cadastre-se', en: 'Sign Up', es: 'Regístrate' },
  'auth.name': { pt: 'Nome completo', en: 'Full name', es: 'Nombre completo' },
  'auth.email': { pt: 'E-mail', en: 'Email', es: 'Correo' },
  'auth.password': { pt: 'Senha', en: 'Password', es: 'Contraseña' },
  'auth.phone': { pt: 'Telefone', en: 'Phone', es: 'Teléfono' },
  'auth.referral': { pt: 'Código de indicação (opcional)', en: 'Referral code (optional)', es: 'Código de referencia (opcional)' },
  'auth.no_account': { pt: 'Não tem conta?', en: 'No account?', es: '¿No tienes cuenta?' },
  'auth.has_account': { pt: 'Já tem conta?', en: 'Already have an account?', es: '¿Ya tienes cuenta?' },
  'auth.welcome': { pt: 'Bem-vindo ao VORTEX', en: 'Welcome to VORTEX', es: 'Bienvenido a VORTEX' },
  'auth.create_account': { pt: 'Criar Conta', en: 'Create Account', es: 'Crear Cuenta' },
  'auth.check_email': { pt: 'Verifique seu e-mail para confirmar o cadastro.', en: 'Check your email to confirm your registration.', es: 'Revisa tu correo para confirmar el registro.' },

  // Performance Bonus
  'dash.bonus': { pt: 'Bônus de Performance', en: 'Performance Bonus', es: 'Bono de Rendimiento' },
  'bonus.title': { pt: 'BÔNUS DE PERFORMANCE', en: 'PERFORMANCE BONUS', es: 'BONO DE RENDIMIENTO' },
  'bonus.subtitle': { pt: 'Alcance metas e ganhe prêmios incríveis', en: 'Reach goals and earn amazing prizes', es: 'Alcanza metas y gana premios increíbles' },
  'bonus.your_volume': { pt: 'Seu volume de indicações', en: 'Your referral volume', es: 'Tu volumen de referencias' },
  'bonus.refer': { pt: 'Indicar', en: 'Refer', es: 'Referir' },
  'bonus.rewards': { pt: 'Recompensas', en: 'Rewards', es: 'Recompensas' },
  'bonus.via_pix': { pt: 'no Pix', en: 'via Pix', es: 'por Pix' },
  'bonus.iphone': { pt: 'iPhone 17 Pro Max', en: 'iPhone 17 Pro Max', es: 'iPhone 17 Pro Max' },
  'bonus.start': { pt: 'Nível Start', en: 'Start Level', es: 'Nivel Start' },
  'bonus.builder': { pt: 'Nível Builder', en: 'Builder Level', es: 'Nivel Builder' },
  'bonus.pro': { pt: 'Nível Pro', en: 'Pro Level', es: 'Nivel Pro' },
  'bonus.elite': { pt: 'Nível Elite', en: 'Elite Level', es: 'Nivel Elite' },
  'bonus.how': { pt: 'Como funciona', en: 'How it works', es: 'Cómo funciona' },
  'bonus.how_text': { pt: 'Indique pessoas para a plataforma. Quando o volume total de depósitos dos seus indicados atingir cada meta, você recebe automaticamente o bônus correspondente via Pix. Os bônus são cumulativos!', en: 'Refer people to the platform. When the total deposit volume from your referrals reaches each goal, you automatically receive the corresponding bonus via Pix. Bonuses are cumulative!', es: 'Refiere personas a la plataforma. Cuando el volumen total de depósitos de tus referidos alcance cada meta, recibes automáticamente el bono correspondiente vía Pix. ¡Los bonos son acumulativos!' },
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('vortex_lang');
    return (saved as Language) || 'pt';
  });

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    localStorage.setItem('vortex_lang', l);
  }, []);

  const t = useCallback((key: string): string => {
    return translations[key]?.[lang] || key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
