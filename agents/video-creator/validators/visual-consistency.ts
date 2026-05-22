import {
  Storyboard,
  VisualCoherence,
  ColorAnalysis,
  MotionAnalysis,
  StyleAnalysis,
} from '../types';

/**
 * Convert hex color to RGB object
 */
export function hexToRgb(hex: string): {r: number, g: number, b: number} | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate Euclidean distance between two RGB colors
 */
function rgbDistance(rgb1: {r: number, g: number, b: number}, rgb2: {r: number, g: number, b: number}): number {
  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Validator for visual consistency across storyboard scenes
 */
export class VisualConsistencyValidator {
  /**
   * Analyze color consistency across scenes
   */
  analyzeColorConsistency(storyboard: Storyboard): ColorAnalysis {
    const issues: string[] = [];
    const colorVariances: number[] = [];

    if (!storyboard.scenes || storyboard.scenes.length === 0) {
      return {
        score: 0,
        issues: ['No scenes in storyboard'],
        colorVariances: []
      };
    }

    if (storyboard.scenes.length === 1) {
      return {
        score: 100,
        issues: [],
        colorVariances: []
      };
    }

    // Extract primary colors and convert to RGB
    const colors = storyboard.scenes.map(scene => {
      const hex = scene.colorScheme?.primary || '#000000';
      const rgb = hexToRgb(hex);
      return rgb || {r: 0, g: 0, b: 0};
    });

    // Calculate distances between consecutive scenes
    const maxRgbDistance = Math.sqrt(255 * 255 + 255 * 255 + 255 * 255); // 441.67

    for (let i = 0; i < colors.length - 1; i++) {
      const distance = rgbDistance(colors[i], colors[i + 1]);
      const normalizedScore = 100 - (distance / maxRgbDistance * 100);
      colorVariances.push(distance);

      // Flag if jump > 100 (very different color)
      if (distance > 100) {
        issues.push(
          `Scene ${i + 1} → ${i + 2}: Large color jump (RGB distance: ${distance.toFixed(1)})`
        );
      }
    }

    // Check for mood changes
    const moods = storyboard.scenes.map(s => s.colorScheme?.mood || 'neutral');
    let moodChangeCount = 0;
    for (let i = 0; i < moods.length - 1; i++) {
      if (moods[i] !== moods[i + 1]) {
        moodChangeCount++;
      }
    }
    if (moodChangeCount >= 3) {
      issues.push(
        `Too many mood changes (${moodChangeCount}): Consider consolidating moods for consistency`
      );
    }

    // Calculate average consistency score
    const avgDistance = colorVariances.length > 0
      ? colorVariances.reduce((a, b) => a + b, 0) / colorVariances.length
      : 0;
    const score = Math.max(0, Math.min(100, 100 - (avgDistance / maxRgbDistance * 100)));

    return {
      score: Math.round(score),
      issues,
      colorVariances: colorVariances.map(v => Math.round(v * 100) / 100)
    };
  }

  /**
   * Analyze motion flow consistency across scenes
   */
  analyzeMotionFlow(storyboard: Storyboard): MotionAnalysis {
    const issues: string[] = [];
    const jumps: Array<{from: number, to: number, percentChange: number}> = [];

    if (!storyboard.scenes || storyboard.scenes.length === 0) {
      return {
        score: 0,
        issues: ['No scenes in storyboard'],
        jumps: []
      };
    }

    if (storyboard.scenes.length === 1) {
      return {
        score: 100,
        issues: [],
        jumps: []
      };
    }

    // Extract motion intensity values
    const intensities = storyboard.scenes.map(scene => {
      return scene.motionOption?.camera?.intensity || 0;
    });

    // Detect jumps between consecutive scenes
    let flaggedJumps = 0;
    const totalTransitions = intensities.length - 1;

    for (let i = 0; i < intensities.length - 1; i++) {
      const from = intensities[i];
      const to = intensities[i + 1];

      // Calculate percent change
      const percentChange = from === 0
        ? (to > 0 ? 100 : 0)
        : Math.abs((to - from) / from * 100);

      // Flag if intensity changes > 50%
      if (percentChange > 50) {
        flaggedJumps++;
        issues.push(
          `Scene ${i + 1} → ${i + 2}: Motion intensity jump (${from} → ${to}, ${percentChange.toFixed(1)}% change)`
        );
        jumps.push({from, to, percentChange: Math.round(percentChange * 10) / 10});
      }
    }

    // Calculate score
    let score = 100;
    if (totalTransitions > 0) {
      const flaggedPercent = (flaggedJumps / totalTransitions) * 100;
      if (flaggedPercent >= 50) {
        score = 50;
      } else if (flaggedPercent > 0) {
        score = 100 - flaggedPercent;
      }
    }

    return {
      score: Math.round(score),
      issues,
      jumps
    };
  }

  /**
   * Analyze style consistency across scenes
   */
  analyzeStyleConsistency(storyboard: Storyboard): StyleAnalysis {
    const issues: string[] = [];
    const gradingStylesSet = new Set<string>();
    const cinematicReferencesSet = new Set<string>();

    if (!storyboard.scenes || storyboard.scenes.length === 0) {
      return {
        score: 0,
        issues: ['No scenes in storyboard'],
        gradingStyles: [],
        cinematicReferences: []
      };
    }

    // Collect unique grading styles
    storyboard.scenes.forEach(scene => {
      const grading = scene.colorScheme?.grading;
      if (grading) {
        gradingStylesSet.add(grading);
      }

      // Collect cinematic references
      const ref = scene.cinematicReference?.style;
      if (ref) {
        cinematicReferencesSet.add(ref);
      }
    });

    const gradingStyles = Array.from(gradingStylesSet);
    const cinematicReferences = Array.from(cinematicReferencesSet);
    const uniqueStyles = gradingStyles.length;

    // Score based on number of unique styles
    let score = 100;
    if (uniqueStyles === 2) {
      score = 90;
    } else if (uniqueStyles === 3) {
      score = 70;
      issues.push('3 different grading styles detected: Consider consolidating to 2 or fewer');
    } else if (uniqueStyles >= 4) {
      score = 40;
      issues.push(
        `Too many grading styles (${uniqueStyles}): Recommend limiting to 2 maximum for visual cohesion`
      );
    }

    // Check for too much cinematic reference variation
    if (cinematicReferences.length >= 3) {
      issues.push(
        `Multiple cinematic references (${cinematicReferences.length}): Consider aligning to 1-2 primary inspirations`
      );
    }

    return {
      score,
      issues,
      gradingStyles,
      cinematicReferences
    };
  }

  /**
   * Analyze overall visual coherence combining all three metrics
   */
  analyzeVisualCoherence(storyboard: Storyboard): VisualCoherence {
    const colorAnalysis = this.analyzeColorConsistency(storyboard);
    const motionAnalysis = this.analyzeMotionFlow(storyboard);
    const styleAnalysis = this.analyzeStyleConsistency(storyboard);

    // Calculate average score
    const overallScore = Math.round(
      (colorAnalysis.score + motionAnalysis.score + styleAnalysis.score) / 3
    );

    // Combine all issues
    const issues = [
      ...colorAnalysis.issues,
      ...motionAnalysis.issues,
      ...styleAnalysis.issues
    ];

    // Generate recommendation based on overall score
    let recommendation = '';
    if (overallScore >= 90) {
      recommendation = 'Excellent visual coherence. Ready for production.';
    } else if (overallScore >= 75) {
      recommendation = 'Good visual coherence with minor inconsistencies. Review issues and proceed.';
    } else if (overallScore >= 60) {
      recommendation = 'Acceptable visual coherence. Address flagged issues before final approval.';
    } else if (overallScore >= 40) {
      recommendation = 'Significant visual inconsistencies detected. Review and revise storyboard.';
    } else {
      recommendation = 'Poor visual coherence. Major revisions needed. Recommend reassessing color scheme, motion, and style choices.';
    }

    return {
      overallScore,
      colorScore: colorAnalysis.score,
      motionScore: motionAnalysis.score,
      styleScore: styleAnalysis.score,
      issues,
      recommendation
    };
  }
}
