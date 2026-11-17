import { describe, it, expect } from 'vitest';
import { convertMarkdownToHtml } from '../../markdownToHtml';

describe('convertMarkdownToHtml (showdown security replacement)', () => {
	const sampleMarkdown =
		' \n\n# Example Domain\n\nThis domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.\n\n[More information...](https://www.iana.org/domains/example)';

	it('matches expected Markdown node HTML fragment output from workflow.markdown.json', () => {
		const html = convertMarkdownToHtml(sampleMarkdown, {});
		expect(html).toBe(
			'<h1 id="exampledomain">Example Domain</h1>\n' +
				'<p>This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.</p>\n' +
				'<p><a href="https://www.iana.org/domains/example">More information…</a></p>',
		);
	});

	it('matches expected completeHTMLDocument output from workflow.markdown.json', () => {
		const html = convertMarkdownToHtml(sampleMarkdown, { completeHTMLDocument: true });
		expect(html).toBe(
			'<!DOCTYPE HTML>\n<html>\n<head>\n<meta charset="utf-8">\n</head>\n<body>\n' +
				'<h1 id="exampledomain">Example Domain</h1>\n' +
				'<p>This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.</p>\n' +
				'<p><a href="https://www.iana.org/domains/example">More information…</a></p>\n' +
				'</body>\n</html>',
		);
	});

	it('prevents CVE-2026-59710 table header ID attribute XSS injection', () => {
		const malicious = '| " onmouseover="alert(1) | col2 |\n| --- | --- |\n| a | b |';
		const html = convertMarkdownToHtml(malicious, { tables: true, tablesHeaderId: true });
		expect(html).not.toContain('onmouseover="alert(1)"');
		expect(html).toContain('<th id="onmouseoveralert1">');
	});

	it('prevents CVE-2024-1899 ReDoS on pathological link input', () => {
		const evil = '[' + 'a'.repeat(5000) + '](' + ' '.repeat(5000) + 'http://example.com';
		const t0 = performance.now();
		const html = convertMarkdownToHtml(evil, {});
		const elapsedMs = performance.now() - t0;
		expect(typeof html).toBe('string');
		expect(elapsedMs).toBeLessThan(200);
	});

	it('supports openLinksInNewWindow, noHeaderId, ghCompatibleHeaderId, strikethrough, and simpleLineBreaks', () => {
		expect(convertMarkdownToHtml('# Hello World', { noHeaderId: true })).toBe(
			'<h1>Hello World</h1>',
		);
		expect(convertMarkdownToHtml('# Hello World', { ghCompatibleHeaderId: true })).toBe(
			'<h1 id="hello-world">Hello World</h1>',
		);
		expect(
			convertMarkdownToHtml('[link](https://n8n.io)', { openLinksInNewWindow: true }),
		).toContain('target="_blank"');
		expect(convertMarkdownToHtml('~~strike~~', { strikethrough: true })).toContain(
			'<s>strike</s>',
		);
		expect(convertMarkdownToHtml('line1\nline2', { simpleLineBreaks: true })).toContain('<br>');
	});
});
