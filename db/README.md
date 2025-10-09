ADDRESSING FORMAT

V-RRR-LLL-SSS-DDD

V = Version (1 digit)
RRR = Region (3 digits)
LLL = Locker unit (3 digits)
SSS = Segment/column (3 digits)
DDD = Door number (3 digits)

Example: 2-001-042-003-015
Example: 02-02-02-02-02

SCHEMA

  STATIC

    regions

    region_id (number) PK
    region_name (text)
    timezone (text)
    created_at (timestamp)

    lockers

    locker_id (nummber) PK V-RRR-LLL-SSS-DDD
    model (text)
    region_code (number) FK → regions
    locker_number (number)
    location_address (text)
    location_lat (number)
    location_lon (number)
    created_at (timestamp)

    locker_segments

    segment_id (number) PK V-RRR-LLL-SSS
    locker_id (number) V-RRR-LLL
    segment_id (number)
    created_at (timestamp)

    locker_doors

    door_id (numbers) PK V-RRR-LLL-SSS-DDD
    segment_id (number) FK → locker_segments
    door_id (number)
    size_category (number)
    created_at (timestamp)

    users

    user_id (uuid) PK
    email (text)
    phone (text)
    full_name (text)
    created_at (timestamp)

  DYNAMIC / EVENTS

    locker_events

    event_id (number) PK
    locker_id (text) FK → lockers
    event_type (text)
    event_data (jsonb)
    timestamp (timestamp)

    user_events

    event_id (number) PK
    user_id (uuid) FK → users
    event_type (text)
    event_data (jsonb)
    timestamp (timestamp)

    deliveries

    delivery_id (uuid) PK
    user_id (uuid) FK → users
    locker_id (text) FK → lockers
    tracking_number (text)
    created_at (timestamp)

    delivery_events

    event_id (number) PK
    delivery_id (uuid) FK → deliveries
    event_type (text)
    event_data (jsonb)
    timestamp (timestamp)

  DERIVED / COMPUTED 

    locker_current_state

    locker_id (text) PK FK → lockers
    status (text)
    door_state (text)
    occupied (boolean)
    last_event_id (number) FK → locker_events
    last_updated (timestamp)

    user_current_state

    user_id (uuid) PK FK → users
    status (text)
    active_deliveries (number)
    total_deliveries (number)
    last_event_id (number) FK → user_events
    last_updated (timestamp)
