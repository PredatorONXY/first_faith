import type { StaticImageData } from 'next/image';

import clayMask1 from '../img/clay-mask/file_000000000cfc81faaa4fb24d0818dba7.png';
import clayMask2 from '../img/clay-mask/file_00000000882481fa9ac0bd71e7b40ccd.png';
import clayMask3 from '../img/clay-mask/file_00000000ad1c81fa91fa0f6640e2607a.png';

import cleanser1 from '../img/cleanser/file_00000000a4fc81f5981362318c725093.png';
import cleanser2 from '../img/cleanser/file_00000000fee082309ca3edddf5f788d1.png';

import sunscreen1 from '../img/sunscreen/file_0000000054dc81faa00d5eb3021bb983.png';
import sunscreen2 from '../img/sunscreen/file_00000000a790820b9f28e1722a5365ca.png';

import serum1 from '../img/serum/file_00000000137c81f59e191cf3e737c3c9.png';
import serum2 from '../img/serum/file_0000000026f481fab3fffcf642a92a67.png';

import bodyButter1 from '../img/body-butter/file_000000003f9882078f076376e1a361c4.png';
import bodyButter2 from '../img/body-butter/file_0000000045a8820980dbf60dd9058138.png';
import bodyButter3 from '../img/body-butter/file_00000000799c81fab19d8a26acc343ab.png';
import bodyButter4 from '../img/body-butter/file_0000000099d0820b9152ddee12d42075.png';
import bodyButter5 from '../img/body-butter/file_00000000eacc820ba2ee64f56d5dac2a.png';

export type ProductGalleryImage = {
  src: string | StaticImageData;
  alt: string;
};

export const productImageMap: Record<string, ProductGalleryImage[]> = {
  'clay-mask': [
    { src: clayMask1, alt: 'First Faith Clay Mask' },
    { src: clayMask2, alt: 'First Faith Clay Mask detail' },
    { src: clayMask3, alt: 'First Faith Clay Mask usage' },
  ],
  cleanser: [
    { src: cleanser1, alt: 'First Faith Cleanser' },
    { src: cleanser2, alt: 'First Faith Cleanser detail' },
  ],
  sunscreen: [
    { src: sunscreen1, alt: 'First Faith Sunscreen' },
    { src: sunscreen2, alt: 'First Faith Sunscreen detail' },
  ],
  serum: [
    { src: serum1, alt: 'First Faith Serum' },
    { src: serum2, alt: 'First Faith Serum detail' },
  ],
  'body-butter': [
    { src: bodyButter1, alt: 'First Faith Body Butter' },
    { src: bodyButter2, alt: 'First Faith Body Butter detail' },
    { src: bodyButter3, alt: 'First Faith Body Butter close-up' },
    { src: bodyButter4, alt: 'First Faith Body Butter texture' },
    { src: bodyButter5, alt: 'First Faith Body Butter product photo' },
  ],
};

export function getProductGalleryImages(slug: string): ProductGalleryImage[] {
  return productImageMap[slug] ?? [];
}

export function getPrimaryProductImage(slug: string): ProductGalleryImage | null {
  const images = getProductGalleryImages(slug);
  return images[0] ?? null;
}
