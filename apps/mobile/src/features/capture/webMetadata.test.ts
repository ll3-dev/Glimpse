import { describe, expect, it } from 'bun:test';
import { extractHostname, parseHtmlMetadata } from './webMetadata';

describe('webMetadata', () => {
  it('extractHostname extracts clean domain', () => {
    expect(extractHostname('https://www.example.com/path?query=1')).toBe('example.com');
    expect(extractHostname('https://github.com/facebook/react')).toBe('github.com');
    expect(extractHostname('not-a-url')).toBe('not-a-url');
  });

  it('parseHtmlMetadata parses OpenGraph and title tags', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>My Document Title</title>
          <meta property="og:title" content="Awesome Article &amp; Insights" />
          <meta property="og:description" content="This is a summary of the article." />
        </head>
        <body><p>Hello world</p></body>
      </html>
    `;

    const result = parseHtmlMetadata(html, 'https://example.com/article');
    expect(result.title).toBe('Awesome Article & Insights');
    expect(result.description).toBe('This is a summary of the article.');
    expect(result.hostname).toBe('example.com');
  });

  it('parseHtmlMetadata falls back to title if og:title is missing', () => {
    const html = `
      <html>
        <head>
          <title>Standard Web Title</title>
        </head>
      </html>
    `;

    const result = parseHtmlMetadata(html, 'https://news.ycombinator.com');
    expect(result.title).toBe('Standard Web Title');
    expect(result.hostname).toBe('news.ycombinator.com');
  });
});
