/**
 * Video Creator Skill - CLI wrapper
 *
 * Usage:
 *   ts-node scripts/video-creator-skill.ts \
 *     --brief "Title" \
 *     --audience "Target" \
 *     --message "Key Point"
 */

import videoCreatorSkill from '../agents/video-creator/skill-entry';

async function main() {
  const args = process.argv.slice(2);
  const params: any = {};

  for (let i = 0; i < args.length; i += 2) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[i + 1];

      // Parse boolean values
      if (value === 'true') {
        params[key] = true;
      } else if (value === 'false') {
        params[key] = false;
      } else {
        params[key] = value;
      }
    }
  }

  const result = await videoCreatorSkill(params);
  console.log('\n' + result.message);

  if (!result.success) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
