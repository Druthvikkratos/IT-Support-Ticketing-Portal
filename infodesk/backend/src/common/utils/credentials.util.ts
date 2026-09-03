export function generateEmployeePassword(employeeCode: string): string {
    return `Infomap@${employeeCode}`
}

export function parseEmployeeLoginIndentifier(identitfer: string): string | null {
    const match = identitfer.match(/^info\/(\d{4})$/i);
    return match ? match[1] : null;
}