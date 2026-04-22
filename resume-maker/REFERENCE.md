# 📋 Resume Maker - Quick Reference Card

## 🚀 Start Here

```bash
# 1. Navigate to project
cd /Users/saisanjaygogineni/Documents/Capstone\ /resume-ai-builder/resume-maker

# 2. Set API key (one-time)
export DEEPSEEK_API_KEY="sk-6dceb1356e2542f6b2b2c85722505834"

# 3. Generate your first resume
npm start
```

## 🎯 Commands

| Command | What it does |
|---------|------------|
| `npm start` | Generate single resume (interactive) |
| `npm run generate` | Same as above |
| `node batch.mjs batch jobs.json client.txt` | Generate 5+ resumes from file |
| `node batch.mjs batch sample-jobs.json sample-client.txt` | Test batch with samples |

## 📥 Input: What to Paste

### When Running `npm start`

**Prompt 1: Your Name**
```
John Doe
```

**Prompt 2: Target Job Title**
```
Senior Backend Engineer
```

**Prompt 3: Your Background**
```
8 years of software engineering experience.

Experience:
- Tech Lead at TechCorp (2021-2024): Led team of 5, built AI platform handling 2M+ users
- Senior Engineer at Startup (2018-2021): Built microservices for 500+ customers
- Engineer at BigCo (2016-2018): Database optimization, 40% latency improvement

Skills: Python, Go, Kubernetes, AWS, System Design, Leadership

Education: B.S. Computer Science, 2016

Certifications: AWS Solutions Architect
```

**Prompt 4: Job Description**
```
[Paste entire job posting here]
```

**Prompt 5: Custom Instructions (Optional)**
```
- Emphasize system design and scalability
- Use formal, technical tone
- Lead with backend infrastructure experience
- Include metrics and quantified results
```

## 📤 Output: What You Get

**Location:** `generated-resumes/`

**Format:** Markdown (`.md`)

**Contents:**
- Professional summary
- Experience (quantified)
- Technical skills
- Education
- Achievements
- Projects

**Ready to:**
- ✅ Copy-paste into applications
- ✅ Convert to PDF
- ✅ Share with recruiters
- ✅ Edit further

## 🔄 Convert to PDF

```bash
# Install pandoc (one-time)
brew install pandoc

# Convert any markdown resume
pandoc generated-resumes/resume.md -o resume.pdf
```

Or use online tool: https://markdowntopdf.com

## 📊 Batch Mode

### Create `jobs.json`
```json
[
  {
    "title": "Senior Backend Engineer",
    "description": "[Full job posting]",
    "instructions": "Emphasize backend and scaling"
  },
  {
    "title": "AI Engineer",
    "description": "[Full job posting]",
    "instructions": "Lead with AI/ML, use technical tone"
  },
  {
    "title": "Staff Engineer",
    "description": "[Full job posting]",
    "instructions": "Focus on architecture and mentoring"
  }
]
```

### Create `client.txt`
```
[Your full background, experience, skills, education]
```

### Run
```bash
node batch.mjs batch jobs.json client.txt
```

### Get
- 3 separate, tailored resumes
- All in `generated-resumes/`
- Each customized for that role

## 💡 Tips for Best Output

✅ **More detail** = Better AI output
- Include numbers: users, scale, performance gains
- Explain impact: what problem did you solve?
- Add context: why did this matter?

✅ **Match job keywords** in custom instructions
- If job emphasizes "AI/ML" → mention in instructions
- If job requires "leadership" → highlight mentoring
- If job is "startup" → emphasize speed, impact

✅ **Use specific instructions**
```
WEAK: "Make it good"
STRONG: "Emphasize system design, quantify with metrics, 
         use professional technical tone, lead with architecture"
```

✅ **Generate multiple versions**
```bash
npm start  # Version A
npm start  # Version B  
npm start  # Version C
# Pick best for this role
```

## 🔧 Customize AI Prompt

Edit `resume-maker.mjs` line ~80:
```javascript
const prompt = `You are an expert resume writer...
RESUME REQUIREMENTS:
- [Change these requirements]
- [To customize output]
```

## 📁 Files

| File | Size | Purpose |
|------|------|---------|
| `resume-maker.mjs` | 6.1K | Single resume generator |
| `batch.mjs` | 4.9K | Batch processor |
| `package.json` | 491B | Dependencies |
| `START_HERE.md` | 7.4K | Getting started guide |
| `README.md` | 5.2K | Full documentation |
| `SETUP.md` | 8.4K | Detailed setup |
| `QUICKSTART.md` | 3.4K | Quick reference |
| `sample-jobs.json` | 1.7K | Test data |
| `sample-client.txt` | 2.9K | Test data |

## ⚙️ Configuration

### API Key

**Option A: Environment Variable (Current Session)**
```bash
export DEEPSEEK_API_KEY="sk-..."
npm start
```

**Option B: .env File (Persistent)**
```bash
echo "DEEPSEEK_API_KEY=sk-..." > .env
npm start
```

Your key: `sk-6dceb1356e2542f6b2b2c85722505834`

### Costs

- Single resume: **$0.01-$0.03**
- Batch of 5: **$0.05-$0.15**
- 100 resumes: **$1-$3**

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "API key not recognized" | Check: `echo $DEEPSEEK_API_KEY` |
| "Connection error" | Check internet, wait 30 sec, retry |
| "Blank resume" | Add more detail to background |
| "Poor quality" | Try different instructions, iterate |
| "Rate limited" | Wait a few seconds between requests |

## 📚 Documentation

| Document | Best for |
|----------|----------|
| `START_HERE.md` | First time? Read this |
| `QUICKSTART.md` | Quick command reference |
| `SETUP.md` | Configuration details |
| `README.md` | Full features & options |
| `EXAMPLE.js` | See sample before/after |

## 🎯 Typical Usage

### Single Resume (1 Job)
```bash
npm start
# Answer 5 questions
# Get tailored resume in 60 seconds
```

### Batch (3-5 Similar Jobs)
```bash
# Prepare jobs.json with all 3-5 jobs
node batch.mjs batch jobs.json client.txt
# Get 5 resumes, each tailored to that job
# All done in 2-3 minutes
```

### Multi-Version Testing
```bash
npm start  # Version A: leadership focus
npm start  # Version B: technical focus
npm start  # Version C: entrepreneurship focus
# Compare, pick best
```

## ✅ Workflow Checklist

- [ ] Set API key: `export DEEPSEEK_API_KEY="..."`
- [ ] Test single mode: `npm start` (with sample data)
- [ ] Convert to PDF: `pandoc resume.md -o resume.pdf`
- [ ] Try batch: `node batch.mjs batch sample-jobs.json sample-client.txt`
- [ ] Create your jobs.json
- [ ] Create your client.txt
- [ ] Generate for real jobs
- [ ] Apply with confidence!

## 🔗 Quick Links

- **API Dashboard:** https://platform.deepseek.com
- **Markdown to PDF:** https://markdowntopdf.com
- **Project Folder:** `/Users/saisanjaygogineni/Documents/Capstone /resume-ai-builder/resume-maker/`

## 💬 Questions?

1. Check `START_HERE.md` (overview)
2. Check `README.md` (features)
3. Check `SETUP.md` (configuration)
4. Edit `.mjs` files directly - they're well-commented

## 🚀 Ready?

```bash
npm start
```

---

**One-page reference for Resume Maker — DeepSeek Edition**
