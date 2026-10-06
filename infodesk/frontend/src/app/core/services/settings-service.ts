import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { ConfigCacheService } from './config-cache-service';
import { SocketService } from './socket-service';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs';

export interface PublicSettings {
  itPhone: string,
  incidentMessage: string,
  incidentUpdatedAt: string | null
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private http = inject(HttpClient)
  private cache = inject(ConfigCacheService)
  private socket = inject(SocketService)
  
  settings = signal<PublicSettings>(this.cache.read<PublicSettings>('settings') ?? {itPhone: '', incidentMessage: '', incidentUpdatedAt: null})

  constructor(){
    this.socket.settingsChanged$.subscribe((s) => this.apply(s))
  }

  load(){
    this.http.get<PublicSettings>(`${environment.apiUrl}/settings/public`).subscribe({
      next: (s) => this.apply(s),
      error: () => {}
    })
  }

  update(dto: {itPhone?: string; incidentMessage?: string}){
    return this.http.put<PublicSettings>(`${environment.apiUrl}/settings`, dto).pipe(tap((s) => this.apply(s)))
  }

  private apply(s: PublicSettings){
    this.settings.set(s)
    this.cache.save('settings', s)
  }
}
