import React, { useState } from 'react';
import { Star, Gamepad, Image, Clock } from 'lucide-react';

const GameCard = ({ id, title, desc, active = false, onClick, icon, selected, starting }) => {
  const isActive = active;
  const isSelected = selected === id;
  return (
    <div
      role={isActive ? 'button' : 'group'}
      tabIndex={isActive ? 0 : -1}
      onClick={() => { if (isActive) onClick?.(); }}
      onKeyDown={(e) => { if (isActive && (e.key === 'Enter' || e.key === ' ')) onClick?.(); }}
      className={`rounded-2xl p-4 shadow-lg transform transition-all ${isActive ? 'cursor-pointer hover:-translate-y-1' : ''} ${isSelected && starting ? 'scale-105 opacity-80' : ''} ${isActive ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white' : 'bg-white'}`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-lg ${isActive ? 'bg-white/20' : 'bg-gray-100'}`}>{icon}</div>
        <div>
          <div className={`font-bold text-lg ${isActive ? 'text-white' : 'text-gray-800'}`}>{title}</div>
          <div className={`text-sm ${isActive ? 'text-white/90' : 'text-gray-600'}`}>{desc}</div>
        </div>
      </div>
      <div className="mt-4 text-right">
        <button
          disabled={!isActive}
          className={`px-4 py-2 rounded-md font-semibold ${isActive ? 'bg-white text-purple-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
        >
          {isActive ? 'Jugar' : 'Próximamente'}
        </button>
      </div>
    </div>
  );
};

const Welcome = ({ onEnter, onStart }) => {
  const [showIntro, setShowIntro] = useState(true);
  const [starting, setStarting] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);

  const handlePlay = (gameId) => {
    setSelectedGame(gameId);
    setStarting(true);
    setShowIntro(false);
    setTimeout(() => {
      onStart?.();
      // reset starting state after navigation
      setStarting(false);
      setSelectedGame(null);
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center z-50">
      {/* decorative floating shapes */}
      <style>{`
        @keyframes floaty { 0% { transform: translateY(0); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0); }}
        @keyframes titlePop { 0% { transform: scale(0.98); opacity: 0 } 50% { transform: scale(1.02); opacity: 1 } 100% { transform: scale(1); opacity: 1 }}
      `}</style>

      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div
          className="absolute left-10 top-20 w-32 h-32 rounded-full blur-xl"
          style={{ animation: 'floaty 6s ease-in-out infinite', backgroundColor: 'rgba(255,255,255,0.08)' }}
        />
        <div
          className="absolute right-6 top-6 w-24 h-24 rounded-full blur-2xl"
          style={{ animation: 'floaty 8s ease-in-out infinite', backgroundColor: 'rgba(255,255,255,0.06)' }}
        />
      </div>

      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-5xl mx-4 w-full">
        <div className={`flex items-center gap-4 mb-4 transition-all ${showIntro ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'}`}>
          <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-300 shadow-md">
            <Star className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900" style={{ animation: 'titlePop 650ms ease both' }}>Bienvenido a <span className="text-purple-600">Arcade</span></h1>
            <p className="text-sm text-gray-600">Elige un juego y compite contra el reloj. Diviértete y mejora tu puntuación.</p>
          </div>
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-6 items-start">
          <div className="space-y-4">
            <div className="rounded-xl p-5 bg-gradient-to-r from-indigo-50 to-white shadow-inner">
              <h2 className="text-xl font-bold text-gray-800">Selecciona un juego</h2>
              <p className="text-sm text-gray-600 mt-1">Por ahora ofrecemos un juego activo; los demás están en camino.</p>
            </div>

            <div className="grid gap-3">
              <GameCard
                id="differences"
                title="Encuentra las Diferencias"
                desc="Busca las diferencias entre dos imágenes antes de que se acabe el tiempo."
                active={true}
                onClick={() => handlePlay('differences')}
                icon={<Image className="w-6 h-6 text-white" />}
                selected={selectedGame}
                starting={starting}
              />

              <GameCard
                id="memory"
                title="Memoria"
                desc="Empareja cartas iguales. Juego próximamente."
                active={false}
                onClick={() => {}}
                icon={<Gamepad className="w-6 h-6 text-gray-600" />}
              />

              <GameCard
                id="crono"
                title="Crono-Reto"
                desc="Mini-retos contra el tiempo. Próximamente."
                active={false}
                onClick={() => {}}
                icon={<Clock className="w-6 h-6 text-gray-600" />}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className={`rounded-2xl p-6 shadow-lg bg-white`}> 
              <h3 className="text-lg font-bold text-gray-800">Acerca de este juego</h3>
              <p className="text-sm text-gray-600 mt-2">"Encuentra las Diferencias" es un juego casual para entrenar la observación. Esta versión está en desarrollo y se puede ejecutar localmente.</p>
              <ul className="text-sm text-gray-600 mt-3 list-disc pl-5 space-y-1">
                <li>Puntos por aciertos y por tiempo restante.</li>
                <li>Modo edición solo visible en desarrollo para configurar niveles.</li>
                <li>Próximamente: más juegos y tablas de clasificación.</li>
              </ul>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => onEnter?.()}
                className="px-5 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 font-semibold hover:shadow"
              >
                Entrar al sitio
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
