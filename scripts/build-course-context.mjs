#!/usr/bin/env node
/**
 * Build Course Context for AI Tutor
 * 
 * This script extracts content from all lesson MDX files and creates a
 * structured JSON file that the AI tutor can use to answer questions
 * about any part of the course.
 * 
 * Run: node scripts/build-course-context.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGES_DIR = path.join(__dirname, '../src/pages');
const OUTPUT_FILE = path.join(__dirname, '../netlify/functions/_lib/course-content.json');

// Extract text content from MDX, removing code blocks and JSX
function extractTextFromMDX(content) {
  // Remove frontmatter
  content = content.replace(/^---[\s\S]*?---/, '');
  
  // Remove import statements
  content = content.replace(/^import\s+.*$/gm, '');
  
  // Remove JSX components but keep text content inside
  content = content.replace(/<[A-Z][a-zA-Z]*[\s\S]*?\/>/g, '');
  content = content.replace(/<[A-Z][a-zA-Z]*[^>]*>[\s\S]*?<\/[A-Z][a-zA-Z]*>/g, (match) => {
    // Try to extract meaningful text from inside
    const textMatch = match.match(/>([\s\S]*?)</);
    return textMatch ? textMatch[1] : '';
  });
  
  // Remove style blocks
  content = content.replace(/<style[\s\S]*?<\/style>/gi, '');
  
  // Remove HTML comments
  content = content.replace(/<!--[\s\S]*?-->/g, '');
  
  // Extract code examples (keep them, they're educational)
  const codeExamples = [];
  content.replace(/```(?:csharp|cs)?\n([\s\S]*?)```/g, (match, code) => {
    if (code.trim().length > 10 && code.trim().length < 500) {
      codeExamples.push(code.trim());
    }
    return '';
  });
  
  // Remove remaining code blocks
  content = content.replace(/```[\s\S]*?```/g, '');
  
  // Remove inline code backticks but keep content
  content = content.replace(/`([^`]+)`/g, '$1');
  
  // Remove HTML tags
  content = content.replace(/<[^>]+>/g, ' ');
  
  // Clean up whitespace
  content = content.replace(/\n{3,}/g, '\n\n');
  content = content.replace(/[ \t]+/g, ' ');
  content = content.trim();
  
  return { text: content, codeExamples };
}

// Extract title from frontmatter or first heading
function extractTitle(content) {
  // Try frontmatter title
  const frontmatterMatch = content.match(/^---[\s\S]*?title:\s*["']?([^"'\n]+)["']?/);
  if (frontmatterMatch) return frontmatterMatch[1].trim();
  
  // Try first # heading
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) return headingMatch[1].trim();
  
  return null;
}

// Extract key concepts from content
function extractKeyConcepts(text) {
  const concepts = [];
  
  // Look for Key Takeaways sections
  const takeawayMatch = text.match(/Key Takeaways?[\s\S]*?(?=---|\n#|$)/i);
  if (takeawayMatch) {
    const bullets = takeawayMatch[0].match(/[-•]\s*\*?\*?([^-•\n]+)/g);
    if (bullets) {
      bullets.forEach(b => {
        const clean = b.replace(/[-•]\s*\*?\*?/, '').trim();
        if (clean.length > 10) concepts.push(clean);
      });
    }
  }
  
  // Look for bold important points
  const boldMatches = text.match(/\*\*([^*]+)\*\*/g);
  if (boldMatches) {
    boldMatches.slice(0, 5).forEach(m => {
      const clean = m.replace(/\*\*/g, '').trim();
      if (clean.length > 5 && clean.length < 100) concepts.push(clean);
    });
  }
  
  return [...new Set(concepts)].slice(0, 8);
}

// Process a single MDX file
function processFile(filePath, relativePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const title = extractTitle(content);
  const { text, codeExamples } = extractTextFromMDX(content);
  const keyConcepts = extractKeyConcepts(text);
  
  // Create a summary (first ~500 chars of meaningful content)
  const summary = text
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 600)
    .trim();
  
  return {
    path: relativePath,
    title,
    summary,
    keyConcepts,
    codeExamples: codeExamples.slice(0, 3), // Keep up to 3 examples
    fullText: text.slice(0, 3000) // Truncate very long content
  };
}

// Recursively find all MDX files
function findMDXFiles(dir, basePath = '') {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...findMDXFiles(fullPath, relativePath));
    } else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) {
      files.push({ fullPath, relativePath });
    }
  }
  
  return files;
}

// Organize content by week
function organizeByWeek(pages) {
  const weeks = {};
  const other = [];
  
  for (const page of pages) {
    const weekMatch = page.path.match(/week-(\d+)/i);
    if (weekMatch) {
      const weekNum = parseInt(weekMatch[1]);
      if (!weeks[weekNum]) {
        weeks[weekNum] = {
          week: weekNum,
          title: getWeekTitle(weekNum),
          sections: []
        };
      }
      weeks[weekNum].sections.push(page);
    } else {
      other.push(page);
    }
  }
  
  return { weeks, other };
}

function getWeekTitle(weekNum) {
  const titles = {
    1: "Introduction to .NET and C#",
    2: "Your First C# Program - Namespaces, Classes, and Main",
    3: "Variables & Data Types",
    4: "Strings & Text Processing",
    5: "User Input",
    6: "Decision Structures (if/else)",
    7: "Logic & Multiple Conditions",
    8: "While Loops",
    9: "For Loops",
    10: "Methods",
    11: "Returning Values",
    12: "Array Architectures",
    13: "Lists & Collections",
    14: "Program Integration",
    15: "Final Project"
  };
  return titles[weekNum] || `Week ${weekNum}`;
}

// Main build function
async function buildCourseContext() {
  console.log('📚 Building course context for AI tutor...\n');
  
  const mdxFiles = findMDXFiles(PAGES_DIR);
  console.log(`Found ${mdxFiles.length} content files\n`);
  
  const pages = [];
  for (const { fullPath, relativePath } of mdxFiles) {
    try {
      const pageData = processFile(fullPath, relativePath);
      if (pageData.title || pageData.summary) {
        pages.push(pageData);
        console.log(`  ✓ ${relativePath}`);
      }
    } catch (err) {
      console.log(`  ✗ ${relativePath}: ${err.message}`);
    }
  }
  
  const { weeks, other } = organizeByWeek(pages);
  
  // Build the final context object
  const courseContext = {
    generatedAt: new Date().toISOString(),
    courseInfo: {
      code: "CIS 118M",
      title: "Introduction to C# Programming",
      term: "Spring 2026",
      totalWeeks: 15
    },
    weeks: Object.values(weeks).sort((a, b) => a.week - b.week),
    otherPages: other
  };
  
  // Write to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(courseContext, null, 2));
  
  console.log(`\n✅ Course context written to: ${OUTPUT_FILE}`);
  console.log(`   Total weeks: ${Object.keys(weeks).length}`);
  console.log(`   Total sections: ${pages.length}`);
  
  // Also generate a compact summary for the AI
  const compactSummary = generateCompactSummary(courseContext);
  const SUMMARY_FILE = path.join(__dirname, '../netlify/functions/_lib/course-summary.txt');
  fs.writeFileSync(SUMMARY_FILE, compactSummary);
  console.log(`   Compact summary: ${SUMMARY_FILE}`);
}

function generateCompactSummary(courseContext) {
  let summary = `# CIS 118M Course Content Summary\n\n`;
  
  for (const week of courseContext.weeks) {
    summary += `## Week ${week.week}: ${week.title}\n`;
    
    for (const section of week.sections) {
      const sectionType = getSectionType(section.path);
      summary += `\n### ${sectionType}: ${section.title || 'Untitled'}\n`;
      
      if (section.keyConcepts.length > 0) {
        summary += `Key Concepts:\n`;
        section.keyConcepts.forEach(c => {
          summary += `- ${c}\n`;
        });
      }
      
      if (section.summary) {
        summary += `\nSummary: ${section.summary.slice(0, 300)}...\n`;
      }
      
      if (section.codeExamples.length > 0) {
        summary += `\nCode Example:\n\`\`\`csharp\n${section.codeExamples[0]}\n\`\`\`\n`;
      }
    }
    summary += '\n---\n\n';
  }
  
  return summary;
}

function getSectionType(path) {
  if (path.includes('lab')) return '🔬 Lab';
  if (path.includes('homework')) return '📝 Homework';
  if (path.includes('quiz') || path.includes('assessment')) return '📋 Quiz';
  if (path.includes('lesson') || path.includes('2-1') || path.includes('2-2') || path.includes('2-3') || path.includes('2-4')) return '📖 Lesson';
  if (path.includes('index')) return '📚 Overview';
  return '📄 Page';
}

buildCourseContext().catch(console.error);
