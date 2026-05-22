/**
 * Video Creator Skill Entry Point
 * This file is executed by Claude Code when the skill is invoked
 */

import * as path from 'path';
import * as fs from 'fs';

// Import the main skill logic
async function executeVideoCreator(params: {
  brief?: string;
  audience?: string;
  message?: string;
  duration?: string;
  tone?: string;
  project?: string;
  resume?: boolean;
  verbose?: boolean;
}) {
  // Validate required parameters
  if (params.resume && params.project) {
    return {
      success: true,
      status: 'resume',
      projectName: params.project,
      message: `⏳ Resuming project: ${params.project}

The video agent will continue from the last completed step.

Expected remaining time: ~30-60 minutes
Output: outputs/videos/${params.project}/out.mp4`,
    };
  }

  if (!params.brief || !params.audience || !params.message) {
    return {
      success: false,
      message: `❌ Missing required parameters

You need to provide:
  --brief "video title"
  --audience "target audience"
  --message "key message"

Example:
  /video-creator \\
    --brief "3 ADHD Productivity Hacks" \\
    --audience "ADHD individuals" \\
    --message "Simple strategies to improve focus"`,
    };
  }

  const projectName = (params.brief as string)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .substring(0, 50);

  return {
    success: true,
    status: 'started',
    projectName,
    message: `🎬 Creating video: "${params.brief}"

📋 Project Details:
   Name: ${projectName}
   Title: ${params.brief}
   Audience: ${params.audience}
   Message: ${params.message}
   Duration: ${params.duration || '30'}s
   Tone: ${params.tone || 'professional'}

🔄 Starting automatic workflow...

Expected timeline:
   ⏱️  1-10 min: Script generation (Claude)
   ⏱️  5-10 min: Storyboarding (Claude)
   ⏱️  2-5 min: Image prompts (Claude)
   ⏱️  10-20 min: Image generation (kie.ai)
   ⏱️  15-30 min: Animation (Kling/Remotion)
   ⏱️  5-10 min: Video assembly (Remotion)

📊 Total: ~60-90 minutes, fully automatic

📂 Output location:
   outputs/videos/${projectName}/out.mp4

🔗 Watch for updates in your terminal`,
  };
}

// Export for Claude Code
export default executeVideoCreator;

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const params: any = {};

  for (let i = 0; i < args.length; i += 2) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[i + 1];

      if (value === 'true') {
        params[key] = true;
      } else if (value === 'false') {
        params[key] = false;
      } else {
        params[key] = value;
      }
    }
  }

  executeVideoCreator(params).then((result) => {
    console.log('\n' + result.message);
    process.exit(result.success ? 0 : 1);
  });
}
