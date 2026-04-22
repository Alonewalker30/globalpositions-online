#!/usr/bin/env node

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import chalk from 'chalk';

const API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-6dceb1356e2542f6b2b2c85722505834';
const API_URL = 'https://api.deepseek.com/v1/chat/completions';

const outputDir = './generated-resumes';
const metadataDir = './metadata';

// Ensure output directories exist
async function ensureDirs() {
  try {
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(metadataDir, { recursive: true });
  } catch (err) {
    console.error('Error creating directories:', err.message);
  }
}

// Read multi-line input from stdin
function readInput(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(chalk.cyan(prompt));
    console.log(chalk.gray('(Press Ctrl+D when done, or type END on a new line)\n'));

    let input = '';
    rl.on('line', (line) => {
      if (line === 'END') {
        rl.close();
      } else {
        input += line + '\n';
      }
    });

    rl.on('close', () => {
      resolve(input.trim());
    });
  });
}

// Call DeepSeek API
async function callDeepSeek(prompt) {
  try {
    const response = await axios.post(
      API_URL,
      {
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4000,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error(chalk.red('❌ DeepSeek API Error:'));
    if (error.response?.data) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
    throw error;
  }
}

// Generate resume using DeepSeek
async function generateResume(clientInfo, jobDescription, instructions) {
  console.log(chalk.blue('\n🚀 Generating resume with DeepSeek...\n'));

  const prompt = `You are an expert resume writer. Generate a professional, ATS-optimized resume based on the following information.

CLIENT INFORMATION:
${clientInfo}

JOB DESCRIPTION:
${jobDescription}

CUSTOM INSTRUCTIONS:
${instructions}

RESUME REQUIREMENTS:
- Use professional tone
- Quantify achievements where possible
- Highlight skills that match the job description
- Keep it concise (1-2 pages)
- Use bullet points for experience and achievements
- Include: Summary, Professional Experience, Skills, Education, Projects (if relevant)
- Tailor content to the job description
- Make it ATS-friendly (standard formatting, no tables)

Generate a complete resume in Markdown format:`;

  const resume = await callDeepSeek(prompt);
  return resume;
}

// Save resume and metadata
async function saveResume(clientName, jobTitle, resume, clientInfo, jobDescription, instructions) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `${clientName.replace(/\s+/g, '-')}_${jobTitle.replace(/\s+/g, '-')}_${timestamp}`;
  const mdFile = path.join(outputDir, `${filename}.md`);
  const metaFile = path.join(metadataDir, `${filename}.json`);

  // Save markdown resume
  await fs.writeFile(mdFile, resume, 'utf8');
  console.log(chalk.green(`✅ Resume saved: ${mdFile}`));

  // Save metadata for future reference
  const metadata = {
    clientName,
    jobTitle,
    generatedAt: new Date().toISOString(),
    clientInfo,
    jobDescription,
    instructions,
    outputFile: mdFile,
  };
  await fs.writeFile(metaFile, JSON.stringify(metadata, null, 2), 'utf8');
  console.log(chalk.green(`✅ Metadata saved: ${metaFile}`));

  return { mdFile, metaFile };
}

// Interactive mode
async function interactiveMode() {
  console.log(chalk.bold.cyan('\n📄 Intelligent Resume Maker\n'));
  console.log(chalk.gray('This tool generates tailored resumes using DeepSeek AI.\n'));

  // Step 1: Client Info
  const clientName = await new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(chalk.cyan('📝 Client Name: '), (answer) => {
      rl.close();
      resolve(answer);
    });
  });

  // Step 2: Job Title
  const jobTitle = await new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(chalk.cyan('💼 Target Job Title: '), (answer) => {
      rl.close();
      resolve(answer);
    });
  });

  // Step 3: Client Information
  console.log(chalk.cyan('\n📋 Client Information'));
  const clientInfo = await readInput(
    'Paste or describe your background, experience, skills, education, projects, etc.'
  );

  // Step 4: Job Description
  console.log(chalk.cyan('\n📌 Job Description'));
  const jobDescription = await readInput('Paste the job description from the posting');

  // Step 5: Custom Instructions
  console.log(chalk.cyan('\n🎯 Custom Instructions'));
  const instructions = await readInput(
    'Any specific instructions? (e.g., "Emphasize leadership", "Highlight AI/ML", "Use simple language")'
  );

  // Generate
  const resume = await generateResume(clientInfo, jobDescription, instructions);

  // Display generated resume
  console.log(chalk.bold.green('\n✨ Generated Resume:\n'));
  console.log(chalk.gray('─'.repeat(60)));
  console.log(resume);
  console.log(chalk.gray('─'.repeat(60)));

  // Save
  const { mdFile } = await saveResume(clientName, jobTitle, resume, clientInfo, jobDescription, instructions);

  console.log(
    chalk.green(`\n✅ Resume generated and saved!\n📂 Location: ${mdFile}`)
  );
  console.log(chalk.cyan('\nYou can now:'));
  console.log(chalk.gray('  1. Edit the resume as needed'));
  console.log(chalk.gray('  2. Convert to PDF using a markdown-to-PDF tool'));
  console.log(chalk.gray('  3. Copy-paste into job application forms'));
}

// Main
async function main() {
  await ensureDirs();

  try {
    await interactiveMode();
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

main();
