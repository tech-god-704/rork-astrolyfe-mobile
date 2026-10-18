import { Heart, Briefcase, Home, Sparkles, Flame } from 'lucide-react-native';
import Colors from '@/constants/colors';
import type { PlacePlanet, Theme } from '@/services/places';

/** Colour and icon for each life area, shared by every Places surface. */
export const THEME_STYLE: Record<Theme, { color: string; Icon: typeof Heart }> = {
  love: { color: Colors.accent, Icon: Heart },
  career: { color: Colors.purpleLight, Icon: Briefcase },
  home: { color: Colors.teal, Icon: Home },
  luck: { color: Colors.success, Icon: Sparkles },
  drive: { color: Colors.nebulaMagenta, Icon: Flame },
};

export const PLANET_THEME: Record<PlacePlanet, Theme> = {
  Venus: 'love',
  Sun: 'career',
  Moon: 'home',
  Jupiter: 'luck',
  Mars: 'drive',
};

/** Short life-area names for tags and share messages. */
export const THEME_LABEL_BY_PLANET: Record<PlacePlanet, string> = {
  Venus: 'Love',
  Sun: 'Career',
  Moon: 'Home',
  Jupiter: 'Luck',
  Mars: 'Drive',
};
