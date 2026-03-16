"""Scheduler – run data sync on a cron schedule."""

import logging
import signal
import sys

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

from .config import SYNC_CRON
from .sync import RetoolDataSync

logger = logging.getLogger(__name__)


def _sync_job():
    """Single sync run – called by the scheduler."""
    try:
        syncer = RetoolDataSync()
        saved = syncer.fetch_and_save()
        for fmt, path in saved.items():
            logger.info("[scheduler] %s → %s", fmt, path)
    except Exception:
        logger.exception("Sync job failed")


def run_scheduler():
    """Start the blocking cron scheduler."""
    scheduler = BlockingScheduler()
    trigger = CronTrigger.from_crontab(SYNC_CRON)
    scheduler.add_job(_sync_job, trigger, id="retool_sync", replace_existing=True)

    def _shutdown(signum, frame):
        logger.info("Shutting down scheduler …")
        scheduler.shutdown(wait=False)
        sys.exit(0)

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    logger.info("Scheduler started – cron: %s", SYNC_CRON)
    # Run once immediately on start
    _sync_job()
    scheduler.start()
