import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type StackTag =
	| 'astro'
	| 'nextjs'
	| 'react'
	| 'vue'
	| 'svelte'
	| 'tailwind'
	| 'typescript'
	| 'testing'
	| 'e2e'
	| 'pdf'
	| 'a11y'
	| 'seo'
	| 'database'
	| 'ai'
	| 'docs'
	| 'deployment';

export type SkillRec = {
	name: string;
	source: string;
	reason: string;
	tag: StackTag;
};

export type DetectResult = {
	tags: StackTag[];
	evidence: string[];
};

function readJsonSafe(path: string): Record<string, unknown> | null {
	try {
		return JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>;
	} catch {
		return null;
	}
}

function hasDep(pkg: Record<string, unknown> | null, name: string): boolean {
	if (!pkg) return false;
	for (const key of ['dependencies', 'devDependencies', 'peerDependencies']) {
		const deps = pkg[key] as Record<string, string> | undefined;
		if (deps && deps[name]) return true;
	}
	return false;
}

function hasAnyDep(pkg: Record<string, unknown> | null, names: string[]): boolean {
	return names.some((n) => hasDep(pkg, n));
}

export function detectStack(cwd: string): DetectResult {
	const tags: StackTag[] = [];
	const evidence: string[] = [];
	const push = (tag: StackTag, ev: string) => {
		if (!tags.includes(tag)) tags.push(tag);
		evidence.push(ev);
	};

	if (!cwd || typeof cwd !== 'string') return { tags, evidence };
	let safeCwd = cwd;
	try {
		if (!existsSync(cwd)) return { tags, evidence };
	} catch {
		return { tags, evidence };
	}

	const pkg = readJsonSafe(join(safeCwd, 'package.json'));

	if (existsSync(join(safeCwd, 'astro.config.mjs')) || existsSync(join(safeCwd, 'astro.config.ts'))) {
		push('astro', 'astro.config.*');
	}
	if (hasAnyDep(pkg, ['astro'])) push('astro', 'package.json: astro');
	if (hasAnyDep(pkg, ['next'])) push('nextjs', 'package.json: next');
	if (hasAnyDep(pkg, ['react', 'react-dom'])) push('react', 'package.json: react');
	if (hasAnyDep(pkg, ['vue', 'nuxt'])) push('vue', 'package.json: vue/nuxt');
	if (hasAnyDep(pkg, ['svelte', '@sveltejs/kit'])) push('svelte', 'package.json: svelte');
	if (hasAnyDep(pkg, ['tailwindcss'])) push('tailwind', 'package.json: tailwindcss');
	if (existsSync(join(safeCwd, 'tsconfig.json'))) push('typescript', 'tsconfig.json');
	if (hasAnyDep(pkg, ['typescript'])) push('typescript', 'package.json: typescript');
	if (hasAnyDep(pkg, ['vitest', 'jest', '@testing-library/react'])) push('testing', 'package.json: testing lib');
	if (hasAnyDep(pkg, ['playwright', '@playwright/test', 'cypress'])) push('e2e', 'package.json: e2e');
	if (existsSync(join(safeCwd, 'tests')) || existsSync(join(safeCwd, '__tests__'))) push('testing', 'tests/ directory');
	if (hasAnyDep(pkg, ['pypdf', 'pdfplumber', 'jspdf', 'pdf-lib'])) push('pdf', 'package.json: pdf lib');
	if (existsSync(join(safeCwd, 'pyproject.toml')) || existsSync(join(safeCwd, 'requirements.txt'))) {
		const txt = (() => {
			try {
				return readFileSync(join(safeCwd, 'requirements.txt'), 'utf-8');
			} catch {
				return '';
			}
		})();
		if (txt.includes('pdf') || txt.includes('pypdf')) push('pdf', 'requirements.txt: pdf');
		if (txt.includes('openai') || txt.includes('anthropic')) push('ai', 'requirements.txt: ai');
	}
	if (hasAnyDep(pkg, ['openai', '@ai-sdk/openai', 'firecrawl'])) push('ai', 'package.json: ai');
	if (hasAnyDep(pkg, ['prisma', '@prisma/client', 'drizzle-orm', 'postgres', 'pg'])) push('database', 'package.json: db');
	if (existsSync(join(safeCwd, 'prisma'))) push('database', 'prisma/');
	if (hasAnyDep(pkg, ['next-sitemap', 'next-seo'])) push('seo', 'package.json: seo');
	if (existsSync(join(safeCwd, '.github'))) push('deployment', '.github/');
	if (existsSync(join(safeCwd, 'Dockerfile'))) push('deployment', 'Dockerfile');
	if (hasAnyDep(pkg, ['typedoc', 'docusaurus', '@astrojs/starlight'])) push('docs', 'package.json: docs');

	if (tags.includes('typescript') || tags.includes('react') || tags.includes('nextjs') || tags.includes('vue')) {
		if (!tags.includes('a11y')) push('a11y', 'frontend stack → a11y suggested');
	}

	return { tags, evidence };
}

export const STACK_TO_SKILLS: Record<StackTag, SkillRec[]> = {
	astro: [{ name: 'astro-framework', source: 'delineas/astro-framework-agents', reason: 'Astro project detected', tag: 'astro' }],
	nextjs: [{ name: 'vercel-react-best-practices', source: 'vercel-labs/agent-skills', reason: 'Next.js detected', tag: 'nextjs' }],
	react: [{ name: 'vercel-react-best-practices', source: 'vercel-labs/agent-skills', reason: 'React detected', tag: 'react' }],
	vue: [{ name: 'vercel-react-best-practices', source: 'vercel-labs/agent-skills', reason: 'Vue/Nuxt detected', tag: 'vue' }],
	svelte: [{ name: 'vercel-react-best-practices', source: 'vercel-labs/agent-skills', reason: 'Svelte detected', tag: 'svelte' }],
	tailwind: [{ name: 'vercel-react-best-practices', source: 'vercel-labs/agent-skills', reason: 'Tailwind detected', tag: 'tailwind' }],
	typescript: [],
	testing: [{ name: 'playwright-testing', source: 'laurigates/claude-plugins', reason: 'Testing detected', tag: 'testing' }],
	e2e: [{ name: 'playwright-testing', source: 'laurigates/claude-plugins', reason: 'E2E detected', tag: 'e2e' }],
	pdf: [{ name: 'pdf', source: 'anthropics/skills', reason: 'PDF detected', tag: 'pdf' }],
	a11y: [{ name: 'accessibility', source: 'addyosmani/web-quality-skills', reason: 'Frontend stack → accessibility', tag: 'a11y' }],
	seo: [{ name: 'seo', source: 'addyosmani/web-quality-skills', reason: 'SEO detected', tag: 'seo' }],
	database: [{ name: 'orchestration', source: 'stablyai/orca', reason: 'Database detected', tag: 'database' }],
	ai: [{ name: 'firecrawl', source: 'firecrawl/cli', reason: 'AI/web stack detected', tag: 'ai' }],
	docs: [{ name: 'docx', source: 'anthropics/skills', reason: 'Docs detected', tag: 'docs' }],
	deployment: [{ name: 'wrangler', source: 'cloudflare/skills', reason: 'Deploy/CI detected', tag: 'deployment' }],
};

export function recommendationsFor(
	detected: DetectResult | null | undefined,
	installedNames: Set<string>,
	installedSources?: Set<string>,
): SkillRec[] {
	if (!detected || !Array.isArray(detected.tags)) return [];
	const seen = new Set<string>();
	const out: SkillRec[] = [];
	for (const tag of detected.tags) {
		for (const rec of STACK_TO_SKILLS[tag as StackTag] ?? []) {
			if (installedNames.has(rec.name)) continue;
			if (installedSources?.has(rec.source)) continue;
			const key = `${rec.source}::${rec.name}`;
			if (seen.has(key)) continue;
			seen.add(key);
			out.push(rec);
		}
	}
	return out;
}

export function formatRecommendations(
	recs: SkillRec[] | null | undefined,
	detected: DetectResult | null | undefined,
	verbose: boolean,
	cwd: string,
): string {
	const safeRecs = Array.isArray(recs) ? recs : [];
	const safeTags = detected?.tags ?? [];
	const safeEvidence = detected?.evidence ?? [];
	const safeCwd = typeof cwd === 'string' && cwd ? cwd : '(unknown)';
	const header = `Project: ${safeCwd}\nDetected stack: ${safeTags.join(', ') || '(none)'}`;
	const evidence = verbose ? `\nEvidence: ${safeEvidence.join(', ')}` : '';
	if (safeRecs.length === 0) {
		return `${header}${evidence}\n\nNo new recommendations — you already have the relevant skills installed.\nBrowse more at https://skills.sh/`;
	}
	const lines = safeRecs.map(
		(r) => `- ${r.name} (${r.source}) — ${r.reason}\n  npx skills add ${r.source} --skill ${r.name} -g -y\n  https://skills.sh/${r.source}`,
	);
	return `${header}${evidence}\n\nRecommended skills (${safeRecs.length}):\n${lines.join('\n\n')}\n\nSuggestions only — nothing is installed automatically.`;
}
