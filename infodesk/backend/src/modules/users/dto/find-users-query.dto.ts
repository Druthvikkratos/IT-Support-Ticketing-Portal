import { Role } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

export class FindUserQueryDto{
    @IsOptional() @IsEnum(Role) role?: Role;

    @IsOptional()
    @Transform(({value}) => value === 'true' ? true : value === 'false' ? false : undefined)
    isActive?: Boolean;

    @IsOptional() @IsString() search?: string

    @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 10;
}