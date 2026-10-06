import { TestBed } from '@angular/core/testing';

import { OutboxService } from './outbox-service';

describe('OutboxService', () => {
  let service: OutboxService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OutboxService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
