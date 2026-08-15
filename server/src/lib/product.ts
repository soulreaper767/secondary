export interface DisplayableVariant {
  packaging: string;
  size: string;
  skuCode: string;
  family: { name: string; brand: string };
}

/** "Zalmi Cola PET 300ml" style label for a SKU, built from its family + packaging + size. */
export function variantDisplayName(v: DisplayableVariant): string {
  return `${v.family.brand} ${v.family.name} ${v.packaging} ${v.size}`;
}

export function variantShortName(v: Pick<DisplayableVariant, 'packaging' | 'size' | 'family'>): string {
  return `${v.family.name} ${v.packaging} ${v.size}`;
}
