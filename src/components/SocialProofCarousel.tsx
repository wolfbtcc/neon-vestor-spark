import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const userDatabase = [
  { p: "🇧🇷 Brasil", n: ["Ricardo","Fernanda","Bruno","Camila","Thiago","Letícia","Marcos","Beatriz","Rafael","Mirelly","Gabriel","Juliana","Felipe","Adriana","Marcelo","Larissa","Gustavo","Patrícia","André","Bianca","Daniel","Carla","Rodrigo","Priscila","Vitor","Simone","Eduardo","Vanessa","Hugo","Aline","Leonardo","Tatiana","Douglas","Monique","Caio","Lorena","Igor","Débora","Samuel","Renata","Wesley","Jéssica","Arthur","Mônica","Renan","Sabrina","Danilo","Cíntia","Paulo","Erica"] },
  { p: "🇺🇸 USA", n: ["James","Sarah","Robert","Emily","Michael","Jessica","David","Jennifer","William","Ashley","Joseph","Taylor","Thomas","Megan","Charles","Hannah","Christopher","Emma","Daniel","Olivia","Matthew","Isabella","Anthony","Sophia","Mark","Ava","Steven","Mia","Paul","Charlotte","Andrew","Amelia","Kenneth","Evelyn","Joshua","Abigail","George","Harper","Kevin","Elizabeth","Brian","Madison","Edward","Avery","Ronald","Sofia","Timothy","Ella","Jason","Chloe"] },
  { p: "🇪🇸 España", n: ["Javier","Elena","Alejandro","Sofia","Diego","Lucía","Manuel","Martina","Pablo","Paula","Álvaro","Maria","Adrián","Julia","David","Alba","Marcos","Sara","Sergio","Irene","Iván","Emma","Jorge","Claudia","Raúl","Noa","Rubén","Carla","Mateo","Lola","Lucas","Aitana","Ángel","Marta","Víctor","Valeria","Ignacio","Jimena","Hugo","Carmen","Fernando","Natalia","Carlos","Daniela","Jose","Nerea","Fran","Clara","Rafa","Olga"] },
  { p: "🇵🇹 Portugal", n: ["João","Margarida","Rui","Ana","Tiago","Beatriz","Miguel","Sofia","Francisco","Mariana","Pedro","Leonor","Gonçalo","Matilde","Duarte","Inês","Ricardo","Carolina","Luís","Alice","Nuno","Benedita","Vasco","Francisca","José","Laura","António","Constança","Filipe","Clara","André","Diana","Manuel","Camila","Diogo","Vitória","Bruno","Bárbara","Sérgio","Catarina","Hélder","Helena","Vítor","Joana","Jorge","Mafalda","Paulo","Marta","Daniel","Rita"] },
  { p: "🇲🇽 México", n: ["Santiago","Valentina","Mateo","Regina","Sebastián","Mariana","Leonardo","Camila","Emiliano","Fernanda","Diego","Sofía","Miguel","Ximena","Iker","María","Gael","Renata","Alejandro","Andrea","Daniel","Natalia","Adrián","Valeria","Pablo","Isabella","Rodrigo","Daniela","Luis","Paola","Carlos","Jimena","Eduardo","Gabriela","Fernando","Lucía","Jorge","Ana","Andrés","Paulina","Arturo","Diana","Ricardo","Elena","Oscar","Gloria","Pedro","Carmen","Manuel","Rosa"] },
  { p: "🇩🇪 Alemanha", n: ["Maximilian","Sophie","Alexander","Marie","Paul","Maria","Leon","Anna","Lukas","Emma","Felix","Mia","Elias","Lena","Jonas","Lea","Noah","Laura","Ben","Sophia","Finn","Hannah","Tim","Lisa","David","Sarah","Jan","Julia","Niklas","Lara","Tom","Clara","Moritz","Johanna","Julian","Katharina","Philipp","Amelie","Liam","Charlotte","Erik","Nele","Simon","Elena","Marco","Franziska","Anton","Eva","Sebastian","Miriam"] },
  { p: "🇫🇷 França", n: ["Lucas","Emma","Gabriel","Jade","Léo","Louise","Raphaël","Alice","Arthur","Chloé","Louis","Léa","Adam","Manon","Jules","Rose","Hugo","Lina","Maël","Anna","Nathan","Mila","Tom","Julia","Théo","Camille","Noah","Zoé","Enzo","Inès","Mathis","Sarah","Ethan","Eva","Maxime","Léonie","Paul","Clara","Sacha","Charlotte","Liam","Ambre","Victor","Juliette","Mohamed","Margot","Martin","Romane","Alexis","Marie"] },
  { p: "🇮🇹 Itália", n: ["Leonardo","Sofia","Francesco","Aurora","Alessandro","Giulia","Lorenzo","Ginevra","Andrea","Emma","Matteo","Alice","Gabriele","Vittoria","Riccardo","Chiara","Tommaso","Beatrice","Edoardo","Greta","Federico","Anna","Luca","Sara","Marco","Nicole","Giuseppe","Martina","Giovanni","Elena","Antonio","Giorgia","Davide","Francesca","Stefano","Matilde","Nicola","Lucia","Pietro","Arianna","Simone","Viola","Filippo","Camilla","Paolo","Eleonora","Fabio","Valentina","Roberto","Serena"] },
  { p: "🇯🇵 Japão", n: ["Haruto","Hina","Yuto","Yui","Sota","Mio","Haruki","Rin","Riku","Sakura","Minato","Aoi","Kaito","Koharu","Asahi","Himari","Yamato","Mei","Ren","Akari","Hiroto","Honoka","Sora","Yuna","Takumi","Saki","Kota","Miyu","Hayato","Nanami","Ryota","Haruka","Daiki","Kokona","Shota","Riko","Yuma","Misaki","Kei","Nana","Ryo","Mana","Aoi","Kanon","Itsuki","Momoka","Sosuke","Shiori","Taiga","Ayaka"] },
  { p: "🇦🇷 Argentina", n: ["Mateo","Sofía","Benjamín","Valentina","Thiago","Emma","Santino","Mía","Bautista","Isabella","Lautaro","Martina","Joaquín","Catalina","Lucas","Olivia","Nicolás","Delfina","Juan","Alma","Facundo","Juana","Agustín","Emilia","Tomás","Renata","Santiago","Lucía","Valentín","Bianca","Maximiliano","Camila","Franco","Victoria","Ignacio","Lola","Gonzalo","Julia","Felipe","Clara","Ezequiel","Elena","Patricio","Florencia","Ramiro","Milagros","Alejo","Pilar","Marcos","Abril"] },
];

const cycles = [
  { name: "Ciclo 1 Dia", minVal: 1, maxVal: 5 },
  { name: "Ciclo 15 Dias", minVal: 5, maxVal: 15 },
  { name: "Ciclo 30 Dias", minVal: 40, maxVal: 60 },
  { name: "Ciclo 60 Dias", minVal: 50, maxVal: 80 },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildList() {
  const items: { country: string; name: string; cycle: string; value: number }[] = [];
  for (const region of userDatabase) {
    for (const name of region.n) {
      const c = cycles[Math.floor(Math.random() * cycles.length)];
      items.push({
        country: region.p,
        name,
        cycle: c.name,
        value: +(c.minVal + Math.random() * (c.maxVal - c.minVal)).toFixed(2),
      });
    }
  }
  return shuffle(items);
}

export default function SocialProofCarousel() {
  const [list, setList] = useState(() => buildList());
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  const regenerateValue = useCallback((item: typeof list[0]) => {
    const c = cycles.find(cy => cy.name === item.cycle) || cycles[0];
    return { ...item, value: +(c.minVal + Math.random() * (c.maxVal - c.minVal)).toFixed(2) };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex(prev => {
          const next = prev + 1;
          if (next >= list.length) {
            setList(shuffle(list.map(regenerateValue)));
            return 0;
          }
          return next;
        });
        setFade(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, [list, regenerateValue]);

  const current = list[index];
  if (!current) return null;

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border border-neon-cyan/30 bg-surface-elevated/60 backdrop-blur-sm transition-all duration-300 ${
          fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm">
          💰
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-foreground font-medium truncate">
            {current.country} · <span className="text-primary">{current.name}</span>
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {current.cycle} — lucrou{' '}
            <span className="text-neon-green font-bold">${current.value.toFixed(2)}</span>
          </p>
        </div>
        <div className="flex-shrink-0 text-[10px] text-muted-foreground/60 font-mono">
          ao vivo
        </div>
      </div>
    </div>
  );
}
