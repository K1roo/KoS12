import {Transform} from 'class-transformer';
import {
  IsOptional,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsNumberString,
} from 'class-validator';

export class GetExtGameEventsFilterDto {
  @IsOptional()
  @IsNotEmpty()
  @IsNumberString()
  public summonerName!: string;

  @IsOptional()
  @IsNotEmpty()
  @Transform((value) => +value)
  @IsInt()
  @Min(0)
  public skip!: number;

  @IsOptional()
  @IsNotEmpty()
  @Transform((value) => +value)
  @IsInt()
  @Min(0)
  @Max(100)
  public limit!: number;
}
