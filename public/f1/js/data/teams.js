/**
 * 2025 Formula 1 grid — teams, liveries and drivers.
 *
 * `pace` is a normalised car performance index (1.000 = benchmark car of the
 * season). It scales the AI speed profile and the amount of downforce a car
 * generates, so the field spreads out the way it does in real life.
 *
 * Driver attributes (0..1):
 *   skill        raw one-lap and race pace
 *   consistency  how rarely they make a mistake
 *   aggression   willingness to commit to a move / defend hard
 *   racecraft    quality of overtakes and wheel-to-wheel positioning
 *   tyreCare     how gently they use the tyres
 */

export const TEAMS = [
  {
    id: 'mclaren',
    name: 'McLaren',
    fullName: 'McLaren Formula 1 Team',
    engine: 'Mercedes',
    base: 'Woking, United Kingdom',
    colour: '#FF8000',
    accent: '#0090D0',
    dark: '#B35400',
    pace: 1.000,
    drivers: [
      { id: 'norris',   num: 4,  code: 'NOR', first: 'Lando',  last: 'Norris',
        nat: 'GBR', skill: 0.965, consistency: 0.90, aggression: 0.74, racecraft: 0.92, tyreCare: 0.90 },
      { id: 'piastri',  num: 81, code: 'PIA', first: 'Oscar',  last: 'Piastri',
        nat: 'AUS', skill: 0.960, consistency: 0.93, aggression: 0.80, racecraft: 0.91, tyreCare: 0.93 },
    ],
  },
  {
    id: 'ferrari',
    name: 'Ferrari',
    fullName: 'Scuderia Ferrari',
    engine: 'Ferrari',
    base: 'Maranello, Italy',
    colour: '#E8002D',
    accent: '#FFF200',
    dark: '#9B0020',
    pace: 0.992,
    drivers: [
      { id: 'leclerc',  num: 16, code: 'LEC', first: 'Charles', last: 'Leclerc',
        nat: 'MON', skill: 0.968, consistency: 0.86, aggression: 0.84, racecraft: 0.90, tyreCare: 0.85 },
      { id: 'hamilton', num: 44, code: 'HAM', first: 'Lewis',   last: 'Hamilton',
        nat: 'GBR', skill: 0.958, consistency: 0.91, aggression: 0.78, racecraft: 0.97, tyreCare: 0.95 },
    ],
  },
  {
    id: 'redbull',
    name: 'Red Bull',
    fullName: 'Oracle Red Bull Racing',
    engine: 'Honda RBPT',
    base: 'Milton Keynes, United Kingdom',
    colour: '#3671C6',
    accent: '#E8002D',
    dark: '#1E3D6B',
    pace: 0.990,
    drivers: [
      { id: 'verstappen', num: 1,  code: 'VER', first: 'Max',  last: 'Verstappen',
        nat: 'NED', skill: 0.995, consistency: 0.95, aggression: 0.92, racecraft: 0.98, tyreCare: 0.92 },
      { id: 'tsunoda',    num: 22, code: 'TSU', first: 'Yuki', last: 'Tsunoda',
        nat: 'JPN', skill: 0.910, consistency: 0.78, aggression: 0.86, racecraft: 0.82, tyreCare: 0.76 },
    ],
  },
  {
    id: 'mercedes',
    name: 'Mercedes',
    fullName: 'Mercedes-AMG Petronas F1 Team',
    engine: 'Mercedes',
    base: 'Brackley, United Kingdom',
    colour: '#27F4D2',
    accent: '#C0C0C0',
    dark: '#12A38C',
    pace: 0.985,
    drivers: [
      { id: 'russell',   num: 63, code: 'RUS', first: 'George', last: 'Russell',
        nat: 'GBR', skill: 0.955, consistency: 0.90, aggression: 0.80, racecraft: 0.89, tyreCare: 0.88 },
      { id: 'antonelli', num: 12, code: 'ANT', first: 'Kimi',   last: 'Antonelli',
        nat: 'ITA', skill: 0.915, consistency: 0.76, aggression: 0.83, racecraft: 0.80, tyreCare: 0.80 },
    ],
  },
  {
    id: 'aston',
    name: 'Aston Martin',
    fullName: 'Aston Martin Aramco F1 Team',
    engine: 'Mercedes',
    base: 'Silverstone, United Kingdom',
    colour: '#229971',
    accent: '#CEDC00',
    dark: '#12634A',
    pace: 0.968,
    drivers: [
      { id: 'alonso', num: 14, code: 'ALO', first: 'Fernando', last: 'Alonso',
        nat: 'ESP', skill: 0.948, consistency: 0.92, aggression: 0.90, racecraft: 0.97, tyreCare: 0.94 },
      { id: 'stroll', num: 18, code: 'STR', first: 'Lance',    last: 'Stroll',
        nat: 'CAN', skill: 0.878, consistency: 0.74, aggression: 0.70, racecraft: 0.72, tyreCare: 0.78 },
    ],
  },
  {
    id: 'alpine',
    name: 'Alpine',
    fullName: 'BWT Alpine F1 Team',
    engine: 'Renault',
    base: 'Enstone, United Kingdom',
    colour: '#FF87BC',
    accent: '#0090FF',
    dark: '#C25E8C',
    pace: 0.958,
    drivers: [
      { id: 'gasly',     num: 10, code: 'GAS', first: 'Pierre', last: 'Gasly',
        nat: 'FRA', skill: 0.918, consistency: 0.83, aggression: 0.79, racecraft: 0.85, tyreCare: 0.83 },
      { id: 'colapinto', num: 43, code: 'COL', first: 'Franco', last: 'Colapinto',
        nat: 'ARG', skill: 0.888, consistency: 0.72, aggression: 0.85, racecraft: 0.78, tyreCare: 0.74 },
    ],
  },
  {
    id: 'haas',
    name: 'Haas',
    fullName: 'MoneyGram Haas F1 Team',
    engine: 'Ferrari',
    base: 'Kannapolis, United States',
    colour: '#B6BABD',
    accent: '#E8002D',
    dark: '#7C8084',
    pace: 0.962,
    drivers: [
      { id: 'ocon',    num: 31, code: 'OCO', first: 'Esteban', last: 'Ocon',
        nat: 'FRA', skill: 0.905, consistency: 0.84, aggression: 0.82, racecraft: 0.81, tyreCare: 0.86 },
      { id: 'bearman', num: 87, code: 'BEA', first: 'Oliver',  last: 'Bearman',
        nat: 'GBR', skill: 0.886, consistency: 0.75, aggression: 0.80, racecraft: 0.79, tyreCare: 0.79 },
    ],
  },
  {
    id: 'rb',
    name: 'Racing Bulls',
    fullName: 'Visa Cash App Racing Bulls F1 Team',
    engine: 'Honda RBPT',
    base: 'Faenza, Italy',
    colour: '#6692FF',
    accent: '#E8002D',
    dark: '#3F5FB8',
    pace: 0.960,
    drivers: [
      { id: 'lawson', num: 30, code: 'LAW', first: 'Liam',  last: 'Lawson',
        nat: 'NZL', skill: 0.892, consistency: 0.77, aggression: 0.88, racecraft: 0.82, tyreCare: 0.77 },
      { id: 'hadjar', num: 6,  code: 'HAD', first: 'Isack', last: 'Hadjar',
        nat: 'FRA', skill: 0.896, consistency: 0.79, aggression: 0.81, racecraft: 0.80, tyreCare: 0.81 },
    ],
  },
  {
    id: 'williams',
    name: 'Williams',
    fullName: 'Atlassian Williams Racing',
    engine: 'Mercedes',
    base: 'Grove, United Kingdom',
    colour: '#64C4FF',
    accent: '#FFFFFF',
    dark: '#2E7FB0',
    pace: 0.966,
    drivers: [
      { id: 'albon', num: 23, code: 'ALB', first: 'Alex',   last: 'Albon',
        nat: 'THA', skill: 0.922, consistency: 0.88, aggression: 0.76, racecraft: 0.86, tyreCare: 0.90 },
      { id: 'sainz', num: 55, code: 'SAI', first: 'Carlos', last: 'Sainz',
        nat: 'ESP', skill: 0.940, consistency: 0.89, aggression: 0.83, racecraft: 0.90, tyreCare: 0.89 },
    ],
  },
  {
    id: 'sauber',
    name: 'Kick Sauber',
    fullName: 'Stake F1 Team Kick Sauber',
    engine: 'Ferrari',
    base: 'Hinwil, Switzerland',
    colour: '#52E252',
    accent: '#000000',
    dark: '#2E9E2E',
    pace: 0.948,
    drivers: [
      { id: 'hulkenberg', num: 27, code: 'HUL', first: 'Nico',    last: 'Hulkenberg',
        nat: 'GER', skill: 0.912, consistency: 0.87, aggression: 0.75, racecraft: 0.84, tyreCare: 0.87 },
      { id: 'bortoleto',  num: 5,  code: 'BOR', first: 'Gabriel', last: 'Bortoleto',
        nat: 'BRA', skill: 0.874, consistency: 0.73, aggression: 0.79, racecraft: 0.76, tyreCare: 0.76 },
    ],
  },
];

/** Flat list of every driver with a back-reference to their team. */
export const DRIVERS = TEAMS.flatMap((t) => t.drivers.map((d) => ({ ...d, team: t })));

export const PLAYER_TEAM_ID = 'mclaren';

export function teamById(id) {
  return TEAMS.find((t) => t.id === id);
}

export function driverById(id) {
  return DRIVERS.find((d) => d.id === id);
}

/** Championship points for positions 1..10, plus the fastest-lap bonus. */
export const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
export const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];
export const FASTEST_LAP_POINT = 1;

/** Tyre compounds. `grip` multiplies peak friction, `wear` the degradation rate. */
export const COMPOUNDS = {
  soft:   { id: 'soft',   name: 'Soft',   short: 'S', colour: '#F5333F', grip: 1.045, wear: 1.55, warmup: 1.0 },
  medium: { id: 'medium', name: 'Medium', short: 'M', colour: '#F5C518', grip: 1.000, wear: 1.00, warmup: 1.3 },
  hard:   { id: 'hard',   name: 'Hard',   short: 'H', colour: '#E8E8E8', grip: 0.962, wear: 0.68, warmup: 1.8 },
  inter:  { id: 'inter',  name: 'Inter',  short: 'I', colour: '#3AC13A', grip: 0.880, wear: 1.10, warmup: 1.1, wet: 0.55 },
  wet:    { id: 'wet',    name: 'Wet',    short: 'W', colour: '#3A7BD5', grip: 0.800, wear: 0.85, warmup: 1.0, wet: 1.00 },
};
