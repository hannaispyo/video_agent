/**
 * Video Creator Skill Entry Point
 * Invocable via: /video-creator --brief "..." --audience "..." --message "..."
 */

import * as path from 'path';
import * as fs from 'fs';
import { AutoVideoExecutor } from './workflows/auto-executor';
import { VideoBrief } from './types';

interface SkillInput {
  brief?: string;
  audience?: string;
  message?: string;
  duration?: string;
  tone?: string;
  project?: string;
  resume?: boolean;
  verbose?: boolean;
}

export async function videoCreatorSkill(input: SkillInput): Promise<{
  success: boolean;
  projectName?: string;
  outputPath?: string;
  message: string;
  status?: any;
}> {
  // Check if resuming existing project
  if (input.resume && input.project) {
    return await resumeProject(input.project, input.verbose);
  }

  // Validate required inputs
  if (!input.brief || !input.audience || !input.message) {
    return {
      success: false,
      message: `❌ Missing required parameters:
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

  // Create brief object
  const brief: VideoBrief = {
    title: input.brief,
    audience: input.audience,
    keyMessage: input.message,
    duration: input.duration ? parseInt(input.duration) : 30,
    tone: (input.tone || 'professional') as any,
  };

  // Create project name
  const projectName = brief.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .substring(0, 50);

  console.log('\n🎬 Video Creator Skill\n');
  console.log(`📋 Project: ${projectName}`);
  console.log(`   Title: ${brief.title}`);
  console.log(`   Audience: ${brief.audience}`);
  console.log(`   Message: ${brief.keyMessage}`);
  console.log(`   Duration: ${brief.duration}s`);
  console.log(`   Tone: ${brief.tone}\n`);

  // Check if project already exists
  const projectDir = path.join(process.cwd(), 'outputs', 'videos', projectName);
  if (fs.existsSync(projectDir)) {
    return {
      success: false,
      message: `⚠️  Project "${projectName}" already exists.

To resume: /video-creator --project ${projectName} --resume`,
      projectName,
    };
  }

  console.log('▶️  Starting automatic workflow...\n');

  try {
    // Create executor
    const executor = new AutoVideoExecutor(projectName, {
      verbose: input.verbose,
      onProgress: (step, message) => {
        console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] ${step}: ${message}`);
      },
    });

    // Execute workflow
    const result = await executor.executeFullWorkflow(brief);

    if (result.success) {
      const status = executor.getStatus();
      return {
        success: true,
        projectName,
        outputPath: result.outputPath,
        message: `✅ Video created successfully!\n\n📂 Output: ${result.outputPath}\n📊 Status:\n${executor.generateReport()}`,
        status,
      };
    } else {
      return {
        success: false,
        projectName,
        message: `❌ Video creation failed: ${result.error}`,
      };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      projectName,
      message: `❌ Error: ${errorMsg}`,
    };
  }
}

async function resumeProject(
  projectName: string,
  verbose?: boolean
): Promise<{
  success: boolean;
  projectName?: string;
  message: string;
  status?: any;
}> {
  const projectDir = path.join(process.cwd(), 'outputs', 'videos', projectName);

  if (!fs.existsSync(projectDir)) {
    return {
      success: false,
      message: `❌ Project "${projectName}" not found at ${projectDir}`,
    };
  }

  console.log(`\n🔄 Resuming project: ${projectName}\n`);

  try {
    const executor = new AutoVideoExecutor(projectName, {
      verbose,
      onProgress: (step, message) => {
        console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] ${step}: ${message}`);
      },
    });

    // Load checkpoint
    await executor.manager.loadCheckpoint();

    const status = executor.getStatus();
    console.log(`\nCurrent status: ${status.currentStep} (${status.progress}% complete)`);
    console.log(`Completed steps: ${status.completedSteps.join(', ')}`);
    console.log(`Estimated time remaining: ${status.estimatedTimeRemaining} minutes\n`);

    // Continue from current step
    console.log('▶️  Continuing workflow...\n');

    const brief: VideoBrief = {
      title: 'Resumed Project',
      audience: '',
      keyMessage: '',
      duration: 30,
      tone: 'professional',
    };

    const result = await executor.executeFullWorkflow(brief);

    if (result.success) {
      return {
        success: true,
        projectName,
        message: `✅ Project resumed and completed!\n\n📂 Output: ${result.outputPath}\n\n${executor.generateReport()}`,
        status: executor.getStatus(),
      };
    } else {
      return {
        success: false,
        projectName,
        message: `❌ Resume failed: ${result.error}`,
      };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      projectName,
      message: `❌ Error resuming project: ${errorMsg}`,
    };
  }
}

/**
 * CLI entry point for direct execution
 */
async function main() {
  const args = process.argv.slice(2);
  const params: SkillInput = {};

  for (let i = 0; i < args.length; i += 2) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2) as keyof SkillInput;
      params[key] = args[i + 1];
    }
  }

  const result = await videoCreatorSkill(params);
  console.log(result.message);
  process.exit(result.success ? 0 : 1);
}

if (require.main === module) {
  main();
}

export default videoCreatorSkill;
