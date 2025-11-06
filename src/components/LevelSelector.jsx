import React from 'react';

const difficultyColors = {
  beginner: 'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-orange-100 text-orange-700',
  advanced: 'bg-rose-100 text-rose-700'
};

const LevelSelector = ({ levels, currentLevelId, onSelect, disabled }) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm font-semibold text-gray-600">Nivel</label>
    <select
      value={currentLevelId ?? ''}
      onChange={(event) => onSelect?.(event.target.value)}
      disabled={disabled}
      className="w-full min-w-[220px] rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
    >
      <option value="" disabled>Selecciona un escenario…</option>
      {levels.map(level => (
        <option key={level.id} value={level.id}>
          {level.name}
        </option>
      ))}
    </select>
    {currentLevelId ? (
      <span className={`inline-flex w-max items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${difficultyColors[levels.find(l => l.id === currentLevelId)?.difficulty] ?? 'bg-slate-100 text-slate-700'}`}>
        Dificultad: {levels.find(l => l.id === currentLevelId)?.difficulty ?? 'personalizada'}
      </span>
    ) : null}
  </div>
);

export default LevelSelector;
