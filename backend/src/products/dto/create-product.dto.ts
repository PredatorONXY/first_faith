import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsUUID,
} from 'class-validator';
import { ProductStatus, IngredientRole } from '@prisma/client';

class VariantInput {
  @IsString()
  sku!: string;

  @IsString()
  sizeLabel!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;
}

class IngredientLinkInput {
  @IsUUID()
  ingredientId!: string;

  @IsEnum(IngredientRole)
  role!: IngredientRole;
}

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  tagline?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  fullDescription?: string;

  @IsOptional()
  @IsString()
  howToUse?: string;

  @IsOptional()
  @IsString()
  suitableSkinTypes?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds!: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantInput)
  variants!: VariantInput[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientLinkInput)
  ingredients?: IngredientLinkInput[];
}
