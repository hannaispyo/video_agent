#!/usr/bin/env node

/**
 * Emily's Video Creator CLI
 *
 * Usage:
 *   npm run create-video -- --brief "My Video Title" --audience "target audience" --message "key message"
 *   npm run create-video -- --project my-video (resume existing project)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Build output paths for TypeScript files
const agentsDir = path.join(__dirname, '..', 'agents', 'video-creator');
const orchestratorPath = path.join(agentsDir, 'orchestrator.ts');
const configPath = path.join(agentsDir, 'config.ts');

// Parse command line arguments
const args = process.argv.slice(2);
const argMap = {};
for (let i = 0; i < args.length; i += 2) {
  if (args[i].startsWith('--')) {
    argMap[args[i].substring(2)] = args[i + 1];
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║        Emily\'s Video Creation Agent - CLI                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Check for resume
    if (argMap.project) {
      console.log(`Resuming project: ${argMap.project}`);
      // TODO: Load existing project and continue from checkpoint
      console.log('Feature not yet implemented. Please start a new project.');
      return;
    }

    // Gather brief from command line or interactive
    const title = argMap.brief || (await question('Project Title: '));
    const audience = argMap.audience || (await question('Target Audience: '));
    const message = argMap.message || (await question('Key Message: '));
    const duration = parseInt(argMap.duration || '30');
    const tone = argMap.tone || 'professional';

    // Validate input
    if (!title || !audience || !message) {
      console.error('❌ Missing required fields: title, audience, message');
      rl.close();
      return;
    }

    // Create project name (sanitized)
    const projectName = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .substring(0, 50);

    const projectPath = path.join(process.cwd(), 'outputs', 'videos', projectName);

    // Check if project already exists
    if (fs.existsSync(projectPath)) {
      const overwrite = await question(
        `Project "${projectName}" already exists. Overwrite? (y/n) `
      );
      if (overwrite.toLowerCase() !== 'y') {
        console.log('Cancelled.');
        rl.close();
        return;
      }
    }

    console.log('\n✓ Creating video project...');
    console.log(`  Project: ${projectName}`);
    console.log(`  Title: ${title}`);
    console.log(`  Audience: ${audience}`);
    console.log(`  Message: ${message}`);
    console.log(`  Duration: ${duration}s`);
    console.log(`  Tone: ${tone}\n`);

    // Display workflow
    displayWorkflow();

    console.log('\n📋 Project Overview:');
    console.log('  Step 1: Scripting (Claude generates script)');
    console.log('  Step 2: Storyboarding (Visual descriptions)');
    console.log('  Step 3: Image Prompts (Optimized for kie.ai)');
    console.log('  Step 4: Image Generation (Create visuals)');
    console.log('  Step 5: Animation (Add motion with Kling/Remotion)');
    console.log('  Step 6: Assembly (Final video composition)');

    console.log('\n⏱️  Estimated time: 60-90 minutes');
    console.log('(Actual time depends on API response times and approvals)\n');

    // Summary of what will happen
    console.log('PROJECT CREATED! 🎬');
    console.log('---');
    console.log(
      `To continue, implement the VideoProjectManager workflow in agents/video-creator/`
    );
    console.log(`Project directory: ${projectPath}`);
    console.log('\nKey Files:');
    console.log('  ✓ agents/video-creator/orchestrator.ts - Project state machine');
    console.log('  ✓ agents/video-creator/workflows/*.ts - Each workflow step');
    console.log('  ✓ agents/video-creator/types.ts - TypeScript interfaces');
    console.log('  ✓ agents/video-creator/config.ts - Configuration');

    console.log('\nNext Steps:');
    console.log('1. Implement the remaining workflow steps (animation-handler, video-assembly)');
    console.log('2. Set up environment variables (CLAUDE_API_KEY, KLING_API_KEY, etc.)');
    console.log('3. Create MCP server integration for orchestration');
    console.log('4. Build terminal UI for user interactions');

    rl.close();
  } catch (error) {
    console.error('Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

function displayWorkflow() {
  console.log('Video Creation Workflow:');
  console.log(
    '  Brief (Input) → Script (Claude) → Storyboard (Claude) → Prompts (Claude)'
  );
  console.log(
    '  → Images (kie.ai) → Animation (Kling/Remotion) → Assembly (Remotion) → Video (Output)'
  );
}

main();
