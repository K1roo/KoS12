import {IsNotEmpty, IsString, IsObject} from 'class-validator';

export class PostExtGameEventFilterDto {
  @IsNotEmpty()
  @IsString()
  public type!: string;

  @IsNotEmpty()
  @IsObject()
  public data!: object;
}
