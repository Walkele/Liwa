#!/usr/bin/env node

/**
 * Current Architecture Converter for Liwa Technical Whitepaper
 * Converts the current architecture documentation to DOCX and HTML
 */

const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = require('docx');

function createCurrentArchitectureDocx() {
  console.log('🔄 Converting Liwa Current Architecture to DOCX...');
  
  try {
    // Read the markdown content
    const markdownContent = fs.readFileSync('LIWA_CURRENT_ARCHITECTURE_WHITEPAPER.md', 'utf8');
    const lines = markdownContent.split('\n');
    const paragraphs = [];
    
    // Add document header
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Liwa: Current Architecture Documentation",
            bold: true,
            size: 36,
            color: "FF6B6B", // Liwa red color
          }),
        ],
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );
    
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Production-Ready Trading Platform Technical Specification",
            italics: true,
            size: 24,
            color: "666666",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      })
    );
    
    // Add date and version
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated: ${new Date().toLocaleDateString()} | Status: Production Ready`,
            size: 20,
            color: "888888",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
      })
    );
    
    // Process markdown content
    let inCodeBlock = false;
    let codeBlockContent = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Handle code blocks
      if (trimmedLine.startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          if (codeBlockContent.length > 0) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: codeBlockContent.join('\n'),
                    font: "Courier New",
                    size: 18,
                    color: "2D3748",
                  }),
                ],
                border: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                  left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                  right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                },
                shading: { fill: "F7FAFC" },
                indent: { left: 360 },
                spacing: { before: 200, after: 200 },
              })
            );
          }
          inCodeBlock = false;
          codeBlockContent = [];
        } else {
          // Start of code block
          inCodeBlock = true;
        }
        continue;
      }
      
      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }
      
      // Process regular content
      if (trimmedLine.startsWith('# ')) {
        // H1 - Main heading
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine.substring(2),
                bold: true,
                size: 32,
                color: "2D3748",
              }),
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 600, after: 300 },
          })
        );
      } else if (trimmedLine.startsWith('## ')) {
        // H2 - Section heading
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine.substring(3),
                bold: true,
                size: 28,
                color: "4A5568",
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          })
        );
      } else if (trimmedLine.startsWith('### ')) {
        // H3 - Subsection heading
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine.substring(4),
                bold: true,
                size: 24,
                color: "718096",
              }),
            ],
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 300, after: 150 },
          })
        );
      } else if (trimmedLine.startsWith('#### ')) {
        // H4 - Sub-subsection heading
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine.substring(5),
                bold: true,
                size: 22,
                color: "A0AEC0",
              }),
            ],
            heading: HeadingLevel.HEADING_4,
            spacing: { before: 200, after: 100 },
          })
        );
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        // Bullet points
        const bulletText = trimmedLine.substring(2);
        const textRuns = parseInlineFormatting(bulletText);
        
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: "• ", size: 22, color: "FF6B6B" }),
              ...textRuns,
            ],
            indent: { left: 720 },
            spacing: { after: 100 },
          })
        );
      } else if (trimmedLine.startsWith('✅ ')) {
        // Implemented features
        const text = trimmedLine.substring(3);
        const textRuns = parseInlineFormatting(text);
        
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: "✅ ", size: 22 }),
              ...textRuns,
            ],
            indent: { left: 360 },
            spacing: { after: 100 },
          })
        );
      } else if (trimmedLine.length > 0 && !trimmedLine.startsWith('---')) {
        // Regular paragraph
        const textRuns = parseInlineFormatting(trimmedLine);
        
        if (textRuns.length > 0) {
          paragraphs.push(
            new Paragraph({
              children: textRuns,
              spacing: { after: 150 },
            })
          );
        }
      } else if (trimmedLine === '' || trimmedLine.startsWith('---')) {
        // Empty line or separator - add spacing
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: "", size: 12 })],
            spacing: { after: 100 },
          })
        );
      }
    }
    
    // Create the document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440,    // 1 inch
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          children: paragraphs,
        },
      ],
    });
    
    // Generate and save the document
    Packer.toBuffer(doc).then((buffer) => {
      fs.writeFileSync('LIWA_CURRENT_ARCHITECTURE_WHITEPAPER.docx', buffer);
      console.log('✅ Successfully created LIWA_CURRENT_ARCHITECTURE_WHITEPAPER.docx');
      console.log('📄 Document saved in the current directory');
      console.log('📊 Document contains', paragraphs.length, 'paragraphs');
    }).catch((error) => {
      console.error('❌ Error creating document:', error);
    });
    
  } catch (error) {
    console.error('❌ Error reading markdown file:', error);
  }
}

function createCurrentArchitectureHtml() {
  console.log('🔄 Converting Liwa Current Architecture to HTML...');
  
  try {
    // Read the markdown content
    const markdownContent = fs.readFileSync('LIWA_CURRENT_ARCHITECTURE_WHITEPAPER.md', 'utf8');
    const lines = markdownContent.split('\n');
    
    // HTML template with styling
    const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Liwa: Current Architecture Documentation</title>
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
        
        .status-badge {
            background: linear-gradient(135deg, #38A169, #48BB78);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            display: inline-block;
            margin-top: 10px;
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
        
        .implemented {
            color: #38A169;
            font-weight: 600;
        }
        
        .implemented::before {
            content: "✅ ";
            margin-right: 8px;
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
        
        .architecture-diagram {
            background-color: #F7FAFC;
            border: 2px solid #E2E8F0;
            border-radius: 12px;
            padding: 20px;
            margin: 30px 0;
            font-family: 'Courier New', monospace;
            font-size: 0.85em;
            line-height: 1.3;
        }
        
        strong {
            color: #2D3748;
            font-weight: 600;
        }
        
        em {
            color: #4A5568;
            font-style: italic;
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
        <div class="title">Liwa: Current Architecture Documentation</div>
        <div class="subtitle">Production-Ready Trading Platform Technical Specification</div>
        <div class="meta">Generated: ${new Date().toLocaleDateString()}</div>
        <div class="status-badge">Production Ready - 100% Complete</div>
    </div>
    
    <div class="content">
`;
    
    let htmlContent = htmlTemplate;
    let inCodeBlock = false;
    let codeBlockContent = [];
    
    // Process markdown content
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Skip the title lines as they're already in the header
      if (i < 5 && (trimmedLine.startsWith('#') || trimmedLine.includes('Current Architecture'))) {
        continue;
      }
      
      // Handle code blocks
      if (trimmedLine.startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          const isArchitectureDiagram = codeBlockContent.some(line => 
            line.includes('┌─') || line.includes('├─') || line.includes('└─')
          );
          
          if (isArchitectureDiagram) {
            htmlContent += `<div class="architecture-diagram">${codeBlockContent.join('\n')}</div>\n`;
          } else {
            htmlContent += `<pre><code>${codeBlockContent.join('\n')}</code></pre>\n`;
          }
          inCodeBlock = false;
          codeBlockContent = [];
        } else {
          // Start of code block
          inCodeBlock = true;
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
        htmlContent += `<div class="implemented">${parseInlineFormatting(text)}</div>\n`;
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
        <p>Generated from LIWA_CURRENT_ARCHITECTURE_WHITEPAPER.md | © 2025 Liwa Development Team</p>
        <p><strong>Status:</strong> Production Ready - All features documented are currently implemented and operational</p>
    </footer>
</body>
</html>`;
    
    // Save the HTML file
    fs.writeFileSync('LIWA_CURRENT_ARCHITECTURE_WHITEPAPER.html', htmlContent);
    console.log('✅ Successfully created LIWA_CURRENT_ARCHITECTURE_WHITEPAPER.html');
    console.log('📄 HTML document saved in the current directory');
    
  } catch (error) {
    console.error('❌ Error creating HTML file:', error);
  }
}

function parseInlineFormatting(text) {
  const textRuns = [];
  let currentIndex = 0;
  
  // Handle **bold** text
  const boldRegex = /\*\*(.*?)\*\*/g;
  let match;
  
  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before bold
    if (match.index > currentIndex) {
      const beforeText = text.substring(currentIndex, match.index);
      if (beforeText.length > 0) {
        textRuns.push(new TextRun({
          text: beforeText,
          size: 22,
          color: "2D3748",
        }));
      }
    }
    
    // Add bold text
    textRuns.push(new TextRun({
      text: match[1],
      bold: true,
      size: 22,
      color: "2D3748",
    }));
    
    currentIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (currentIndex < text.length) {
    const remainingText = text.substring(currentIndex);
    if (remainingText.length > 0) {
      textRuns.push(new TextRun({
        text: remainingText,
        size: 22,
        color: "2D3748",
      }));
    }
  }
  
  // If no formatting found, add as simple text
  if (textRuns.length === 0 && text.length > 0) {
    textRuns.push(new TextRun({
      text: text,
      size: 22,
      color: "2D3748",
    }));
  }
  
  return textRuns;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// HTML inline formatting function
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

// Run both conversions
if (require.main === module) {
  console.log('🚀 Liwa Current Architecture Converter');
  console.log('======================================');
  
  if (!fs.existsSync('LIWA_CURRENT_ARCHITECTURE_WHITEPAPER.md')) {
    console.log('❌ LIWA_CURRENT_ARCHITECTURE_WHITEPAPER.md not found in current directory');
    process.exit(1);
  }
  
  createCurrentArchitectureDocx();
  createCurrentArchitectureHtml();
  
  console.log('');
  console.log('🎉 Conversion completed successfully!');
  console.log('📄 Files created:');
  console.log('   - LIWA_CURRENT_ARCHITECTURE_WHITEPAPER.docx');
  console.log('   - LIWA_CURRENT_ARCHITECTURE_WHITEPAPER.html');
}

module.exports = { createCurrentArchitectureDocx, createCurrentArchitectureHtml };