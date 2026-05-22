import { Buffer } from 'buffer';

const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
const ELEVEN_LABS_VOICE_ID = process.env.ELEVEN_LABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Default voice ID
const ELEVEN_LABS_ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech';

// Model ID for Eleven Labs (updated to latest stable)
const ELEVEN_LABS_MODEL_ID = 'eleven_monolingual_v1';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 30000;

interface VoiceoverResult {
  buffer: Buffer;
  durationMs: number;
}

interface DurationValidation {
  valid: boolean;
  variance: number;
  message: string;
}

/**
 * ElevenLabsAudioSynthesizer
 * Handles text-to-speech voiceover generation using Eleven Labs API
 */
export class ElevenLabsAudioSynthesizer {
  private apiKey: string;
  private voiceId: string;

  constructor(apiKey?: string, voiceId?: string) {
    this.apiKey = apiKey || ELEVEN_LABS_API_KEY || '';
    this.voiceId = voiceId || ELEVEN_LABS_VOICE_ID;

    if (!this.apiKey) {
      console.warn(
        '⚠️  ELEVEN_LABS_API_KEY not set. Audio synthesis will fail. Set ELEVEN_LABS_API_KEY environment variable.'
      );
    }
  }

  /**
   * Generate voiceover audio from text using Eleven Labs API
   * @param text - Voiceover script (can be full script or individual lines)
   * @param voiceId - Eleven Labs voice ID (optional, uses instance voiceId if not provided)
   * @returns Promise<{buffer: Buffer, durationMs: number}>
   */
  async generateVoiceover(text: string, voiceId?: string): Promise<VoiceoverResult> {
    // Input validation
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    if (!this.apiKey) {
      throw new Error('ELEVEN_LABS_API_KEY not set or invalid. Set the environment variable to enable audio synthesis.');
    }

    const selectedVoiceId = voiceId || this.voiceId;

    try {
      const audioBuffer = await this._callElevenLabsAPI(text, selectedVoiceId);

      // Calculate duration of the generated audio
      const durationMs = this.getAudioDuration(audioBuffer);

      console.log(
        `✓ Generated voiceover: ${text.substring(0, 50)}... (${durationMs}ms, voice: ${selectedVoiceId.substring(0, 8)}...)`
      );

      return {
        buffer: audioBuffer,
        durationMs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`✗ Failed to generate voiceover: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Internal method: Call Eleven Labs API with retry logic
   * @private
   */
  private async _callElevenLabsAPI(text: string, voiceId: string): Promise<Buffer> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        const response = await fetch(`${ELEVEN_LABS_ENDPOINT}/${voiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: ELEVEN_LABS_MODEL_ID,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
          signal: controller.signal,
        } as any);

        clearTimeout(timeoutId);

        // Handle specific error codes
        if (response.status === 401) {
          throw new Error('ELEVEN_LABS_API_KEY is invalid. Check your API key and try again.');
        }

        if (response.status === 400) {
          const errorData = (await response.json()) as any;
          throw new Error(`Invalid request to Eleven Labs: ${errorData.detail || 'Bad request'}`);
        }

        if (response.status === 404) {
          throw new Error(`Voice ID "${voiceId}" not found. Check the voice ID and try again.`);
        }

        if (response.status === 429) {
          // Rate limit - retry with exponential backoff
          if (attempt < MAX_RETRIES) {
            const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
            console.log(`⚠️  Rate limited by Eleven Labs. Retrying in ${delayMs}ms (attempt ${attempt}/${MAX_RETRIES})...`);
            await this._delay(delayMs);
            continue;
          } else {
            throw new Error('Rate limited by Eleven Labs. Max retries exceeded. Try again later.');
          }
        }

        if (!response.ok) {
          throw new Error(`Eleven Labs API error: ${response.status} ${response.statusText}`);
        }

        // Success: convert response stream to buffer
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on validation errors
        if (lastError.message.includes('invalid') || lastError.message.includes('not found')) {
          throw lastError;
        }

        // Retry on network/timeout errors
        if (attempt < MAX_RETRIES) {
          const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          console.log(`Retrying API call (attempt ${attempt}/${MAX_RETRIES}) after ${delayMs}ms...`);
          await this._delay(delayMs);
        }
      }
    }

    throw lastError || new Error('Failed to call Eleven Labs API after max retries');
  }

  /**
   * Calculate duration of audio buffer (MP3)
   * Uses frame count method for MP3 duration calculation
   * @param audioBuffer - MP3 audio buffer
   * @returns Duration in milliseconds
   */
  getAudioDuration(audioBuffer: Buffer): number {
    try {
      // MP3 frame size calculation
      // Frame header is 4 bytes, we need to find sync headers (0xFFF)
      // For simplicity, we use bitrate estimation or frame counting

      const durationMs = this._calculateMP3Duration(audioBuffer);

      if (durationMs <= 0) {
        throw new Error('Could not calculate valid duration from audio buffer');
      }

      return durationMs;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to calculate audio duration: ${errorMessage}`);
    }
  }

  /**
   * Internal method: Calculate MP3 duration from buffer
   * @private
   */
  private _calculateMP3Duration(buffer: Buffer): number {
    // MP3 frame header format:
    // FFFBAAAA AAABCCCD DDDEEEEE FFGGGGGG
    // Byte 0: Frame sync (0xFF)
    // Byte 1: sync continuation (11100000) + MPEG version (2 bits) + Layer (2 bits)
    // Byte 2: Bitrate index (4 bits) + Sample rate index (2 bits) + Padding (1 bit)
    // Byte 3: Private bit + emphasis (2 bits)

    const BITRATES: Record<number, Record<number, number>> = {
      // [version][bitrate_index] in kbps
      1: { 1: 32, 2: 64, 3: 96, 4: 128, 5: 160, 6: 192, 7: 224, 8: 256, 9: 288, 10: 320, 11: 352, 12: 384, 13: 416, 14: 448 },
      2: { 1: 32, 2: 48, 3: 56, 4: 64, 5: 80, 6: 96, 7: 112, 8: 128, 9: 144, 10: 160, 11: 176, 12: 192, 13: 224, 14: 256 },
      3: { 1: 32, 2: 40, 3: 48, 4: 56, 5: 64, 6: 80, 7: 96, 8: 112, 9: 128, 10: 160, 11: 192, 12: 224, 13: 256, 14: 288 },
    };

    const SAMPLE_RATES: Record<number, Record<number, number>> = {
      1: { 0: 44100, 1: 48000, 2: 32000 },
      2: { 0: 22050, 1: 24000, 2: 16000 },
      3: { 0: 11025, 1: 12000, 2: 8000 },
    };

    let totalSamples = 0;
    let offset = 0;
    let firstFrameParsed = false;
    let samplesPerFrame = 1152; // Default for MPEG1
    let sampleRate = 44100;

    // Scan for MP3 frames and sum samples
    while (offset < buffer.length - 3) {
      // Look for frame sync (0xFFF)
      if (buffer[offset] === 0xff && (buffer[offset + 1] & 0xe0) === 0xe0) {
        const byte1 = buffer[offset + 1];
        const byte2 = buffer[offset + 2];

        // Extract MPEG version (bits 3-4 of byte1)
        const mpegVersionBits = (byte1 >> 3) & 0x03;
        const versionMap: Record<number, number> = { 0: 3, 1: 2, 2: 2, 3: 1 };
        const version = versionMap[mpegVersionBits];

        // Extract bitrate index (bits 4-7 of byte2)
        const bitrateIndex = (byte2 >> 4) & 0x0f;

        // 0 = free format, 15 = reserved - skip these frames
        if (bitrateIndex === 0 || bitrateIndex === 15) {
          offset += 4;
          continue;
        }

        // Extract sample rate index (bits 2-3 of byte2)
        const sampleRateIndex = (byte2 >> 2) & 0x03;

        // Look up bitrate from table
        const bitrate = BITRATES[version] ? BITRATES[version][bitrateIndex] : null;
        const frameSampleRate = SAMPLE_RATES[version] ? SAMPLE_RATES[version][sampleRateIndex] : null;

        // Skip frame if bitrate or sample rate lookup fails
        if (!bitrate || !frameSampleRate) {
          offset += 4;
          continue;
        }

        // Extract padding bit (bit 1 of byte2)
        const paddingBit = (byte2 >> 1) & 0x01;

        // Calculate samples per frame based on MPEG version
        const framesSamplesPerFrame = version === 1 ? 1152 : 576;

        // Calculate frame size: (144 * bitrate / sampleRate) + padding
        const frameSize = Math.floor((144 * bitrate) / frameSampleRate) + paddingBit;

        // Store first frame data for reference
        if (!firstFrameParsed) {
          samplesPerFrame = framesSamplesPerFrame;
          sampleRate = frameSampleRate;
          firstFrameParsed = true;
        }

        // Accumulate samples
        totalSamples += framesSamplesPerFrame;

        // Move to next frame
        offset += frameSize;
      } else {
        offset++;
      }
    }

    // Fallback: estimate based on buffer size if no frames found
    if (totalSamples === 0) {
      const estimatedBitrate = 128; // kbps
      const durationSeconds = (buffer.length * 8) / (estimatedBitrate * 1000);
      return Math.round(durationSeconds * 1000);
    }

    // Calculate total duration from accumulated samples
    const durationSeconds = totalSamples / sampleRate;
    return Math.round(durationSeconds * 1000);
  }

  /**
   * Validate audio duration matches expected script duration
   * @param audioDurationMs - Duration of generated audio (milliseconds)
   * @param expectedDurationSec - Expected duration from script (seconds)
   * @param tolerance - Acceptable variance percentage (default 10%)
   * @returns {valid: boolean, variance: number, message: string}
   */
  validateDuration(
    audioDurationMs: number,
    expectedDurationSec: number,
    tolerance: number = 10
  ): DurationValidation {
    const audioDurationSec = audioDurationMs / 1000;
    const variance = ((audioDurationSec - expectedDurationSec) / expectedDurationSec) * 100;
    const isValid = Math.abs(variance) <= tolerance;

    const sign = variance > 0 ? '+' : '';
    const message = `Audio duration ${audioDurationSec.toFixed(1)}s, expected ${expectedDurationSec.toFixed(1)}s (variance: ${sign}${variance.toFixed(1)}%) ${isValid ? '✓ Valid' : '✗ Invalid'}`;

    return {
      valid: isValid,
      variance: parseFloat(variance.toFixed(2)),
      message,
    };
  }

  /**
   * Internal helper: delay for retry logic
   * @private
   */
  private _delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create a singleton ElevenLabsAudioSynthesizer instance
 */
export function createAudioSynthesizer(): ElevenLabsAudioSynthesizer {
  const apiKey = ELEVEN_LABS_API_KEY;

  if (!apiKey) {
    console.warn('⚠️  ELEVEN_LABS_API_KEY not set. Audio synthesis will be unavailable.');
  }

  return new ElevenLabsAudioSynthesizer(apiKey, ELEVEN_LABS_VOICE_ID);
}

/**
 * Convenience export for common voice IDs
 */
export const ELEVEN_LABS_VOICE_IDS = {
  bella: '21m00Tcm4TlvDq8ikWAM',
  josh: 'TtoZ7ATAN4d61NhD3c8z',
  samantha: 'EXAVITQu4EsNXjluf0k5',
  thomas: '2SxwuosuAxyx3cxWZr2B',
  default: '21m00Tcm4TlvDq8ikWAM',
};
