# 🚀 Resume Maker - Complete Setup Guide

Your intelligent resume builder is ready! Here's everything you need to know.

## 📁 Project Structure

```
resume-maker/
├── resume-maker.mjs         ← Interactive single resume generator
├── batch.mjs                ← Batch process multiple resumes
├── package.json             ← Dependencies
├── README.md                ← Full documentation
├── QUICKSTART.md            ← Quick start guide
├── SETUP.md                 ← This file
├── EXAMPLE.js               ← Example usage and output
├── sample-jobs.json         ← Sample batch jobs
├── sample-client.txt        ← Sample client background
├── .env.example             ← API key template
├── .gitignore               ← Git ignore rules
├── generated-resumes/       ← Your output resumes (gitignored)
├── metadata/                ← Input logs (gitignored)
└── node_modules/            ← Dependencies installed
```

## ⚙️ Initial Setup

### Step 1: One-Time Configuration

You only need to do this once:

```bash
cd resume-maker

# Option A: Set API key in terminal (current session only)
export DEEPSEEK_API_KEY="sk-6dceb1356e2542f6b2b2c85722505834"

# Option B: Create .env file (persistent, recommended)
cat > .env << EOF
DEEPSEEK_API_KEY=sk-6dceb1356e2542f6b2b2c85722505834
EOF

# Verify
echo $DEEPSEEK_API_KEY
```

### Step 2: Install Dependencies

```bash
npm install
```

✅ Already done! You have:
- `axios` - API calls
- `chalk` - Colored output
- `inquirer` - Interactive prompts
- `puppeteer` - PDF generation (optional)

## 🎯 Usage Modes

### Mode 1: Interactive Single Resume

For one job at a time:

```bash
npm start
```

Or:
```bash
node resume-maker.mjs
```

**What happens:**
1. Enter your name
2. Enter target job title
3. Paste your background (experience, skills, education)
4. Paste the job description
5. Add custom instructions (optional)
6. Get AI-generated resume on screen
7. Auto-saved to `generated-resumes/`

**Best for:** Tailoring resume to specific job posting

### Mode 2: Batch Generate Multiple Resumes

For multiple jobs at once:

```bash
# Using sample data
node batch.mjs batch sample-jobs.json sample-client.txt

# Using your own data
node batch.mjs batch your-jobs.json your-client.txt
```

**What you need:**
- `jobs.json`: Array of job objects (title, description, instructions)
- `client.txt`: Your background (name, experience, skills, etc.)

**What happens:**
1. Reads all job descriptions
2. Generates personalized resume for each
3. Saves all to `generated-resumes/`
4. Includes metadata for each

**Best for:** Applying to 3-5 similar roles in one shot

## 📋 Input Format

### Single Resume Mode - What to Paste

#### Your Background
```
8 years of software engineering experience.
Specialized in Python, Go, and system design.

Experience:
- Tech Lead at TechCorp (2021-2024)
  Led 5 engineers, built AI platform, 2M+ users
  
Skills: Python, Go, AWS, Kubernetes, Leadership

Education: B.S. Computer Science, 2016

Projects: Open source ML library (1K GitHub stars)
```

#### Job Description
```
[Paste entire job posting here]
Include title, company, responsibilities, requirements, etc.
```

#### Custom Instructions
```
- Emphasize leadership and system design
- Use formal, technical tone
- Highlight scale and metrics
- Focus on AI/ML aspects
```

### Batch Mode - File Format

#### `jobs.json`
```json
[
  {
    "title": "Senior Backend Engineer",
    "description": "[Full job description]",
    "instructions": "Emphasize backend and scaling"
  },
  {
    "title": "AI Engineer",
    "description": "[Full job description]",
    "instructions": "Highlight AI/ML experience"
  }
]
```

#### `client.txt`
```
Name: John Doe
Years of Experience: 8

Background:
[Your full background, experience, skills, education]

Key Achievements:
- Built platform for 2M+ users
- Led team of 5 engineers
- 40% performance improvement
```

## 📊 Output

All generated resumes are saved to:

```
generated-resumes/
├── john-doe_senior-backend-engineer_2024-04-20T14-30.md
├── john-doe_ai-engineer_2024-04-20T14-35.md
└── ...

metadata/
├── john-doe_senior-backend-engineer_2024-04-20T14-30.json
├── john-doe_ai-engineer_2024-04-20T14-35.json
└── ...
```

Each markdown file is ready to:
- ✅ View directly in any editor
- ✅ Convert to PDF
- ✅ Copy-paste into applications
- ✅ Share with recruiters

## 🔄 Converting to PDF

### Option 1: Online Tool (Easiest)
1. Open https://markdowntopdf.com
2. Paste markdown content
3. Download PDF

### Option 2: Pandoc (CLI)
```bash
# Install (one-time)
brew install pandoc

# Convert any markdown resume to PDF
pandoc generated-resumes/resume.md -o resume.pdf
```

### Option 3: Google Docs
1. Create new Google Doc
2. Paste markdown as plain text
3. Format (headings, bold, bullet points)
4. Download as PDF

## 💡 Tips for Best Results

### Background Information
✅ More detail = better output  
✅ Include quantifiable metrics (users, performance improvements)  
✅ Show impact, not just tasks  
✅ Mention leadership, mentoring, or special achievements  

### Job Description
✅ Copy entire posting (title, company, all requirements)  
✅ Include "Nice to have" section  
✅ Better detail = better matching  

### Custom Instructions
✅ "Emphasize X" → Focus on that topic  
✅ "Use formal/casual tone" → Sets style  
✅ "Lead with Y" → Puts that first  
✅ "Quantify achievements" → Adds numbers  
✅ Leave blank for neutral output  

### Multiple Versions
✅ Generate 2-3 versions with different instructions  
✅ Pick the one that fits best  
✅ Iterate: if one is off, adjust instructions and regenerate  

## 🚨 Troubleshooting

### Error: "Unauthorized" or "Invalid API key"
```
❌ DeepSeek API Error: Unauthorized
```
**Fix:**
1. Verify API key is correct: `echo $DEEPSEEK_API_KEY`
2. Check in `.env` file if using that method
3. Get new key from DeepSeek dashboard if needed

### Error: "Connection refused"
```
❌ DeepSeek API Error: connect ENOTFOUND
```
**Fix:**
1. Check internet connection
2. Verify API URL is accessible
3. Try again in a few seconds

### Generated Resume is Blank
**Fix:**
1. Add more detail to your background
2. Make sure job description is complete
3. Try with different instructions
4. Check API key is working

### API Rate Limit
**Problem:** Too many requests too fast  
**Fix:** Wait a few seconds between requests, or use batch mode with delays

## 📈 Advanced: Customize the AI Prompt

Edit `resume-maker.mjs` or `batch.mjs` to change how the AI generates resumes:

```javascript
// Look for this section and modify the prompt:
const prompt = `You are an expert resume writer...
RESUME REQUIREMENTS:
- Use professional tone        ← Change requirements here
- Quantify achievements
- Highlight skills
...`;
```

**Examples:**
- Add "Make it 1 page max" for shorter resumes
- Add "Focus on metrics and ROI" for finance roles
- Add "Highlight open source work" for developer roles

## 🎓 Learning More

See:
- `README.md` - Full documentation
- `QUICKSTART.md` - Quick reference
- `EXAMPLE.js` - Before/after example
- `sample-jobs.json` - Example batch input
- `sample-client.txt` - Example client background

## 📝 Common Workflows

### Workflow 1: Single Job
```bash
npm start
→ Answer questions
→ Get resume
→ Copy to application
```

### Workflow 2: Batch for Similar Roles
```bash
# Prepare jobs.json with 3-5 similar positions
node batch.mjs batch jobs.json client.txt
→ Get 3-5 tailored resumes
→ Pick best version of each
→ Apply to all
```

### Workflow 3: Multi-Version Testing
```bash
npm start  # Version 1 with Instruction Set A
npm start  # Version 2 with Instruction Set B
npm start  # Version 3 with Instruction Set C
→ Compare outputs
→ Pick best for this role
```

## 🔒 Privacy & Security

- All API calls go directly to DeepSeek
- No data is stored on any server
- Resumes saved locally to `generated-resumes/`
- API key stored in `.env` (gitignored)
- Metadata saved for reference

## ✅ Next Steps

1. **Set API key:** `export DEEPSEEK_API_KEY="..."`
2. **Try single mode:** `npm start`
3. **Try batch mode:** `node batch.mjs batch sample-jobs.json sample-client.txt`
4. **Use your data:** Create your own jobs.json and client.txt
5. **Convert to PDF** using Pandoc or online tool
6. **Apply with confidence!**

---

**Ready to generate your first resume?**

```bash
npm start
```

Good luck! 🚀
