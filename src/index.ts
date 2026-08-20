import type { ModApi } from '@commandcode/harness';
import {
	detectStack,
	formatRecommendations,
	recommendationsFor,
} from './recommend';

type InstalledSkill = { name: string; source: string };

async function listInstalled(cmd: ModApi): Promise<InstalledSkill[]> {
	const r = await cmd.exec({
		command: 'npx',
		args: ['--yes', 'skills', 'list', '-g', '--json'],
	});
	try {
		return JSON.parse(r.stdout) as InstalledSkill[];
	} catch {
		return [];
	}
}

function helpText(): string {
	return [
		'/skillhub — Skill Hub: maintenance & recommendations',
		'',
		'  /skillhub list              List installed skills',
		'  /skillhub check             Quick status (installed + stack)',
		'  /skillhub update [name]     Update one or all (with confirmation)',
		'  /skillhub recommend [--verbose]  Recommend skills for this project (no install, suggestions only)',
		'',
		'Compat alias: /skills-update [list|<name>|all]  (same as /skillhub update/list)',
		'Flags: --mod-option autoCheck=true|false  --mod-option autoUpdate=true  --mod-option autoRecommend=true',
	].join('\n');
}

async function handleSkillsCommand(cmd: ModApi, rawArgs: string): Promise<{ message: string }> {
	const trimmed = rawArgs.trim();
	if (trimmed === '' || trimmed === 'help' || trimmed === '--help' || trimmed === '-h') {
		return { message: helpText() };
	}

	const [sub, ...rest] = trimmed.split(/\s+/);
	const subLower = sub.toLowerCase();

	if (subLower === 'list') {
		const data = await listInstalled(cmd);
		if (data.length === 0) return { message: 'No skills installed (global).' };
		const lines = data.map((s) => `- ${s.name} (${s.source})`).join('\n');
		return {
			message: `Installed skills (${data.length}):\n${lines}\n\n/skillhub recommend  for suggestions tailored to this project.`,
		};
	}

	if (subLower === 'check') {
		const data = await listInstalled(cmd);
		const detected = detectStack(cmd.cwd);
		const recs = recommendationsFor(detected, new Set(data.map((d) => d.name)));
		const lines =
			data.length === 0
				? 'No skills installed.'
				: `Installed: ${data.length} — ${data.map((d) => d.name).join(', ')}`;
		const stackLine = `Stack: ${detected.tags.join(', ') || '(none)'}`;
		const recLine =
			recs.length === 0 ? 'Recommendations: none pending.' : `Recommendations: ${recs.map((r) => r.name).join(', ')} — /skillhub recommend`;
		return { message: [lines, stackLine, recLine].join('\n') };
	}

	if (subLower === 'recommend' || subLower === 'rec') {
		const verbose = rest.includes('--verbose') || rest.includes('-v');
		const data = await listInstalled(cmd);
		const installedNames = new Set(data.map((d) => d.name));
		const detected = detectStack(cmd.cwd);
		const recs = recommendationsFor(detected, installedNames);
		return { message: formatRecommendations(recs, detected, verbose, cmd.cwd) };
	}

	if (subLower === 'update' || subLower === 'upgrade' || subLower === 'up') {
		const names = rest.filter((t) => t !== '--verbose' && t !== '-v');
		if (names.length > 0) {
			const confirmed = await cmd.ui.confirm({
				title: `Update ${names.join(', ')}?`,
				message: `Will run: npx skills update ${names.join(' ')} -g -y`,
			});
			if (!confirmed) return { message: 'Cancelled.' };
			const r = await cmd.exec({
				command: 'npx',
				args: ['--yes', 'skills', 'update', ...names, '-g', '-y'],
			});
			const out = (r.stdout + r.stderr).trim();
			return { message: out || `Update of ${names.join(', ')} completed.` };
		}

		const data = await listInstalled(cmd);
		const count = data.length;
		const confirmed = await cmd.ui.confirm({
			title: 'Update all skills?',
			message:
				count > 0
					? `${count} skills installed. Will run: npx skills update -g -y`
					: 'Will run: npx skills update -g -y',
		});
		if (!confirmed) return { message: 'Cancelled. Use /skillhub list to see installed skills.' };
		const r = await cmd.exec({
			command: 'npx',
			args: ['--yes', 'skills', 'update', '-g', '-y'],
		});
		const out = (r.stdout + r.stderr).trim();
		return { message: out || 'All skills updated.' };
	}

	return { message: `Unknown subcommand: ${sub}\n\n${helpText()}` };
}

async function handleLegacySkillsUpdate(cmd: ModApi, raw: string): Promise<{ message: string }> {
	const trimmed = raw.trim();
	if (trimmed === 'list') return handleSkillsCommand(cmd, 'list');
	if (trimmed === '' || trimmed === 'all') return handleSkillsCommand(cmd, 'update');
	return handleSkillsCommand(cmd, `update ${trimmed}`);
}

export default function (cmd: ModApi): void {
	cmd.addFlag('autoCheck', {
		type: 'boolean',
		default: true,
		description: 'Show a reminder on session start',
	});
	cmd.addFlag('autoUpdate', {
		type: 'boolean',
		default: false,
		description: 'Automatically update all skills on session start',
	});
	cmd.addFlag('autoRecommend', {
		type: 'boolean',
		default: false,
		description: 'Suggest recommended skills on session start when relevant',
	});

	cmd.hooks({
		onSessionStart: async ({ source }) => {
			if (source !== 'startup') return;
			try {
				if (cmd.getFlag('autoCheck') !== true && cmd.getFlag('autoUpdate') !== true && cmd.getFlag('autoRecommend') !== true) return;

				if (cmd.getFlag('autoUpdate') === true) {
					const r = await cmd.exec({
						command: 'npx',
						args: ['--yes', 'skills', 'update', '-g', '-y'],
					});
					const out = (r.stdout + r.stderr).trim().slice(0, 500);
					if (out) cmd.ui.notify(out);
					else cmd.ui.notify('Skills: auto-update completed.');
				} else if (cmd.getFlag('autoCheck') === true) {
					cmd.ui.notify('Skills: /skillhub list · /skillhub update · /skillhub recommend');
				}

				if (cmd.getFlag('autoRecommend') === true) {
					const data = await listInstalled(cmd);
					const recs = recommendationsFor(detectStack(cmd.cwd), new Set(data.map((d) => d.name)));
					if (recs.length > 0) {
						cmd.ui.notify(`Recommended for this project: ${recs.map((r) => r.name).join(', ')} — /skillhub recommend`);
					}
				}
			} catch {}
		},
	});

	cmd.addCommand({
		name: 'skillhub',
		description: 'Skill Hub: list / check / update / recommend',
		argumentHint: '[list|check|update [name]|recommend]',
		handler: async ({ args }) => handleSkillsCommand(cmd, args),
	});

	cmd.addCommand({
		name: 'skills-update',
		description: 'Alias for /skillhub update (compatibility)',
		argumentHint: '[skill-name|list|all]',
		handler: async ({ args }) => handleLegacySkillsUpdate(cmd, args),
	});

	cmd.addTool({
		schema: {
			name: 'skill_autoupdate_check',
			description: 'List installed skills and optionally update them. Compat: use /skillhub. No params = list; updateAll = update all; skillName = update one.',
			input_schema: {
				type: 'object',
				properties: {
					updateAll: { type: 'boolean', description: 'If true, update all global skills' },
					skillName: { type: 'string', description: 'Name of a specific skill to update' },
				},
				required: [],
			},
		},
		readOnly: false,
		run: async ({ input }) => {
			try {
				const skillName = typeof input.skillName === 'string' ? input.skillName.trim() : '';
				const updateAll = input.updateAll === true;
				if (skillName) {
					const r = await cmd.exec({ command: 'npx', args: ['--yes', 'skills', 'update', skillName, '-g', '-y'] });
					return { ok: true, content: [{ type: 'text', text: (r.stdout + r.stderr).trim() || `Skill ${skillName} updated.` }] };
				}
				if (updateAll) {
					const r = await cmd.exec({ command: 'npx', args: ['--yes', 'skills', 'update', '-g', '-y'] });
					return { ok: true, content: [{ type: 'text', text: (r.stdout + r.stderr).trim() || 'All skills updated.' }] };
				}
				const data = await listInstalled(cmd);
				const lines = data.map((s) => `${s.name} -> ${s.source}`).join('\n');
				return { ok: true, content: [{ type: 'text', text: `Installed skills (${data.length}):\n${lines}` }] };
			} catch (e) {
				return { ok: false, error: String(e) };
			}
		},
	});

	cmd.addTool({
		schema: {
			name: 'recommend_skills',
			description: 'Recommend relevant skills for the current project based on local stack detection (no network). Suggests only, does not install.',
			input_schema: {
				type: 'object',
				properties: {
					verbose: { type: 'boolean', description: 'Include stack detection evidence' },
				},
				required: [],
			},
		},
		readOnly: true,
		run: async ({ input }) => {
			try {
				const verbose = input.verbose === true;
				const data = await listInstalled(cmd);
				const installedNames = new Set(data.map((d) => d.name));
				const detected = detectStack(cmd.cwd);
				const recs = recommendationsFor(detected, installedNames);
				return { ok: true, content: [{ type: 'text', text: formatRecommendations(recs, detected, verbose, cmd.cwd) }] };
			} catch (e) {
				return { ok: false, error: String(e) };
			}
		},
	});
}
