#!/usr/bin/env node

/**
 * Simple Word Converter for Liwa Technical Whitepaper
 * Creates a Word document from the updated markdown whitepaper
 */

const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

async function createWordDocument() {
  console.log('🔄 Converting Liwa Technical Whitepaper to Word...');
  
  try {
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
            text: "Advanced Peer-to-Peer Trading Platform for Ethiopia",
            italics: true,
            size: 24,
            color: "666666",
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
    
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "🇪🇹 75% PRODUCTION READY - Built on Traditional Ethiopian \"ልዋጭ\" Culture",
            bold: true,
            size: 20,
            color: "FF6B6B",
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
    
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Author: Michaele Ermias Baye (send2michaele@gmail.com)",
            size: 18,
            color: "888888",
            bold: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
    
    // Add page break
    paragraphs.push(new Paragraph({ children: [], pageBreakBefore: true }));
    
    let inCodeBlock = false;
    let codeBlockLines = [];
    
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
                    color: "2D3748",
                  }),
                ],
                shading: {
                  fill: "F7FAFC",
                },
              })
            );
          }
          inCodeBlock = false;
          codeBlockLines = [];
        } else {
          // Start of code block
          inCodeBlock = true;
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
        // Regular paragraph with basic formatting
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
    
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Status: 75% Production Ready | Author: Michaele Ermias Baye | send2michaele@gmail.com",
            size: 18,
            color: "888888",
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
    
    // Create document
    const doc = new Document({
      creator: "Michaele Ermias Baye",
      title: "LIWA: Technical White Paper - 75% Production Ready",
      description: "Advanced Peer-to-Peer Trading Platform for Ethiopia built on traditional ልዋጭ culture",
      subject: "Technical Architecture and Implementation Guide",
      keywords: ["Liwa", "Trading Platform", "Ethiopian", "ልዋጭ", "Technical Whitepaper", "Production Ready"],
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
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync('LIWA_TECHNICAL_WHITEPAPER_UPDATED.docx', buffer);
    console.log('✅ Successfully created LIWA_TECHNICAL_WHITEPAPER_UPDATED.docx');
    console.log('📄 Word document saved in the current directory');
    console.log('🎯 Features Ethiopian cultural context and 75% production ready status');
    console.log('👤 Author: Michaele Ermias Baye (send2michaele@gmail.com)');
    
  } catch (error) {
    console.error('❌ Error creating Word document:', error);
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
      textRuns.push(new TextRun({
        text: text.substring(currentIndex, match.index),
        size: 22,
      }));
    }
    
    // Add bold text
    textRuns.push(new TextRun({
      text: match[1],
      bold: true,
      size: 22,
    }));
    
    currentIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (currentIndex < text.length) {
    textRuns.push(new TextRun({
      text: text.substring(currentIndex),
      size: 22,
    }));
  }
  
  // If no formatting found, add as simple text
  if (textRuns.length === 0) {
    textRuns.push(new TextRun({
      text: text,
      size: 22,
    }));
  }
  
  return textRuns;
}

// Run the conversion
if (require.main === module) {
  console.log('🚀 Liwa Technical Whitepaper to Word Converter');
  console.log('==============================================');
  
  if (!fs.existsSync('LIWA_TECHNICAL_WHITEPAPER_UPDATED.md')) {
    console.log('❌ LIWA_TECHNICAL_WHITEPAPER_UPDATED.md not found in current directory');
    process.exit(1);
  }
  
  createWordDocument();
}

module.exports = { createWordDocument };