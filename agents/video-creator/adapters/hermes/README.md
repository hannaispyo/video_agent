# Hermes AI Adapter — Video Creator

Agente autónomo que se conecta a Hermes AI para recibir briefs y generar videos automáticamente.

## Cómo funciona

1. Hermes asigna la tarea al agente y lo lanza con `HERMES_TASK_ID`
2. El agente hace `GET /api/tasks/{taskId}` para leer el brief
3. Ejecuta el workflow completo (script → imágenes → animación → MP4)
4. Sube el video a S3/R2
5. Reporta el resultado a `POST /api/tasks/{taskId}/result`
6. Si el task tiene `callbackUrl`, también dispara el webhook

## Variables de entorno requeridas

```env
# Hermes platform
HERMES_API_URL=https://hermes.yourdomain.com
HERMES_API_KEY=your-bearer-token
HERMES_TASK_ID=task-abc123          # Set by Hermes when spawning

# Video generation APIs
CLAUDE_API_KEY=sk_...
KIE_API_KEY=...
ELEVEN_LABS_API_KEY=...

# Output storage (S3 / R2)
STORAGE_BUCKET=your-bucket
STORAGE_PUBLIC_URL=https://videos.yourdomain.com
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## Input esperado del task (Hermes API)

```json
{
  "id": "task-abc123",
  "status": "pending",
  "input": {
    "brief": "3 ADHD Productivity Hacks",
    "audience": "ADHD individuals",
    "message": "Simple strategies to improve focus",
    "duration": 30,
    "tone": "professional",
    "style": "flat lay con objetos físicos",
    "motion": "subtle-camera",
    "colorMood": "warm",
    "callbackUrl": "https://tu-sistema.com/webhooks/video-done"
  }
}
```

## Output que reporta a Hermes

```json
{
  "taskId": "task-abc123",
  "status": "completed",
  "videoUrl": "https://videos.yourdomain.com/videos/3-adhd-productivity-hacks/out.mp4",
  "durationMin": 72.3,
  "completedAt": "2026-05-22T15:30:00Z"
}
```

## Lanzar manualmente

```bash
HERMES_TASK_ID=task-abc123 \
HERMES_API_URL=https://hermes.yourdomain.com \
HERMES_API_KEY=your-key \
npx ts-node agents/video-creator/adapters/hermes/agent.ts
```

## Registrar en Hermes

Configura Hermes para lanzar este agente con:

```
command: npx ts-node agents/video-creator/adapters/hermes/agent.ts
env:
  HERMES_TASK_ID: "{{task.id}}"
  HERMES_API_URL: "https://hermes.yourdomain.com"
  HERMES_API_KEY: "{{secrets.HERMES_API_KEY}}"
  CLAUDE_API_KEY: "{{secrets.CLAUDE_API_KEY}}"
  KIE_API_KEY: "{{secrets.KIE_API_KEY}}"
  ELEVEN_LABS_API_KEY: "{{secrets.ELEVEN_LABS_API_KEY}}"
  STORAGE_BUCKET: "{{config.STORAGE_BUCKET}}"
  STORAGE_PUBLIC_URL: "{{config.STORAGE_PUBLIC_URL}}"
  AWS_ACCESS_KEY_ID: "{{secrets.AWS_ACCESS_KEY_ID}}"
  AWS_SECRET_ACCESS_KEY: "{{secrets.AWS_SECRET_ACCESS_KEY}}"
timeout: 5400  # 90 minutes
```
