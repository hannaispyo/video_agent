import React from 'react';
import { Sequence, Audio, Video } from 'remotion';
import { VideoClip } from '../types';

interface VideoSequenceProps {
  clips: VideoClip[];
  audioPath?: string;
  script: any;
  projectDir: string;
}

/**
 * Main video composition component for Remotion
 * Assembles video clips sequentially and embeds audio track
 */
export const VideoSequence: React.FC<VideoSequenceProps> = ({
  clips,
  audioPath,
  script,
  projectDir,
}) => {
  let currentFrame = 0;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Video clips arranged sequentially */}
      {clips.map((clip) => {
        const clipStartFrame = currentFrame;
        const clipFrames = Math.ceil(clip.duration * 30); // 30fps
        const clipEndFrame = clipStartFrame + clipFrames;

        const result = (
          <Sequence
            key={clip.sceneNumber}
            from={clipStartFrame}
            durationInFrames={clipFrames}
            layout="none"
          >
            <Video
              src={clip.filePath}
              style={{
                width: '100%',
                height: '100%',
              }}
            />
          </Sequence>
        );

        currentFrame = clipEndFrame;
        return result;
      })}

      {/* Audio track - synced to start at frame 0 */}
      {audioPath && (
        <Audio
          src={audioPath}
          startFrom={0}
        />
      )}
    </div>
  );
};
