# 📄 Intelligent Resume Maker - DeepSeek Edition

An intelligent CLI tool that generates tailored, ATS-optimized resumes using the DeepSeek API. Paste a job description + your background, and get a customized resume in seconds.

## Features

✅ **AI-Powered Resume Generation** - Uses DeepSeek to intelligently tailor resumes  
✅ **Interactive CLI** - Simple step-by-step process  
✅ **Job Description Analysis** - Automatically highlights relevant skills  
✅ **Custom Instructions** - Add tone, emphasis, and specific requirements  
✅ **Metadata Tracking** - Saves inputs for future reference  
✅ **ATS-Optimized** - Generates professional, searchable formats  

## Setup

### 1. Install Dependencies
```bash
cd resume-maker
npm install
```

### 2. Set Your DeepSeek API Key
```bash
export DEEPSEEK_API_KEY="sk-your-api-key-here"
```

Or create a `.env` file:
```
DEEPSEEK_API_KEY=sk-your-api-key-here
```

### 3. Run the Tool
```bash
npm start
```

Or:
```bash
node resume-maker.mjs
```

## Usage

The tool guides you through 5 steps:

1. **Client Name** - Your name
2. **Target Job Title** - The position you're applying for
3. **Client Information** - Your background, experience, skills, education, projects
4. **Job Description** - Paste the full job posting
5. **Custom Instructions** - Any specific guidance (e.g., "emphasize AI/ML", "use formal tone")

### Example Workflow

```
📄 Intelligent Resume Maker

📝 Client Name: John Doe
💼 Target Job Title: Senior Software Engineer

📋 Client Information
(Paste or describe your background, experience, skills, education, projects, etc.)

📌 Job Description
(Paste the job description from the posting)

🎯 Custom Instructions
(Any specific instructions? e.g., "Emphasize leadership", "Highlight AI/ML")

🚀 Generating resume with DeepSeek...

✨ Generated Resume:
──────────────────────────────────────────
[AI-Generated Resume in Markdown]
──────────────────────────────────────────

✅ Resume generated and saved!
📂 Location: ./generated-resumes/john-doe_senior-software-engineer_2024-01-15T10-30.md
```

## Output

Generated resumes are saved to:
- **Markdown format**: `./generated-resumes/{name}_{job}_{timestamp}.md`
- **Metadata**: `./metadata/{name}_{job}_{timestamp}.json`

### Next Steps

1. **Edit** the markdown as needed
2. **Convert to PDF** (use pandoc, markdown viewers, or paste into Google Docs)
3. **Copy to Applications** (most job forms accept plain text or PDF)

## Example Inputs

### Client Information
```
Name: Sarah Chen
Background: 
- 8 years of software engineering experience
- Expert in Python, JavaScript, React
- Led 2 technical teams (5-8 engineers each)
- Built 3 successful SaaS products
- Published 10+ technical articles

Skills: Python, JavaScript, React, Node.js, Docker, AWS, SQL, Leadership

Education: B.S. Computer Science, MIT, 2016

Projects:
- Built an AI chatbot platform (2M+ messages/month)
- Architected microservices migration (3M+ users)
```

### Job Description
```
Senior Software Engineer - AI Platform

We're looking for a Senior Software Engineer to lead our AI platform team.

Requirements:
- 5+ years of software engineering experience
- Experience with Python, ML frameworks
- System design and architecture experience
- Team leadership experience

Nice to have:
- Experience with LLMs or generative AI
- AWS expertise
- Published technical writing
```

### Custom Instructions
```
- Emphasize AI/ML experience
- Lead with leadership accomplishments
- Quantify impact in terms of scale and users
- Use professional but approachable tone
```

## Tips

- **Be specific in your info** - More detail = better tailoring
- **Include quantifiable metrics** - Use numbers (revenue, users, scale)
- **Add context** - Explain the impact, not just the task
- **Use job keywords** - The AI will pick them up and emphasize them
- **Iterate** - Generate multiple versions with different instructions if needed

## API Costs

DeepSeek is very affordable:
- ~$0.14 per 1M input tokens
- ~$0.28 per 1M output tokens
- Most resumes cost < $0.01 each

## Troubleshooting

### API Key Error
```
❌ DeepSeek API Error: Unauthorized
```
Check that your `DEEPSEEK_API_KEY` environment variable is set correctly.

### Connection Error
```
❌ DeepSeek API Error: connect ENOTFOUND
```
Check your internet connection and ensure the API URL is accessible.

### Empty Response
If the API returns an empty resume, try:
1. Check your client information is detailed
2. Ensure job description is complete
3. Add more specific instructions

## File Structure

```
resume-maker/
├── resume-maker.mjs        # Main CLI script
├── package.json            # Dependencies
├── README.md              # This file
├── .env.example           # API key template
├── generated-resumes/     # Output markdown files (gitignored)
└── metadata/              # Input metadata logs (gitignored)
```

## License

MIT - Use freely, modify as needed.

## Support

Issues? Check:
1. API key is correct
2. You have internet connection
3. Your input information is detailed enough
4. Job description is complete

---

**Built with DeepSeek AI** 🚀
