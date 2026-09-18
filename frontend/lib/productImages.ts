import type { StaticImageData } from 'next/image';

// Clay Mask Images
import clayMaskHero1 from '../img/clay-mask/ChatGPT Image Sep 18, 2026, 10_13_10 AM.png';
import clayMaskHero2 from '../img/clay-mask/ChatGPT Image Sep 18, 2026, 10_19_49 AM.png';
import clayMask1 from '../img/clay-mask/file_000000000cfc81faaa4fb24d0818dba7.png';
import clayMask2 from '../img/clay-mask/file_00000000882481fa9ac0bd71e7b40ccd.png';
import clayMask3 from '../img/clay-mask/file_00000000ad1c81fa91fa0f6640e2607a.png';

// Cleanser Images
import cleanserHero1 from '../img/cleanser/ChatGPT Image Sep 18, 2026, 10_11_04 AM.png';
import cleanserHero2 from '../img/cleanser/ChatGPT Image Sep 18, 2026, 10_11_55 AM.png';
import cleanser1 from '../img/cleanser/file_00000000a4fc81f5981362318c725093.png';
import cleanser2 from '../img/cleanser/file_00000000fee082309ca3edddf5f788d1.png';

// Sunscreen Images
import sunscreenHero1 from '../img/sunscreen/ChatGPT Image Sep 18, 2026, 10_05_59 AM.png';
import sunscreenHero2 from '../img/sunscreen/ChatGPT Image Sep 18, 2026, 10_07_16 AM.png';
import sunscreen1 from '../img/sunscreen/file_0000000054dc81faa00d5eb3021bb983.png';
import sunscreen2 from '../img/sunscreen/file_00000000a790820b9f28e1722a5365ca.png';

// Serum Images
import serumHero1 from '../img/serum/ChatGPT Image Sep 18, 2026, 10_08_23 AM.png';
import serumHero2 from '../img/serum/ChatGPT Image Sep 18, 2026, 10_09_30 AM.png';
import serum1 from '../img/serum/file_00000000137c81f59e191cf3e737c3c9.png';
import serum2 from '../img/serum/file_0000000026f481fab3fffcf642a92a67.png';

// Body Butter Images
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
    { src: clayMaskHero1, alt: 'First Faith Moroccan Lava Clay Mask' },
    { src: clayMaskHero2, alt: 'First Faith Clay Mask presentation' },
    { src: clayMask1, alt: 'First Faith Clay Mask texture' },
    { src: clayMask2, alt: 'First Faith Clay Mask detail' },
    { src: clayMask3, alt: 'First Faith Clay Mask packaging' },
  ],
  cleanser: [
    { src: cleanserHero1, alt: 'First Faith Daily Gentle Cleanser' },
    { src: cleanserHero2, alt: 'First Faith Cleanser bottle presentation' },
    { src: cleanser1, alt: 'First Faith Cleanser texture' },
    { src: cleanser2, alt: 'First Faith Cleanser detail' },
  ],
  sunscreen: [
    { src: sunscreenHero1, alt: 'First Faith Invisible Daily Sunscreen SPF 50' },
    { src: sunscreenHero2, alt: 'First Faith Sunscreen bottle presentation' },
    { src: sunscreen1, alt: 'First Faith Sunscreen application texture' },
    { src: sunscreen2, alt: 'First Faith Sunscreen packaging' },
  ],
  serum: [
    { src: serumHero1, alt: 'First Faith Radiance Face Serum' },
    { src: serumHero2, alt: 'First Faith Serum bottle presentation' },
    { src: serum1, alt: 'First Faith Serum pipette dropper detail' },
    { src: serum2, alt: 'First Faith Serum texture' },
  ],
  'body-butter': [
    { src: bodyButter1, alt: 'First Faith Whipped Shea Body Butter' },
    { src: bodyButter2, alt: 'First Faith Body Butter jar detail' },
    { src: bodyButter3, alt: 'First Faith Body Butter close-up' },
    { src: bodyButter4, alt: 'First Faith Body Butter rich texture' },
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
