import {
  Camera,
  Car,
  Coffee,
  Footprints,
  Heart,
  Home,
  Landmark,
  Leaf,
  MapPin,
  Moon,
  Music2,
  Palette,
  ShoppingBag,
  Shuffle,
  Soup,
  Train,
  User,
  Users,
} from 'lucide-vue-next'

export const interestOptions = [
  { id: 'cafe',     icon: Coffee,      color: '#c97000', labelKey: 'ai.interest.cafe' },
  { id: 'food',     icon: Soup,        color: '#f97316', labelKey: 'ai.interest.food' },
  { id: 'history',  icon: Landmark,    color: '#a16207', labelKey: 'ai.interest.history' },
  { id: 'nature',   icon: Leaf,        color: '#16a34a', labelKey: 'ai.interest.nature' },
  { id: 'art',      icon: Palette,     color: '#db2777', labelKey: 'ai.interest.art' },
  { id: 'kpop',     icon: Music2,      color: '#7c3aed', labelKey: 'ai.interest.kpop' },
  { id: 'shopping', icon: ShoppingBag, color: '#0ea5e9', labelKey: 'ai.interest.shopping' },
  { id: 'activity', icon: Footprints,  color: '#ea580c', labelKey: 'ai.interest.activity' },
  { id: 'healing',  icon: Heart,       color: '#ef4444', labelKey: 'ai.interest.healing' },
  { id: 'night',    icon: Moon,        color: '#2563eb', labelKey: 'ai.interest.night' },
  { id: 'photo',    icon: Camera,      color: '#0891b2', labelKey: 'ai.interest.photo' },
  { id: 'local',    icon: MapPin,      color: '#0d9488', labelKey: 'ai.interest.local' },
]

export const relationshipOptions = [
  { id: '혼자', icon: User,  color: '#0ea5e9', labelKey: 'ai.relationship.alone' },
  { id: '친구', icon: Users, color: '#6366f1', labelKey: 'ai.relationship.friends' },
  { id: '가족', icon: Home,  color: '#16a34a', labelKey: 'ai.relationship.family' },
  { id: '연인', icon: Heart, color: '#e11d48', labelKey: 'ai.relationship.couple' },
]

export const mobilityOptions = [
  { id: 'public', icon: Train,   color: '#0284c7', labelKey: 'ai.mobility.public' },
  { id: 'rental', icon: Car,     color: '#f97316', labelKey: 'ai.mobility.rental' },
  { id: 'hybrid', icon: Shuffle, color: '#7c3aed', labelKey: 'ai.mobility.hybrid' },
]

export const personaOptions = [
  {
    id: 'main100',
    labelKey: 'ai.persona.main100',
    descriptionKey: 'ai.persona.main100Desc',
    localDensity: 0,
  },
  {
    id: 'main70',
    labelKey: 'ai.persona.main70',
    descriptionKey: 'ai.persona.main70Desc',
    localDensity: 25,
  },
  {
    id: 'balanced',
    labelKey: 'ai.persona.balanced',
    descriptionKey: 'ai.persona.balancedDesc',
    localDensity: 50,
  },
  {
    id: 'local70',
    labelKey: 'ai.persona.local70',
    descriptionKey: 'ai.persona.local70Desc',
    localDensity: 75,
  },
  {
    id: 'local100',
    labelKey: 'ai.persona.local100',
    descriptionKey: 'ai.persona.local100Desc',
    localDensity: 100,
  },
]
