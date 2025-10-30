export default [
  // ============================================
  // HOUR 1: 22:00-23:00 local = 20:00-21:00 UTC
  // ============================================
  {
    serialNumber: 'EARLY001',
    logisticsPointId: 1,
    logisticsPointName: '001 - Skopje Center',
    updatedAt: '2025-10-29T22:15:00+02:00', // 20:15 UTC
  },
  {
    serialNumber: 'EARLY002',
    logisticsPointId: 2,
    logisticsPointName: '101 - Aerodrom',
    updatedAt: '2025-10-29T22:30:00+02:00', // 20:30 UTC
  },
  {
    serialNumber: 'EARLY003',
    logisticsPointId: 3,
    logisticsPointName: '201 - Karpos',
    updatedAt: '2025-10-29T22:45:00+02:00', // 20:45 UTC
  },

  // ============================================
  // HOUR 2: 23:00-00:00 local = 21:00-22:00 UTC
  // ============================================
  {
    serialNumber: 'MID001',
    logisticsPointId: 1,
    logisticsPointName: '102 - Kisela Voda',
    updatedAt: '2025-10-29T23:10:00+02:00', // 21:10 UTC
  },
  {
    serialNumber: 'MID002',
    logisticsPointId: 2,
    logisticsPointName: '111 - Centar Plaza',
    updatedAt: '2025-10-29T23:25:00+02:00', // 21:25 UTC
  },
  {
    serialNumber: 'MID003',
    logisticsPointId: 3,
    logisticsPointName: '121 - GTC',
    updatedAt: '2025-10-29T23:50:00+02:00', // 21:50 UTC
  },

  // ============================================
  // HOUR 3: 00:00-01:00 local next day = 22:00-23:00 UTC
  // *** BOOTSTRAP TARGETS THIS HOUR ***
  // ============================================
  {
    serialNumber: 'BOOT001',
    logisticsPointId: 1,
    logisticsPointName: '103 - Cair',
    updatedAt: '2025-10-30T00:10:00+02:00', // 22:10 UTC ✓
  },
  {
    serialNumber: 'BOOT002',
    logisticsPointId: 2,
    logisticsPointName: '112 - City Mall',
    updatedAt: '2025-10-30T00:25:00+02:00', // 22:25 UTC ✓
  },
  {
    serialNumber: 'BOOT003',
    logisticsPointId: 3,
    logisticsPointName: '122 - Ramstore',
    updatedAt: '2025-10-30T00:45:00+02:00', // 22:45 UTC ✓
  },

  // ============================================
  // DEDUPE TEST: BOOT001 appears twice
  // ============================================
  {
    serialNumber: 'BOOT001',
    logisticsPointId: 5,
    logisticsPointName: '203 - Bunjakovec',
    updatedAt: '2025-10-30T00:50:00+02:00', // 22:50 UTC - later, should win ✓
  },

  // ============================================
  // SPAN TEST: Item across all three hours
  // ============================================
  {
    serialNumber: 'SPAN001',
    logisticsPointId: 1,
    logisticsPointName: '123 - Vero',
    updatedAt: '2025-10-29T22:20:00+02:00', // 20:20 UTC
  },
  {
    serialNumber: 'SPAN001',
    logisticsPointId: 2,
    logisticsPointName: '131 - Veles',
    updatedAt: '2025-10-29T23:35:00+02:00', // 21:35 UTC
  },
  {
    serialNumber: 'SPAN001',
    logisticsPointId: 3,
    logisticsPointName: '141 - Prilep',
    updatedAt: '2025-10-30T00:30:00+02:00', // 22:30 UTC - latest, should win ✓
  },

  // ============================================
  // DEDUPE TEST: Multiple updates same hour
  // ============================================
  {
    serialNumber: 'DEDUPE001',
    logisticsPointId: 1,
    logisticsPointName: '001 - Skopje Center',
    updatedAt: '2025-10-30T00:05:00+02:00', // 22:05 UTC
  },
  {
    serialNumber: 'DEDUPE001',
    logisticsPointId: 2,
    logisticsPointName: '101 - Aerodrom',
    updatedAt: '2025-10-30T00:35:00+02:00', // 22:35 UTC
  },
  {
    serialNumber: 'DEDUPE001',
    logisticsPointId: 3,
    logisticsPointName: '201 - Karpos',
    updatedAt: '2025-10-30T00:55:00+02:00', // 22:55 UTC - latest, should win ✓
  },
]
