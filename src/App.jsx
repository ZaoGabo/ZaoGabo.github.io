import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Star, RefreshCw, Zap } from 'lucide-react';

const App = () => {
  const [foundDifferences, setFoundDifferences] = useState([]);
  const [score, setScore] = useState(0);
  const [showVictory, setShowVictory] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [wrongClick, setWrongClick] = useState(null);
  const [timeLeft, setTimeLeft] = useState(120);
  const [gameStarted, setGameStarted] = useState(false);

  // Rutas locales para las imágenes del parque al atardecer
  // Coloca tus imágenes en `public/images` con los nombres `original.png` y `modified.png`
  // Ejemplo: public/images/original.png y public/images/modified.png
  const originalImage = "/images/original.png";
  const modifiedImage = "/images/modified.png";

  // Diferencias identificadas entre las dos imágenes (coordenadas aproximadas)
  // Ahora gestionadas por estado para permitir modo edición (click para fijar coordenadas)
  const [differences, setDifferences] = useState(() => {
    try {
      const raw = localStorage.getItem('differences');
      if (raw) return JSON.parse(raw);
    } catch (err) {
      // ignore parse errors
    }
    return [
      { id: 1, x: 50, y: 13, radius: 10, name: "Nube superior" },
      { id: 2, x: 16, y: 46, radius: 8, name: "Pájaro en el poste" },
      { id: 3, x: 18, y: 86, radius: 9, name: "Regadera" },
      { id: 4, x: 68, y: 88, radius: 10, name: "Hongos grandes" },
      { id: 5, x: 43, y: 90, radius: 7, name: "Luciérnaga" }
    ];
  });

  const totalDifferences = differences.length;

  // Modo edición: permite hacer clic en la imagen para añadir/eliminar diferencias exactas
  const [editMode, setEditMode] = useState(false);
  const toggleEditMode = () => setEditMode(v => !v);
  // refs a los contenedores de imagen para calcular rects durante el drag
  const originalContainerRef = useRef(null);
  const modifiedContainerRef = useRef(null);

  // estado de arrastre (dragging)
  const [dragging, setDragging] = useState(null);

  const clamp = (v, a = 0, b = 100) => Math.min(Math.max(v, a), b);

  const handlePointerDown = (e, id, imageType) => {
    e.preventDefault();
    e.stopPropagation();
    const container = imageType === 'original' ? originalContainerRef.current : modifiedContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setDragging({
      id,
      imageType,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startXPercent: differences.find(d => d.id === id)?.x || 0,
      startYPercent: differences.find(d => d.id === id)?.y || 0,
      rect
    });
  };

  useEffect(() => {
    if (!dragging) return;

    const onPointerMove = (ev) => {
      ev.preventDefault();
      const { rect, startMouseX, startMouseY, startXPercent, startYPercent, id } = dragging;
      const deltaXpx = ev.clientX - startMouseX;
      const deltaYpx = ev.clientY - startMouseY;
      const deltaXPercent = (deltaXpx / rect.width) * 100;
      const deltaYPercent = (deltaYpx / rect.height) * 100;
      const newX = clamp(startXPercent + deltaXPercent, 0, 100);
      const newY = clamp(startYPercent + deltaYPercent, 0, 100);
      setDifferences(prev => prev.map(d => d.id === id ? { ...d, x: Math.round(newX * 100) / 100, y: Math.round(newY * 100) / 100 } : d));
    };

    const onPointerUp = () => {
      setDragging(null);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [dragging, differences]);

  const handleEditClick = (e, imageType) => {
    // calcula porcentaje x,y relativo a la imagen
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const nextId = differences.length > 0 ? Math.max(...differences.map(d => d.id)) + 1 : 1;
    const newDiff = {
      id: nextId,
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      radius: 8,
      name: `Diferencia ${nextId}`
    };

    setDifferences(prev => [...prev, newDiff]);
    // Persistencia: ahora se guarda automáticamente via useEffect cuando `differences` cambia
  };

  const removeDifference = (id) => {
    setDifferences(prev => prev.filter(d => d.id !== id));
    setFoundDifferences(prev => prev.filter(fid => fid !== id));
  };

  const adjustRadius = (id, delta) => {
    setDifferences(prev => prev.map(d => d.id === id ? { ...d, radius: Math.max(1, d.radius + delta) } : d));
  };

  const exportDifferences = async () => {
    const json = JSON.stringify(differences, null, 2);
    console.log('Differences JSON:\n', json);
    try {
      await navigator.clipboard.writeText(json);
      alert('JSON de diferencias copiado al portapapeles y volcado en la consola.');
    } catch (err) {
      alert('JSON volcado en la consola. Copiar al portapapeles falló.');
    }
  };

  // Persistir differences en localStorage automáticamente
  useEffect(() => {
    try {
      localStorage.setItem('differences', JSON.stringify(differences));
    } catch (err) {
      console.error('No se pudo guardar differences en localStorage', err);
    }
  }, [differences]);

  // Timer
  useEffect(() => {
    if (!gameStarted || showVictory) return;

    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      alert('¡Tiempo agotado! Intenta de nuevo.');
      resetGame();
    }
  }, [timeLeft, gameStarted, showVictory]);

  // Check victory
  useEffect(() => {
    if (foundDifferences.length === totalDifferences && gameStarted) {
      setShowVictory(true);
      const bonusPoints = timeLeft * 10;
      setScore(prev => prev + bonusPoints);
    }
  }, [foundDifferences, totalDifferences, gameStarted, timeLeft]);

  const startGame = () => {
    setGameStarted(true);
  };

  const handleImageClick = (e, imageType) => {
    if (!gameStarted || showVictory) return;

    // Calcula coordenadas en píxeles relativos al área de la imagen para comparar de forma consistente
    const rect = e.currentTarget.getBoundingClientRect();
  const clickXpx = e.clientX - rect.left;
  const clickYpx = e.clientY - rect.top;
  const xPercent = (clickXpx / rect.width) * 100;
  const yPercent = (clickYpx / rect.height) * 100;

    const clickedDiff = differences.find(
      diff => {
        // convierte la posición guardada (porcentaje) a píxeles en el tamaño actual del elemento
        const diffXpx = (diff.x / 100) * rect.width;
        const diffYpx = (diff.y / 100) * rect.height;

        // interpreta diff.radius como porcentaje del menor lado de la imagen para mantener círculo "esférico"
        const radiusPx = (diff.radius / 100) * Math.min(rect.width, rect.height);

        const distance = Math.hypot(diffXpx - clickXpx, diffYpx - clickYpx);
        return distance <= radiusPx && !foundDifferences.includes(diff.id);
      } 
    );

    if (clickedDiff) {
      setFoundDifferences(prev => [...prev, clickedDiff.id]);
      setScore(prev => prev + 200);
      setAttempts(prev => prev + 1);
    } else {
      setWrongClick({ x: xPercent, y: yPercent, imageType });
      setTimeout(() => setWrongClick(null), 600);
      setAttempts(prev => prev + 1);
      setScore(prev => Math.max(0, prev - 50));
    }
  };

  const resetGame = () => {
    setFoundDifferences([]);
    setScore(0);
    setShowVictory(false);
    setAttempts(0);
    setTimeLeft(120);
    setGameStarted(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMarkers = (imageType) => {
    return (
      <>
        {foundDifferences.map(diffId => {
          const diff = differences.find(d => d.id === diffId);
          return (
            <div
              key={`marker-${imageType}-${diffId}`}
              className="absolute pointer-events-none"
              style={{
                left: `${diff.x}%`,
                top: `${diff.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="relative">
                <div className="absolute inset-0 w-16 h-16 border-4 border-green-400 rounded-full animate-ping opacity-75" />
                <div className="w-16 h-16 border-4 border-green-400 rounded-full bg-green-400/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-green-400 animate-pulse" />
                </div>
              </div>
            </div>
          );
        })}
        
        {wrongClick && wrongClick.imageType === imageType && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${wrongClick.x}%`,
              top: `${wrongClick.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="relative">
              <div className="absolute inset-0 w-12 h-12 rounded-full bg-red-500 animate-ping opacity-75" />
              <div className="w-12 h-12 rounded-full bg-red-500/40 border-4 border-red-500 flex items-center justify-center">
                <span className="text-white font-bold text-xl">✕</span>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

    const renderEditMarkers = (imageType) => {
      return (
        <>
          {differences.map(diff => (
            <button
              key={`edit-${imageType}-${diff.id}`}
              onClick={(e) => { e.stopPropagation(); removeDifference(diff.id); }}
              className="absolute flex items-center justify-center"
              style={{
                left: `${diff.x}%`,
                top: `${diff.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              title={`Eliminar ${diff.name} (id: ${diff.id})`}
            >
              <div style={{ position: 'relative' }}>
                {/* visualiza el radio en porcentaje respecto al contenedor */}
                <div style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: `${diff.radius}%`,
                  height: `${diff.radius}%`,
                  borderRadius: '50%',
                  border: '2px dashed rgba(255,165,0,0.9)',
                  background: 'rgba(255,165,0,0.08)'
                }} />
                <div className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center border-2 border-white" style={{ position: 'relative', zIndex: 2 }}>{diff.id}</div>
              </div>
            </button>
          ))}
        </>
      );
    };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-3">
                <Star className="text-yellow-500 w-10 h-10" />
                Encuentra las Diferencias
              </h1>
              <p className="text-gray-600 mt-2 text-lg">Parque al Atardecer - Nivel 1</p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-center bg-gradient-to-br from-purple-100 to-pink-100 px-6 py-3 rounded-2xl">
                <div className="text-3xl font-bold text-purple-600">{score}</div>
                <div className="text-sm text-gray-600 font-semibold">Puntos</div>
              </div>
              
              <div className="text-center bg-gradient-to-br from-blue-100 to-cyan-100 px-6 py-3 rounded-2xl">
                <div className="text-3xl font-bold text-blue-600">
                  {foundDifferences.length}/{totalDifferences}
                </div>
                <div className="text-sm text-gray-600 font-semibold">Encontradas</div>
              </div>
              
              <div className={`text-center px-6 py-3 rounded-2xl ${timeLeft < 30 ? 'bg-red-100 animate-pulse' : 'bg-gradient-to-br from-green-100 to-emerald-100'}`}>
                <div className={`text-3xl font-bold ${timeLeft < 30 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatTime(timeLeft)}
                </div>
                <div className="text-sm text-gray-600 font-semibold">Tiempo</div>
              </div>
              
              <button
                onClick={resetGame}
                className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2"
              >
                <RefreshCw size={20} />
                Reiniciar
              </button>
              <button
                onClick={toggleEditMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${editMode ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-800 hover:scale-105'}`}
                title="Alternar modo edición (clic para fijar diferencias)"
              >
                <Zap size={18} />
                {editMode ? 'Edición: ON' : 'Modo edición'}
              </button>

              <button
                onClick={exportDifferences}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-xl font-bold hover:shadow-md transition-all"
                title="Exportar diferencias (JSON)"
              >
                Exportar
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-5 mb-6 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <Trophy className="text-yellow-500 w-7 h-7" />
            <span className="font-bold text-gray-800 text-lg">Progreso</span>
            <span className="text-gray-600 text-sm ml-auto">
              Precisión: {attempts > 0 ? Math.round((foundDifferences.length / attempts) * 100) : 0}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-6 shadow-inner">
            <div
              className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-3 shadow-lg"
              style={{ width: `${(foundDifferences.length / totalDifferences) * 100}%` }}
            >
              {foundDifferences.length > 0 && (
                <span className="text-sm text-white font-bold drop-shadow-lg">
                  {Math.round((foundDifferences.length / totalDifferences) * 100)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Start Overlay */}
        {!gameStarted && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-10 max-w-lg text-center shadow-2xl">
              <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                ¡Encuentra las 5 Diferencias!
              </h2>
              <p className="text-gray-600 mb-6 text-lg">
                Tienes 2 minutos para encontrar todas las diferencias entre las dos imágenes del parque.
              </p>
              <ul className="text-left mb-6 space-y-2 text-gray-700">
                <li>✨ +200 puntos por cada diferencia</li>
                <li>⏱️ +10 puntos por cada segundo restante</li>
                <li>❌ -50 puntos por clic incorrecto</li>
              </ul>
              <button
                onClick={startGame}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-10 py-4 rounded-xl font-bold text-xl hover:shadow-2xl hover:scale-105 transition-all"
              >
                ¡Comenzar Juego!
              </button>
            </div>
          </div>
        )}

        {/* Game Images */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Original Image */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-5">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
              🖼️ Imagen Original
            </h2>
            <div ref={originalContainerRef} className="relative rounded-2xl overflow-hidden shadow-2xl cursor-crosshair border-4 border-gray-200">
              <img 
                src={originalImage}
                alt="Imagen Original"
                className="w-full h-auto select-none"
                draggable="false"
                onClick={(e) => editMode ? handleEditClick(e, 'original') : handleImageClick(e, 'original')}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden w-full h-96 bg-gradient-to-br from-purple-100 to-pink-100 items-center justify-center flex-col p-8">
                <p className="text-gray-700 font-bold text-xl mb-4">⚠️ Imagen no disponible</p>
                <p className="text-gray-600 text-center">Por favor, reemplaza la URL de originalImage con una imagen válida</p>
                <p className="text-sm text-gray-500 mt-4">Sube tus imágenes a imgur.com o imgbb.com</p>
              </div>
              {renderMarkers('original')}
              {editMode && renderEditMarkers('original')}
            </div>
          </div>

          {/* Modified Image */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-5">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
              🔍 Imagen Modificada
            </h2>
              <div ref={modifiedContainerRef} className="relative rounded-2xl overflow-hidden shadow-2xl cursor-crosshair border-4 border-purple-300">
              <img 
                src={modifiedImage}
                alt="Imagen Modificada"
                className="w-full h-auto select-none"
                draggable="false"
                onClick={(e) => editMode ? handleEditClick(e, 'modified') : handleImageClick(e, 'modified')}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden w-full h-96 bg-gradient-to-br from-blue-100 to-purple-100 items-center justify-center flex-col p-8">
                <p className="text-gray-700 font-bold text-xl mb-4">⚠️ Imagen no disponible</p>
                <p className="text-gray-600 text-center">Por favor, reemplaza la URL de modifiedImage con una imagen válida</p>
                <p className="text-sm text-gray-500 mt-4">Sube tus imágenes a imgur.com o imgbb.com</p>
              </div>
              {renderMarkers('modified')}
              {editMode && renderEditMarkers('modified')}
            </div>
          </div>
        </div>

        {/* Hints Section */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-5 mt-6 shadow-xl">
          <h3 className="font-bold text-gray-800 mb-3 text-lg">💡 Pistas de las diferencias:</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {differences.map(diff => (
              <div 
                key={diff.id}
                className={`p-3 rounded-xl text-center transition-all ${
                  foundDifferences.includes(diff.id) 
                    ? 'bg-green-100 border-2 border-green-400' 
                    : 'bg-gray-100 border-2 border-gray-300'
                }`}
              >
                <div className="font-semibold text-sm">
                  {foundDifferences.includes(diff.id) ? '✓' : '?'} {diff.name}
                </div>
                <div className="text-xs text-gray-500 mt-2">{diff.x}% , {diff.y}% • r={diff.radius}</div>
                {editMode && (
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <button onClick={() => removeDifference(diff.id)} className="text-sm px-2 py-1 bg-red-500 text-white rounded">Eliminar</button>
                    <button onClick={() => adjustRadius(diff.id, -1)} className="text-sm px-2 py-1 bg-gray-200 rounded">-</button>
                    <div className="text-sm px-2 py-1 bg-white rounded">r: {diff.radius}%</div>
                    <button onClick={() => adjustRadius(diff.id, +1)} className="text-sm px-2 py-1 bg-gray-200 rounded">+</button>
                    <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(diff, null, 2)); alert('Marcador copiado al portapapeles'); }} className="text-sm px-2 py-1 bg-gray-200 rounded">Copiar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Victory Modal */}
        {showVictory && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-10 max-w-md text-center shadow-2xl animate-bounce">
              <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-5xl font-bold text-gray-800 mb-3">
                ¡Felicitaciones!
              </h2>
              <p className="text-2xl text-green-600 font-bold mb-2">
                Nivel Completado
              </p>
              <p className="text-xl text-gray-600 mb-4">
                Puntuación Final: {score}
              </p>
              <div className="bg-purple-100 rounded-xl p-4 mb-6">
                <p className="text-gray-700">
                  ⏱️ Tiempo restante: {formatTime(timeLeft)}
                </p>
                <p className="text-gray-700">
                  🎯 Precisión: {Math.round((foundDifferences.length / attempts) * 100)}%
                </p>
              </div>
              <button
                onClick={resetGame}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-2xl hover:scale-105 transition-all"
              >
                Jugar de Nuevo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
