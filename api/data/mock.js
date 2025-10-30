export default [
  // HOUR 1: 17:00–18:00 local = 15:00–16:00 UTC
  {
    serialNumber: 'EARLY001',
    logisticsPointId: 1,
    logisticsPointName: '001 - Skopje Center',
    updatedAt: '2025-10-30T18:30:00+02:00', // 15:30 UTC
  },

  // HOUR 2: 18:00–19:00 local = 16:00–17:00 UTC
  {
    serialNumber: 'MID001',
    logisticsPointId: 2,
    logisticsPointName: '101 - Aerodrom',
    updatedAt: '2025-10-30T19:25:00+02:00', // 16:25 UTC
  },

  // HOUR 3: 19:00–20:00 local = 17:00–18:00 UTC
  {
    serialNumber: 'BOOT001',
    logisticsPointId: 1,
    logisticsPointName: '103 - Cair',
    updatedAt: '2025-10-30T20:10:00+02:00', // 17:10 UTC ✓
  },
  {
    serialNumber: 'BOOT001',
    logisticsPointId: 5,
    logisticsPointName: '203 - Bunjakovec',
    updatedAt: '2025-10-30T20:50:00+02:00', // 17:50 UTC - later, should win ✓
  },
  {
    serialNumber: 'BOOT002',
    logisticsPointId: 2,
    logisticsPointName: '112 - City Mall',
    updatedAt: '2025-10-30T20:25:00+02:00', // 17:25 UTC ✓
  },

  // SPAN TEST: Appears across all three hours
  {
    serialNumber: 'SPAN001',
    logisticsPointId: 1,
    logisticsPointName: '123 - Vero',
    updatedAt: '2025-10-30T18:20:00+02:00', // 15:20 UTC
  },
  {
    serialNumber: 'SPAN001',
    logisticsPointId: 2,
    logisticsPointName: '131 - Veles',
    updatedAt: '2025-10-30T19:35:00+02:00', // 16:35 UTC
  },
  {
    serialNumber: 'SPAN001',
    logisticsPointId: 3,
    logisticsPointName: '141 - Prilep',
    updatedAt: '2025-10-30T20:30:00+02:00', // 17:30 UTC - latest ✓
  },

  // DEDUPE TEST: Multiple updates same hour
  {
    serialNumber: 'DEDUPE001',
    logisticsPointId: 3,
    logisticsPointName: '201 - Karpos',
    updatedAt: '2025-10-30T20:55:00+02:00', // 17:55 UTC ✓
  },
]
