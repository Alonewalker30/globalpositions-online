#!/usr/bin/env node

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
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
  const prompt = `You are an expert resume writer. Generate a professional, ATS-optimized resume.

CLIENT INFORMATION:
${clientInfo}

JOB DESCRIPTION:
${jobDescription}

CUSTOM INSTRUCTIONS:
${instructions}

REQUIREMENTS:
- Professional, ATS-friendly format
- Quantify achievements with metrics
- Match job description keywords
- 1-2 pages max
- Bullet points for clarity
- Include: Summary, Experience, Skills, Education, Projects

Generate in Markdown:`;

  return await callDeepSeek(prompt);
}

// Batch process multiple job descriptions
async function batchGenerate(inputFile, clientInfo) {
  try {
    const content = await fs.readFile(inputFile, 'utf8');
    const jobs = JSON.parse(content);

    console.log(chalk.cyan(`\n📦 Processing ${jobs.length} job descriptions...\n`));

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const { title, description, instructions } = job;

      console.log(chalk.yellow(`[${i + 1}/${jobs.length}] ${title}...`));

      try {
        const resume = await generateResume(clientInfo, description, instructions);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `${title.replace(/\s+/g, '-')}_${timestamp}`;
        const mdFile = path.join(outputDir, `${filename}.md`);
        const metaFile = path.join(metadataDir, `${filename}.json`);

        await fs.writeFile(mdFile, resume, 'utf8');

        const metadata = {
          jobTitle: title,
          generatedAt: new Date().toISOString(),
          jobDescription: description,
          instructions,
          outputFile: mdFile,
        };
        await fs.writeFile(metaFile, JSON.stringify(metadata, null, 2), 'utf8');

        console.log(chalk.green(`   ✅ Saved to ${mdFile}\n`));
      } catch (error) {
        console.log(chalk.red(`   ❌ Failed: ${error.message}\n`));
      }

      // Rate limiting to avoid API abuse
      if (i < jobs.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(chalk.bold.green('\n✨ Batch processing complete!\n'));
  } catch (error) {
    console.error(chalk.red('Batch error:'), error.message);
  }
}

// Main
async function main() {
  await ensureDirs();

  const args = process.argv.slice(2);

  if (args[0] === 'batch' && args[1]) {
    const inputFile = args[1];
    const clientFile = args[2];

    if (!clientFile) {
      console.error(chalk.red('Usage: node batch.mjs batch <jobs.json> <client.txt>'));
      process.exit(1);
    }

    try {
      const clientInfo = await fs.readFile(clientFile, 'utf8');
      await batchGenerate(inputFile, clientInfo);
    } catch (error) {
      console.error(chalk.red('Error reading files:'), error.message);
      process.exit(1);
    }
  } else {
    console.log(chalk.cyan('Batch Resume Generator\n'));
    console.log(chalk.gray('Usage:'));
    console.log(chalk.gray('  node batch.mjs batch <jobs.json> <client.txt>\n'));

    console.log(chalk.gray('Example jobs.json:'));
    console.log(chalk.gray(`[
  {
    "title": "Senior Backend Engineer",
    "description": "We're looking for... [JD here]",
    "instructions": "Emphasize backend and scaling"
  },
  {
    "title": "AI Engineer",
    "description": "Join our AI team... [JD here]",
    "instructions": "Highlight AI/ML experience"
  }
]\n`));

    console.log(chalk.gray('Example client.txt:'));
    console.log(chalk.gray(`John Doe, 8 years of experience...
Skills: Python, Go, AWS...
[Full background here]`));
  }
}

main();
