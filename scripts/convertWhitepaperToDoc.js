#!/usr/bin/env node

/**
 * Liwa Technical Whitepaper Converter
 * Converts the Markdown whitepaper to Microsoft Word (.docx) format
 */

const fs = require('fs');
const path = require('path');

// Check if pandoc is available (recommended method)
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
  console.log('🔄 Converting whitepaper using Pandoc...');
  
  try {
    // Convert using pandoc with enhanced formatting
    const command = `pandoc "LIWA_TECHNICAL_WHITEPAPER.md" -o "LIWA_TECHNICAL_WHITEPAPER.docx" --from markdown --to docx --reference-doc=scripts/reference.docx --toc --toc-depth=3`;
    
    execSync(command, { stdio: 'inherit' });
    console.log('✅ Successfully converted to LIWA_TECHNICAL_WHITEPAPER.docx using Pandoc');
    return true;
  } catch (error) {
    console.log('❌ Pandoc conversion failed:', error.message);
    return false;
  }
}

function convertWithNodeLibrary() {
  console.log('🔄 Converting whitepaper using Node.js library...');
  
  try {
    // Try to use markdown-to-docx library
    const markdownToDocx = require('markdown-to-docx');
    const markdownContent = fs.readFileSync('LIWA_TECHNICAL_WHITEPAPER.md', 'utf8');
    
    markdownToDocx(markdownContent, {
      title: 'Liwa: Technical White Paper',
      author: 'Liwa Development Team',
      subject: 'Technical Architecture and Implementation Guide',
      keywords: ['Liwa', 'Trading Platform', 'Ethiopian', 'Minimalism', 'Technical Whitepaper'],
      description: 'Comprehensive technical documentation for the Liwa trading platform',
      orientation: 'portrait',
      margins: {
        top: 1440,    // 1 inch in twips
        right: 1440,
        bottom: 1440,
        left: 1440
      }
    }).then(buffer => {
      fs.writeFileSync('LIWA_TECHNICAL_WHITEPAPER.docx', buffer);
      console.log('✅ Successfully converted to LIWA_TECHNICAL_WHITEPAPER.docx');
    }).catch(error => {
      console.log('❌ Node library conversion failed:', error.message);
      return false;
    });
    
    return true;
  } catch (error) {
    console.log('❌ Node library not available:', error.message);
    return false;
  }
}

function createSimpleDocx() {
  console.log('🔄 Creating simple DOCX using docx library...');
  
  try {
    const docx = require('docx');
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;
    
    // Read the markdown content
    const markdownContent = fs.readFileSync('LIWA_TECHNICAL_WHITEPAPER.md', 'utf8');
    
    // Simple markdown parsing
    const lines = markdownContent.split('\n');
    const paragraphs = [];
    
    // Add title
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Liwa: Technical White Paper",
            bold: true,
            size: 32,
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
            text: "Comprehensive Backend & Frontend Architecture Analysis",
            italics: true,
            size: 24,
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
    
    // Add spacing
    paragraphs.push(new Paragraph({ children: [] }));
    
    // Process markdown lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('# ')) {
        // H1 - Main heading
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line.substring(2),
                bold: true,
                size: 28,
              }),
            ],
            heading: HeadingLevel.HEADING_1,
          })
        );
      } else if (line.startsWith('## ')) {
        // H2 - Section heading
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line.substring(3),
                bold: true,
                size: 24,
              }),
            ],
            heading: HeadingLevel.HEADING_2,
          })
        );
      } else if (line.startsWith('### ')) {
        // H3 - Subsection heading
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line.substring(4),
                bold: true,
                size: 20,
              }),
            ],
            heading: HeadingLevel.HEADING_3,
          })
        );
      } else if (line.startsWith('#### ')) {
        // H4 - Sub-subsection heading
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line.substring(5),
                bold: true,
                size: 18,
              }),
            ],
            heading: HeadingLevel.HEADING_4,
          })
        );
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        // Bullet points
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${line.substring(2)}`,
                size: 22,
              }),
            ],
            indent: { left: 720 }, // 0.5 inch indent
          })
        );
      } else if (line.startsWith('```')) {
        // Code blocks - skip for now or handle specially
        continue;
      } else if (line.length > 0) {
        // Regular paragraph
        let textRuns = [];
        
        // Handle bold text **text**
        let processedLine = line;
        const boldRegex = /\*\*(.*?)\*\*/g;
        let lastIndex = 0;
        let match;
        
        while ((match = boldRegex.exec(line)) !== null) {
          // Add text before bold
          if (match.index > lastIndex) {
            textRuns.push(new TextRun({
              text: line.substring(lastIndex, match.index),
              size: 22,
            }));
          }
          
          // Add bold text
          textRuns.push(new TextRun({
            text: match[1],
            bold: true,
            size: 22,
          }));
          
          lastIndex = match.index + match[0].length;
        }
        
        // Add remaining text
        if (lastIndex < line.length) {
          textRuns.push(new TextRun({
            text: line.substring(lastIndex),
            size: 22,
          }));
        }
        
        // If no formatting found, add as simple text
        if (textRuns.length === 0) {
          textRuns.push(new TextRun({
            text: line,
            size: 22,
          }));
        }
        
        paragraphs.push(
          new Paragraph({
            children: textRuns,
          })
        );
      } else {
        // Empty line - add spacing
        paragraphs.push(new Paragraph({ children: [] }));
      }
    }
    
    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });
    
    // Generate and save
    Packer.toBuffer(doc).then((buffer) => {
      fs.writeFileSync('LIWA_TECHNICAL_WHITEPAPER.docx', buffer);
      console.log('✅ Successfully created LIWA_TECHNICAL_WHITEPAPER.docx');
    });
    
    return true;
  } catch (error) {
    console.log('❌ DOCX library conversion failed:', error.message);
    return false;
  }
}

function createReferenceDoc() {
  console.log('📄 Creating reference document for better formatting...');
  
  try {
    const docx = require('docx');
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
    
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Reference Document", bold: true })],
              heading: HeadingLevel.TITLE,
            }),
          ],
        },
      ],
    });
    
    Packer.toBuffer(doc).then((buffer) => {
      fs.writeFileSync('scripts/reference.docx', buffer);
      console.log('✅ Created reference document');
    });
  } catch (error) {
    console.log('❌ Could not create reference document:', error.message);
  }
}

function installRequiredPackages() {
  console.log('📦 Installing required packages...');
  
  try {
    execSync('npm install docx markdown-to-docx --save-dev', { stdio: 'inherit' });
    console.log('✅ Packages installed successfully');
    return true;
  } catch (error) {
    console.log('❌ Failed to install packages:', error.message);
    return false;
  }
}

function main() {
  console.log('🚀 Liwa Technical Whitepaper Converter');
  console.log('=====================================');
  
  // Check if whitepaper exists
  if (!fs.existsSync('LIWA_TECHNICAL_WHITEPAPER.md')) {
    console.log('❌ LIWA_TECHNICAL_WHITEPAPER.md not found in current directory');
    process.exit(1);
  }
  
  // Method 1: Try Pandoc (best quality)
  if (checkPandocAvailable()) {
    if (convertWithPandoc()) {
      console.log('🎉 Conversion completed successfully with Pandoc!');
      return;
    }
  } else {
    console.log('ℹ️  Pandoc not available. Install Pandoc for best results: https://pandoc.org/installing.html');
  }
  
  // Method 2: Try Node.js libraries
  console.log('📦 Attempting to install required Node.js packages...');
  if (installRequiredPackages()) {
    // Try markdown-to-docx
    if (convertWithNodeLibrary()) {
      console.log('🎉 Conversion completed successfully with Node.js library!');
      return;
    }
    
    // Try docx library
    if (createSimpleDocx()) {
      console.log('🎉 Conversion completed successfully with DOCX library!');
      return;
    }
  }
  
  // Method 3: Fallback instructions
  console.log('');
  console.log('📋 Manual Conversion Instructions:');
  console.log('==================================');
  console.log('1. Install Pandoc: https://pandoc.org/installing.html');
  console.log('2. Run: pandoc LIWA_TECHNICAL_WHITEPAPER.md -o LIWA_TECHNICAL_WHITEPAPER.docx');
  console.log('');
  console.log('Alternative:');
  console.log('1. Copy the content from LIWA_TECHNICAL_WHITEPAPER.md');
  console.log('2. Paste into Google Docs or Microsoft Word');
  console.log('3. Use the built-in markdown formatting tools');
  console.log('4. Save as .docx format');
  console.log('');
  console.log('Online Converters:');
  console.log('- https://pandoc.org/try/');
  console.log('- https://word-to-markdown.herokuapp.com/ (reverse)');
  console.log('- https://markdowntoword.com/');
}

if (require.main === module) {
  main();
}

module.exports = {
  convertWithPandoc,
  convertWithNodeLibrary,
  createSimpleDocx,
  installRequiredPackages
};