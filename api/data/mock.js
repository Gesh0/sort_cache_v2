export default [
  // ============================================
  // HOUR 1: 17:00-18:00 local = 15:00-16:00 UTC
  // ============================================
  {
    serialNumber: 'EARLY001',
    logisticsPointId: 1,
    logisticsPointName: '001 - Skopje Center',
    updatedAt: '2025-10-30T17:15:00+02:00', // 15:15 UTC
  },
  {
    serialNumber: 'EARLY002',
    logisticsPointId: 2,
    logisticsPointName: '101 - Aerodrom',
    updatedAt: '2025-10-30T17:30:00+02:00', // 15:30 UTC
  },
  {
    serialNumber: 'EARLY003',
    logisticsPointId: 3,
    logisticsPointName: '201 - Karpos',
    updatedAt: '2025-10-30T17:45:00+02:00', // 15:45 UTC
  },
  // ============================================
  // HOUR 2: 18:00-19:00 local = 16:00-17:00 UTC
  // ============================================
  {
    serialNumber: 'MID001',
    logisticsPointId: 1,
    logisticsPointName: '102 - Kisela Voda',
    updatedAt: '2025-10-30T18:10:00+02:00', // 16:10 UTC
  },
  {
    serialNumber: 'MID002',
    logisticsPointId: 2,
    logisticsPointName: '111 - Centar Plaza',
    updatedAt: '2025-10-30T18:25:00+02:00', // 16:25 UTC
  },
  {
    serialNumber: 'MID003',
    logisticsPointId: 3,
    logisticsPointName: '121 - GTC',
    updatedAt: '2025-10-30T18:50:00+02:00', // 16:50 UTC
  },
  // ============================================
  // HOUR 3: 19:00-20:00 local = 17:00-18:00 UTC
  // *** BOOTSTRAP TARGETS THIS HOUR (current) ***
  // ============================================
  {
    serialNumber: 'BOOT001',
    logisticsPointId: 1,
    logisticsPointName: '103 - Cair',
    updatedAt: '2025-10-30T19:10:00+02:00', // 17:10 UTC ✓
  },
  {
    serialNumber: 'BOOT002',
    logisticsPointId: 2,
    logisticsPointName: '112 - City Mall',
    updatedAt: '2025-10-30T19:25:00+02:00', // 17:25 UTC ✓ (before current time)
  },
  {
    serialNumber: 'BOOT003',
    logisticsPointId: 3,
    logisticsPointName: '122 - Ramstore',
    updatedAt: '2025-10-30T19:45:00+02:00', // 17:45 UTC ✓
  },
  // ============================================
  // DEDUPE TEST: BOOT001 appears twice
  // ============================================
  {
    serialNumber: 'BOOT001',
    logisticsPointId: 5,
    logisticsPointName: '203 - Bunjakovec',
    updatedAt: '2025-10-30T19:50:00+02:00', // 17:50 UTC - later, should win ✓
  },
  // ============================================
  // SPAN TEST: Item across all three hours
  // ============================================
  {
    serialNumber: 'SPAN001',
    logisticsPointId: 1,
    logisticsPointName: '123 - Vero',
    updatedAt: '2025-10-30T17:20:00+02:00', // 15:20 UTC
  },
  {
    serialNumber: 'SPAN001',
    logisticsPointId: 2,
    logisticsPointName: '131 - Veles',
    updatedAt: '2025-10-30T18:35:00+02:00', // 16:35 UTC
  },
  {
    serialNumber: 'SPAN001',
    logisticsPointId: 3,
    logisticsPointName: '141 - Prilep',
    updatedAt: '2025-10-30T19:30:00+02:00', // 17:30 UTC - latest, should win ✓
  },
  // ============================================
  // DEDUPE TEST: Multiple updates same hour
  // ============================================
  {
    serialNumber: 'DEDUPE001',
    logisticsPointId: 1,
    logisticsPointName: '001 - Skopje Center',
    updatedAt: '2025-10-30T19:05:00+02:00', // 17:05 UTC
  },
  {
    serialNumber: 'DEDUPE001',
    logisticsPointId: 2,
    logisticsPointName: '101 - Aerodrom',
    updatedAt: '2025-10-30T19:35:00+02:00', // 17:35 UTC
  },
  {
    serialNumber: 'DEDUPE001',
    logisticsPointId: 3,
    logisticsPointName: '201 - Karpos',
    updatedAt: '2025-10-30T19:55:00+02:00', // 17:55 UTC - latest, should win ✓
  },
]