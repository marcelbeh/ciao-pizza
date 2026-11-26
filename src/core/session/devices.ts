export const deviceIds = ['tm7', 'tm6', 'tm5', 'manual'] as const;
export type DeviceId = typeof deviceIds[number];
export const deviceProfiles = {
  tm7: { name: 'Thermomix TM7', mode: 'Manuelles Kochen → Modi → Teig kneten', flourCap: 400, doughCap: null, bowlLitres: 2.2, scale: 'Waage am Gerät öffnen und vor jeder Zutat tarieren. Kleine Hefemengen separat mit einer Feinwaage wiegen.', source: 'https://assets.vorwerk.com/content/dam/general/zendesk-guide/manuals/tm7_2025-04/user%20manual_TM7_11001_V1.0_DEAT.pdf' },
  tm6: { name: 'Thermomix TM6', mode: 'Modi → Teigmodus', flourCap: 400, doughCap: 1000, bowlLitres: 2.2, scale: 'Waage am Gerät nutzen und tarieren. Hefe separat auf einer Feinwaage wiegen.', source: 'https://cookidoo.co.uk/foundation/en-GB/pages/tm6-modes-explained-dough' },
  tm5: { name: 'Thermomix TM5', mode: 'Ährensymbol wählen, mit Drehregler starten', flourCap: 400, doughCap: null, bowlLitres: 2.2, scale: 'Waage am TM5 nutzen und vor der nächsten Zutat tarieren. Hefe separat fein wiegen.', source: 'https://support-gb.vorwerk.com/hc/en-gb/articles/18202346542236-How-do-I-activate-the-knead-mode-on-my-Thermomix-TM5-and-what-is-the-maximum-amount-of-dough-I-can-prepare-at-a-time' },
  manual: { name: 'Manuelle Teigzubereitung', mode: 'Von Hand mischen und kneten', flourCap: null, doughCap: null, bowlLitres: null, scale: 'Küchenwaage verwenden; kleine Hefemengen mit einer Feinwaage wiegen.', source: null },
} as const;
export function assertDevice(value: unknown): asserts value is DeviceId { if (!deviceIds.includes(value as DeviceId)) throw Error('Unbekanntes Zubereitungsgerät.'); }
