Job Cycle Pipeline with Advisory LocksSTART (job_queue insert):

New job arrives, trigger fires per row
Check if job before this one is incomplete AND unlocked
If found, try advisory lock on it
If lock succeeds, process (notify worker or execute inline)
If lock fails, someone else processing, do nothing
If no incomplete jobs before this one, do nothing (will process when results trigger)
CONTINUE (results written):

Worker wrote to ingest_raw → transform_to_acc fires → writes to ingest_acc
ingest_acc insert trigger fires (statement level)
Loop through all incomplete jobs oldest first
Try advisory lock on each until one succeeds
Process that job (notify worker or execute inline)
If no locks succeed, all jobs being processed elsewhere
If no incomplete jobs, check derivation
DERIVE (all jobs complete):

Both job types have no incomplete jobs
New data exists since last derivation
Execute derive_cache, update derivation_state
Notify cache reload
STOP:

No incomplete jobs and nothing to derive → idle
Lock acquisition fails on all jobs → others processing → idle
LOCK LIFECYCLE:

Acquired: Before notify/process
Held: During entire worker operation
Released: When worker commits ingest_raw write (transaction ends)
Auto-released: If worker connection drops (crash recovery)