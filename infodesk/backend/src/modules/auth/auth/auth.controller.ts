import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import express from 'express';
import { LoginDto } from 'src/modules/users/dto/login.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService){}


    @Post('login')
    @HttpCode(200)
    async login(@Body() dto: LoginDto,  @Res({passthrough: true}) res: express.Response){
        const {token, user} = await this.authService.login(dto.identifier, dto.password)
        res.cookie('access_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000,
        })
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            employeeCode: user.employeeCode
        }
    }

    @Post('logout')
    @HttpCode(200)
    logout(@Res({passthrough: true}) res: express.Response){
        res.clearCookie('access_token')
        return {message: 'Logged out'}
    }

}
