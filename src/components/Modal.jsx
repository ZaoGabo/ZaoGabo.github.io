import React from 'react';

const Modal = ({ title, description, children, actions, onClose, tone = 'default' }) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden">
      <div className={`px-8 pt-8 pb-4 ${tone === 'success' ? 'bg-emerald-50' : tone === 'danger' ? 'bg-rose-50' : 'bg-white'}`}>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>
        {description ? <p className="text-gray-600 text-lg">{description}</p> : null}
      </div>
      <div className="px-8 py-6 space-y-4">
        {children}
        {actions ? (
          <div className="flex flex-wrap gap-3 justify-end">
            {actions.map(({ label, variant = 'primary', onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className={[
                  'px-5 py-3 rounded-xl font-semibold transition-all',
                  variant === 'primary' && 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:scale-105',
                  variant === 'secondary' && 'bg-gray-100 text-gray-900 hover:bg-gray-200',
                  variant === 'ghost' && 'text-gray-500 hover:text-gray-900'
                ].filter(Boolean).join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {onClose ? (
        <button
          aria-label="Cerrar"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
          onClick={onClose}
        >
          ×
        </button>
      ) : null}
    </div>
  </div>
);

export default Modal;
