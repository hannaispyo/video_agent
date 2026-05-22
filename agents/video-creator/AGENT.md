# Video Creator Agent

Genera videos profesionales de forma completamente automática a partir de un brief de texto. Orquesta múltiples APIs de IA para producir un MP4 final con voiceover, imágenes generadas y animación cinematográfica.

---

## Qué hace

Toma un **brief de 3 líneas** (título, audiencia, mensaje) y produce un video terminado en 45–90 minutos sin intervención humana.

### Pipeline de 7 pasos

```
Brief → Script → Audio → Storyboard → Prompts → Imágenes → Animación → Ensamblaje
                 ↓           ↓             ↓          ↓           ↓            ↓
            Eleven Labs   Claude API    Claude API  kie.ai API   Kling API   Remotion
```

| Paso | Qué produce | API | Tiempo |
|------|------------|-----|--------|
| **1. Script** | Guión con escenas y voiceover | Claude | 5 min |
| **2. Audio** | Voiceover MP3 sincronizado | Eleven Labs | 2 min |
| **3. Storyboard** | Descripciones visuales + paletas de color + referencias cinematográficas | Claude | 5 min |
| **4. Prompts** | Prompts optimizados para kie.ai con parámetros Kling 3.0 | — | 2 min |
| **5. Imágenes** | PNG por escena (1920×1080, 16:9) | kie.ai | 15 min |
| **6. Animación** | Clips MP4 con movimiento de cámara | Kling | 20 min |
| **7. Ensamblaje** | `out.mp4` final con audio embebido | Remotion | 5 min |

---

## Cómo se invoca

```bash
/video-creator \
  --brief "Título del video" \
  --audience "Audiencia objetivo" \
  --message "Mensaje principal"
```

**Parámetros opcionales:**
- `--duration 60` — duración en segundos (default: 30)
- `--tone energetic` — tono: `energetic | steady | comedic | professional` (default: `professional`)
- `--project nombre --resume` — retomar un proyecto interrumpido

**Ejemplo real:**
```bash
/video-creator \
  --brief "3 Hacks de Productividad TDAH" \
  --audience "Adultos con TDAH" \
  --message "Técnicas simples para mejorar el enfoque" \
  --tone energetic \
  --duration 60
```

---

## Características visuales avanzadas

### 🎨 Color Schemes & Referencias Cinematográficas
Cuando `CLAUDE_API_KEY` está disponible, el storyboard incluye:
- Paleta de color por escena (hex: primary, secondary, accent)
- Estado de ánimo: `warm | cool | vibrant | neutral`
- Estilo de gradación: `cinematic | modern | vintage | documentary`
- Referencias de películas o series como inspiración visual

### 🎬 Kling 3.0 Motion Options
Parámetros de movimiento específicos para Kling:
- **subtle-camera** — pan/zoom suave, intensidad 20%
- **subject-motion** — movimiento del sujeto con cámara estable, intensidad 40%
- **complex-motion** — cámara + sujeto coordinados, intensidad 60%
- **static** — sin movimiento

### 🔗 Frame Continuity
Si FFmpeg está instalado, el último frame de cada clip se usa como primer frame del siguiente → transiciones visuales sin saltos.

### 📊 Visual Coherence Validator
Analiza el storyboard completo antes de generar imágenes:
- **Color Consistency** — distancia RGB entre escenas consecutivas
- **Motion Flow** — detecta cambios bruscos de intensidad (>50%)
- **Style Consistency** — valida que no haya >2 estilos de gradación distintos
- Score final 0–100 con recomendaciones específicas

---

## Output por proyecto

```
outputs/videos/{nombre-proyecto}/
├── script.json                  # Guión con escenas
├── storyboard.json              # Descripciones visuales + color + movimiento
├── image-prompts.json           # Prompts optimizados para kie.ai
├── images/                      # PNGs generados
├── clips/                       # MP4s animados por escena
├── voiceover.mp3                # Audio generado por Eleven Labs
├── audio-manifest.json          # Metadata del audio
├── visual-coherence-report.json # Análisis de coherencia visual
├── frame-continuity-manifest.json # Links entre frames (si FFmpeg disponible)
└── out.mp4                      # VIDEO FINAL
```

---

## APIs requeridas

| API | Variable de entorno | Para qué | Fallback sin API |
|-----|-------------------|----------|-----------------|
| **Claude** | `CLAUDE_API_KEY` | Script + storyboard mejorado | Templates predefinidos |
| **kie.ai** | `KIE_API_KEY` | Generación de imágenes | Imágenes placeholder |
| **Kling** | `KLING_API_KEY` | Animación de clips | Animación Remotion básica |
| **Eleven Labs** | `ELEVEN_LABS_API_KEY` | Voiceover MP3 | Video sin audio |
| **FFmpeg** | — (instalado localmente) | Frame continuity | Sin linking entre clips |

> **Funciona sin APIs:** El agente degrada graciosamente. Sin claves, genera un video de demostración con contenido placeholder.

---

## Recuperación de proyectos

El agente guarda checkpoints después de cada paso. Si se interrumpe:

```bash
/video-creator --project nombre-del-proyecto --resume
```

Retoma desde el último paso completado sin repetir trabajo ya hecho.

---

## Arquitectura interna

```
skill-entry.ts              # Punto de entrada (parseando --args)
├── AutoVideoExecutor       # Orquestador principal (auto-executor.ts)
│   ├── VideoProjectManager # Estado, checkpoints, manifests (orchestrator.ts)
│   └── Pasos del workflow:
│       ├── script-generation.ts      # Claude API → script.json
│       ├── audio-synthesis.ts        # Eleven Labs → voiceover.mp3
│       ├── storyboard-generation.ts  # Claude API → storyboard.json
│       ├── prompt-engineering.ts     # Builders Kling 3.0 → image-prompts.json
│       ├── image-generation.ts       # kie.ai → images/
│       ├── animation-handler.ts      # Kling → clips/
│       ├── frame-continuity.ts       # FFmpeg → frame links
│       └── video-assembly.ts         # Remotion → out.mp4
└── validators/
    └── visual-consistency.ts         # Coherence scoring
```

---

## Configuración de entorno

Ver `config/video-agent.env.template` para todas las variables disponibles. Variables mínimas para producción:

```env
CLAUDE_API_KEY=sk_...
KIE_API_KEY=sk_...
KLING_API_KEY=sk_...
ELEVEN_LABS_API_KEY=sk_...
ELEVEN_LABS_VOICE_ID=bella
```
