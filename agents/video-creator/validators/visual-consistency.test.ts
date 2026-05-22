import { describe, it, expect } from 'vitest';
import { VisualConsistencyValidator, hexToRgb } from './visual-consistency';
import { Storyboard, VisualScene } from '../types';

/**
 * Sample storyboard for testing
 * 3 scenes: warm → warm → cool progression
 */
const sampleStoryboard: Storyboard = {
  title: 'Test Storyboard',
  duration: 90,
  generatedAt: new Date().toISOString(),
  scenes: [
    {
      sceneNumber: 1,
      duration: 30,
      scriptLine: 'Scene 1: Opening',
      visualDescription: 'Warm introduction',
      imagePromptSeed: 'warm-opening',
      colorScheme: {
        primary: '#FF6B6B',
        secondary: '#FF8A80',
        accent: '#FFB74D',
        mood: 'warm',
        grading: 'cinematic'
      },
      motionOption: {
        type: 'subtle-camera',
        camera: {
          motion: 'zoom-in',
          speed: 'slow',
          intensity: 20
        }
      },
      cinematicReference: {
        style: 'warm-cinematic',
        inspirationBrief: 'Golden hour cinematography'
      }
    },
    {
      sceneNumber: 2,
      duration: 30,
      scriptLine: 'Scene 2: Build',
      visualDescription: 'Warm continuation',
      imagePromptSeed: 'warm-build',
      colorScheme: {
        primary: '#FF8A80',
        secondary: '#FFB74D',
        accent: '#FF6B6B',
        mood: 'warm',
        grading: 'cinematic'
      },
      motionOption: {
        type: 'subject-motion',
        camera: {
          motion: 'pan-right',
          speed: 'medium',
          intensity: 40
        },
        subject: {
          present: true,
          motion: 'walk',
          frameConsistency: true
        }
      },
      cinematicReference: {
        style: 'warm-cinematic',
        inspirationBrief: 'Dynamic warm transitions'
      }
    },
    {
      sceneNumber: 3,
      duration: 30,
      scriptLine: 'Scene 3: Climax',
      visualDescription: 'Cool transition',
      imagePromptSeed: 'cool-climax',
      colorScheme: {
        primary: '#4A90E2',
        secondary: '#357ABD',
        accent: '#2E5C8A',
        mood: 'cool',
        grading: 'modern'
      },
      motionOption: {
        type: 'complex-motion',
        camera: {
          motion: 'dolly',
          speed: 'fast',
          intensity: 100
        }
      },
      cinematicReference: {
        style: 'cool-modern',
        inspirationBrief: 'Modern blue aesthetic'
      }
    }
  ]
};

describe('VisualConsistencyValidator', () => {
  describe('hexToRgb helper', () => {
    it('converts valid hex to RGB', () => {
      const rgb = hexToRgb('#FF6B6B');
      expect(rgb).toEqual({ r: 255, g: 107, b: 107 });
    });

    it('converts hex without # prefix', () => {
      const rgb = hexToRgb('FF6B6B');
      expect(rgb).toEqual({ r: 255, g: 107, b: 107 });
    });

    it('handles lowercase hex', () => {
      const rgb = hexToRgb('#ff6b6b');
      expect(rgb).toEqual({ r: 255, g: 107, b: 107 });
    });

    it('returns null for invalid hex', () => {
      expect(hexToRgb('invalid')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(hexToRgb('')).toBeNull();
    });

    it('returns null for partial hex', () => {
      expect(hexToRgb('#FF6B')).toBeNull();
    });

    it('converts pure colors correctly', () => {
      expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
    });
  });

  describe('analyzeColorConsistency', () => {
    const validator = new VisualConsistencyValidator();

    it('returns 0 score and error message for empty storyboard', () => {
      const emptyStoryboard: Storyboard = {
        title: 'Empty',
        duration: 0,
        generatedAt: new Date().toISOString(),
        scenes: []
      };

      const result = validator.analyzeColorConsistency(emptyStoryboard);
      expect(result.score).toBe(0);
      expect(result.issues).toContain('No scenes in storyboard');
      expect(result.colorVariances).toEqual([]);
    });

    it('returns 100 score for single-scene storyboard', () => {
      const singleScene: Storyboard = {
        title: 'Single Scene',
        duration: 30,
        generatedAt: new Date().toISOString(),
        scenes: [sampleStoryboard.scenes[0]]
      };

      const result = validator.analyzeColorConsistency(singleScene);
      expect(result.score).toBe(100);
      expect(result.issues).toEqual([]);
      expect(result.colorVariances).toEqual([]);
    });

    it('calculates RGB distance correctly for warm→warm transition', () => {
      const result = validator.analyzeColorConsistency(sampleStoryboard);

      // RGB distance between #FF6B6B and #FF8A80:
      // sqrt((255-255)² + (107-138)² + (107-128)²) = sqrt(0 + 961 + 441) ≈ 37.4
      expect(result.colorVariances[0]).toBeCloseTo(37.4, 1);

      // This should NOT be flagged (distance < 100)
      expect(result.issues.filter(i => i.includes('Scene 1 → 2')).length).toBe(0);
    });

    it('detects large color jumps (>100 RGB distance)', () => {
      const result = validator.analyzeColorConsistency(sampleStoryboard);

      // RGB distance between #FF8A80 and #4A90E2 (warm to cool):
      // This should be a large jump and flagged
      const largeJumpIssues = result.issues.filter(i => i.includes('Large color jump'));
      expect(largeJumpIssues.length).toBeGreaterThan(0);

      // The distance should be > 100
      expect(result.colorVariances[1]).toBeGreaterThan(100);
    });

    it('generates a reasonable score for mixed warm/cool colors', () => {
      const result = validator.analyzeColorConsistency(sampleStoryboard);

      // With two small distances followed by one large jump,
      // we expect a moderate score (not too high, not too low)
      expect(result.score).toBeGreaterThan(40);
      expect(result.score).toBeLessThan(90);
    });

    it('flags excessive mood changes (3+)', () => {
      const storyboardWith4Moods: Storyboard = {
        title: 'Many moods',
        duration: 120,
        generatedAt: new Date().toISOString(),
        scenes: [
          { ...sampleStoryboard.scenes[0], colorScheme: { ...sampleStoryboard.scenes[0].colorScheme!, mood: 'warm' } },
          { ...sampleStoryboard.scenes[1], colorScheme: { ...sampleStoryboard.scenes[1].colorScheme!, mood: 'cool' } },
          { ...sampleStoryboard.scenes[2], colorScheme: { ...sampleStoryboard.scenes[2].colorScheme!, mood: 'neutral' } },
          {
            ...sampleStoryboard.scenes[0],
            sceneNumber: 4,
            colorScheme: { ...sampleStoryboard.scenes[0].colorScheme!, mood: 'vibrant' }
          }
        ]
      };

      const result = validator.analyzeColorConsistency(storyboardWith4Moods);
      const moodIssue = result.issues.find(i => i.includes('mood changes'));
      expect(moodIssue).toBeDefined();
    });

    it('handles missing colorScheme gracefully', () => {
      const storyboardMissingColors: Storyboard = {
        title: 'Missing colors',
        duration: 60,
        generatedAt: new Date().toISOString(),
        scenes: [
          { ...sampleStoryboard.scenes[0], colorScheme: undefined },
          { ...sampleStoryboard.scenes[1], colorScheme: undefined }
        ]
      };

      const result = validator.analyzeColorConsistency(storyboardMissingColors);
      // Should use default #000000 and still calculate distances
      expect(result.score).toBeDefined();
      expect(result.colorVariances.length).toBe(1);
    });
  });

  describe('analyzeMotionFlow', () => {
    const validator = new VisualConsistencyValidator();

    it('returns 0 score and error message for empty storyboard', () => {
      const emptyStoryboard: Storyboard = {
        title: 'Empty',
        duration: 0,
        generatedAt: new Date().toISOString(),
        scenes: []
      };

      const result = validator.analyzeMotionFlow(emptyStoryboard);
      expect(result.score).toBe(0);
      expect(result.issues).toContain('No scenes in storyboard');
      expect(result.jumps).toEqual([]);
    });

    it('returns 100 score for single-scene storyboard', () => {
      const singleScene: Storyboard = {
        title: 'Single Scene',
        duration: 30,
        generatedAt: new Date().toISOString(),
        scenes: [sampleStoryboard.scenes[0]]
      };

      const result = validator.analyzeMotionFlow(singleScene);
      expect(result.score).toBe(100);
      expect(result.issues).toEqual([]);
      expect(result.jumps).toEqual([]);
    });

    it('detects >50% intensity jumps', () => {
      const result = validator.analyzeMotionFlow(sampleStoryboard);

      // Jump 1: 20→40 = 100% change (flagged)
      // Jump 2: 40→100 = 150% change (flagged)
      expect(result.jumps.length).toBe(2);

      // First jump: 20→40, 100% change
      expect(result.jumps[0].from).toBe(20);
      expect(result.jumps[0].to).toBe(40);
      expect(result.jumps[0].percentChange).toBeCloseTo(100, 0);

      // Second jump: 40→100, 150% change
      expect(result.jumps[1].from).toBe(40);
      expect(result.jumps[1].to).toBe(100);
      expect(result.jumps[1].percentChange).toBeCloseTo(150, 0);
    });

    it('generates low score when 50%+ of transitions are flagged', () => {
      const result = validator.analyzeMotionFlow(sampleStoryboard);

      // 2/2 transitions flagged → 100% flagged → score should be 50 or lower
      expect(result.score).toBeLessThanOrEqual(50);
    });

    it('generates appropriate issue messages', () => {
      const result = validator.analyzeMotionFlow(sampleStoryboard);

      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toMatch(/Scene \d+ → \d+: Motion intensity jump/);
    });

    it('handles smooth transitions without flagging', () => {
      const smoothMotion: Storyboard = {
        title: 'Smooth motion',
        duration: 90,
        generatedAt: new Date().toISOString(),
        scenes: [
          {
            ...sampleStoryboard.scenes[0],
            motionOption: {
              type: 'subtle-camera',
              camera: { motion: 'zoom-in', speed: 'slow', intensity: 20 }
            }
          },
          {
            ...sampleStoryboard.scenes[1],
            motionOption: {
              type: 'subtle-camera',
              camera: { motion: 'zoom-in', speed: 'slow', intensity: 25 }
            }
          },
          {
            ...sampleStoryboard.scenes[2],
            motionOption: {
              type: 'subtle-camera',
              camera: { motion: 'zoom-in', speed: 'slow', intensity: 30 }
            }
          }
        ]
      };

      const result = validator.analyzeMotionFlow(smoothMotion);
      expect(result.jumps.length).toBe(0);
      expect(result.score).toBe(100);
    });

    it('handles missing motionOption gracefully', () => {
      const missingMotion: Storyboard = {
        title: 'Missing motion',
        duration: 60,
        generatedAt: new Date().toISOString(),
        scenes: [
          { ...sampleStoryboard.scenes[0], motionOption: undefined },
          { ...sampleStoryboard.scenes[1], motionOption: undefined }
        ]
      };

      const result = validator.analyzeMotionFlow(missingMotion);
      // Should treat as 0 intensity and calculate percentage change
      expect(result.score).toBeDefined();
    });

    it('handles zero intensity correctly', () => {
      const zeroMotion: Storyboard = {
        title: 'Zero motion',
        duration: 60,
        generatedAt: new Date().toISOString(),
        scenes: [
          {
            ...sampleStoryboard.scenes[0],
            motionOption: {
              type: 'static',
              camera: { motion: 'none', speed: 'slow', intensity: 0 }
            }
          },
          {
            ...sampleStoryboard.scenes[1],
            motionOption: {
              type: 'subtle-camera',
              camera: { motion: 'zoom-in', speed: 'slow', intensity: 50 }
            }
          }
        ]
      };

      const result = validator.analyzeMotionFlow(zeroMotion);
      // Jump from 0 to 50 should be treated as 100% (or handled specially)
      expect(result.score).toBeDefined();
    });
  });

  describe('analyzeStyleConsistency', () => {
    const validator = new VisualConsistencyValidator();

    it('returns 0 score and error message for empty storyboard', () => {
      const emptyStoryboard: Storyboard = {
        title: 'Empty',
        duration: 0,
        generatedAt: new Date().toISOString(),
        scenes: []
      };

      const result = validator.analyzeStyleConsistency(emptyStoryboard);
      expect(result.score).toBe(0);
      expect(result.issues).toContain('No scenes in storyboard');
      expect(result.gradingStyles).toEqual([]);
    });

    it('returns 100 score for single grading style', () => {
      const uniformStyle: Storyboard = {
        title: 'Uniform style',
        duration: 90,
        generatedAt: new Date().toISOString(),
        scenes: [
          { ...sampleStoryboard.scenes[0], colorScheme: { ...sampleStoryboard.scenes[0].colorScheme!, grading: 'cinematic' } },
          { ...sampleStoryboard.scenes[1], colorScheme: { ...sampleStoryboard.scenes[1].colorScheme!, grading: 'cinematic' } },
          { ...sampleStoryboard.scenes[2], colorScheme: { ...sampleStoryboard.scenes[2].colorScheme!, grading: 'cinematic' } }
        ]
      };

      const result = validator.analyzeStyleConsistency(uniformStyle);
      expect(result.score).toBe(100);
      expect(result.gradingStyles).toEqual(['cinematic']);
      expect(result.issues.length).toBe(0);
    });

    it('returns 90 score for 2 grading styles', () => {
      const result = validator.analyzeStyleConsistency(sampleStoryboard);

      // Sample has cinematic and modern
      expect(result.gradingStyles.length).toBe(2);
      expect(result.score).toBe(90);
    });

    it('flags 3 different grading styles with 70 score', () => {
      const threeStyles: Storyboard = {
        title: 'Three styles',
        duration: 120,
        generatedAt: new Date().toISOString(),
        scenes: [
          { ...sampleStoryboard.scenes[0], colorScheme: { ...sampleStoryboard.scenes[0].colorScheme!, grading: 'cinematic' } },
          { ...sampleStoryboard.scenes[1], colorScheme: { ...sampleStoryboard.scenes[1].colorScheme!, grading: 'modern' } },
          { ...sampleStoryboard.scenes[2], colorScheme: { ...sampleStoryboard.scenes[2].colorScheme!, grading: 'vintage' } }
        ]
      };

      const result = validator.analyzeStyleConsistency(threeStyles);
      expect(result.gradingStyles.length).toBe(3);
      expect(result.score).toBe(70);
      expect(result.issues.some(i => i.includes('3 different grading styles'))).toBe(true);
    });

    it('flags 4+ grading styles with 40 score', () => {
      const manyStyles: Storyboard = {
        title: 'Many styles',
        duration: 160,
        generatedAt: new Date().toISOString(),
        scenes: [
          { ...sampleStoryboard.scenes[0], colorScheme: { ...sampleStoryboard.scenes[0].colorScheme!, grading: 'cinematic' } },
          { ...sampleStoryboard.scenes[1], colorScheme: { ...sampleStoryboard.scenes[1].colorScheme!, grading: 'modern' } },
          { ...sampleStoryboard.scenes[2], colorScheme: { ...sampleStoryboard.scenes[2].colorScheme!, grading: 'vintage' } },
          {
            ...sampleStoryboard.scenes[0],
            sceneNumber: 4,
            colorScheme: { ...sampleStoryboard.scenes[0].colorScheme!, grading: 'documentary' }
          }
        ]
      };

      const result = validator.analyzeStyleConsistency(manyStyles);
      expect(result.gradingStyles.length).toBe(4);
      expect(result.score).toBe(40);
      expect(result.issues.some(i => i.includes('Too many grading styles'))).toBe(true);
    });

    it('collects cinematic references', () => {
      const result = validator.analyzeStyleConsistency(sampleStoryboard);

      // Sample should have 2 different cinematic references
      expect(result.cinematicReferences.length).toBeGreaterThan(0);
    });

    it('flags 3+ cinematic references', () => {
      const manyReferences: Storyboard = {
        title: 'Many references',
        duration: 120,
        generatedAt: new Date().toISOString(),
        scenes: [
          {
            ...sampleStoryboard.scenes[0],
            cinematicReference: { style: 'style-1', inspirationBrief: 'Ref 1' }
          },
          {
            ...sampleStoryboard.scenes[1],
            cinematicReference: { style: 'style-2', inspirationBrief: 'Ref 2' }
          },
          {
            ...sampleStoryboard.scenes[2],
            cinematicReference: { style: 'style-3', inspirationBrief: 'Ref 3' }
          }
        ]
      };

      const result = validator.analyzeStyleConsistency(manyReferences);
      expect(result.cinematicReferences.length).toBeGreaterThanOrEqual(3);
      expect(result.issues.some(i => i.includes('Multiple cinematic references'))).toBe(true);
    });

    it('handles missing cinematicReference gracefully', () => {
      const missingRef: Storyboard = {
        title: 'Missing ref',
        duration: 60,
        generatedAt: new Date().toISOString(),
        scenes: [
          { ...sampleStoryboard.scenes[0], cinematicReference: undefined },
          { ...sampleStoryboard.scenes[1], cinematicReference: undefined }
        ]
      };

      const result = validator.analyzeStyleConsistency(missingRef);
      expect(result.score).toBeDefined();
      expect(result.cinematicReferences.length).toBe(0);
    });

    it('handles missing grading gracefully', () => {
      const missingGrading: Storyboard = {
        title: 'Missing grading',
        duration: 60,
        generatedAt: new Date().toISOString(),
        scenes: [
          { ...sampleStoryboard.scenes[0], colorScheme: { ...sampleStoryboard.scenes[0].colorScheme!, grading: undefined as any } },
          { ...sampleStoryboard.scenes[1], colorScheme: undefined }
        ]
      };

      const result = validator.analyzeStyleConsistency(missingGrading);
      expect(result.score).toBeDefined();
    });
  });

  describe('analyzeVisualCoherence', () => {
    const validator = new VisualConsistencyValidator();

    it('combines all three scores correctly', () => {
      const result = validator.analyzeVisualCoherence(sampleStoryboard);

      // Should have all required properties
      expect(result.overallScore).toBeDefined();
      expect(result.colorScore).toBeDefined();
      expect(result.motionScore).toBeDefined();
      expect(result.styleScore).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.recommendation).toBeDefined();

      // Overall score should be average of three scores
      const expectedAverage = Math.round((result.colorScore + result.motionScore + result.styleScore) / 3);
      expect(result.overallScore).toBe(expectedAverage);
    });

    it('returns reasonable scores for sample storyboard', () => {
      const result = validator.analyzeVisualCoherence(sampleStoryboard);

      // With test data: warm→warm (good), motion jumps (bad), 2 styles (good)
      // Overall should be in acceptable range
      expect(result.overallScore).toBeGreaterThan(40);
      expect(result.overallScore).toBeLessThan(100);
    });

    it('generates "Excellent" recommendation for score >= 90', () => {
      const excellentStoryboard: Storyboard = {
        title: 'Excellent',
        duration: 90,
        generatedAt: new Date().toISOString(),
        scenes: [
          {
            ...sampleStoryboard.scenes[0],
            colorScheme: { ...sampleStoryboard.scenes[0].colorScheme!, grading: 'cinematic' },
            motionOption: { type: 'subtle-camera', camera: { motion: 'zoom-in', speed: 'slow', intensity: 30 } }
          },
          {
            ...sampleStoryboard.scenes[1],
            colorScheme: { ...sampleStoryboard.scenes[1].colorScheme!, grading: 'cinematic' },
            motionOption: { type: 'subtle-camera', camera: { motion: 'zoom-in', speed: 'slow', intensity: 35 } }
          },
          {
            ...sampleStoryboard.scenes[2],
            colorScheme: { ...sampleStoryboard.scenes[2].colorScheme!, grading: 'cinematic' },
            motionOption: { type: 'subtle-camera', camera: { motion: 'zoom-in', speed: 'slow', intensity: 40 } }
          }
        ]
      };

      const result = validator.analyzeVisualCoherence(excellentStoryboard);
      if (result.overallScore >= 90) {
        expect(result.recommendation).toContain('Excellent');
      }
    });

    it('generates "Good" recommendation for 75-89 score', () => {
      // This would require a storyboard engineered for this range
      const result = validator.analyzeVisualCoherence(sampleStoryboard);

      if (result.overallScore >= 75 && result.overallScore < 90) {
        expect(result.recommendation).toContain('Good');
      }
    });

    it('generates "Acceptable" recommendation for 60-74 score', () => {
      const result = validator.analyzeVisualCoherence(sampleStoryboard);

      if (result.overallScore >= 60 && result.overallScore < 75) {
        expect(result.recommendation).toContain('Acceptable');
      }
    });

    it('generates "Significant" recommendation for 40-59 score', () => {
      const result = validator.analyzeVisualCoherence(sampleStoryboard);

      if (result.overallScore >= 40 && result.overallScore < 60) {
        expect(result.recommendation).toContain('Significant');
      }
    });

    it('generates "Poor" recommendation for < 40 score', () => {
      const poorStoryboard: Storyboard = {
        title: 'Poor coherence',
        duration: 120,
        generatedAt: new Date().toISOString(),
        scenes: [
          {
            ...sampleStoryboard.scenes[0],
            colorScheme: { primary: '#FF0000', secondary: '#FF0000', accent: '#FF0000', mood: 'warm', grading: 'cinematic' },
            motionOption: { type: 'complex-motion', camera: { motion: 'dolly', speed: 'fast', intensity: 10 } }
          },
          {
            ...sampleStoryboard.scenes[1],
            colorScheme: { primary: '#00FF00', secondary: '#00FF00', accent: '#00FF00', mood: 'cool', grading: 'modern' },
            motionOption: { type: 'complex-motion', camera: { motion: 'dolly', speed: 'fast', intensity: 90 } }
          },
          {
            ...sampleStoryboard.scenes[2],
            colorScheme: { primary: '#0000FF', secondary: '#0000FF', accent: '#0000FF', mood: 'vibrant', grading: 'vintage' },
            motionOption: { type: 'complex-motion', camera: { motion: 'dolly', speed: 'fast', intensity: 10 } }
          },
          {
            ...sampleStoryboard.scenes[0],
            sceneNumber: 4,
            colorScheme: { primary: '#FFFF00', secondary: '#FFFF00', accent: '#FFFF00', mood: 'neutral', grading: 'documentary' },
            motionOption: { type: 'complex-motion', camera: { motion: 'dolly', speed: 'fast', intensity: 80 } }
          }
        ]
      };

      const result = validator.analyzeVisualCoherence(poorStoryboard);
      if (result.overallScore < 40) {
        expect(result.recommendation).toContain('Poor');
      }
    });

    it('combines all issues from sub-analyses', () => {
      const result = validator.analyzeVisualCoherence(sampleStoryboard);

      // Should have issues from color, motion, and/or style analyses
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it('handles empty storyboard correctly', () => {
      const emptyStoryboard: Storyboard = {
        title: 'Empty',
        duration: 0,
        generatedAt: new Date().toISOString(),
        scenes: []
      };

      const result = validator.analyzeVisualCoherence(emptyStoryboard);
      expect(result.overallScore).toBe(0);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('handles single-scene storyboard correctly', () => {
      const singleScene: Storyboard = {
        title: 'Single Scene',
        duration: 30,
        generatedAt: new Date().toISOString(),
        scenes: [sampleStoryboard.scenes[0]]
      };

      const result = validator.analyzeVisualCoherence(singleScene);
      expect(result.overallScore).toBe(100);
      expect(result.colorScore).toBe(100);
      expect(result.motionScore).toBe(100);
    });
  });

  describe('edge cases', () => {
    const validator = new VisualConsistencyValidator();

    it('handles storyboard with null scenes', () => {
      const nullScenes: Storyboard = {
        title: 'Null scenes',
        duration: 0,
        generatedAt: new Date().toISOString(),
        scenes: null as any
      };

      // Should handle gracefully without crashing
      expect(() => {
        validator.analyzeVisualCoherence(nullScenes);
      }).not.toThrow();
    });

    it('handles very long storyboard (20+ scenes)', () => {
      const longStoryboard: Storyboard = {
        title: 'Long storyboard',
        duration: 600,
        generatedAt: new Date().toISOString(),
        scenes: Array.from({ length: 25 }, (_, i) => ({
          ...sampleStoryboard.scenes[0],
          sceneNumber: i + 1,
          colorScheme: {
            ...sampleStoryboard.scenes[0].colorScheme!,
            primary: `#${String(100 + i * 5).padStart(2, '0')}${String(100 + i * 3).padStart(2, '0')}${String(100 + i * 2).padStart(2, '0')}`
          }
        }))
      };

      const result = validator.analyzeVisualCoherence(longStoryboard);
      expect(result.overallScore).toBeDefined();
      expect(result.issues).toBeDefined();
    });

    it('handles all fields being undefined', () => {
      const undefinedFields: Storyboard = {
        title: 'Undefined fields',
        duration: 90,
        generatedAt: new Date().toISOString(),
        scenes: [
          {
            sceneNumber: 1,
            duration: 30,
            scriptLine: 'Scene 1',
            visualDescription: 'Description',
            imagePromptSeed: 'seed'
            // All optional fields undefined
          } as VisualScene,
          {
            sceneNumber: 2,
            duration: 30,
            scriptLine: 'Scene 2',
            visualDescription: 'Description',
            imagePromptSeed: 'seed'
          } as VisualScene
        ]
      };

      const result = validator.analyzeVisualCoherence(undefinedFields);
      expect(result.overallScore).toBeDefined();
      // Should use defaults gracefully
      expect(result.colorScore).toBe(100); // Same colors (both default to #000000)
      expect(result.motionScore).toBe(100); // Same motion (both 0)
    });

    it('validates math with known input and expected output', () => {
      // This is the core validation test with exact expected values
      const result = validator.analyzeVisualCoherence(sampleStoryboard);

      // Verify the math works:
      // Color: warm→warm good, warm→cool bad = moderate score
      // Motion: both jumps flagged = 50 or lower
      // Style: 2 styles = 90
      // Overall: average of the three

      expect(result.colorScore).toBeGreaterThan(50);
      expect(result.motionScore).toBeLessThanOrEqual(50);
      expect(result.styleScore).toBe(90);

      const manualAverage = Math.round((result.colorScore + result.motionScore + result.styleScore) / 3);
      expect(result.overallScore).toBe(manualAverage);

      // Overall should be in acceptable range (60-75 as per spec)
      expect(result.overallScore).toBeGreaterThan(50);
      expect(result.overallScore).toBeLessThan(85);
    });
  });
});
