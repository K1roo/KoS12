import {IsObject, IsOptional} from 'class-validator';

export class LoginTicketBodyDto {
  @IsOptional()
  @IsObject()
  public deviceMetadata?: unknown;
}
