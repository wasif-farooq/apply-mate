import logging
import os
import sys
from datetime import datetime, timezone

LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)

LOG_LEVEL = os.getenv("LOG_LEVEL", "DEBUG").upper()
JSON_LOGS = os.getenv("JSON_LOGS", "false").lower() == "true"

if JSON_LOGS:
    from pythonjsonlogger import jsonlogger
    
    log_handler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter(
        '%(asctime)s %(levelname)s %(name)s %(message)s',
        datefmt='%Y-%m-%dT%H:%M:%S'
    )
    log_handler.setFormatter(formatter)
else:
    log_handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    log_handler.setFormatter(formatter)

    log_file = os.path.join(LOG_DIR, f"job-applier-{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.log")
    file_handler = logging.FileHandler(log_file)
    file_handler.setFormatter(formatter)

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.DEBUG),
    handlers=[log_handler] + ([file_handler] if not JSON_LOGS else [])
)

logger = logging.getLogger("job-applier")