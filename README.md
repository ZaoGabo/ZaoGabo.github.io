# Encuentra las Diferencias

**Estado:** 🚧 *En desarrollo* (recién comenzado)

Este proyecto es una aplicación web tipo juego donde el objetivo es encontrar diferencias entre dos imágenes. Está construido con React y Vite, y permite agregar niveles, ajustar dificultad y visualizar marcadores de diferencias (solo en modo desarrollador).

Características principales:
- Pantalla de bienvenida
- Sistema de puntuación y temporizador
- Niveles configurables
- Edición de diferencias solo para el autor

Ideal para practicar observación y atención visual.

## Requisitos

- Node.js 18 o superior
- npm (viene incluido con Node.js)


## ¿Cómo probar la aplicación?

1. Instala Node.js (versión 18 o superior).
2. Descarga este proyecto y abre una terminal en la carpeta principal.
3. Ejecuta:
	```bash
	npm install
	npm run dev
	```
4. Abre la URL que aparece en la terminal (por defecto http://localhost:5173) en tu navegador.

¡Listo! Ya puedes jugar Encuentra las Diferencias en tu computadora.

Próximamente se publicará un link para jugar online directamente.

## Personalización de imágenes

Coloca tus imágenes en `public/images` con los nombres `original.png` y `modified.png`. El componente usa rutas relativas (`/images/original.png`, `/images/modified.png`).

## Notas técnicas

- Tailwind se importa mediante CDN desde `index.html` para simplificar el prototipo; se puede migrar a una configuración completa si hace falta.
- El modo edición de diferencias sólo se muestra cuando la app se ejecuta en modo desarrollo (`npm run dev`).
- El archivo `vite.config.js` contiene la configuración de Vite. Si más adelante despliegas en un subdirectorio, ajusta `base` según sea necesario.
