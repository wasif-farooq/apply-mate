# ApplyMate

AI-powered job application assistant that automates applying to jobs via LinkedIn posts.

> Your friendly AI assistant for automating job applications!

## Features

- 🤖 **AI Agent** - Uses LangGraph for intelligent workflow orchestration
- 📥 **LinkedIn Fetcher** - Extracts job details from LinkedIn post URLs
- 📧 **Auto Email Detection** - Finds email addresses in LinkedIn posts
- ✍️ **AI Email Generation** - Generates personalized subject and body using Ollama (local LLM)
- 📎 **Resume Attachment** - Automatically attaches your resume PDF
- 📤 **Gmail Integration** - Sends emails via Gmail App Password
- 🧪 **Dry-Run Mode** - Test without sending actual emails

## Prerequisites

- Python 3.10+
- [Ollama](https://ollama.ai/) installed and running locally
- Gmail account with App Password configured
- Resume PDF file

## Setup

### 1. Clone and Setup Virtual Environment

```bash
cd job-applier
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
RESUME_PATH=./resume.pdf
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma4:e2b
GMAIL_SENDER_NAME=Your Name
GMAIL_EMAIL=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

### 3. Setup Gmail App Password

1. Enable 2-Factor Authentication on your Gmail
2. Go to: https://myaccount.google.com/apppasswords
3. Generate app password for "Mail"
4. Add to `.env` as `GMAIL_APP_PASSWORD`

### 4. Ensure Ollama is Running

```bash
ollama serve
# Or run in background
ollama run gemma4:e2b
```

## Usage

### Basic Apply (with approval)

```bash
python main.py apply "LINKEDIN_POST_URL" --resume ./resume.pdf
```

### Auto-send (no approval prompt)

```bash
python main.py apply "LINKEDIN_POST_URL" --resume ./resume.pdf --auto
```

### Dry-run (test without sending)

```bash
python main.py apply "LINKEDIN_POST_URL" --resume ./resume.pdf --auto --dry-run
```

### With manual email (if not in post)

```bash
python main.py apply "LINKEDIN_POST_URL" --resume ./resume.pdf --to hr@company.com --auto
```

### Interactive Mode

```bash
python main.py interactive
```

### Setup Command

```bash
python main.py setup
```

## Options

| Option | Description |
|--------|-------------|
| `--resume PATH` | Path to resume PDF (default: ./resume.pdf) |
| `--to EMAIL` | Recipient email (auto-detected if in post) |
| `--auto` | Auto-send without approval |
| `--dry-run` | Test without sending email |

## Project Structure

```
job-applier/
├── main.py              # CLI entry point
├── config.py            # Configuration
├── .env                 # Environment variables (gitignored)
├── .env.example         # Environment template
├── .gitignore           # Git ignore rules
├── requirements.txt     # Python dependencies
├── resume.pdf           # Your resume (gitignored)
├── logs/                # Log files (gitignored)
├── venv/                # Virtual environment (gitignored)
└── src/
    ├── linkedin_fetcher.py   # Fetch & parse LinkedIn posts
    ├── email_extractor.py    # Extract email regex
    ├── resume_handler.py     # Load resume PDF
    ├── gmail_sender.py       # Gmail SMTP sending
    ├── ai_generator.py       # Ollama AI integration
    ├── logger.py             # Logging configuration
    └── agent/
        ├── state.py          # Agent state definition
        ├── tools.py          # LangGraph tools
        └── graph.py          # Agent workflow graph
```

## Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `RESUME_PATH` | Path to resume PDF | `./resume.pdf` |
| `OLLAMA_BASE_URL` | Ollama server URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | Ollama model to use | `gemma4:e2b` |
| `GMAIL_SENDER_NAME` | Your name for email signature | - |
| `GMAIL_EMAIL` | Your Gmail address | - |
| `GMAIL_APP_PASSWORD` | Gmail app password | - |

## Agent Workflow

```
1. Fetch LinkedIn post → Extract title, company, description
2. Extract email from post (or use --to flag)
3. Generate subject & body using AI (Ollama)
4. Validate email quality
5. Show preview (or auto-send with --auto)
6. Send email via Gmail
```

## Logs

Logs are stored in `logs/job-applier-YYYY-MM-DD.log`

Enable debug logging by setting in `.env`:
```
LOG_LEVEL=DEBUG
```

## Troubleshooting

### Ollama not running
```bash
ollama serve
```

### Gmail authentication failed
- Make sure 2FA is enabled on Gmail
- Generate App Password: https://myaccount.google.com/apppasswords

### Email not found in LinkedIn post
- Use `--to hr@company.com` to manually specify recipient

## License

MIT