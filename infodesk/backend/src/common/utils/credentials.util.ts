export function generateEmployeePassword(employeeCode: string): string {
    return `Infomap@${employeeCode}`
}

export function generateAdminPassword(): string{
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pass = ''
    for(let i=0; i<10; i++){
        pass += chars[Math.floor(Math.random() * chars.length)]
    }
    return pass
}

export function parseEmployeeLoginIndentifier(identitfer: string): string | null {
    const match = identitfer.match(/^info\/(\d{4})$/i);
    return match ? match[1] : null;
}