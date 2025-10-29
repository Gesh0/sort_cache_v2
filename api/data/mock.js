export default [
  // HOUR 1: 06:00-07:00 (early morning baseline)
  {
    serialNumber: 'SN001',
    logisticsPointId: 1,
    logisticsPointName: '001 - Jug',
    updatedAt: '2025-10-29T06:15:00.00Z',
  },
  {
    serialNumber: 'SN002',
    logisticsPointId: 2,
    logisticsPointName: '101 - Sever',
    updatedAt: '2025-10-29T06:45:00.00Z',
  },

  // HOUR 2: 07:00-08:00
  {
    serialNumber: 'SN003',
    logisticsPointId: 3,
    logisticsPointName: '102 - Zapad',
    updatedAt: '2025-10-29T07:20:00.00Z',
  },

  // HOUR 3: 08:00-09:00
  {
    serialNumber: 'SN004',
    logisticsPointId: 4,
    logisticsPointName: '103 - Istok',
    updatedAt: '2025-10-29T08:30:00.00Z',
  },
  {
    serialNumber: 'SN001', // MOVED - tests dedupe (should use this, not 06:15)
    logisticsPointId: 5,
    logisticsPointName: '111 - Centar',
    updatedAt: '2025-10-29T08:50:00.00Z',
  },

  // HOUR 4: 09:00-10:00 (BOOTSTRAP HOUR)
  {
    serialNumber: 'TEST',
    logisticsPointId: 1,
    logisticsPointName: '001 - Jug',
    updatedAt: '2025-10-29T09:10:00.00Z',
  },
  {
    serialNumber: 'SN005',
    logisticsPointId: 2,
    logisticsPointName: '112 - Sever',
    updatedAt: '2025-10-29T09:35:00.00Z',
  },

  // HOUR 5: 10:00-11:00 (INIT CATCHES THIS)
  {
    serialNumber: 'TEST2',
    logisticsPointId: 3,
    logisticsPointName: '121 - Zapad',
    updatedAt: '2025-10-29T10:05:00.00Z',
  },
  {
    serialNumber: 'SN002', // MOVED - tests dedupe
    logisticsPointId: 4,
    logisticsPointName: '122 - Istok',
    updatedAt: '2025-10-29T10:40:00.00Z',
  },

  // HOUR 6: 11:00-12:00 (CURRENT INCOMPLETE HOUR - timer will catch at 12:00)
  {
    serialNumber: 'SN006',
    logisticsPointId: 5,
    logisticsPointName: '123 - Centar',
    updatedAt: '2025-10-29T11:20:00.00Z',
  },
  {
    serialNumber: 'TEST', // MOVED AGAIN - tests multiple moves
    logisticsPointId: 2,
    logisticsPointName: '124 - Sever',
    updatedAt: '2025-10-29T11:45:00.00Z',
  },

  // HOUR 7: 12:00-13:00 (FUTURE - timer will catch at 13:00)
  {
    serialNumber: 'SN007',
    logisticsPointId: 1,
    logisticsPointName: '131 - Jug',
    updatedAt: '2025-10-29T12:25:00.00Z',
  },
]