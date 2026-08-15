import { Product } from '../types';

/** "Zalmi Cola PET 300ml" — full label for menus, tables, print documents. */
export function variantName(p: Product): string {
  if (!p.family) return `${p.packaging} ${p.size}`;
  return `${p.family.brand} ${p.family.name} ${p.packaging} ${p.size}`;
}

/** "Cola PET 300ml" — compact label for tight chart/kanban/select spaces. */
export function variantShortName(p: Product): string {
  if (!p.family) return `${p.packaging} ${p.size}`;
  return `${p.family.name} ${p.packaging} ${p.size}`;
}
