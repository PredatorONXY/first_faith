import type { StaticImageData } from 'next/image';
import clayMaskOfferImg from '../img/offer_img/Clay Mask and Cleanser 1+1 Offer.png';
import bodyButterOfferImg from '../img/offer_img/1+1 Body Butter and Serum Offer.png';
import sunscreenOfferImg from '../img/offer_img/1+1 Skincare Duo_ Sunscreen & Cleanser.png';

export interface PromotionOfferInfo {
  buySlug: string;
  buyName: string;
  freeSlug: string;
  freeName: string;
  note: string;
  pairImage?: StaticImageData;
}

export const PROMOTION_OFFERS: Record<string, PromotionOfferInfo> = {
  'clay-mask': {
    buySlug: 'clay-mask',
    buyName: 'Clay Mask',
    freeSlug: 'cleanser',
    freeName: 'Cleanser',
    note: 'Buy Clay Mask · Get Cleanser FREE',
    pairImage: clayMaskOfferImg,
  },
  'body-butter': {
    buySlug: 'body-butter',
    buyName: 'Body Butter',
    freeSlug: 'serum',
    freeName: 'Serum',
    note: 'Buy Body Butter · Get Serum FREE',
    pairImage: bodyButterOfferImg,
  },
  'sunscreen': {
    buySlug: 'sunscreen',
    buyName: 'Sunscreen',
    freeSlug: 'cleanser',
    freeName: 'Cleanser',
    note: 'Buy Sunscreen · Get Cleanser FREE',
    pairImage: sunscreenOfferImg,
  },
};

export function getProductPromotionOffer(slug?: string): PromotionOfferInfo | null {
  if (!slug) return null;
  return PROMOTION_OFFERS[slug] ?? null;
}
