import puppeteer from 'puppeteer';
import type { Artifact } from '../db/schema.js';

const PDF_STYLES = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #1a1a2e;
    background: white;
    padding: 50px 60px;
  }
  
  .cover {
    text-align: center;
    padding: 100px 0;
    margin-bottom: 60px;
    border-bottom: 3px solid #6366f1;
  }
  
  .cover h1 {
    font-size: 32pt;
    font-weight: 700;
    color: #1e1e2f;
    margin-bottom: 16px;
    letter-spacing: -0.5px;
  }
  
  .cover .subtitle {
    font-size: 14pt;
    color: #64748b;
    margin-bottom: 40px;
  }
  
  .cover .meta {
    font-size: 10pt;
    color: #94a3b8;
    margin-top: 60px;
  }
  
  .cover .logo {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border-radius: 20px;
    margin: 0 auto 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 36px;
    font-weight: 700;
  }
  
  h1, h2, h3, h4, h5, h6 {
    color: #1e1e2f;
    margin-top: 30px;
    margin-bottom: 16px;
  }
  
  h1 { font-size: 24pt; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
  h2 { font-size: 18pt; font-weight: 600; color: #3730a3; }
  h3 { font-size: 14pt; font-weight: 600; }
  h4 { font-size: 12pt; font-weight: 600; }
  
  p {
    margin-bottom: 12px;
  }
  
  ul, ol {
    margin-left: 24px;
    margin-bottom: 16px;
  }
  
  li {
    margin-bottom: 6px;
  }
  
  ul li::marker {
    color: #6366f1;
  }
  
  ol li::marker {
    color: #6366f1;
    font-weight: 600;
  }
  
  code {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 9pt;
    color: #7c3aed;
  }
  
  pre {
    background: #1e1e2f;
    color: #e2e8f0;
    padding: 20px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 16px 0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9pt;
    line-height: 1.5;
  }
  
  pre code {
    background: none;
    padding: 0;
    color: inherit;
  }
  
  .code-block {
    background: #1e1e2f;
    color: #e2e8f0;
    padding: 20px;
    border-radius: 8px;
    margin: 16px 0;
    overflow-x: auto;
  }
  
  .code-block code {
    background: none;
    padding: 0;
    color: #e2e8f0;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    font-size: 10pt;
  }
  
  th {
    background: #f8fafc;
    font-weight: 600;
    text-align: left;
    padding: 12px 16px;
    border-bottom: 2px solid #e2e8f0;
    color: #475569;
  }
  
  td {
    padding: 12px 16px;
    border-bottom: 1px solid #f1f5f9;
  }
  
  tr:hover {
    background: #fafbfc;
  }
  
  blockquote {
    border-left: 4px solid #6366f1;
    padding-left: 20px;
    margin: 20px 0;
    color: #64748b;
    font-style: italic;
  }
  
  .badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 9pt;
    font-weight: 600;
    margin-right: 8px;
  }
  
  .badge-critical { background: #fee2e2; color: #dc2626; }
  .badge-high { background: #fef3c7; color: #d97706; }
  .badge-medium { background: #dbeafe; color: #2563eb; }
  .badge-low { background: #d1fae5; color: #059669; }
  
  .card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 24px;
    margin: 20px 0;
  }
  
  .card-header {
    font-weight: 600;
    color: #1e1e2f;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin: 20px 0;
  }
  
  .metric {
    text-align: center;
    padding: 24px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border-radius: 12px;
    color: white;
  }
  
  .metric-value {
    font-size: 28pt;
    font-weight: 700;
  }
  
  .metric-label {
    font-size: 10pt;
    opacity: 0.9;
    margin-top: 4px;
  }
  
  .section {
    margin-top: 40px;
  }
  
  .section:first-of-type {
    margin-top: 0;
  }
  
  hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 40px 0;
  }
  
  .toc {
    background: #f8fafc;
    padding: 30px;
    border-radius: 12px;
    margin: 30px 0;
  }
  
  .toc-title {
    font-size: 14pt;
    font-weight: 600;
    margin-bottom: 16px;
    color: #1e1e2f;
  }
  
  .toc-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .toc-item:last-child {
    border-bottom: none;
  }
  
  .toc-item a {
    color: #6366f1;
    text-decoration: none;
  }
  
  .user-story {
    background: #fafbfc;
    border-left: 4px solid #6366f1;
    padding: 20px;
    margin: 16px 0;
    border-radius: 0 8px 8px 0;
  }
  
  .user-story-header {
    font-weight: 600;
    color: #1e1e2f;
    margin-bottom: 8px;
  }
  
  .user-story-format {
    color: #6366f1;
    font-weight: 500;
    margin-bottom: 12px;
  }
  
  .acceptance-criteria {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed #e2e8f0;
  }
  
  .page-break {
    page-break-after: always;
  }
  
  @page {
    size: A4;
    margin: 40px 50px;
  }
</style>
`;

function markdownToHtml(markdown: string): string {
  let html = markdown
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  html = '<p>' + html + '</p>';
  html = html.replace(/<p><ul>/g, '<ul>');
  html = html.replace(/<\/ul><\/p>/g, '</ul>');
  html = html.replace(/<p><pre>/g, '<pre>');
  html = html.replace(/<\/pre><\/p>/g, '</pre>');
  html = html.replace(/<p><h/g, '<h');
  html = html.replace(/<\/h(\d)><\/p>/g, '</h$1>');

  return html;
}

export interface GeneratePdfOptions {
  title: string;
  subtitle?: string;
  content: string;
  type?: Artifact['type'];
  projectName?: string;
  phase?: string;
  metadata?: Record<string, string>;
}

export async function generatePdf(options: GeneratePdfOptions): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    
    const contentHtml = markdownToHtml(options.content);
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  ${PDF_STYLES}
</head>
<body>
  <div class="cover">
    <div class="logo">SF</div>
    <h1>${options.title}</h1>
    ${options.subtitle ? `<div class="subtitle">${options.subtitle}</div>` : ''}
    <div class="meta">
      ${options.projectName ? `<div>Project: ${options.projectName}</div>` : ''}
      ${options.phase ? `<div>Phase: ${options.phase}</div>` : ''}
      ${options.metadata?.['generatedAt'] ? `<div>Generated: ${options.metadata['generatedAt']}</div>` : `<div>Generated: ${new Date().toLocaleDateString()}</div>`}
    </div>
  </div>
  
  <div class="content">
    ${contentHtml}
  </div>
</body>
</html>
    `;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '40px',
        right: '50px',
        bottom: '40px',
        left: '50px',
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function generateTestReportPdf(options: {
  title: string;
  projectName: string;
  testResults: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  suites: Array<{
    name: string;
    tests: Array<{
      name: string;
      status: 'passed' | 'failed' | 'skipped';
      duration: number;
      error?: string;
    }>;
  }>;
}): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    
    const passRate = options.testResults.total > 0 
      ? Math.round((options.testResults.passed / options.testResults.total) * 100) 
      : 0;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${options.title}</title>
  ${PDF_STYLES}
</head>
<body>
  <div class="cover">
    <div class="logo">SF</div>
    <h1>${options.title}</h1>
    <div class="subtitle">Test Report</div>
    <div class="meta">
      <div>Project: ${options.projectName}</div>
      <div>Generated: ${new Date().toLocaleString()}</div>
    </div>
  </div>
  
  <div class="section">
    <h2>Executive Summary</h2>
    <div class="grid">
      <div class="metric">
        <div class="metric-value">${options.testResults.total}</div>
        <div class="metric-label">Total Tests</div>
      </div>
      <div class="metric" style="background: linear-gradient(135deg, #059669 0%, #10b981 100%);">
        <div class="metric-value">${passRate}%</div>
        <div class="metric-label">Pass Rate</div>
      </div>
      <div class="metric" style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);">
        <div class="metric-value">${options.testResults.failed}</div>
        <div class="metric-label">Failed</div>
      </div>
      <div class="metric" style="background: linear-gradient(135deg, #64748b 0%, #94a3b8 100%);">
        <div class="metric-value">${(options.testResults.duration / 1000).toFixed(1)}s</div>
        <div class="metric-label">Duration</div>
      </div>
    </div>
  </div>
  
  ${options.coverage ? `
  <div class="section">
    <h2>Code Coverage</h2>
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Coverage</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Statements</td>
          <td>${options.coverage.statements}%</td>
          <td><span class="badge ${options.coverage.statements >= 80 ? 'badge-low' : 'badge-high'}">${options.coverage.statements >= 80 ? 'Good' : 'Needs Work'}</span></td>
        </tr>
        <tr>
          <td>Branches</td>
          <td>${options.coverage.branches}%</td>
          <td><span class="badge ${options.coverage.branches >= 80 ? 'badge-low' : 'badge-high'}">${options.coverage.branches >= 80 ? 'Good' : 'Needs Work'}</span></td>
        </tr>
        <tr>
          <td>Functions</td>
          <td>${options.coverage.functions}%</td>
          <td><span class="badge ${options.coverage.functions >= 80 ? 'badge-low' : 'badge-high'}">${options.coverage.functions >= 80 ? 'Good' : 'Needs Work'}</span></td>
        </tr>
        <tr>
          <td>Lines</td>
          <td>${options.coverage.lines}%</td>
          <td><span class="badge ${options.coverage.lines >= 80 ? 'badge-low' : 'badge-high'}">${options.coverage.lines >= 80 ? 'Good' : 'Needs Work'}</span></td>
        </tr>
      </tbody>
    </table>
  </div>
  ` : ''}
  
  <div class="section">
    <h2>Test Suites</h2>
    ${options.suites.map(suite => `
      <div class="card">
        <div class="card-header">${suite.name}</div>
        <table>
          <thead>
            <tr>
              <th>Test</th>
              <th>Status</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            ${suite.tests.map(test => `
              <tr>
                <td>${test.name}</td>
                <td>
                  <span class="badge ${test.status === 'passed' ? 'badge-low' : test.status === 'failed' ? 'badge-critical' : 'badge-medium'}">
                    ${test.status}
                  </span>
                </td>
                <td>${(test.duration / 1000).toFixed(2)}s</td>
              </tr>
              ${test.error ? `<tr><td colspan="3" style="color: #dc2626; font-size: 9pt;">${test.error}</td></tr>` : ''}
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('')}
  </div>
</body>
</html>
    `;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '40px',
        right: '50px',
        bottom: '40px',
        left: '50px',
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function generateRequirementsDocPdf(options: {
  title: string;
  projectName: string;
  description: string;
  features: Array<{
    name: string;
    description: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
  userStories: Array<{
    asA: string;
    iWant: string;
    soThat: string;
    acceptanceCriteria: string[];
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
  technicalStack?: {
    frontend?: string[];
    backend?: string[];
    database?: string[];
    devops?: string[];
  };
  nonFunctionalRequirements?: string[];
}): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    
    const priorityBadgeClass: Record<string, string> = {
      critical: 'badge-critical',
      high: 'badge-high',
      medium: 'badge-medium',
      low: 'badge-low',
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${options.title}</title>
  ${PDF_STYLES}
</head>
<body>
  <div class="cover">
    <div class="logo">SF</div>
    <h1>${options.title}</h1>
    <div class="subtitle">Requirements Document</div>
    <div class="meta">
      <div>Project: ${options.projectName}</div>
      <div>Version: 1.0</div>
      <div>Generated: ${new Date().toLocaleDateString()}</div>
    </div>
  </div>
  
  <div class="section">
    <h2>1. Project Overview</h2>
    <div class="card">
      <div class="card-header">${options.projectName}</div>
      <p>${options.description}</p>
    </div>
  </div>
  
  <div class="section">
    <h2>2. Feature Specifications</h2>
    ${options.features.map((feature, idx) => `
      <div class="card">
        <div class="card-header">
          ${feature.name}
          <span class="badge ${priorityBadgeClass[feature.priority]}">${feature.priority}</span>
        </div>
        <p>${feature.description}</p>
      </div>
    `).join('')}
  </div>
  
  <div class="page-break"></div>
  
  <div class="section">
    <h2>3. User Stories</h2>
    ${options.userStories.map((story, idx) => `
      <div class="user-story">
        <div class="user-story-format">As a <strong>${story.asA}</strong>, I want to <strong>${story.iWant}</strong>, so that <strong>${story.soThat}</strong>.</div>
        <span class="badge ${priorityBadgeClass[story.priority]}">${story.priority} priority</span>
        <div class="acceptance-criteria">
          <strong>Acceptance Criteria:</strong>
          <ul>
            ${story.acceptanceCriteria.map(c => `<li>${c}</li>`).join('')}
          </ul>
        </div>
      </div>
    `).join('')}
  </div>
  
  ${options.technicalStack ? `
  <div class="section">
    <h2>4. Technical Stack</h2>
    <div class="grid">
      ${options.technicalStack.frontend ? `
        <div class="card">
          <div class="card-header">Frontend</div>
          <ul>${options.technicalStack.frontend.map(t => `<li>${t}</li>`).join('')}</ul>
        </div>
      ` : ''}
      ${options.technicalStack.backend ? `
        <div class="card">
          <div class="card-header">Backend</div>
          <ul>${options.technicalStack.backend.map(t => `<li>${t}</li>`).join('')}</ul>
        </div>
      ` : ''}
      ${options.technicalStack.database ? `
        <div class="card">
          <div class="card-header">Database</div>
          <ul>${options.technicalStack.database.map(t => `<li>${t}</li>`).join('')}</ul>
        </div>
      ` : ''}
      ${options.technicalStack.devops ? `
        <div class="card">
          <div class="card-header">DevOps</div>
          <ul>${options.technicalStack.devops.map(t => `<li>${t}</li>`).join('')}</ul>
        </div>
      ` : ''}
    </div>
  </div>
  ` : ''}
  
  ${options.nonFunctionalRequirements && options.nonFunctionalRequirements.length > 0 ? `
  <div class="section">
    <h2>5. Non-Functional Requirements</h2>
    <ul>
      ${options.nonFunctionalRequirements.map(nfr => `<li>${nfr}</li>`).join('')}
    </ul>
  </div>
  ` : ''}
</body>
</html>
    `;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '40px',
        right: '50px',
        bottom: '40px',
        left: '50px',
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
