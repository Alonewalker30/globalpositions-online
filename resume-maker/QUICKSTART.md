# Quick Start Guide

## 1️⃣ Setup (One-time)

```bash
cd resume-maker
npm install
export DEEPSEEK_API_KEY="sk-6dceb1356e2542f6b2b2c85722505834"
```

## 2️⃣ Run the Tool

```bash
npm start
```

Or directly:
```bash
node resume-maker.mjs
```

## 3️⃣ Follow the Interactive Steps

The tool will ask for:

1. **Your Name** → "John Doe"
2. **Target Job** → "Senior Software Engineer"
3. **Your Background** → Paste your experience, skills, education
4. **Job Description** → Paste the job posting
5. **Custom Instructions** → Any special requests

## 4️⃣ Get Your Resume

The AI generates a tailored resume in **Markdown** format.

- View it on screen
- Edit if needed
- Convert to PDF (see next section)

## 5️⃣ Convert to PDF (Optional)

### Option A: Use an Online Tool
- Copy the markdown text
- Paste into [Markdown to PDF converter](https://markdowntopdf.com)
- Download PDF

### Option B: Use Pandoc (CLI)
```bash
# Install pandoc first
brew install pandoc

# Convert
pandoc generated-resumes/your_resume.md -o your_resume.pdf
```

### Option C: Use Google Docs
- Create new Google Doc
- Paste markdown as plain text
- Format manually (takes 2-3 minutes)

## Examples

### What to Include in "Your Background"

```
Senior Software Engineer with 8 years of experience.

Experience:
- Tech Lead at TechCorp (2020-2024): Led 8-engineer team, built AI chatbot platform handling 2M messages/month, reduced latency by 40%
- Senior Engineer at StartupXYZ (2018-2020): Full-stack developer, architected microservices for 3M+ users, mentored 3 junior devs
- Software Engineer at BigCo (2016-2018): Backend engineer, Python/Node.js, AWS, database optimization

Skills:
Python, JavaScript, React, Node.js, AWS, Docker, Kubernetes, PostgreSQL, MongoDB, Leadership, System Design

Projects:
- AI Resume Generator: Built with DeepSeek API, 500+ users in first month
- Microservices Migration: Reduced deployment time from 4h to 15min

Education:
B.S. Computer Science, State University, 2016
Certifications: AWS Solutions Architect, Kubernetes CKA
```

### What to Include in "Custom Instructions"

```
- Emphasize AI/ML and system design experience
- Use concrete metrics and scale (millions of users, millions of dollars)
- Highlight leadership and mentoring
- Use professional but approachable tone
- Focus on impact, not tasks
- Include 3-5 key achievements
```

## Tips for Best Results

✅ **Be Specific** - More detail = better AI output  
✅ **Use Numbers** - Revenue, users, scale, performance gains  
✅ **Show Impact** - What problems did you solve?  
✅ **Match Keywords** - Use words from the job posting  
✅ **Iterate** - Generate multiple versions with different instructions  

## Troubleshooting

| Problem | Solution |
|---------|----------|
| API Key Error | Check `export DEEPSEEK_API_KEY="..."` is set |
| Blank Resume | Add more detail to your background |
| Bad Formatting | Reword instructions, try again |
| Connection Error | Check internet connection |

## Output Location

All resumes are saved to:
```
resume-maker/
├── generated-resumes/      ← Your markdown resumes
├── metadata/               ← Input logs for each resume
└── node_modules/
```

## Need Help?

1. Check README.md for full documentation
2. Edit `resume-maker.mjs` to customize the prompt
3. Try different instructions
4. Generate multiple versions and pick the best

---

**Ready? Run: `npm start`** 🚀
