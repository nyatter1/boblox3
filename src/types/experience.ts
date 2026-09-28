export type PartShape = 'block' | 'sphere' | 'cylinder' | 'wedge';

export type PartMaterial = 'SmoothPlastic' | 'Neon' | 'Wood' | 'Metal' | 'Brick' | 'Glass';

export type PartFaceName = 'all' | 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right';

export type TextureMappingMode = 'stretch' | 'tile' | 'fit';

export interface TextureProperties {
  mode?: TextureMappingMode;
  repeatX?: number;
  repeatY?: number;
  transparency?: number;
}

export interface PartFaceTextures {
  all?: string;
  front?: string;
  back?: string;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
}

export interface StudioScript {
  id: string;
  name: string;
  parentId: string; // 'serverscriptservice', 'workspace', or part ID
  code: string;
  enabled: boolean;
  createdAt: number;
}

export interface ClickDetectorInstance {
  id: string;
  name: string;
  maxActivationDistance: number;
  cursorIcon?: string;
}

export interface StudioPart {
  id: string;
  name: string;
  shape: PartShape;
  position: [number, number, number];
  size: [number, number, number];
  rotation: [number, number, number]; // Euler angles in degrees
  color: string;
  material: PartMaterial;
  transparency: number;
  reflectance: number;
  anchored: boolean; // if false, falls with physics
  canCollide: boolean; // if false, player walks through
  location?: 'workspace' | 'replicatedstorage' | 'serverstorage' | string;
  hasClickDetector?: boolean;
  clickDetector?: ClickDetectorInstance | null;
  textures?: PartFaceTextures;
  textureProperties?: TextureProperties;
  scripts?: StudioScript[];
}

export interface ExperienceData {
  id: string;
  name: string;
  description: string;
  creatorId?: string;
  creatorUsername?: string;
  createdAt: number;
  lastUpdated: number;
  published: boolean;
  visits: number;
  likes: number;
  dislikes: number;
  favorites: number;
  userLiked?: 'like' | 'dislike' | null;
  userFavorited?: boolean;
  parts: StudioPart[];
  scripts?: StudioScript[];
  baseplateEnabled?: boolean;
  baseplateColor?: string;
  baseplateSize?: [number, number];
  iconUrl?: string;
  thumbnailUrl?: string;
}

export const EXPERIENCES_STORAGE_KEY = 'boblox_experiences_v6_revamp';
export const CONTINUED_STORAGE_KEY = 'boblox_continued_game_ids_v1';

export const INITIAL_DEFAULT_EXPERIENCES: ExperienceData[] = [
  {
    id: 'exp-disaster-survival',
    name: 'Natural Disaster Survival',
    description: 'Survive flash floods, meteor showers, tornadoes, and acid rain on the iconic green island tower!',
    creatorId: 'user-stickmasterluke',
    creatorUsername: 'Stickmasterluke',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 120,
    lastUpdated: Date.now() - 1000 * 60 * 60 * 2,
    published: true,
    visits: 1420500,
    likes: 48200,
    dislikes: 2100,
    favorites: 31000,
    baseplateEnabled: true,
    baseplateColor: '#2b7a3e',
    baseplateSize: [120, 120],
    parts: [
      // Central multi-tier disaster tower
      {
        id: 'tower-base',
        name: 'Tower Base',
        shape: 'block',
        position: [0, 4, 0],
        size: [16, 8, 16],
        rotation: [0, 0, 0],
        color: '#dc2626',
        material: 'Brick',
        transparency: 0,
        reflectance: 0.1,
        anchored: true,
        canCollide: true,
      },
      {
        id: 'tower-mid',
        name: 'Tower Mid Level',
        shape: 'block',
        position: [0, 12, 0],
        size: [12, 8, 12],
        rotation: [0, 0, 0],
        color: '#f97316',
        material: 'SmoothPlastic',
        transparency: 0,
        reflectance: 0.2,
        anchored: true,
        canCollide: true,
      },
      {
        id: 'tower-top',
        name: 'Observation Roof',
        shape: 'block',
        position: [0, 18, 0],
        size: [16, 2, 16],
        rotation: [0, 0, 0],
        color: '#eab308',
        material: 'Neon',
        transparency: 0,
        reflectance: 0.5,
        anchored: true,
        canCollide: true,
      },
      {
        id: 'safety-ramp',
        name: 'Emergency Ramp',
        shape: 'wedge',
        position: [12, 2, 0],
        size: [8, 4, 6],
        rotation: [0, 180, 0],
        color: '#64748b',
        material: 'Metal',
        transparency: 0,
        reflectance: 0.3,
        anchored: true,
        canCollide: true,
      }
    ],
  },
  {
    id: 'exp-crossroads-2006',
    name: 'Crossroads 2006 (Classic)',
    description: 'The legendary classic 2006 arena. Castles, ramparts, silver watchtowers, and timeless sandbox physics.',
    creatorId: 'user-roblox-official',
    creatorUsername: 'ROBLOX',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 365,
    lastUpdated: Date.now() - 1000 * 60 * 60 * 5,
    published: true,
    visits: 890400,
    likes: 31400,
    dislikes: 720,
    favorites: 24500,
    baseplateEnabled: true,
    baseplateColor: '#3d7c47',
    baseplateSize: [140, 140],
    parts: [
      {
        id: 'castle-left',
        name: 'West Fort',
        shape: 'block',
        position: [-18, 5, 0],
        size: [10, 10, 14],
        rotation: [0, 0, 0],
        color: '#475569',
        material: 'Brick',
        transparency: 0,
        reflectance: 0,
        anchored: true,
        canCollide: true,
      },
      {
        id: 'castle-right',
        name: 'East Fort',
        shape: 'block',
        position: [18, 5, 0],
        size: [10, 10, 14],
        rotation: [0, 0, 0],
        color: '#475569',
        material: 'Brick',
        transparency: 0,
        reflectance: 0,
        anchored: true,
        canCollide: true,
      },
      {
        id: 'cross-bridge',
        name: 'Sky Bridge',
        shape: 'block',
        position: [0, 9, 0],
        size: [28, 1, 6],
        rotation: [0, 0, 0],
        color: '#94a3b8',
        material: 'Metal',
        transparency: 0,
        reflectance: 0.4,
        anchored: true,
        canCollide: true,
      }
    ],
  },
  {
    id: 'exp-blox-fruits',
    name: 'Blox Fruits Arena',
    description: 'Train your combat prowess, search for enchanted elemental fruit powers, and rule the high seas!',
    creatorId: 'user-gamerrobot',
    creatorUsername: 'GamerRobot',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 90,
    lastUpdated: Date.now() - 1000 * 60 * 60 * 1,
    published: true,
    visits: 3820000,
    likes: 94500,
    dislikes: 3200,
    favorites: 78000,
    baseplateEnabled: true,
    baseplateColor: '#1e3a8a',
    baseplateSize: [150, 150],
    parts: [
      {
        id: 'pirate-island',
        name: 'Sand Island',
        shape: 'cylinder',
        position: [0, 1, 0],
        size: [50, 2, 50],
        rotation: [0, 0, 0],
        color: '#d4a373',
        material: 'SmoothPlastic',
        transparency: 0,
        reflectance: 0.1,
        anchored: true,
        canCollide: true,
      },
      {
        id: 'dojo-temple',
        name: 'Fruit Dojo',
        shape: 'block',
        position: [0, 6, 0],
        size: [16, 8, 16],
        rotation: [0, 45, 0],
        color: '#7f1d1d',
        material: 'Wood',
        transparency: 0,
        reflectance: 0.1,
        anchored: true,
        canCollide: true,
      }
    ],
  },
  {
    id: 'exp-brookhaven',
    name: 'Brookhaven City RP',
    description: 'A place to hang out with friends, customize modern homes, drive cool rides, and explore the city!',
    creatorId: 'user-wolfpaq',
    creatorUsername: 'Wolfpaq',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 180,
    lastUpdated: Date.now() - 1000 * 60 * 60 * 4,
    published: true,
    visits: 5120000,
    likes: 87000,
    dislikes: 4100,
    favorites: 89000,
    baseplateEnabled: true,
    baseplateColor: '#1e293b',
    baseplateSize: [160, 160],
    parts: [
      {
        id: 'city-park',
        name: 'Town Square Green',
        shape: 'block',
        position: [0, 0.5, 0],
        size: [40, 1, 40],
        rotation: [0, 0, 0],
        color: '#15803d',
        material: 'SmoothPlastic',
        transparency: 0,
        reflectance: 0.1,
        anchored: true,
        canCollide: true,
      },
      {
        id: 'city-hall',
        name: 'Modern Townhouse',
        shape: 'block',
        position: [0, 7, -25],
        size: [24, 12, 18],
        rotation: [0, 0, 0],
        color: '#f8fafc',
        material: 'SmoothPlastic',
        transparency: 0,
        reflectance: 0.3,
        anchored: true,
        canCollide: true,
      }
    ],
  },
  {
    id: 'exp-speedrun-4',
    name: 'Speed Run 4: Neon Dimension',
    description: 'Race through neon obstacle dimensions at supersonic speeds. Timed jumps, neon ramps, and sound effects!',
    creatorId: 'user-vurse',
    creatorUsername: 'Vurse',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 45,
    lastUpdated: Date.now() - 1000 * 60 * 60 * 8,
    published: true,
    visits: 950000,
    likes: 29800,
    dislikes: 1400,
    favorites: 18200,
    baseplateEnabled: true,
    baseplateColor: '#0a0a0f',
    baseplateSize: [180, 80],
    parts: [
      {
        id: 'runway-1',
        name: 'Neon Track 1',
        shape: 'block',
        position: [0, 1, 0],
        size: [120, 1, 10],
        rotation: [0, 0, 0],
        color: '#a855f7',
        material: 'Neon',
        transparency: 0,
        reflectance: 0.8,
        anchored: true,
        canCollide: true,
      },
      {
        id: 'boost-pad',
        name: 'Hyper Boost Pad',
        shape: 'block',
        position: [30, 1.2, 0],
        size: [10, 0.4, 8],
        rotation: [0, 0, 0],
        color: '#06b6d4',
        material: 'Neon',
        transparency: 0,
        reflectance: 1,
        anchored: true,
        canCollide: true,
      }
    ],
  },
  {
    id: 'exp-tower-of-hell',
    name: 'Tower of Hell',
    description: 'Climb a randomly generated obstacle tower with zero checkpoints before the timer expires!',
    creatorId: 'user-yxceptional',
    creatorUsername: 'YXCeptional',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 60,
    lastUpdated: Date.now() - 1000 * 60 * 60 * 12,
    published: true,
    visits: 2710000,
    likes: 62300,
    dislikes: 4800,
    favorites: 42000,
    baseplateEnabled: true,
    baseplateColor: '#0f172a',
    baseplateSize: [100, 100],
    parts: [
      {
        id: 'obstacle-section-1',
        name: 'Magenta Spinning Beam',
        shape: 'cylinder',
        position: [0, 5, 0],
        size: [24, 2, 2],
        rotation: [0, 30, 90],
        color: '#d946ef',
        material: 'Neon',
        transparency: 0,
        reflectance: 0.6,
        anchored: true,
        canCollide: true,
      },
      {
        id: 'obstacle-section-2',
        name: 'Cyan Stepping Block',
        shape: 'block',
        position: [8, 10, 0],
        size: [4, 1, 4],
        rotation: [0, 0, 0],
        color: '#06b6d4',
        material: 'Neon',
        transparency: 0,
        reflectance: 0.5,
        anchored: true,
        canCollide: true,
      }
    ],
  }
];

export function getSavedExperiences(): ExperienceData[] {
  try {
    const raw = localStorage.getItem(EXPERIENCES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge with defaults to ensure catalog is always rich and user creations are preserved at top
        const existingIds = new Set(parsed.map((p: any) => p.id));
        const merged = [...parsed];
        INITIAL_DEFAULT_EXPERIENCES.forEach((def) => {
          if (!existingIds.has(def.id)) {
            merged.push(def);
          }
        });
        return merged;
      }
    }
  } catch (e) {
    console.error('Failed to load experiences:', e);
  }
  return INITIAL_DEFAULT_EXPERIENCES;
}

export function getContinuedGameIds(): string[] {
  try {
    const raw = localStorage.getItem(CONTINUED_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    // ignore
  }
  // Default continue games if user is new
  return ['exp-disaster-survival', 'exp-crossroads-2006', 'exp-speedrun-4'];
}

export function recordContinuedGame(experienceId: string) {
  try {
    const current = getContinuedGameIds();
    const updated = [experienceId, ...current.filter((id) => id !== experienceId)].slice(0, 10);
    localStorage.setItem(CONTINUED_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    // ignore
  }
}

export function resetAllSavedExperiences(): ExperienceData[] {
  try {
    localStorage.setItem(EXPERIENCES_STORAGE_KEY, JSON.stringify(INITIAL_DEFAULT_EXPERIENCES));
  } catch (e) {
    console.error('Failed to reset experiences:', e);
  }
  return INITIAL_DEFAULT_EXPERIENCES;
}

export function saveExperiences(experiences: ExperienceData[]) {
  try {
    localStorage.setItem(EXPERIENCES_STORAGE_KEY, JSON.stringify(experiences));
  } catch (e) {
    console.error('Failed to save experiences:', e);
  }
}

export function calculateRatingPercentage(likes: number, dislikes: number): number {
  const total = (likes || 0) + (dislikes || 0);
  if (total === 0) return 96; // fallback optimistic default
  return Math.round(((likes || 0) / total) * 100);
}

export function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
