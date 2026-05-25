# Paperclip Adapter — Video Creator

Adapter para la plataforma [Paperclip](https://paperclip.ing/) que permite generar videos automáticos multi-escena desde tareas asignadas por agentes.

## Instalación en Paperclip

### Opción A: Local (desarrollo)

```bash
# Desde el root del proyecto
npm run build --workspace=agents/video-creator/adapters/paperclip

# Registrar en Paperclip
curl -X POST http://127.0.0.1:3100/api/adapters/install \
  -H "Content-Type: application/json" \
  -d '{
    "packageName": "/ruta/absoluta/al/proyecto/agents/video-creator/adapters/paperclip",
    "isLocalPath": true
  }'
```

### Opción B: Via ~/.paperclip/adapter-plugins.json

```json
{
  "adapters": [
    {
      "packageName": "/ruta/absoluta/agents/video-creator/adapters/paperclip",
      "isLocalPath": true
    }
  ]
}
```

## Configuración del agente en Paperclip UI

Al crear un agente con este adapter, configura:

| Campo | Descripción |
|---|---|
| KIE API Key | API key de kie.ai (imágenes + Kling) — **requerido** |
| Claude API Key | Anthropic API key (script + storyboard) |
| Eleven Labs API Key | Eleven Labs (voiceover) |
| Storage Bucket | Bucket S3/R2 para el video final |
| Storage Public URL | URL pública del bucket |

## Input del task

El adapter lee el brief desde `context.data` del task Paperclip:

```json
{
  "brief": "3 ADHD Productivity Hacks",
  "audience": "ADHD individuals",
  "message": "Simple strategies to improve focus",
  "duration": 30,
  "tone": "professional",
  "style": "flat lay con objetos físicos",
  "motion": "subtle-camera",
  "colorMood": "warm"
}
```

## Output

El adapter retorna en `resultJson`:

```json
{
  "videoUrl": "https://videos.yourdomain.com/videos/project-name/out.mp4",
  "projectName": "3-adhd-productivity-hacks",
  "durationMin": 72.3
}
```
