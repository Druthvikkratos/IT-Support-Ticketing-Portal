import { IsOptional, IsString, Matches, MaxLength } from "class-validator";


export class UpdateSettingsDto {
    @IsOptional() @IsString() @Matches(/^[+0-9 ()-]{0,20}$/, { message: 'Enter a valid phone number' })
    itPhone?: string

    @IsOptional() @IsString() @MaxLength(300)
    incidentMessage?: string
}