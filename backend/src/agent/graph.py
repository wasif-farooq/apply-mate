from langgraph.graph import StateGraph, END
from langgraph.graph import START
import json
from src.agent.state import AgentState, create_initial_state
from src.agent.tools import get_tools
from src.logger import logger
import config
import re


def fetch_linkedin_node(state: AgentState) -> AgentState:
    """Node: Fetch LinkedIn post."""
    from src.agent.tools import fetch_linkedin_tool

    logger.info("[Node] Fetching LinkedIn post...")
    state["status"] = "fetching"

    try:
        result = fetch_linkedin_tool.invoke({"url": state["linkedin_url"]})
        data = json.loads(result)

        if "error" in data:
            state["error"] = data["error"]
            state["status"] = "failed"
            return state

        state["title"] = data.get("title", "")
        state["company"] = data.get("company", "")
        state["location"] = data.get("location", "")
        state["description"] = data.get("description", "")
        raw_html = data.get("raw_html", "")

        logger.info(f"[Node] Title: '{state['title']}'")
        logger.info(f"[Node] Company: '{state['company']}'")
        logger.info(f"[Node] Location: '{state['location']}'")
        logger.info(f"[Node] Description length: {len(state['description'])} chars")

        if state["description"]:
            logger.info(f"[Node] Description preview: {state['description'][:200]}")

        # Option 1: Search email in description first
        import re
        email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', state["description"])
        if email_match:
            logger.info(f"[Node] Found email in description: {email_match.group()}")
            state["email"] = email_match.group()

        # Option 1: Also search in raw HTML (if not found in description)
        if not state.get("email") and raw_html:
            logger.debug("[Node] Searching email in raw HTML...")
            html_email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', raw_html)
            if html_email_match:
                logger.info(f"[Node] Found email in raw HTML: {html_email_match.group()}")
                state["email"] = html_email_match.group()

        state["status"] = "fetched"
        state["message"] = f"✅ Fetched: {state['title']} @ {state['company']}"
        logger.info(f"[Node] Fetched: {state['title']} @ {state['company']}")

    except Exception as e:
        state["error"] = str(e)
        state["status"] = "failed"
        logger.error(f"[Node] Fetch failed: {e}")

    return state


def extract_email_node(state: AgentState) -> AgentState:
    """Node: Extract email from post."""
    from src.agent.tools import extract_email_tool

    logger.info("[Node] Extracting email...")
    state["status"] = "extracting"

    logger.debug(f"[Node] Title: '{state['title']}', Company: '{state['company']}'")
    logger.debug(f"[Node] Description length: {len(state['description'])} chars")

    # First, try direct regex on description (faster)
    import re
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    direct_match = re.search(email_pattern, state['description'])
    if direct_match:
        state["email"] = direct_match.group()
        state["message"] = f"📧 Extracted email: {state['email']}"
        logger.info(f"[Node] Direct email found: {state['email']}")
        return state

    # Try tool-based extraction
    try:
        text_to_search = f"{state['title']} {state['company']} {state['description']}"
        logger.debug(f"[Node] Text to search length: {len(text_to_search)} chars")

        result = extract_email_tool.invoke({"text": text_to_search})
        data = json.loads(result)

        if data.get("email"):
            state["email"] = data["email"]
            state["message"] = f"📧 Extracted email: {state['email']}"
            logger.info(f"[Node] Extracted via tool: {state['email']}")
        else:
            state["email"] = ""
            state["message"] = "⚠️ No email found in post. Will prompt user."
            logger.info("[Node] No email found - will ask user")

    except Exception as e:
        state["error"] = str(e)
        logger.error(f"[Node] Email extraction failed: {e}")
        state["email"] = ""

    return state


def generate_email_node(state: AgentState) -> AgentState:
    """Node: Generate email with AI."""
    from src.agent.tools import generate_email_ai_tool

    logger.info("[Node] Generating email with AI...")
    state["status"] = "generating"

    try:
        resume_info = f"[Resume attached: {state['resume_path']}]"

        result = generate_email_ai_tool.invoke({
            "job_title": state["title"],
            "company": state["company"],
            "location": state["location"],
            "description": state["description"],
            "candidate_name": config.GMAIL_SENDER_NAME,
            "resume_info": resume_info
        })

        data = json.loads(result)

        if "error" in data:
            state["error"] = data["error"]
            state["status"] = "failed"
            return state

        state["subject"] = data.get("subject", "")
        state["body"] = data.get("body", "")
        state["status"] = "generated"
        state["message"] = f"✅ Generated email: {state['subject'][:40]}..."
        logger.info(f"[Node] Generated subject: {state['subject']}")

    except Exception as e:
        state["error"] = str(e)
        logger.error(f"[Node] Email generation failed: {e}")

    return state


def validate_email_node(state: AgentState) -> AgentState:
    """Node: Validate email quality."""
    from src.agent.tools import validate_email_quality_tool

    logger.info("[Node] Validating email quality...")

    try:
        result = validate_email_quality_tool.invoke({
            "subject": state["subject"],
            "body": state["body"]
        })

        data = json.loads(result)
        quality = data.get("quality", "unknown")

        if quality == "good":
            state["message"] = state.get("message", "") + " | Quality: Good ✅"
            logger.info("[Node] Email quality: GOOD")
        else:
            issues = data.get("issues", [])
            state["message"] = f"⚠️ Quality issues: {issues}"
            logger.info(f"[Node] Quality issues: {issues}")

    except Exception as e:
        logger.warning(f"[Node] Validation failed: {e}")

    return state


def should_retry(state: AgentState) -> str:
    """Router: Decide if we should retry email generation."""
    if state.get("retry_count", 0) < state.get("max_retries", 3):
        return "retry"
    return "continue"


def request_approval_node(state: AgentState) -> AgentState:
    """Node: Request user approval."""
    import re

    logger.info("[Node] Requesting user approval...")

    state["needs_approval"] = True

    # If no email found, leave it empty - user must provide via --to
    if not state.get("email"):
        logger.info("[Node] No email found - user must provide via --to option")
        state["email"] = ""

    state["message"] = f"""
📧 Preview Email:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To: {state.get('email', 'NOT_SET')}
Subject: {state['subject']}

{state['body']}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
    return state


def send_email_node(state: AgentState) -> AgentState:
    """Node: Send email via Gmail."""
    from src.agent.tools import send_gmail_tool

    logger.info("[Node] Sending email...")
    state["status"] = "sending"

    try:
        result = send_gmail_tool.invoke({
            "to_email": state["email"],
            "subject": state["subject"],
            "body": state["body"],
            "resume_path": state["resume_path"]
        })

        data = json.loads(result)

        if "error" in data:
            state["error"] = data["error"]
            state["status"] = "failed"
            state["message"] = f"❌ Failed: {data['error']}"
        else:
            state["status"] = "sent"
            state["message"] = "✅ Email sent successfully!"
            logger.info("[Node] Email sent!")

    except Exception as e:
        state["error"] = str(e)
        state["status"] = "failed"
        logger.error(f"[Node] Send failed: {e}")

    return state


def create_job_agent_graph():
    """Create the LangGraph workflow."""

    graph = StateGraph(AgentState)

    graph.add_node("fetch", fetch_linkedin_node)
    graph.add_node("extract_email", extract_email_node)
    graph.add_node("generate_email", generate_email_node)
    graph.add_node("validate", validate_email_node)
    graph.add_node("approval", request_approval_node)
    graph.add_node("send", send_email_node)

    graph.add_edge(START, "fetch")
    graph.add_edge("fetch", "extract_email")
    graph.add_edge("extract_email", "generate_email")
    graph.add_edge("generate_email", "validate")
    graph.add_edge("validate", "approval")
    graph.add_edge("approval", "send")
    graph.add_edge("send", END)

    return graph.compile()


def run_agent(linkedin_url: str, resume_path: str = "./resume.pdf", user_approval: str = ""):
    """Run the agent."""

    logger.info(f"[Agent] Starting for: {linkedin_url}")

    initial_state = create_initial_state(linkedin_url, resume_path)

    graph = create_job_agent_graph()

    result = graph.invoke(initial_state)

    logger.info(f"[Agent] Final state: {result.get('status')} | Message: {result.get('message')}")

    return result