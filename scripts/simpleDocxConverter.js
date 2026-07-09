#!/usr/bin/env node

/**
 * Simple DOCX Converter for Liwa Technical Whitepaper
 * Uses the already installed docx package
 */

const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = require('docx');

function createLiwaWhitepaperDocx() {
  console.log('🔄 Converting Liwa Technical Whitepaper to DOCX...');
  
  try {
    // Read the markdown content
    const markdownContent = fs.readFileSync('LIWA_TECHNICAL_WHITEPAPER.md', 'utf8');
    const lines = markdownContent.split('\n');
    const paragraphs = [];
    
    // Add document header
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Liwa: Technical White Paper",
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
            text: "Comprehensive Backend & Frontend Architecture Analysis",
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
            text: `Generated: ${new Date().toLocaleDateString()}`,
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
      } else if (trimmedLine.startsWith('✅ ') || trimmedLine.startsWith('🔮 ')) {
        // Special status indicators
        const icon = trimmedLine.startsWith('✅ ') ? '✅ ' : '🔮 ';
        const text = trimmedLine.substring(3);
        const textRuns = parseInlineFormatting(text);
        
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: icon, size: 22 }),
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
      fs.writeFileSync('LIWA_TECHNICAL_WHITEPAPER.docx', buffer);
      console.log('✅ Successfully created LIWA_TECHNICAL_WHITEPAPER.docx');
      console.log('📄 Document saved in the current directory');
      console.log('📊 Document contains', paragraphs.length, 'paragraphs');
    }).catch((error) => {
      console.error('❌ Error creating document:', error);
    });
    
  } catch (error) {
    console.error('❌ Error reading markdown file:', error);
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

// Run the conversion
if (require.main === module) {
  console.log('🚀 Liwa Technical Whitepaper to DOCX Converter');
  console.log('===============================================');
  
  if (!fs.existsSync('LIWA_TECHNICAL_WHITEPAPER.md')) {
    console.log('❌ LIWA_TECHNICAL_WHITEPAPER.md not found in current directory');
    process.exit(1);
  }
  
  createLiwaWhitepaperDocx();
}

module.exports = { createLiwaWhitepaperDocx };