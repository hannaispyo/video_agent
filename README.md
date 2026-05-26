# Video Creator

Genera videos profesionales multi-escena de forma completamente automática.  
Un brief de entrada → MP4 listo en 60-90 minutos.

---

## Cómo funciona

```
brief (título, audiencia, mensaje)
    │
    ├─ 1. Script        → Claude Code CLI escribe el guión con N escenas    (5-10 min)
    ├─ 2. Voiceover     → Eleven Labs sintetiza el audio                    (1-2 min)
    ├─ 3. Storyboard    → Claude diseña cada escena: colores, cámara, mood  (5-10 min)
    ├─ 4. Prompts       → Claude genera prompts optimizados para kie.ai     (2-5 min)
    ├─ 5. Imágenes      → kie.ai (GPT-4o) genera una imagen por escena     (10-20 min)
    ├─ 6. Animación     → Kling 2.6 anima cada imagen → clip MP4           (15-30 min)
    └─ 7. Ensamble      → Remotion une clips + audio → out.mp4             (5-10 min)

Total: ~60-90 minutos
```

---

## Instalación

```bash
git clone https://github.com/hannaispyo/video_agent
cd video_agent
./install-skill.sh
```

El script:
- Verifica prerequisitos (Node, Claude Code CLI, FFmpeg)
- Corre `npm install`
- Crea `.env` y pide el KIE API key interactivamente
- Instala `/video-creator` globalmente en Claude Code y Cowork

### Lo que necesitas

| Herramienta | Para qué | Cómo obtener |
|---|---|---|
| **Claude Code CLI** | Script + storyboard + prompts | Instalar Claude Code y hacer `claude login` |
| **KIE API Key** | Imágenes (GPT-4o) + animación (Kling 2.6) | [kie.ai](https://kie.ai) → Dashboard → API Keys |
| **FFmpeg** | Frame continuity entre escenas (opcional) | `brew install ffmpeg` |
| **Eleven Labs API Key** | Voiceover (opcional) | [elevenlabs.io](https://elevenlabs.io/app/api) |

> **No se necesita `CLAUDE_API_KEY`** — el agente usa el Claude Code CLI local.  
> KIE_API_KEY cubre tanto imágenes como animación (una sola key).

---

## Uso

### Claude Code (skill /video-creator)

```
/video-creator --brief "Título del video" --audience "Audiencia" --message "Mensaje principal"
```

**Parámetros requeridos:**

| Parámetro | Descripción | Ejemplo |
|---|---|---|
| `--brief` | Título del video | `"3 Tips de Productividad TDAH"` |
| `--audience` | Audiencia objetivo | `"Adultos con TDAH"` |
| `--message` | Mensaje principal | `"Pequeños hábitos que cambian todo"` |

**Parámetros opcionales:**

| Parámetro | Opciones | Default | Descripción |
|---|---|---|---|
| `--duration` | número (segundos) | `30` | Duración del video |
| `--tone` | `energetic` `steady` `comedic` `educational` `professional` | `professional` | Tono del guión |
| `--style` | texto libre | — | Concepto visual: `"flat lay, iluminación cálida"` |
| `--motion` | `subtle-camera` `subject-motion` `complex-motion` `static` | — | Tipo de movimiento en Kling |
| `--color-mood` | `warm` `cool` `vibrant` `neutral` | — | Paleta de color |
| `--project` + `--resume` | nombre del proyecto | — | Reanudar un video interrumpido |

**Ejemplos:**

```
# Mínimo
/video-creator --brief "3 Tips TDAH" --audience "Adultos con TDAH" --message "Hábitos simples"

# Con dirección visual completa
/video-creator \
  --brief "Lanzamiento Authoflow" \
  --audience "Profesionales con TDAH" \
  --message "Gestiona tus tareas con IA" \
  --duration 30 \
  --tone energetic \
  --style "flat lay con objetos físicos, iluminación cálida y acogedora" \
  --motion subtle-camera \
  --color-mood warm

# Reanudar video interrumpido
/video-creator --project "lanzamiento-authoflow" --resume
```

### Cowork

El skill `/video-creator` funciona directamente en Cowork.  
Al configurar Cowork, establece el **work folder** en el directorio del proyecto:

```
/ruta/al/proyecto/video_agent
```

Luego usa el skill normalmente con `/video-creator`.

### Terminal (npm)

```bash
npm run video-creator -- \
  --brief "3 Tips TDAH" \
  --audience "Adultos con TDAH" \
  --message "Hábitos simples"
```

---

## Otras formas de integración

### HTTP API (sistemas externos)

Servidor async con webhook callback:

```bash
npm run api   # Inicia en puerto 3001
```

```bash
# Crear un video
curl -X POST http://localhost:3001/videos \
  -H "Content-Type: application/json" \
  -d '{
    "brief": "3 Tips TDAH",
    "audience": "Adultos con TDAH",
    "message": "Hábitos simples",
    "callbackUrl": "https://tu-sistema.com/webhook"
  }'
# → { "jobId": "3-tips-tdah", "status": "queued", "estimatedMinutes": "60-90" }

# Consultar estado
curl http://localhost:3001/videos/3-tips-tdah
```

Ver [docs/uso-api.md](docs/uso-api.md) para más detalles.

### Paperclip adapter

```bash
cd agents/video-creator/adapters/paperclip
npm install && npm run build
```

Ver [docs/uso-paperclip.md](docs/uso-paperclip.md) para instalación en Paperclip.

### Hermes AI agent

```bash
HERMES_TASK_ID=task-abc123 \
HERMES_API_URL=https://hermes.tudominio.com \
HERMES_API_KEY=tu-key \
KIE_API_KEY=tu-kie-key \
npx ts-node agents/video-creator/adapters/hermes/agent.ts
```

Ver [docs/uso-hermes.md](docs/uso-hermes.md) para configuración en Hermes AI.

---

## Output

```
outputs/videos/{nombre-del-proyecto}/
├── out.mp4                          ← Video final
├── script.json                      ← Guión por escenas
├── storyboard.json                  ← Descripción visual + colores + cámara
├── image-prompts.json               ← Prompts usados en kie.ai
├── audio-manifest.json              ← Metadatos del voiceover
├── images/                          ← Imágenes generadas (PNG por escena)
├── clips/                           ← Clips animados (MP4 por escena)
├── visual-coherence-report.json     ← Análisis de consistencia visual
└── frame-continuity-manifest.json   ← Links entre frames (si FFmpeg disponible)
```

---

## Características

### Coherencia visual entre escenas

Claude genera para cada escena:
- **Color scheme:** colores primario, secundario y acento en hex + mood (warm/cool/vibrant/neutral) + grading (cinematic/modern/vintage)
- **Referencia cinematográfica:** director o serie de referencia + descripción del estilo
- **Motion option:** tipo de movimiento, velocidad e intensidad para Kling

### Frame continuity

Si FFmpeg está instalado, el sistema extrae el último frame de cada clip y lo usa como punto de partida del siguiente — eliminando los cortes abruptos entre escenas.

### Visual coherence validator

Analiza consistencia entre escenas y genera un reporte con score 0-100:
- **Color consistency:** detecta saltos bruscos de color entre escenas
- **Motion flow:** detecta cambios abruptos de intensidad de movimiento  
- **Style consistency:** valida que el grading sea consistente a lo largo del video

### Checkpoint recovery

El workflow guarda checkpoints después de cada paso. Si se interrumpe, retoma desde donde quedó:

```
/video-creator --project "mi-video" --resume
```

---

## Estructura del proyecto

```
.
├── install-skill.sh                          ← Instalador del skill
├── agents/
│   └── video-creator/
│       ├── skill-entry.ts                    ← Entry point del skill
│       ├── api-server.ts                     ← HTTP API server
│       ├── storage-uploader.ts               ← Upload a S3/R2
│       ├── config.ts                         ← Configuración y defaults
│       ├── types.ts                          ← TypeScript interfaces
│       ├── orchestrator.ts                   ← Gestión de proyectos y checkpoints
│       ├── workflows/
│       │   ├── claude-cli.ts                 ← Wrapper del Claude Code CLI
│       │   ├── script-generation.ts          ← Generación de guión
│       │   ├── storyboard-generation.ts      ← Storyboard + colores + cámara
│       │   ├── prompt-engineering.ts         ← Prompts optimizados para kie.ai
│       │   ├── image-generation.ts           ← Generación de imágenes (kie.ai)
│       │   ├── animation-handler.ts          ← Animación Kling + fallback Remotion
│       │   ├── auto-executor.ts              ← Orquestador del workflow completo
│       │   ├── visual-coherence.ts           ← Validador de coherencia visual
│       │   └── frame-continuity.ts           ← Frame linking con FFmpeg
│       ├── adapters/
│       │   ├── paperclip/                    ← Adapter para Paperclip
│       │   └── hermes/                       ← Agent para Hermes AI
│       └── remotion/                         ← Composición y ensamble de video
├── config/
│   └── video-agent.env.template              ← Template de variables de entorno
├── docs/
│   ├── uso-skill-video-creator.md            ← Documentación del skill
│   ├── uso-paperclip.md                      ← Documentación del adapter Paperclip
│   └── uso-hermes.md                         ← Documentación del agent Hermes
└── outputs/                                  ← Videos generados (gitignored)
```

---

## Troubleshooting

**FFmpeg no encontrado:**
```bash
brew install ffmpeg   # macOS
apt-get install ffmpeg  # Linux
```
El video se genera igual — frame continuity simplemente se desactiva.

**Claude CLI no autenticado:**
```bash
claude login
```

**KIE_API_KEY inválida:** Verificar en [kie.ai dashboard](https://kie.ai). El video se genera con imágenes placeholder si la key falla.

**Video interrumpido a mitad:** Usar `--resume` — los pasos completados no se repiten.

**Clips no encontrados en ensamble:** Verificar que existan archivos en `outputs/videos/{proyecto}/clips/`. Si el directorio está vacío, la animación falló — revisar logs de Kling.
