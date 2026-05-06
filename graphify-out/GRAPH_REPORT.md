# Graph Report - job-applier  (2026-05-06)

## Corpus Check
- 26 files · ~31,596 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 182 nodes · 179 edges · 52 communities detected
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]

## God Nodes (most connected - your core abstractions)
1. `LangGraph Workflow` - 11 edges
2. `Agent Tools` - 9 edges
3. `apply_to_job()` - 8 edges
4. `auth_callback()` - 6 edges
5. `create_or_update_user()` - 6 edges
6. `get_settings()` - 5 edges
7. `send_email()` - 5 edges
8. `UserSettings` - 5 edges
9. `ProviderConfig` - 5 edges
10. `ProviderModel` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Resume Handler` --conceptually_related_to--> `LangGraph AI Agent`  [INFERRED]
  backend/src/resume_handler.py → README.md
- `Email Extractor` --conceptually_related_to--> `LangGraph AI Agent`  [INFERRED]
  backend/src/email_extractor.py → README.md
- `auth_callback()` --calls--> `exchange_code_for_tokens()`  [INFERRED]
  backend/main.py → backend/src/auth.py
- `auth_callback()` --calls--> `get_google_user_info()`  [INFERRED]
  backend/main.py → backend/src/auth.py
- `auth_callback()` --calls--> `create_or_update_user()`  [INFERRED]
  backend/main.py → backend/src/auth.py

## Hyperedges (group relationships)
- **LangGraph Workflow Nodes** — fetch_linkedin_node, extract_email_node, generate_email_node, validate_email_node, approval_node, send_email_node, stategraph_workflow [EXTRACTED 1.00]
- **Agent Tool Implementations** — fetch_linkedin_tool, extract_email_tool, generate_email_ai_tool, validate_email_tool, send_gmail_tool [EXTRACTED 1.00]
- **Database Schema Models** — user_model, provider_config_model, provider_model_db [EXTRACTED 1.00]
- **AI Provider Configuration Ecosystem** — settings_provider, ai_provider_ollama, ai_provider_openai, ai_provider_anthropic, ai_provider_google [EXTRACTED 1.00]
- **Job Application Pipeline** — step_url, step_resume, step_processing, step_preview, applytojob_function, sendemail_function, uploadresume_function [EXTRACTED 1.00]
- **Design Token System** — brand_green, brand_teal_deep, pill_button, design_system [EXTRACTED 1.00]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (19): get_all_provider_configs(), get_user_settings(), BaseModel, ApplyRequest, ApplyResponse, auth_me(), AuthCallbackRequest, ensure_defaults_exist() (+11 more)

### Community 1 - "Community 1"
Cohesion: 0.1
Nodes (24): LangGraph Workflow, Agent State, AgentState TypedDict, Agent Tools, Request Approval Node, FastAPI Backend, Configuration Module, Email Extractor (+16 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (16): decode_token(), exchange_code_for_tokens(), generate_token(), get_all_user_models(), get_google_auth_url(), get_google_user_info(), get_user_by_id(), get_user_models() (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.19
Nodes (14): create_or_update_user(), get_default_provider_and_model(), update_provider_config(), update_user_models(), Base, Database Connection, Update a provider config., Update models for a provider. (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.19
Nodes (4): generateEmail(), handleNext(), handleResumeUpload(), handleSkipResume()

### Community 5 - "Community 5"
Cohesion: 0.24
Nodes (10): authenticate_gmail(), create_message(), get_gmail_service(), Build Gmail service using refresh token., Create email message with optional attachment., Send email via Gmail API using user's OAuth credentials., Validate that refresh token can create a valid Gmail service., send_email() (+2 more)

### Community 6 - "Community 6"
Cohesion: 0.24
Nodes (8): clean_email_body(), generate_email_body(), generate_subject(), Clean the generated email body - remove hashtags, fix formatting, ensure proper, get_provider_config(), fetch_linkedin_post(), apply_to_job(), Process LinkedIn URL and generate email content.

### Community 8 - "Community 8"
Cohesion: 0.5
Nodes (4): API Client Library, Authentication Module, Google OAuth Flow, useAuth Hook

### Community 9 - "Community 9"
Cohesion: 0.5
Nodes (4): Brand Green Color Token, Brand Teal Deep Color Token, MongoDB Design System, Pill Button Component

### Community 10 - "Community 10"
Cohesion: 1.0
Nodes (2): AuthProvider Component, Frontend Root Layout

### Community 12 - "Community 12"
Cohesion: 1.0
Nodes (2): applyToJob Function, sendEmail Function

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (1): uploadResume Function

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (1): ApplyResponse Type

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (1): Get current user info.

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (1): Ensure default provider configs and models exist for a user.

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (1): Get all provider configs.

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (1): Update a provider config.

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (1): Get all model configs.

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (1): Update models for a provider.

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (1): Upload a resume PDF file.

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (1): Process LinkedIn URL and generate email content.

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (1): Send the generated email.

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (1): Get Google OAuth authorization URL.

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (1): Handle OAuth callback - exchange code for JWT.

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (1): Get current user info.

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (1): Ensure default provider configs and models exist for a user.

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (1): Get all provider configs.

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (1): Update a provider config.

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (1): Get all model configs.

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (1): Update models for a provider.

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (1): Upload a resume PDF file.

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (1): Process LinkedIn URL and generate email content.

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (1): Send the generated email.

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (1): Unified LLM provider using LangChain.

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (1): Get the configured LLM instance.                  Args:             provider: Ov

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (1): Generate text using the configured LLM.                  Args:             promp

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (1): Get information about the current provider.

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (1): Convenience function to generate text.

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (1): Node: Fetch LinkedIn post.

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (1): Node: Extract email from post.

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (1): Node: Generate email with AI.

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (1): Node: Validate email quality.

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (1): Router: Decide if we should retry email generation.

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (1): Node: Request user approval.

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (1): Node: Send email via Gmail.

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (1): Create the LangGraph workflow.

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (1): Fetch and parse a LinkedIn job post to extract job details.      Args:         u

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (1): Extract email address from text content.      Args:         text: Text content t

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (1): Generate job application email subject and body using AI (Ollama).      Args:

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (1): Validate the quality of generated email subject and body.      Args:         sub

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (1): Send email via Gmail using app password.      Args:         to_email: Recipient

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (1): Request user approval before sending email.      Args:         subject: Email su

## Knowledge Gaps
- **81 isolated node(s):** `Get Google OAuth authorization URL.`, `Handle OAuth callback - exchange code for JWT.`, `Get current user info.`, `Ensure default provider configs and models exist for a user.`, `Get all provider configs.` (+76 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 10`** (2 nodes): `AuthProvider Component`, `Frontend Root Layout`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (2 nodes): `applyToJob Function`, `sendEmail Function`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (1 nodes): `uploadResume Function`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (1 nodes): `ApplyResponse Type`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (1 nodes): `Get current user info.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (1 nodes): `Ensure default provider configs and models exist for a user.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `Get all provider configs.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `Update a provider config.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `Get all model configs.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `Update models for a provider.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `Upload a resume PDF file.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `Process LinkedIn URL and generate email content.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `Send the generated email.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `Get Google OAuth authorization URL.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `Handle OAuth callback - exchange code for JWT.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `Get current user info.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `Ensure default provider configs and models exist for a user.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `Get all provider configs.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `Update a provider config.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `Get all model configs.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `Update models for a provider.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `Upload a resume PDF file.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `Process LinkedIn URL and generate email content.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `Send the generated email.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `Unified LLM provider using LangChain.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `Get the configured LLM instance.                  Args:             provider: Ov`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `Generate text using the configured LLM.                  Args:             promp`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `Get information about the current provider.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `Convenience function to generate text.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `Node: Fetch LinkedIn post.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `Node: Extract email from post.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `Node: Generate email with AI.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `Node: Validate email quality.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `Router: Decide if we should retry email generation.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `Node: Request user approval.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `Node: Send email via Gmail.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `Create the LangGraph workflow.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `Fetch and parse a LinkedIn job post to extract job details.      Args:         u`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `Extract email address from text content.      Args:         text: Text content t`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `Generate job application email subject and body using AI (Ollama).      Args:`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `Validate the quality of generated email subject and body.      Args:         sub`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `Send email via Gmail using app password.      Args:         to_email: Recipient`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `Request user approval before sending email.      Args:         subject: Email su`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `apply_to_job()` connect `Community 6` to `Community 0`, `Community 3`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `send_job_email()` connect `Community 5` to `Community 0`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `apply_to_job()` (e.g. with `get_default_provider_and_model()` and `get_provider_config()`) actually correct?**
  _`apply_to_job()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `auth_callback()` (e.g. with `exchange_code_for_tokens()` and `get_google_user_info()`) actually correct?**
  _`auth_callback()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Get Google OAuth authorization URL.`, `Handle OAuth callback - exchange code for JWT.`, `Get current user info.` to the rest of the system?**
  _81 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._