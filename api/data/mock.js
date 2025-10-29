export default [
  // ============================================
  // HOUR 1: 18:00-19:00 local = 16:00-17:00 UTC
  // ============================================
  {
    serialNumber: 'EARLY001',
    logisticsPointId: 1,
    logisticsPointName: '001 - Skopje Center',
    updatedAt: '2025-10-29T18:15:00+02:00', // 16:15 UTC
  },
  {
    serialNumber: 'EARLY002',
    logisticsPointId: 2,
    logisticsPointName: '101 - Aerodrom',
    updatedAt: '2025-10-29T18:30:00+02:00', // 16:30 UTC
  },
  {
    serialNumber: 'EARLY003',
    logisticsPointId: 3,
    logisticsPointName: '201 - Karpos',
    updatedAt: '2025-10-29T18:45:00+02:00', // 16:45 UTC
  },

  // ============================================
  // HOUR 2: 19:00-20:00 local = 17:00-18:00 UTC
  // ============================================
  {
    serialNumber: 'MID001',
    logisticsPointId: 1,
    logisticsPointName: '102 - Kisela Voda',
    updatedAt: '2025-10-29T19:10:00+02:00', // 17:10 UTC
  },
  {
    serialNumber: 'MID002',
    logisticsPointId: 2,
    logisticsPointName: '111 - Centar Plaza',
    updatedAt: '2025-10-29T19:25:00+02:00', // 17:25 UTC
  },
  {
    serialNumber: 'MID003',
    logisticsPointId: 3,
    logisticsPointName: '121 - GTC',
    updatedAt: '2025-10-29T19:50:00+02:00', // 17:50 UTC
  },

  // ============================================
  // HOUR 3: 20:00-21:00 local = 18:00-19:00 UTC
  // *** BOOTSTRAP TARGETS THIS HOUR ***
  // ============================================
  {
    serialNumber: 'BOOT001',
    logisticsPointId: 1,
    logisticsPointName: '103 - Cair',
    updatedAt: '2025-10-29T20:10:00+02:00', // 18:10 UTC ✓
  },
  {
    serialNumber: 'BOOT002',
    logisticsPointId: 2,
    logisticsPointName: '112 - City Mall',
    updatedAt: '2025-10-29T20:25:00+02:00', // 18:25 UTC ✓
  },
  {
    serialNumber: 'BOOT003',
    logisticsPointId: 3,
    logisticsPointName: '122 - Ramstore',
    updatedAt: '2025-10-29T20:45:00+02:00', // 18:45 UTC ✓
  },

  // ============================================
  // DEDUPE TEST: BOOT001 appears twice
  // ============================================
  {
    serialNumber: 'BOOT001',
    logisticsPointId: 5,
    logisticsPointName: '203 - Bunjakovec',
    updatedAt: '2025-10-29T20:50:00+02:00', // 18:50 UTC - later, should win ✓
  },

  // ============================================
  // SPAN TEST: Item across all three hours
  // ============================================
  {
    serialNumber: 'SPAN001',
    logisticsPointId: 1,
    logisticsPointName: '123 - Vero',
    updatedAt: '2025-10-29T18:20:00+02:00', // 16:20 UTC
  },
  {
    serialNumber: 'SPAN001',
    logisticsPointId: 2,
    logisticsPointName: '131 - Veles',
    updatedAt: '2025-10-29T19:35:00+02:00', // 17:35 UTC
  },
  {
    serialNumber: 'SPAN001',
    logisticsPointId: 3,
    logisticsPointName: '141 - Prilep',
    updatedAt: '2025-10-29T20:30:00+02:00', // 18:30 UTC - latest, should win ✓
  },

  // ============================================
  // DEDUPE TEST: Multiple updates same hour
  // ============================================
  {
    serialNumber: 'DEDUPE001',
    logisticsPointId: 1,
    logisticsPointName: '001 - Skopje Center',
    updatedAt: '2025-10-29T20:05:00+02:00', // 18:05 UTC
  },
  {
    serialNumber: 'DEDUPE001',
    logisticsPointId: 2,
    logisticsPointName: '101 - Aerodrom',
    updatedAt: '2025-10-29T20:35:00+02:00', // 18:35 UTC
  },
  {
    serialNumber: 'DEDUPE001',
    logisticsPointId: 3,
    logisticsPointName: '201 - Karpos',
    updatedAt: '2025-10-29T20:55:00+02:00', // 18:55 UTC - latest, should win ✓
  },
]
