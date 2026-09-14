import Image, { type StaticImageData } from 'next/image';

import alphaArbutinImage from '../../img/ingredients/Alpha Arbutin/JwaATOtgx5PS-8x86KCmvIQqd-2K6gNu8vlUedBMEtr6NcaQDzlaY5uEt9ZEZjJzvxb0fnaa-DtahtFqj7iTWo1xn1Zzij_tPy993FZt1-tRoJ91KUrDYf6Giwr4e825MQnn3p2Uzrg9c2VwSsCe-HD1_vRJIFS_meHVVmzyEVJedMeE2h798Ys3eDl9kegd.jpg';
import centellaAsiaticaImage from '../../img/ingredients/Centella Asiatica/7iV-9rmJ_EcD6PooEVY7qL3Zog1d-Pi_74t3IVPhqeVo8iyPmkDb5o1k5gjUvnEBIS62mci72guhKY9AfFp5G3ixNONCnLbLbcRQ6u4bzs-sFOBaQQ8ENe5DPIUuEmp3FcGdtBZPATei7szJ4o5Zil9baO2FHBP_QhKDwUSaxFP8IkIllo3LCVXoyzlyeRZQ.jpg';
import hyaluronicAcidImage from '../../img/ingredients/Hyaluronic Acid/ehu72YvT0dRTgg9NrhH1G9HMVNbsCAQWWGn0240X4Hp-O8KP9GXiwU5PlE-M1tPZoolrp3c0sDbCVJEYkDwKIttMONFlVaU7B9n9XTi9rHM-keiCdfEaRQ9mH4B90mkVgqFfTEGyNouC21GosSs01XCCXBF_NbMR40QxGfzxdMQHrVazgZyiqJPJmwj7zEGu.jpg';
import moroccanLavaClayImage from '../../img/ingredients/Moroccan Lava Clay/_jwhhPeFMVLn4PwdspClhJj5l52ixk6-rDHrLUvfniL8ixTdwI9KiUfu_ynQSOHLF9XLzoQO5V8HAz5wv1Q9DSASPiE1lTHtfqrPL7IOochf-u4o2JeDGoq0pTVOtk01jdx2gAblxXTitWpTbGoUG0Ilv-U1aEE4zLyAzkz4-38ZMSv3v-ErKbeEA2d-RuyD.jpg';
import niacinamideImage from '../../img/ingredients/Niacinamide/t5oup-dtmqSDS4ZiFFugYai2xeQNISBVoavC2iNe5VyqGGgXmtm3puf2XcjVr-J3qEmXwBDdTLfW8ScHdv2XR8TI_Mhx3uykrDb8yMLv21jBBDLHUl9i5a-1z_4o6G7CnTzfGGwnzifXo3fP8XutzkAb5cKS-ZRWboJC6lPtPAl8oAA0Re5HMb6_p_39Oben.jpg';
import oatKernelImage from '../../img/ingredients/Oat Kernel/ESxxr1UDzZxpK4YXueP59iOg5vxfm47uZIyDSvhRznL6b2hbMSYaLHCHs7Ai8qFQK0_p-X03WOh8PpalLiDbMAQvsnJh6OPROmNxCQI9KOMKFbgSABNoI0-kTrwVHwLlAVeZlVlLDkxMXUcffcG7GjWoN-owh2E9v9N95l2N2SA18ICMJN01ycwrerqFUbxX.jpg';
import riceWaterImage from '../../img/ingredients/Rice Water/3XnSGAL8lTDQvj7PmeqT7GLLWf3iiSyh1tUBR6uDomRttFtuBWh5Ml7xw0Z4PNgzLqdrgWTayQafgiv-n-UrG3hS-w4A50VlksZBr-Bfb1YhPLzlLEwIodYWO8Y2jm6ZzxH6z4FmfmvYNnB7qCAz-KJHKHs9ouGg3SaUwsZO5V2aqphUAV9NnSb04NANp-oZ.jpg';
import sheaButterImage from '../../img/ingredients/Shea Butter/0KQOWfIX6kseYPPDHTDFfZBYAghwTW8Z_07k2wFg-Pauv2dv8R0XRr537jbxxIreLDwl2otZ2HmyFpxPhkrWguOwqkFX5y5pXVag8tv7aY_RztEyiqTEtrEBsBzZfJHHgc8ddLfpm7vhi_1O0gwYd5v5AE9xCOzyAz526o9YIEsOnL083RfGYGPumlhWOUwT.jpg';
import snailMucinImage from '../../img/ingredients/Snail Mucin/8DTjBzI_3qm0L9aEOEGEgaVjuu9_bOkT3dZas8v9Z-VW-iPaR4uTzcTvWzRUB4LsxZ763zVkwpNXQvcUBHEAEooBrY-__RXBbktgRNhUROSIw5R2Y_rdB0WXMC0lTi8ZBwNjOAFVhT3c6c3Oq6LhLlnuMp3oHYAqdMjljjD_STz2nIkXlvyFtRD1QsvRILZz.jpg';
import vitaminB5Image from '../../img/ingredients/Vitamin B5/14Twyj5Sbu75r55pAY2i_0XMH7poaIxGRyF-dzPA9Ywyfrz-Yp3KgAlLWBJypidHVfqMY3grxbpto0c1gFR5e4k-zfXhlvwbxivfhn2a2dChU8xNHlrJLqF7g4vAJCCEAEFwoAQ6Mo3NJkYprRASjQ1Utkht4NVxcIh0gMsD8Jw24gUgJkPMmQ1SdrqzcLYF.jpg';

const ingredientVisuals: Record<string, StaticImageData> = {
  'Alpha Arbutin': alphaArbutinImage,
  'Centella Asiatica': centellaAsiaticaImage,
  'Hyaluronic Acid': hyaluronicAcidImage,
  'Moroccan Lava Clay': moroccanLavaClayImage,
  Niacinamide: niacinamideImage,
  'Oat Kernel': oatKernelImage,
  'Oat Kernel Extract': oatKernelImage,
  'Rice Water': riceWaterImage,
  'Shea Butter': sheaButterImage,
  'Snail Mucin': snailMucinImage,
  'Vitamin B5': vitaminB5Image,
};

function BotanicalDropIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      <path d="M12 12a3 3 0 0 0 3-3" />
    </svg>
  );
}

export function HeroIngredientCards({ ingredients }: { ingredients: string[] }) {
  if (!ingredients.length) return null;

  return (
    <section className="hero-ingredients" aria-labelledby="hero-ingredients-title">
      <h2 id="hero-ingredients-title" className="hero-ingredients-title">Hero ingredients</h2>
      <div className="hero-ingredient-list">
        {ingredients.map((name) => {
          const image = ingredientVisuals[name];
          return (
            <div key={name} className="hero-ingredient-card">
              {image ? (
                <div className="hero-ingredient-image">
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="32px"
                    quality={75}
                    className="hero-ingredient-image-element"
                  />
                </div>
              ) : (
                <div className="hero-ingredient-fallback" aria-hidden="true">
                  <BotanicalDropIcon />
                </div>
              )}
              <span className="hero-ingredient-name">{name}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
