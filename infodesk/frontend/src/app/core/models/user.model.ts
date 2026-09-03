export enum Role {
    Admin = 'admin',
    Employee = 'employee'
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    employeeCode?: string;
    isActive: Boolean;
    createdAt: string;
    createdBy?: {id: string, name: string} | null
}

export interface CreateAdminPayload{
    name: string;
    email: string;
    password: string;
}

export interface CreateEmployeePayload{
    name: string;
    employeeCode: string;
    email: string
}