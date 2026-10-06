import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ConnectivityService } from '../../core/services/connectivity-service';
import { OutboxService } from '../../core/services/outbox-service';
import { SettingsService } from '../../core/services/settings-service';
import { AuthService } from '../../core/services/auth-service';
import { ConfigCacheService } from '../../core/services/config-cache-service';
import Swal from 'sweetalert2';
import { IssueType } from '../../core/models/issue-type.model';

@Component({
  selector: 'app-offline-banner',
  imports: [DatePipe],
  templateUrl: './offline-banner.html',
  styleUrl: './offline-banner.scss',
})
export class OfflineBanner {
  connectivity = inject(ConnectivityService);
  outbox = inject(OutboxService);
  settings = inject(SettingsService);
  private auth = inject(AuthService);
  private cache = inject(ConfigCacheService);

  constructor() {
    this.settings.load();
    this.connectivity.backOnline$.subscribe(() => this.settings.load());
    this.outbox.synced$.subscribe((n) =>
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        showConfirmButton: false,
        timer: 3500,
        title: `${n} offline ticket(s) sent to IT`,
      }),
    );
  }

  smsLink(phone: string): string {
    const body = encodeURIComponent(
      `InfoDesk: I have no internet at my desk. - ${this.auth.currentUser()?.name ?? ''}`,
    );
    return `sms:${phone}?body=${body}`;
  }

  async reportNetworkProblem() {
    const result = await Swal.fire({
      title: 'Report network problem',
      input: 'tel',
      inputLabel: 'Your phone number (so IT can call you)',
      inputPlaceholder: '10 digits',
      inputValidator: (v) => (/^\d{10}$/.test(v) ? undefined : 'Enter a valid 10-digit number'),
      showCancelButton: true,
      confirmButtonColor: '#0ea5e9',
    });
    if (!result.isConfirmed) return;

    const types = this.cache.read<IssueType[]>('issueTypes') ?? [];
    const network = types.find((t) => /network/i.test(t.name)) ?? types[0];
    if (!network) {
      Swal.fire({
        icon: 'warning',
        title: 'Not available yet',
        text: 'Open the Raise Ticket page once while online so this works offline.',
      });
      return;
    }
    await this.outbox.enqueue(
      {
        title: 'No network / internet access',
        description: `Reported from the offline screen at ${new Date().toLocaleString()}.\nDevice: ${navigator.userAgent}`,
        issueTypeId: network.id,
        priority: 'high',
        phoneNumber: result.value,
        quickReport: true, // skips the bot and required custom fields on the server
      },
      [],
    );
    Swal.fire({
      icon: 'success',
      title: 'Report saved',
      text: 'It reaches IT automatically when your connection returns. If it is urgent, use Call IT.',
    });
  }
}
