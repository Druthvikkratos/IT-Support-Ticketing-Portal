import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { Observable } from "rxjs";

@Injectable()
export class RolesGaurd implements CanActivate{
    constructor(private reflector: Reflector){}

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const requiredRole =  this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ])
        if(!requiredRole) return true;

        const {user} = context.switchToHttp().getRequest()
        if(!requiredRole.includes(user?.role)){
            throw new ForbiddenException('You do not have access to this resource')
        }
        return true;

    }
}