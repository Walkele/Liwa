#!/usr/bin/env node

/**
 * Updated Liwa Technical Whitepaper to Word Converter
 * Converts the updated markdown whitepaper to Microsoft Word (.docx) format
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function checkPandocAvailable() {
  try {
    execSync('pandoc --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

function convertWithPandoc() {
  console.log('🔄 Converting updated whitepaper using Pandoc...');
  
  try {
    // Convert using pandoc with enhanced formatting
    const command = `pandoc "LIWA_TECHNICAL_WHITEPAPER_UPDATED.md" -o "LIWA_TECHNICAL_WHITEPAPER_UPDATED.docx" --from markdown --to docx --toc --toc-depth=3 --highlight-style=tango --reference-doc=scripts/liwa-reference.docx`;
    
    execSync(command, { stdio: 'inherit' });
    console.log('✅ Successfully converted to LIWA_TECHNICAL_WHITEPAPER_UPDATED.docx using Pandoc');
    return true;
  } catch (error) {
    console.log('❌ Pandoc conversion failed, trying without reference doc...');
    
    try {
      // Fallback without reference doc
      const fallbackCommand = `pandoc "LIWA_TECHNICAL_WHITEPAPER_UPDATED.md" -o "LIWA_TECHNICAL_WHITEPAPER_UPDATED.docx" --from markdown --to docx --toc --toc-depth=3 --highlight-style=tango`;
      execSync(fallbackCommand, { stdio: 'inherit' });
      console.log('✅ Successfully converted to LIWA_TECHNICAL_WHITEPAPER_UPDATED.docx using Pandoc (fallback)');
      return true;
    } catch (fallbackError) {
      console.log('❌ Pandoc conversion failed:', fallbackError.message);
      return false;
    }
  }
}

function createLiwaReferenceDoc() {
  console.log('📄 Creating Liwa-branded reference document...');
  
  try {
    const docx = require('docx');
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = docx;
    
    const doc = new Document({
      creator: "Liwa Development Team",
      title: "LIWA Technical Whitepaper Reference",
      description: "Reference document for Liwa whitepaper formatting",
      styles: {
        paragraphStyles: [
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              size: 32,
              bold: true,
              color: "FF6B6B",
            },
            paragraph: {
              spacing: {
                after: 240,
                before: 240,
              },
            },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              size: 28,
              bold: true,
              color: "4A5568",
            },
            paragraph: {
              spacing: {
                after: 200,
                before: 200,
              },
            },
          },
          {
            id: "Heading3",
            name: "Heading 3",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              size: 24,
              bold: true,
              color: "718096",
            },
            paragraph: {
              spacing: {
                after: 160,
                before: 160,
              },
            },
          },
        ],
      },
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "LIWA: Technical White Paper",
                  bold: true,
                  size: 36,
                  color: "FF6B6B",
                }),
              ],
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Production-Ready Peer-to-Peer Trading Platform",
                  italics: true,
                  size: 24,
                  color: "666666",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Reference Document for Formatting",
                  size: 18,
                  color: "888888",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        },
      ],
    });
    
    return Packer.toBuffer(doc).then((buffer) => {
      if (!fs.existsSync('scripts')) {
        fs.mkdirSync('scripts', { recursive: true });
      }
      fs.writeFileSync('scripts/liwa-reference.docx', buffer);
      console.log('✅ Created Liwa reference document');
      return true;
    }).catch(error => {
      console.log('❌ Could not create reference document:', error.message);
      return false;
    });
  } catch (error) {
    console.log('❌ DOCX library not available for reference doc:', error.message);
    return false;
  }
}

function createAdvancedDocx() {
  console.log('🔄 Creating advanced DOCX with full formatting...');
  
  try {
    const docx = require('docx');
    const { 
      Document, 
      Packer, 
      Paragraph, 
      TextRun, 
      HeadingLevel, 
      AlignmentType,
      BorderStyle,
      Table,
      TableRow,
      TableCell,
      WidthType
    } = docx;
    
    // Read the markdown content
    const markdownContent = fs.readFileSync('LIWA_TECHNICAL_WHITEPAPER_UPDATED.md', 'utf8');
    const lines = markdownContent.split('\n');
    const paragraphs = [];
    
    // Add title page
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "LIWA: Technical White Paper",
            bold: true,
            size: 36,
            color: "FF6B6B",
          }),
        ],
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      })
    );
    
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Production-Ready Peer-to-Peer Trading Platform",
            italics: true,
            size: 24,
            color: "666666",
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
    
    // Production ready badge
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "✅ 100% PRODUCTION READY",
            bold: true,
            size: 20,
            color: "38A169",
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
    
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated: ${new Date().toLocaleDateString()} | Version: 2.0`,
            size: 18,
            color: "888888",
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
    
    // Add page break
    paragraphs.push(new Paragraph({ children: [], pageBreakBefore: true }));
    
    let inCodeBlock = false;
    let codeBlockLines = [];
    let isArchitectureDiagram = false;
    
    // Process markdown lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Skip title lines as they're already added
      if (i < 10 && (trimmedLine.startsWith('#') || trimmedLine.includes('Technical White Paper'))) {
        continue;
      }
      
      // Handle code blocks
      if (trimmedLine.startsWith('```')) {
        if (inCodeBlock) {
          // End of code block - add as formatted text
          if (codeBlockLines.length > 0) {
            const codeText = codeBlockLines.join('\n');
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: codeText,
                    font: "Courier New",
                    size: 18,
                    color: isArchitectureDiagram ? "2D3748" : "4A5568",
                  }),
                ],
                border: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                  left: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                  right: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                },
                shading: {
                  fill: "F7FAFC",
                },
              })
            );
          }
          inCodeBlock = false;
          isArchitectureDiagram = false;
          codeBlockLines = [];
        } else {
          // Start of code block
          inCodeBlock = true;
          // Check if this is an architecture diagram
          isArchitectureDiagram = lines[i-1] && lines[i-1].toLowerCase().includes('architecture');
        }
        continue;
      }
      
      if (inCodeBlock) {
        codeBlockLines.push(line);
        continue;
      }
      
      // Process regular content
      if (trimmedLine.startsWith('# ')) {
        const text = trimmedLine.substring(2);
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: text,
                bold: true,
                size: 32,
                color: "2D3748",
              }),
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 240, before: 240 },
          })
        );
      } else if (trimmedLine.startsWith('## ')) {
        const text = trimmedLine.substring(3);
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: text,
                bold: true,
                size: 28,
                color: "4A5568",
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200, before: 200 },
          })
        );
      } else if (trimmedLine.startsWith('### ')) {
        const text = trimmedLine.substring(4);
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: text,
                bold: true,
                size: 24,
                color: "718096",
              }),
            ],
            heading: HeadingLevel.HEADING_3,
            spacing: { after: 160, before: 160 },
          })
        );
      } else if (trimmedLine.startsWith('#### ')) {
        const text = trimmedLine.substring(5);
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: text,
                bold: true,
                size: 20,
                color: "A0AEC0",
              }),
            ],
            heading: HeadingLevel.HEADING_4,
            spacing: { after: 120, before: 120 },
          })
        );
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        const text = trimmedLine.substring(2);
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${text}`,
                size: 22,
              }),
            ],
            indent: { left: 720 },
          })
        );
      } else if (trimmedLine.startsWith('✅ ')) {
        const text = trimmedLine.substring(3);
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `✅ ${text}`,
                size: 22,
                color: "38A169",
                bold: true,
              }),
            ],
            indent: { left: 360 },
          })
        );
      } else if (trimmedLine.startsWith('🔮 ')) {
        const text = trimmedLine.substring(3);
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `🔮 ${text}`,
                size: 22,
                color: "3182CE",
                bold: true,
              }),
            ],
            indent: { left: 360 },
          })
        );
      } else if (trimmedLine === '---') {
        // Add a separator line
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "────────────────────────────────────────────────────────",
                color: "E2E8F0",
              }),
            ],
            alignment: AlignmentType.CENTER,
          })
        );
      } else if (trimmedLine.length > 0) {
        // Regular paragraph with formatting
        const textRuns = parseInlineFormatting(trimmedLine);
        paragraphs.push(
          new Paragraph({
            children: textRuns,
            spacing: { after: 120 },
          })
        );
      } else {
        // Empty line
        paragraphs.push(new Paragraph({ children: [] }));
      }
    }
    
    // Add footer
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Generated from LIWA_TECHNICAL_WHITEPAPER_UPDATED.md | © 2025 Liwa Development Team",
            size: 18,
            color: "888888",
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 480 },
      })
    );
    
    // Create document
    const doc = new Document({
      creator: "Liwa Development Team",
      title: "LIWA: Technical White Paper - Production Ready",
      description: "Comprehensive technical documentation for the production-ready Liwa trading platform",
      subject: "Technical Architecture and Implementation Guide",
      keywords: ["Liwa", "Trading Platform", "Ethiopian", "Technical Whitepaper", "Production Ready"],
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
    
    // Generate and save
    return Packer.toBuffer(doc).then((buffer) => {
      fs.writeFileSync('LIWA_TECHNICAL_WHITEPAPER_UPDATED.docx', buffer);
      console.log('✅ Successfully created LIWA_TECHNICAL_WHITEPAPER_UPDATED.docx with advanced formatting');
      return true;
    });
    
  } catch (error) {
    console.log('❌ Advanced DOCX creation failed:', error.message);
    return false;
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
      textRuns.push(new (require('docx').TextRun)({
        text: text.substring(currentIndex, match.index),
        size: 22,
      }));
    }
    
    // Add bold text
    textRuns.push(new (require('docx').TextRun)({
      text: match[1],
      bold: true,
      size: 22,
    }));
    
    currentIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (currentIndex < text.length) {
    textRuns.push(new (require('docx').TextRun)({
      text: text.substring(currentIndex),
      size: 22,
    }));
  }
  
  // If no formatting found, add as simple text
  if (textRuns.length === 0) {
    textRuns.push(new (require('docx').TextRun)({
      text: text,
      size: 22,
    }));
  }
  
  return textRuns;
}

function installRequiredPackages() {
  console.log('📦 Installing required packages...');
  
  try {
    execSync('npm install docx --save-dev', { stdio: 'inherit' });
    console.log('✅ Packages installed successfully');
    return true;
  } catch (error) {
    console.log('❌ Failed to install packages:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Updated Liwa Technical Whitepaper to Word Converter');
  console.log('===================================================');
  
  // Check if updated whitepaper exists
  if (!fs.existsSync('LIWA_TECHNICAL_WHITEPAPER_UPDATED.md')) {
    console.log('❌ LIWA_TECHNICAL_WHITEPAPER_UPDATED.md not found in current directory');
    process.exit(1);
  }
  
  // Method 1: Try Pandoc (best quality)
  if (checkPandocAvailable()) {
    console.log('✅ Pandoc is available - using for high-quality conversion');
    
    // Create reference document first
    console.log('📦 Installing DOCX library for reference document...');
    if (installRequiredPackages()) {
      await createLiwaReferenceDoc();
    }
    
    if (convertWithPandoc()) {
      console.log('🎉 Conversion completed successfully with Pandoc!');
      console.log('📄 Output: LIWA_TECHNICAL_WHITEPAPER_UPDATED.docx');
      return;
    }
  } else {
    console.log('ℹ️  Pandoc not available. Install Pandoc for best results: https://pandoc.org/installing.html');
  }
  
  // Method 2: Try Node.js DOCX library
  console.log('📦 Attempting to install required Node.js packages...');
  if (installRequiredPackages()) {
    console.log('🔄 Using Node.js DOCX library for conversion...');
    try {
      const success = await createAdvancedDocx();
      if (success) {
        console.log('🎉 Conversion completed successfully with Node.js DOCX library!');
        console.log('📄 Output: LIWA_TECHNICAL_WHITEPAPER_UPDATED.docx');
        return;
      }
    } catch (error) {
      console.log('❌ Node.js conversion failed:', error.message);
    }
  }
  
  // Method 3: Fallback instructions
  console.log('');
  console.log('📋 Manual Conversion Instructions:');
  console.log('==================================');
  console.log('1. Install Pandoc: https://pandoc.org/installing.html');
  console.log('2. Run: pandoc LIWA_TECHNICAL_WHITEPAPER_UPDATED.md -o LIWA_TECHNICAL_WHITEPAPER_UPDATED.docx --toc');
  console.log('');
  console.log('Alternative Methods:');
  console.log('1. Open LIWA_TECHNICAL_WHITEPAPER_UPDATED.html in a browser');
  console.log('2. Copy all content (Ctrl+A, Ctrl+C)');
  console.log('3. Paste into Microsoft Word or Google Docs');
  console.log('4. Save as .docx format');
  console.log('');
  console.log('Online Converters:');
  console.log('- https://pandoc.org/try/');
  console.log('- https://markdowntoword.com/');
  console.log('- https://word-to-markdown.herokuapp.com/ (for reverse conversion)');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  convertWithPandoc,
  createAdvancedDocx,
  createLiwaReferenceDoc,
  installRequiredPackages
};