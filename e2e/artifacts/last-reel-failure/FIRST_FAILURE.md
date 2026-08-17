# FIRST FAILURE

PRODUCTION:
3b29baa9-a45b-43e4-a479-8837c285f89e

STAGE:
animation

FIRST FAILURE:
animation is queued on server; no stage running; lock=false

PROVIDER:
NONE

HTTP:
N/A

TIMESTAMP:
2026-08-16T22:24:44.313Z

UI STATE:
no running spinner

BACKEND STATE:
current=animation animation=queued (started_at=null) music=not-yet-created running=none status=producing

LOCK:
RELEASED (pipeline_lock.locked=false since 2026-08-16T22:19:02.717Z)

CHECKPOINT:
6/6 scene image checkpoints persisted (image stage completed)

RETRY COUNT:
0

OUTPUT:
6/6 images present; 0/6 scene videos; animation output absent

ROOT CAUSE EVIDENCE:
After 60s observation post image completion (2026-08-16T22:19:00.179Z): production.current_stage=animation but animation.status=queued with started_at=null and no stage running. UI shows no running spinner. 15 other productions remain status=producing (oldest updated_at=2026-08-06T18:43:43Z at render stage); several hold stale pipeline_lock.locked=true. Localhost has no evidence of /api/cron/v7-advance picking this production — worker scheduling/advancement stall at IMAGE→I2V, not a provider/I2V failure.
