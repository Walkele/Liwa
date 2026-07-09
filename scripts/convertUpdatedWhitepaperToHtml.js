#!/usr/bin/env node

/**
 * HTML Converter for Updated Liwa Technical Whitepaper
 * Creates a styled HTML version that can be easily converted to other formats
 */

const fs = require('fs');

function createLiwaWhitepaperHtml() {
  console.log('🔄 Converting Updated Liwa Technical Whitepaper to HTML...');
  
  try {
    // Read the markdown content
    const markdownContent = fs.readFileSync('LIWA_TECHNICAL_WHITEPAPER_UPDATED.md', 'utf8');
    const lines = markdownContent.split('\n');
    
    // HTML template with styling
    const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LIWA: Technical White Paper - Production Ready</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #2D3748;
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
            background-color: #FFFFFF;
        }
        
        .header {
            text-align: center;
            margin-bottom: 60px;
            border-bottom: 3px solid #FF6B6B;
            padding-bottom: 30px;
        }
        
        .title {
            color: #FF6B6B;
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .subtitle {
            color: #666666;
            font-size: 1.3em;
            font-style: italic;
            margin-bottom: 20px;
        }
        
        .meta {
            color: #888888;
            font-size: 0.9em;
        }
        
        h1 {
            color: #2D3748;
            font-size: 2.2em;
            font-weight: bold;
            margin-top: 50px;
            margin-bottom: 20px;
            border-bottom: 2px solid #E2E8F0;
            padding-bottom: 10px;
        }
        
        h2 {
            color: #4A5568;
            font-size: 1.8em;
            font-weight: bold;
            margin-top: 40px;
            margin-bottom: 15px;
        }
        
        h3 {
            color: #718096;
            font-size: 1.4em;
            font-weight: bold;
            margin-top: 30px;
            margin-bottom: 12px;
        }
        
        h4 {
            color: #A0AEC0;
            font-size: 1.2em;
            font-weight: bold;
            margin-top: 25px;
            margin-bottom: 10px;
        }
        
        p {
            margin-bottom: 15px;
            text-align: justify;
        }
        
        ul, ol {
            margin-bottom: 15px;
            padding-left: 30px;
        }
        
        li {
            margin-bottom: 8px;
        }
        
        .status-item {
            margin-left: 20px;
            margin-bottom: 8px;
        }
        
        .implemented {
            color: #38A169;
            font-weight: 600;
        }
        
        .planned {
            color: #3182CE;
            font-weight: 600;
        }
        
        .architecture-diagram {
            background-color: #F7FAFC;
            border: 2px solid #E2E8F0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            font-size: 0.8em;
            line-height: 1.2;
            overflow-x: auto;
            white-space: pre;
        }
        
        code {
            background-color: #F7FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 4px;
            padding: 2px 6px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        
        pre {
            background-color: #F7FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            line-height: 1.4;
        }
        
        .separator {
            border: none;
            height: 2px;
            background: linear-gradient(to right, #FF6B6B, #4ECDC4);
            margin: 40px 0;
        }
        
        .toc {
            background-color: #F7FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
        }
        
        .toc h3 {
            margin-top: 0;
            color: #2D3748;
        }
        
        .toc ul {
            list-style-type: none;
            padding-left: 0;
        }
        
        .toc li {
            margin-bottom: 5px;
        }
        
        .toc a {
            color: #3182CE;
            text-decoration: none;
        }
        
        .toc a:hover {
            text-decoration: underline;
        }
        
        strong {
            color: #2D3748;
            font-weight: 600;
        }
        
        em {
            color: #4A5568;
            font-style: italic;
        }
        
        .production-ready {
            background: linear-gradient(135deg, #38A169, #48BB78);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            text-align: center;
            font-weight: bold;
            margin: 20px 0;
        }
        
        @media print {
            body {
                font-size: 12pt;
                line-height: 1.4;
            }
            
            .header {
                page-break-after: always;
            }
            
            h1, h2, h3, h4 {
                page-break-after: avoid;
            }
            
            pre, .architecture-diagram {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">LIWA: Technical White Paper</div>
        <div class="subtitle">Advanced Peer-to-Peer Trading Platform for Ethiopia</div>
        <div class="meta">Generated: ${new Date().toLocaleDateString()} | Version: 2.0 | Status: 75% Production Ready</div>
        <div class="meta" style="margin-top: 10px; font-weight: bold;">Author: Michaele Ermias Baye (send2michaele@gmail.com)</div>
    </div>
    
    <div class="production-ready" style="background: linear-gradient(135deg, #FF6B6B, #4ECDC4);">
        🇪🇹 75% PRODUCTION READY - Built on Traditional Ethiopian "ልዋጭ" Culture
    </div>
    
    <div class="content">
`;
    
    let htmlContent = htmlTemplate;
    let inCodeBlock = false;
    let codeBlockContent = [];
    let isArchitectureDiagram = false;
    
    // Process markdown content
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Skip the title lines as they're already in the header
      if (i < 10 && (trimmedLine.startsWith('#') || trimmedLine.includes('Technical White Paper') || trimmedLine.includes('Executive Summary'))) {
        continue;
      }
      
      // Handle code blocks
      if (trimmedLine.startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          const cssClass = isArchitectureDiagram ? 'architecture-diagram' : '';
          htmlContent += `<pre class="${cssClass}"><code>${codeBlockContent.join('\n')}</code></pre>\n`;
          inCodeBlock = false;
          isArchitectureDiagram = false;
          codeBlockContent = [];
        } else {
          // Start of code block
          inCodeBlock = true;
          // Check if this is an architecture diagram
          isArchitectureDiagram = codeBlockContent.length === 0 && 
            (lines[i-1] && lines[i-1].includes('Architecture')) ||
            (lines[i+1] && lines[i+1].includes('┌'));
        }
        continue;
      }
      
      if (inCodeBlock) {
        codeBlockContent.push(escapeHtml(line));
        continue;
      }
      
      // Process regular content
      if (trimmedLine.startsWith('# ')) {
        const text = trimmedLine.substring(2);
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        htmlContent += `<h1 id="${id}">${escapeHtml(text)}</h1>\n`;
      } else if (trimmedLine.startsWith('## ')) {
        const text = trimmedLine.substring(3);
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        htmlContent += `<h2 id="${id}">${escapeHtml(text)}</h2>\n`;
      } else if (trimmedLine.startsWith('### ')) {
        const text = trimmedLine.substring(4);
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        htmlContent += `<h3 id="${id}">${escapeHtml(text)}</h3>\n`;
      } else if (trimmedLine.startsWith('#### ')) {
        const text = trimmedLine.substring(5);
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        htmlContent += `<h4 id="${id}">${escapeHtml(text)}</h4>\n`;
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        const text = trimmedLine.substring(2);
        htmlContent += `<ul><li>${parseInlineFormatting(text)}</li></ul>\n`;
      } else if (trimmedLine.startsWith('✅ ')) {
        const text = trimmedLine.substring(3);
        htmlContent += `<div class="status-item implemented">✅ ${parseInlineFormatting(text)}</div>\n`;
      } else if (trimmedLine.startsWith('🔮 ')) {
        const text = trimmedLine.substring(3);
        htmlContent += `<div class="status-item planned">🔮 ${parseInlineFormatting(text)}</div>\n`;
      } else if (trimmedLine === '---') {
        htmlContent += `<hr class="separator">\n`;
      } else if (trimmedLine.length > 0) {
        htmlContent += `<p>${parseInlineFormatting(trimmedLine)}</p>\n`;
      } else {
        htmlContent += `<br>\n`;
      }
    }
    
    // Close HTML
    htmlContent += `
    </div>
    
    <footer style="margin-top: 60px; padding-top: 30px; border-top: 1px solid #E2E8F0; text-align: center; color: #888888;">
        <p>Generated from LIWA_TECHNICAL_WHITEPAPER_UPDATED.md | © 2025 Liwa Development Team</p>
        <p><strong>Status: 75% Production Ready</strong> | Advanced development ready for beta testing</p>
        <p><strong>Author:</strong> Michaele Ermias Baye | <strong>Email:</strong> send2michaele@gmail.com</p>
    </footer>
</body>
</html>`;
    
    // Save the HTML file
    fs.writeFileSync('LIWA_TECHNICAL_WHITEPAPER_UPDATED.html', htmlContent);
    console.log('✅ Successfully created LIWA_TECHNICAL_WHITEPAPER_UPDATED.html');
    console.log('📄 HTML document saved in the current directory');
    console.log('💡 You can open this in a browser and print to PDF or convert to other formats');
    console.log('🎯 Features comprehensive architectural diagrams and production-ready status');
    
  } catch (error) {
    console.error('❌ Error creating HTML file:', error);
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseInlineFormatting(text) {
  let result = escapeHtml(text);
  
  // Handle **bold** text
  result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Handle *italic* text
  result = result.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Handle `code` text
  result = result.replace(/`(.*?)`/g, '<code>$1</code>');
  
  return result;
}

// Run the conversion
if (require.main === module) {
  console.log('🚀 Updated Liwa Technical Whitepaper to HTML Converter');
  console.log('====================================================');
  
  if (!fs.existsSync('LIWA_TECHNICAL_WHITEPAPER_UPDATED.md')) {
    console.log('❌ LIWA_TECHNICAL_WHITEPAPER_UPDATED.md not found in current directory');
    process.exit(1);
  }
  
  createLiwaWhitepaperHtml();
}

module.exports = { createLiwaWhitepaperHtml };