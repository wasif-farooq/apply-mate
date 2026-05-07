import requests
from bs4 import BeautifulSoup
import re
from src.logger import logger


def fetch_linkedin_post(url: str) -> dict:
    logger.debug(f"[LinkedIn] Fetching URL: {url}")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    }

    logger.debug(f"[LinkedIn] Request headers: User-Agent set")
    response = requests.get(url, headers=headers, timeout=30, allow_redirects=True)
    logger.debug(f"[LinkedIn] Response status: {response.status_code} | Content length: {len(response.text)} chars")
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    # Remove ALL comment-related containers to prevent email extraction from comments
    comment_selectors = [
        "feed-shared-update-v2__comments-container",
        "feed-shared-update-v2__comments",
        "comments-comments-list",
        "social-details-social-activity",
        "comments-list",
        "feed-shared-update-v2__comment-list"
    ]
    removed_count = 0
    for cls in comment_selectors:
        for elem in soup.find_all("div", class_=cls):
            elem.decompose()
            removed_count += 1
    if removed_count > 0:
        logger.debug(f"[LinkedIn] Removed {removed_count} comment container(s)")

    # Also remove any element with "comment" in class that looks like a container
    for elem in soup.find_all(class_=lambda x: x and "comment" in x.lower()):
        if elem.name in ["div", "section", "ul"]:
            elem.decompose()
            removed_count += 1
    if removed_count > 0:
        logger.debug(f"[LinkedIn] Total comment elements removed: {removed_count}")

    post_data = {
        "url": url,
        "title": "",
        "company": "",
        "location": "",
        "description": "",
        "raw_html": response.text,
    }

    # Try to find job-specific elements first (jobs board)
    title_selectors = [
        ("h1", {"class": "job-title"}),
        ("div", {"data-test-id": "job-title"}),
        ("span", {"class": "job-details-job-title-text"}),
        ("h1", {"class": "t-24"}),
        ("div", {"class": "jobs-unified-top-card__job-title"}),
    ]

    for tag, attrs in title_selectors:
        title_elem = soup.find(tag, attrs)
        if title_elem:
            post_data["title"] = title_elem.get_text(strip=True)
            logger.debug(f"[LinkedIn] Found title (job): {post_data['title']}")
            break

    # Try multiple selectors for company
    company_selectors = [
        ("a", {"data-test-id": "about-company"}),
        ("span", {"class": "company-name"}),
        ("a", {"class": "company-details-link"}),
        ("span", {"class": "jobs-company-name"}),
        ("a", {"class": "jobs-unified-top-card__company-name"}),
    ]

    for tag, attrs in company_selectors:
        company_elem = soup.find(tag, attrs)
        if company_elem:
            post_data["company"] = company_elem.get_text(strip=True)
            logger.debug(f"[LinkedIn] Found company: {post_data['company']}")
            break

    # Try multiple selectors for location
    loc_selectors = [
        ("span", {"class": "location"}),
        ("span", {"data-test-id": "job-location"}),
        ("span", {"class": "jobs-compact-details-item__text"}),
        ("span", {"class": "jobs-unified-top-card__location"}),
    ]

    for tag, attrs in loc_selectors:
        loc_elem = soup.find(tag, attrs)
        if loc_elem:
            post_data["location"] = loc_elem.get_text(strip=True)
            logger.debug(f"[LinkedIn] Found location: {post_data['location']}")
            break

    # Try job description
    desc_selectors = [
        ("div", {"class": "job-details-skill-match-status"}),
        ("div", {"class": "description"}),
        ("div", {"data-test-id": "job-details-description"}),
        ("div", {"class": "jobs-description-content"}),
        ("div", {"class": "jobs-description__content"}),
    ]

    for tag, attrs in desc_selectors:
        desc_elem = soup.find(tag, attrs)
        if desc_elem:
            text = desc_elem.get_text(strip=True)
            if text and len(text) > 50:
                post_data["description"] = text
                logger.debug(f"[LinkedIn] Found description: {text[:100]}...")
                break

    # If no job details found, try to extract from generic LinkedIn post/feed content
    if not post_data["title"] or not post_data["description"]:
        logger.debug("[LinkedIn] No job-specific elements found, trying generic post content")

        # Look for article or post content
        article = soup.find("article")
        if article:
            # IMPROVEMENT: Get ALL text from article - collect all paragraphs
            all_text_parts = []
            for elem in article.find_all(["p", "span", "li", "div"]):
                text = elem.get_text(strip=True)
                if text and len(text) > 20:  # Lower threshold from 100 to 20
                    all_text_parts.append(text)

            # Combine all text parts
            if all_text_parts:
                full_text = "\n".join(all_text_parts)
                post_data["description"] = full_text
                logger.debug(f"[LinkedIn] Full article text: {len(full_text)} chars")

            # Extract job-related information from lines
            lines = full_text.split("\n") if full_text else []

            # Skip author name as title - look for actual job titles
            job_keywords = ["hiring", "looking for", "job", "position", "role", "opening", 
                            "developer", "engineer", "manager", "specialist", "analyst", 
                            "coordinator", "lead", "associate", "executive", "architect", "designer"]
            
            if not post_data["title"]:
                for line in lines:
                    line_stripped = line.strip()
                    line_lower = line_stripped.lower()
                    
                    # Skip if: too short, has time units, has UI text, looks like author name
                    if len(line_stripped) < 15:
                        continue
                    if any(t in line_lower for t in ["hour", "minute", "day", "week", "month", "yesterday", "ago"]):
                        continue
                    if any(ui in line_lower for ui in ["report", "like", "comment", "share", "follow", "promoted"]):
                        continue
                    # Skip if it's just a name (capitalized words, no job keywords)
                    if len(line_stripped.split()) <= 3 and not any(kw in line_lower for kw in job_keywords):
                        continue
                    
                    # Use line if it has job keywords or looks like a proper title
                    if any(kw in line_lower for kw in job_keywords) or (line_stripped[0].isupper() and len(line_stripped) > 20):
                        post_data["title"] = line_stripped[:100]
                        logger.debug(f"[LinkedIn] Found title from article: {post_data['title']}")
                        break

            # Look for company mentions (often in "@company" format)
            if not post_data["company"]:
                for line in lines:
                    if "@" in line:
                        match = re.search(r'@(\w+)', line)
                        if match:
                            post_data["company"] = match.group(1)
                            logger.debug(f"[LinkedIn] Found company from @ mention: {post_data['company']}")
                            break
            
            # Look for company names in hiring context
            if not post_data["company"]:
                for line in lines:
                    line_lower = line.lower()
                    if "hiring" in line_lower or "looking for" in line_lower or "join" in line_lower:
                        # Try to extract company name after these keywords
                        match = re.search(r'(?:hiring|looking for|join|at)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)', line)
                        if match:
                            post_data["company"] = match.group(1).strip()
                            logger.debug(f"[LinkedIn] Found company from pattern: {post_data['company']}")
                            break

    # Fallback: look for any content that might have job info
    if not post_data["description"]:
        for tag in soup.find_all(["div", "span", "p"]):
            text = tag.get_text(strip=True)
            if text and 50 < len(text) < 5000:  # Lower from 100 to 50
                keywords = ["job", "position", "apply", "hiring", "role", "requirements", "experience", "skills", "salary", "remote", "developer", "engineer"]
                if any(kw in text.lower() for kw in keywords):
                    post_data["description"] = text
                    logger.debug(f"[LinkedIn] Fallback description found: {text[:100]}...")
                    break

    # Note: Email extraction is now handled by AI in generate_email_content()
    # to ensure email is extracted only from description, not comments

    logger.debug(f"[LinkedIn] Parsed data - Title: '{post_data['title']}', Company: '{post_data['company']}', Location: '{post_data['location']}', Description: '{post_data['description'][:100]}...'")

    return post_data