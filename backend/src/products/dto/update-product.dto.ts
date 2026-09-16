import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  sizeLabel?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;
}
