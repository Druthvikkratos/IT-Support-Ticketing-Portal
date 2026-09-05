import { Transform, Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Min, min } from "class-validator";

export class FindIssueTypesQueryDto{
    @IsOptional() @IsString() search?: string

    @IsOptional()
    @Transform(({value}) => value === 'true' ? true : value === 'false' ? false : undefined)
    isActive?: boolean

    @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 10;

    @IsOptional() @IsIn(['name', 'createdAt']) sortField?: 'name' | 'createdAt';
    @IsOptional() @IsIn(['asc', 'desc']) sortDir?: 'asc' | 'desc';
}