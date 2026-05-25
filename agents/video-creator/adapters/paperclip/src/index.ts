/**
 * Paperclip adapter metadata — MUST be dependency-free.
 * This file is loaded in every context (server, UI, CLI).
 */

export const type = 'video_creator';

export const label = 'Video Creator (Authoflow)';

export const models: { id: string; label: string }[] = [
  { id: 'kling-2.6', label: 'Kling 2.6 (recommended)' },
  { id: 'remotion-only', label: 'Remotion fallback (no API keys required)' },
];

export const agentConfigurationDoc = `
## Video Creator — Configuración

Genera videos multi-escena automáticamente: script → storyboard → imágenes → animación → MP4 final.

### API Keys requeridas

| Variable | Uso | Dónde obtenerla |
|---|---|---|
| \`CLAUDE_API_KEY\` | Script + storyboard | console.anthropic.com |
| \`KIE_API_KEY\` | Imágenes (GPT-4o) + animación (Kling) | kie.ai |
| \`ELEVEN_LABS_API_KEY\` | Voiceover | elevenlabs.io |

### Parámetros del brief

El agente recibe el brief desde el campo \`data\` del task:

\`\`\`json
{
  "brief": "Video title",
  "audience": "Target audience",
  "message": "Key message",
  "duration": 30,
  "tone": "professional",
  "style": "flat lay con objetos físicos",
  "motion": "subtle-camera",
  "colorMood": "warm"
}
\`\`\`

### Output

El video final se sube a S3/R2 y la URL se retorna en \`resultJson.videoUrl\`.
Tiempo estimado: 60-90 minutos.
`;
