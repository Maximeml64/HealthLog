// src/constants/menstrualLabels.ts

import type { BloodColor, BloodTexture, FlowIntensity, MenstrualSymptom } from '../types';

export const SYMPTOM_LABELS: Record<MenstrualSymptom, { label: string; icon: string }> = {
  cramps:            { label: 'Crampes',               icon: '⚡' },
  headache:          { label: 'Mal de tête',            icon: '🤕' },
  fatigue:           { label: 'Fatigue',                icon: '😴' },
  mood_swings:       { label: 'Humeur',                 icon: '😤' },
  bloating:          { label: 'Ballonnements',          icon: '🫃' },
  acne:              { label: 'Acné',                   icon: '✨' },
  breast_tenderness: { label: 'Sensibilité poitrine',   icon: '💗' },
  back_pain:         { label: 'Mal de dos',             icon: '🔙' },
  nausea:            { label: 'Nausées',                icon: '🤢' },
  food_cravings:     { label: 'Envies alimentaires',    icon: '🍫' },
  insomnia:          { label: 'Insomnie',               icon: '🌙' },
};

export const FLOW_LABELS: Record<FlowIntensity, string> = {
  light:  'Léger',
  medium: 'Moyen',
  heavy:  'Abondant',
};

export const BLOOD_COLOR_LABELS: Record<BloodColor, { label: string; hex: string; isWarning?: boolean }> = {
  pink:       { label: 'Rose clair',   hex: '#FFB6C1' },
  bright_red: { label: 'Rouge vif',    hex: '#DC143C' },
  dark_red:   { label: 'Rouge foncé',  hex: '#8B0000' },
  brown:      { label: 'Marron',       hex: '#6B3410' },
  black:      { label: 'Noir',         hex: '#2D1810' },
  orange:     { label: 'Orange',       hex: '#E67E22', isWarning: true },
  gray:       { label: 'Gris',         hex: '#7F8C8D', isWarning: true },
};

export const BLOOD_TEXTURE_LABELS: Record<BloodTexture, { label: string; description?: string }> = {
  fluid:       { label: 'Fluide' },
  small_clots: { label: 'Petits caillots' },
  large_clots: { label: 'Gros caillots',   description: 'À surveiller si fréquent' },
  watery:      { label: 'Aqueux',           description: 'Peut indiquer une carence' },
  mucousy:     { label: 'Muqueux' },
};
