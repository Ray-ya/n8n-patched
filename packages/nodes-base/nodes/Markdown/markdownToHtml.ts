import type { IDataObject } from 'n8n-workflow';
import MarkdownIt from 'markdown-it';

const HTML_ESCAPE_MAP: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
};

function escapeHtmlAttr(value: string): string {
	return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
}

function generateHeaderId(text: string, options: IDataObject): string {
	let id = text.trim();
	const prefix = typeof options.prefixHeaderId === 'string' ? options.prefixHeaderId : '';

	if (options.rawHeaderId) {
		id = id.replace(/[\s'"]+/g, '-');
	} else if (options.ghCompatibleHeaderId) {
		id = id
			.toLowerCase()
			.replace(/[^\p{L}\p{N}\s_-]+/gu, '')
			.replace(/\s+/g, '-');
	} else {
		id = id.toLowerCase().replace(/[^a-z0-9]+/g, '');
	}

	if (prefix) {
		const cleanPrefix = options.rawPrefixHeaderId
			? prefix
			: prefix.toLowerCase().replace(/[^a-z0-9_-]+/g, '');
		id = `${cleanPrefix}${id}`;
	}

	return id;
}

/**
 * Convert Markdown to HTML using markdown-it (security replacement for unmaintained showdown@2.1.0,
 * mitigating CVE-2026-59711, CVE-2026-59710, and CVE-2024-1899 while maintaining n8n Markdown node options).
 */
export function convertMarkdownToHtml(markdown: string, options: IDataObject = {}): string {
	const md = new MarkdownIt({
		html: !options.backslashEscapesHTMLTags,
		breaks: Boolean(options.simpleLineBreaks),
		linkify: Boolean(options.simplifiedAutoLink),
		typographer: false,
	});

	if (!options.tables) {
		md.disable('table');
	}
	if (!options.strikethrough) {
		md.disable('strikethrough');
	}

	// Match Showdown's ellipsis normalization in plain text tokens (e.g. "..." -> "…")
	md.core.ruler.push('ellipsis_normalize', (state) => {
		for (const token of state.tokens) {
			if (token.type === 'inline' && token.children) {
				for (const child of token.children) {
					if (child.type === 'text' && child.content.includes('...')) {
						child.content = child.content.replace(/\.\.\./g, '…');
					}
				}
			}
		}
	});

	// Header level start & safe header IDs
	const headerLevelStart =
		typeof options.headerLevelStart === 'number' && options.headerLevelStart >= 1
			? Math.min(Math.floor(options.headerLevelStart), 6)
			: 1;
	const levelOffset = headerLevelStart - 1;

	const defaultHeadingOpen =
		md.renderer.rules.heading_open ??
		((tokens, idx, opts, _env, self) => self.renderToken(tokens, idx, opts));
	const defaultHeadingClose =
		md.renderer.rules.heading_close ??
		((tokens, idx, opts, _env, self) => self.renderToken(tokens, idx, opts));

	md.renderer.rules.heading_open = (tokens, idx, opts, env, self) => {
		const token = tokens[idx];
		if (levelOffset > 0) {
			const currentLevel = Number(token.tag.slice(1)) || 1;
			token.tag = `h${Math.min(currentLevel + levelOffset, 6)}`;
		}
		if (!options.noHeaderId) {
			const inlineToken = tokens[idx + 1];
			let headingText = inlineToken?.content ?? '';
			let customId: string | undefined;

			if (options.customizedHeaderId) {
				const match = headingText.match(/\s*\{([^{}]+)\}\s*$/);
				if (match) {
					customId = match[1].trim();
					headingText = headingText.slice(0, match.index).trim();
					if (inlineToken) {
						inlineToken.content = headingText;
						if (inlineToken.children?.length) {
							const last = inlineToken.children[inlineToken.children.length - 1];
							if (last.type === 'text') {
								last.content = last.content.replace(/\s*\{[^{}]+\}\s*$/, '');
							}
						}
					}
				}
			}

			const safeId = customId
				? escapeHtmlAttr(customId.replace(/[\s"'<>]+/g, '-'))
				: escapeHtmlAttr(generateHeaderId(headingText, options));
			if (safeId) {
				token.attrSet('id', safeId);
			}
		}
		return defaultHeadingOpen(tokens, idx, opts, env, self);
	};

	md.renderer.rules.heading_close = (tokens, idx, opts, env, self) => {
		const token = tokens[idx];
		if (levelOffset > 0) {
			const currentLevel = Number(token.tag.slice(1)) || 1;
			token.tag = `h${Math.min(currentLevel + levelOffset, 6)}`;
		}
		return defaultHeadingClose(tokens, idx, opts, env, self);
	};

	// Safe table header IDs (mitigates CVE-2026-59710: strictly sanitized & escaped attribute)
	if (options.tables && options.tablesHeaderId) {
		const defaultThOpen =
			md.renderer.rules.th_open ??
			((tokens, idx, opts, _env, self) => self.renderToken(tokens, idx, opts));
		md.renderer.rules.th_open = (tokens, idx, opts, env, self) => {
			const inlineToken = tokens[idx + 1];
			const rawText = inlineToken?.content ?? '';
			const safeId = escapeHtmlAttr(rawText.toLowerCase().replace(/[^a-z0-9_-]+/g, ''));
			if (safeId) {
				tokens[idx].attrSet('id', safeId);
			}
			return defaultThOpen(tokens, idx, opts, env, self);
		};
	}

	// Open links in new window
	if (options.openLinksInNewWindow) {
		const defaultLinkOpen =
			md.renderer.rules.link_open ??
			((tokens, idx, opts, _env, self) => self.renderToken(tokens, idx, opts));
		md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
			tokens[idx].attrSet('target', '_blank');
			return defaultLinkOpen(tokens, idx, opts, env, self);
		};
	}

	const body = md.render(markdown).trimEnd();

	if (options.completeHTMLDocument) {
		return `<!DOCTYPE HTML>\n<html>\n<head>\n<meta charset="utf-8">\n</head>\n<body>\n${body}\n</body>\n</html>`;
	}

	return body;
}
