import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef
} from 'react';
import {
  Trophy,
  Star,
  RefreshCw,
  Zap,
  Upload,
  Download,
  Clock3,
  Info
} from 'lucide-react';
import Welcome from './Welcome';
import Modal from './components/Modal';
import LevelSelector from './components/LevelSelector';
import { HitMarker, WrongMarker } from './components/FeedbackMarker';
import useDifferences from './hooks/useDifferences';

const clampPercent = (value, min = 0, max = 100) => Math.min(Math.max(value, min), max);
const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const isDev = import.meta.env.MODE !== 'production';

const App = () => {
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
  const [levels, setLevels] = useState([]);
  const [currentLevelId, setCurrentLevelId] = useState('');
  const [levelData, setLevelData] = useState(null);
  const [loadingLevel, setLoadingLevel] = useState(false);
  const [levelError, setLevelError] = useState(null);

  const [differences, setDifferences] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const [editMode, setEditMode] = useState(false);
  const [selectedDifferenceId, setSelectedDifferenceId] = useState(null);
  const [dragging, setDragging] = useState(null);

  const originalContainerRef = useRef(null);
  const modifiedContainerRef = useRef(null);
  const importInputRef = useRef(null);

  const scoringRules = useMemo(() => ({
    pointsPerHit: levelData?.pointsPerHit,
    penaltyPerMiss: levelData?.penaltyPerMiss,
    bonusPerSecond: levelData?.bonusPerSecond
  }), [levelData?.pointsPerHit, levelData?.penaltyPerMiss, levelData?.bonusPerSecond]);

  const {
    foundDifferences,
    score,
    attempts,
    wrongClick,
    registerClick,
    applyBonus,
    reset: resetTracking
  } = useDifferences(differences, scoringRules);

  const totalDifferences = differences.length;
  const accuracy = useMemo(
    () => (attempts > 0 ? Math.round((foundDifferences.length / attempts) * 100) : 0),
    [attempts, foundDifferences.length]
  );

  const currentLevelMeta = useMemo(
    () => levels.find(level => level.id === currentLevelId) ?? null,
    [levels, currentLevelId]
  );

  const timeLimit = levelData?.timeLimit ?? 120;

  const nudgeDifference = useCallback((id, deltaX, deltaY) => {
    setDifferences(prev => prev.map(diff => (
      diff.id === id
        ? {
            ...diff,
            x: Math.round(clampPercent(diff.x + deltaX) * 100) / 100,
            y: Math.round(clampPercent(diff.y + deltaY) * 100) / 100
          }
        : diff
    )));
  }, []);

  useEffect(() => {
    const loadLevelIndex = async () => {
      try {
        const response = await fetch('/levels/index.json', { cache: 'no-cache' });
        if (!response.ok) throw new Error('No se pudo cargar el índice de niveles');
        const payload = await response.json();
        const entries = payload?.levels ?? [];
        setLevels(entries);
        if (entries.length > 0) {
          setCurrentLevelId(entries[0].id);
        }
      } catch (err) {
        console.error(err);
        setLevelError('No pudimos cargar la lista de niveles. Revisa public/levels/index.json.');
      }
    };

    loadLevelIndex();
  }, []);

  useEffect(() => {
    if (!currentLevelMeta) return;

    const loadLevel = async () => {
      setLoadingLevel(true);
      setLevelError(null);
      try {
        const response = await fetch(`/levels/${currentLevelMeta.file}`, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`Archivo ${currentLevelMeta.file} no encontrado`);
        const payload = await response.json();
        setLevelData(payload);
      } catch (err) {
        console.error(err);
        setLevelError('No pudimos cargar la configuración del nivel seleccionado.');
      } finally {
        setLoadingLevel(false);
      }
    };

    loadLevel();
  }, [currentLevelMeta]);

  useEffect(() => {
    if (!levelData) return;
    let nextDifferences = levelData.differences ?? [];
    if (isDev && currentLevelId) {
      try {
        const stored = localStorage.getItem(`differences-${currentLevelId}`);
        if (stored) nextDifferences = JSON.parse(stored);
      } catch (err) {
        console.warn('No se pudo leer differences desde localStorage', err);
      }
    }
    setDifferences(nextDifferences);
    setTimeLeft(levelData.timeLimit ?? 120);
    resetTracking();
    setShowVictory(false);
    setShowTimeoutModal(false);
    setGameStarted(false);
    setSelectedDifferenceId(null);
  }, [levelData, currentLevelId, resetTracking]);

  useEffect(() => {
    if (!gameStarted || showVictory || showTimeoutModal) return;
    if (timeLeft <= 0) {
      setShowTimeoutModal(true);
      setGameStarted(false);
      return;
    }
    const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [gameStarted, timeLeft, showVictory, showTimeoutModal]);

  useEffect(() => {
    if (!gameStarted) return;
    if (foundDifferences.length === totalDifferences && totalDifferences > 0) {
      applyBonus(timeLeft);
      setShowVictory(true);
      setGameStarted(false);
    }
  }, [applyBonus, foundDifferences.length, gameStarted, timeLeft, totalDifferences]);

  useEffect(() => {
    if (!editMode || !selectedDifferenceId) return;

    const handleKeyDown = (event) => {
      const step = event.shiftKey ? 0.2 : 0.8;
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        nudgeDifference(selectedDifferenceId, 0, -step);
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        nudgeDifference(selectedDifferenceId, 0, step);
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        nudgeDifference(selectedDifferenceId, -step, 0);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        nudgeDifference(selectedDifferenceId, step, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editMode, selectedDifferenceId, nudgeDifference]);

  useEffect(() => {
    if (!dragging) return;

    const onPointerMove = (event) => {
      event.preventDefault();
      const { rect, id, startMouseX, startMouseY, startXPercent, startYPercent } = dragging;
      const deltaXpx = event.clientX - startMouseX;
      const deltaYpx = event.clientY - startMouseY;
      const deltaXPercent = (deltaXpx / rect.width) * 100;
      const deltaYPercent = (deltaYpx / rect.height) * 100;
      const newX = clampPercent(startXPercent + deltaXPercent, 0, 100);
      const newY = clampPercent(startYPercent + deltaYPercent, 0, 100);
      setDifferences(prev => prev.map(diff => (
        diff.id === id
          ? {
              ...diff,
              x: Math.round(newX * 100) / 100,
              y: Math.round(newY * 100) / 100
            }
          : diff
      )));
    };

    const onPointerUp = () => setDragging(null);

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [dragging]);

  useEffect(() => {
    if (!isDev || !currentLevelId) return;
    try {
      localStorage.setItem(`differences-${currentLevelId}`, JSON.stringify(differences));
    } catch (err) {
      console.warn('No se pudo guardar differences en localStorage', err);
    }
  }, [differences, currentLevelId]);

  const toggleEditMode = () => {
    setEditMode(value => !value);
    setSelectedDifferenceId(null);
    setDragging(null);
  };

  const adjustSize = (id, delta) => {
    setDifferences(prev => prev.map(diff => {
      if (diff.id !== id) return diff;
      if (diff.type === 'rect') {
        const width = Math.max(2, (diff.width ?? 10) + delta);
        const height = Math.max(2, (diff.height ?? 10) + delta);
        return {
          ...diff,
          width: Math.round(width * 100) / 100,
          height: Math.round(height * 100) / 100
        };
      }
      const radius = Math.max(1, (diff.radius ?? 8) + delta);
      return { ...diff, radius: Math.round(radius * 100) / 100 };
    }));
  };

  const removeDifference = (id) => {
    setDifferences(prev => prev.filter(diff => diff.id !== id));
  };

  const handlePointerDown = (event, id, imageType) => {
    event.preventDefault();
    event.stopPropagation();
    const container = imageType === 'original' ? originalContainerRef.current : modifiedContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const diff = differences.find(item => item.id === id);
    if (!diff) return;
    setSelectedDifferenceId(id);
    setDragging({
      id,
      rect,
      startMouseX: event.clientX,
      startMouseY: event.clientY,
      startXPercent: diff.x,
      startYPercent: diff.y
    });
  };

  const handleEditClick = (event, imageType) => {
    const container = imageType === 'original' ? originalContainerRef.current : modifiedContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const nextId = differences.length > 0 ? Math.max(...differences.map(diff => diff.id)) + 1 : 1;
    const newDiff = {
      id: nextId,
      type: 'circle',
      x: Math.round(clampPercent(x) * 100) / 100,
      y: Math.round(clampPercent(y) * 100) / 100,
      radius: 8,
      name: `Diferencia ${nextId}`
    };
    setDifferences(prev => [...prev, newDiff]);
    setSelectedDifferenceId(nextId);
  };

  const handleImageClick = (event, imageType) => {
    if (!gameStarted || showVictory) return;
    const container = imageType === 'original' ? originalContainerRef.current : modifiedContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const clickXpx = event.clientX - rect.left;
    const clickYpx = event.clientY - rect.top;
    const xPercent = (clickXpx / rect.width) * 100;
    const yPercent = (clickYpx / rect.height) * 100;

    registerClick(clampPercent(xPercent), clampPercent(yPercent), { imageType });
  };

  const startGame = () => {
    if (totalDifferences === 0) return;
    setShowWelcomeScreen(false);
    setShowTimeoutModal(false);
    setShowVictory(false);
    resetTracking();
    setTimeLeft(timeLimit);
    setGameStarted(true);
  };

  const resetGame = () => {
    resetTracking();
    setShowVictory(false);
    setShowTimeoutModal(false);
    setTimeLeft(timeLimit);
    setGameStarted(false);
    setSelectedDifferenceId(null);
    setDragging(null);
  };

  const goToNextLevel = () => {
    if (levels.length < 2) {
      resetGame();
      return;
    }
    const currentIndex = levels.findIndex(level => level.id === currentLevelId);
    const nextIndex = (currentIndex + 1) % levels.length;
    setCurrentLevelId(levels[nextIndex].id);
  };

  const exportLevel = async () => {
    const payload = JSON.stringify({
      ...(levelData ?? {}),
      differences,
    }, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      alert('Configuración copiada al portapapeles.');
    } catch (err) {
      console.error(err);
      alert('No se pudo copiar al portapapeles. Revisa la consola.');
    }
  };

  const importLevel = (event) => {
    const [file] = event.target.files ?? [];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const payload = JSON.parse(loadEvent.target?.result ?? '{}');
        if (!Array.isArray(payload.differences)) throw new Error('El JSON debe incluir un arreglo "differences".');
        setDifferences(payload.differences);
        setLevelData(prev => ({ ...prev, ...payload }));
      } catch (err) {
        console.error(err);
        alert('No se pudo importar el archivo. Comprueba que tenga el formato correcto.');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleSizeInput = (id, key, value) => {
    const parsed = parseFloat(value);
    if (Number.isNaN(parsed)) return;
    setDifferences(prev => prev.map(diff => (
      diff.id === id
        ? { ...diff, [key]: parsed }
        : diff
    )));
  };

  const renderHitMarkers = (imageType) => (
    <>
      {foundDifferences.map(diffId => {
        const diff = differences.find(item => item.id === diffId);
        if (!diff) return null;
        return <HitMarker key={`hit-${imageType}-${diffId}`} x={diff.x} y={diff.y} />;
      })}
    </>
  );

  const renderWrongMarker = (imageType) => {
    if (!wrongClick) return null;
    if (wrongClick.context?.imageType !== imageType) return null;
    return <WrongMarker x={wrongClick.x} y={wrongClick.y} />;
  };

  const renderEditMarkers = (imageType) => {
    if (!editMode) return null;
    return (
      <>
        {differences.map(diff => (
          <button
            key={`edit-${imageType}-${diff.id}`}
            onClick={(event) => {
              event.stopPropagation();
              setSelectedDifferenceId(diff.id);
            }}
            onPointerDown={(event) => handlePointerDown(event, diff.id, imageType)}
            className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 font-bold ${selectedDifferenceId === diff.id ? 'border-orange-500 bg-orange-500/30 text-white' : 'border-orange-300 bg-orange-200/40 text-orange-700'}`}
            style={{ left: `${diff.x}%`, top: `${diff.y}%` }}
            title={`Editar ${diff.name ?? `Marcador ${diff.id}`}`}
          >
            {diff.id}
          </button>
        ))}
      </>
    );
  };

  const hintShapeSummary = (diff) => {
    if (diff.type === 'rect') {
      return `${diff.x}%, ${diff.y}% • ${diff.width ?? 0}×${diff.height ?? 0}`;
    }
    if (diff.type === 'polygon') {
      return `${diff.points?.length ?? 0} puntos`;
    }
    return `${diff.x}%, ${diff.y}% • r=${diff.radius ?? 0}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-4">
      {showWelcomeScreen && (
        <Welcome
          onEnter={() => setShowWelcomeScreen(false)}
          onStart={startGame}
        />
      )}

      {levelError && (
        <Modal
          title="Error al cargar"
          description={levelError}
          tone="danger"
          actions={[
            { label: 'Reintentar carga', variant: 'primary', onClick: () => currentLevelMeta && setCurrentLevelId(currentLevelMeta.id) }
          ]}
        />
      )}

      {showVictory && (
        <Modal
          title="¡Nivel completado!"
          description={levelData?.description}
          tone="success"
          actions={[
            { label: 'Jugar de nuevo', variant: 'secondary', onClick: resetGame },
            { label: 'Siguiente nivel', variant: 'primary', onClick: goToNextLevel }
          ]}
        >
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="rounded-2xl bg-emerald-100 p-4">
              <div className="text-sm font-semibold text-emerald-600">Puntuación</div>
              <div className="text-3xl font-bold text-emerald-700">{score}</div>
            </div>
            <div className="rounded-2xl bg-sky-100 p-4">
              <div className="text-sm font-semibold text-sky-600">Tiempo restante</div>
              <div className="text-3xl font-bold text-sky-700">{formatTime(timeLeft)}</div>
            </div>
            <div className="rounded-2xl bg-purple-100 p-4">
              <div className="text-sm font-semibold text-purple-600">Precisión</div>
              <div className="text-3xl font-bold text-purple-700">{accuracy}%</div>
            </div>
            <div className="rounded-2xl bg-amber-100 p-4">
              <div className="text-sm font-semibold text-amber-600">Intentos</div>
              <div className="text-3xl font-bold text-amber-700">{attempts}</div>
            </div>
          </div>
        </Modal>
      )}

      {showTimeoutModal && (
        <Modal
          title="Tiempo agotado"
          description="¡Casi lo logras! Revisa las pistas o intenta nuevamente."
          tone="danger"
          actions={[
            { label: 'Ver pistas', variant: 'secondary', onClick: () => setShowTimeoutModal(false) },
            { label: 'Intentar de nuevo', variant: 'primary', onClick: resetGame }
          ]}
        >
          <p className="text-gray-600">Consejo: busca elementos que cambian ligeramente de color o posición.</p>
        </Modal>
      )}

      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-white/95 p-6 shadow-2xl backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h1 className="flex items-center gap-3 text-4xl font-bold">
                <Star className="h-10 w-10 text-yellow-500" />
                Encuentra las Diferencias
              </h1>
              <p className="mt-2 text-gray-600">
                {levelData?.name ?? 'Selecciona un nivel para comenzar'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <LevelSelector
                levels={levels}
                currentLevelId={currentLevelId}
                onSelect={setCurrentLevelId}
                disabled={loadingLevel}
              />

              <div className="rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 px-5 py-3 text-center">
                <div className="text-3xl font-bold text-purple-600">{score}</div>
                <div className="text-xs font-semibold text-purple-500">Puntos</div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 px-5 py-3 text-center">
                <div className="text-3xl font-bold text-blue-600">{foundDifferences.length}/{totalDifferences}</div>
                <div className="text-xs font-semibold text-blue-500">Encontradas</div>
              </div>

              <div className={`rounded-2xl px-5 py-3 text-center ${timeLeft < 30 && gameStarted ? 'bg-rose-100 animate-pulse' : 'bg-gradient-to-br from-emerald-100 to-lime-100'}`}>
                <div className={`text-3xl font-bold ${timeLeft < 30 && gameStarted ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatTime(timeLeft)}
                </div>
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600">
                  <Clock3 className="h-4 w-4" /> Tiempo
                </div>
              </div>

              <button
                onClick={resetGame}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-5 py-3 font-semibold text-white shadow-lg transition hover:scale-105"
              >
                <RefreshCw size={18} /> Reiniciar
              </button>

              {isDev && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleEditMode}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 font-semibold transition ${editMode ? 'bg-orange-500 text-white shadow-lg' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                    title="Alternar modo edición"
                  >
                    <Zap size={18} /> {editMode ? 'Edición activada' : 'Modo edición'}
                  </button>

                  <button
                    onClick={exportLevel}
                    className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    <Download size={18} /> Exportar
                  </button>

                  <button
                    onClick={() => importInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    <Upload size={18} /> Importar
                  </button>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={importLevel}
                  />
                </div>
              )}
            </div>
          </div>

          {levelData?.description && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-gray-100 px-4 py-3 text-gray-700">
              <Info className="h-5 w-5 text-purple-500" />
              <span>{levelData.description}</span>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white/95 p-5 shadow-xl backdrop-blur">
          <div className="flex items-center gap-3 text-lg font-bold text-gray-800">
            <Trophy className="h-7 w-7 text-yellow-500" /> Progreso
            <span className="ml-auto text-sm font-semibold text-gray-600">Precisión: {accuracy}%</span>
          </div>
          <div className="mt-4 h-5 w-full rounded-full bg-gray-200">
            <div
              className="flex h-5 items-center justify-end rounded-full bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 pr-3 text-sm font-bold text-white transition-all"
              style={{ width: totalDifferences > 0 ? `${(foundDifferences.length / totalDifferences) * 100}%` : '0%' }}
            >
              {foundDifferences.length > 0 && (
                <span className="drop-shadow">{Math.round((foundDifferences.length / totalDifferences) * 100)}%</span>
              )}
            </div>
          </div>
        </div>

        {!gameStarted && !showVictory && !showTimeoutModal && totalDifferences > 0 && (
          <div className="rounded-3xl bg-white/95 p-10 text-center shadow-2xl backdrop-blur">
            <Trophy className="mx-auto mb-4 h-16 w-16 text-yellow-500" />
            <h2 className="text-3xl font-bold text-gray-800">¿Listo para jugar?</h2>
            <p className="mt-2 text-gray-600">Presiona el botón para iniciar el reto de {totalDifferences} diferencias.</p>
            <button
              onClick={startGame}
              className="mt-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 text-xl font-semibold text-white shadow-lg transition hover:scale-105"
            >
              ¡Comenzar!
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
            <h2 className="mb-4 text-center text-2xl font-bold text-gray-800">🖼️ Imagen Original</h2>
            <div ref={originalContainerRef} className="relative cursor-crosshair overflow-hidden rounded-2xl border-4 border-gray-200 shadow-2xl">
              <img
                src={levelData?.originalImage ?? '/images/original.png'}
                alt="Imagen Original"
                className="w-full select-none"
                draggable="false"
                onClick={(event) => (isDev && editMode) ? handleEditClick(event, 'original') : handleImageClick(event, 'original')}
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                  if (event.currentTarget.nextSibling) event.currentTarget.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden h-96 w-full flex-col items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 p-8 text-center text-gray-600">
                <p className="text-xl font-semibold">Imagen no disponible</p>
                <p className="mt-2 text-sm">Asegúrate de que la ruta "originalImage" apunte a un archivo válido.</p>
              </div>
              {renderHitMarkers('original')}
              {renderWrongMarker('original')}
              {renderEditMarkers('original')}
            </div>
          </div>

          <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
            <h2 className="mb-4 text-center text-2xl font-bold text-gray-800">🔍 Imagen Modificada</h2>
            <div ref={modifiedContainerRef} className="relative cursor-crosshair overflow-hidden rounded-2xl border-4 border-purple-300 shadow-2xl">
              <img
                src={levelData?.modifiedImage ?? '/images/modified.png'}
                alt="Imagen Modificada"
                className="w-full select-none"
                draggable="false"
                onClick={(event) => (isDev && editMode) ? handleEditClick(event, 'modified') : handleImageClick(event, 'modified')}
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                  if (event.currentTarget.nextSibling) event.currentTarget.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden h-96 w-full flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 p-8 text-center text-gray-600">
                <p className="text-xl font-semibold">Imagen no disponible</p>
                <p className="mt-2 text-sm">Asegúrate de que la ruta "modifiedImage" apunte a un archivo válido.</p>
              </div>
              {renderHitMarkers('modified')}
              {renderWrongMarker('modified')}
              {renderEditMarkers('modified')}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/95 p-5 shadow-xl backdrop-blur">
          <div className="mb-4 flex items-center gap-3 text-lg font-bold text-gray-800">
            <Zap className="h-6 w-6 text-purple-500" /> Pistas de las diferencias
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {differences.map(diff => {
              const isFound = foundDifferences.includes(diff.id);
              const isSelected = selectedDifferenceId === diff.id;
              return (
                <div
                  key={diff.id}
                  className={`rounded-2xl border-2 p-4 transition ${isFound ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-gray-50'} ${isSelected ? 'ring-2 ring-orange-400' : ''}`}
                  onClick={() => setSelectedDifferenceId(diff.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">
                      {isFound ? '✓' : '?'} {diff.name ?? `Diferencia ${diff.id}`}
                    </span>
                    <span className="text-xs uppercase tracking-wide text-gray-400">{diff.type ?? 'circle'}</span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">{hintShapeSummary(diff)}</div>

                  {isDev && editMode && (
                    <div className="mt-3 space-y-2 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <label className="w-10">X</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          className="w-full rounded-lg border border-gray-200 px-2 py-1"
                          value={diff.x}
                          onChange={(event) => handleSizeInput(diff.id, 'x', event.target.value)}
                        />
                        <label className="w-10">Y</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          className="w-full rounded-lg border border-gray-200 px-2 py-1"
                          value={diff.y}
                          onChange={(event) => handleSizeInput(diff.id, 'y', event.target.value)}
                        />
                      </div>
                      {diff.type === 'circle' && (
                        <div className="flex items-center gap-2">
                          <label className="w-16">Radio</label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            step="0.1"
                            className="w-full rounded-lg border border-gray-200 px-2 py-1"
                            value={diff.radius ?? 8}
                            onChange={(event) => handleSizeInput(diff.id, 'radius', event.target.value)}
                          />
                          <div className="flex items-center gap-1">
                            <button className="rounded-lg bg-gray-100 px-2 py-1" onClick={() => adjustSize(diff.id, -0.5)}>-</button>
                            <button className="rounded-lg bg-gray-100 px-2 py-1" onClick={() => adjustSize(diff.id, 0.5)}>+</button>
                          </div>
                        </div>
                      )}
                      {diff.type === 'rect' && (
                        <div className="flex items-center gap-2">
                          <label className="w-16">Ancho</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            step="0.1"
                            className="w-full rounded-lg border border-gray-200 px-2 py-1"
                            value={diff.width ?? 10}
                            onChange={(event) => handleSizeInput(diff.id, 'width', event.target.value)}
                          />
                          <label className="w-16">Alto</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            step="0.1"
                            className="w-full rounded-lg border border-gray-200 px-2 py-1"
                            value={diff.height ?? 10}
                            onChange={(event) => handleSizeInput(diff.id, 'height', event.target.value)}
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2">
                        <button
                          onClick={() => removeDifference(diff.id)}
                          className="rounded-lg bg-rose-100 px-3 py-1 font-semibold text-rose-600 hover:bg-rose-200"
                        >
                          Eliminar
                        </button>
                        <button
                          onClick={() => navigator.clipboard?.writeText(JSON.stringify(diff, null, 2))}
                          className="rounded-lg bg-gray-100 px-3 py-1 text-gray-600 hover:bg-gray-200"
                        >
                          Copiar JSON
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
