import { TestBed } from '@angular/core/testing';

import { ConfigCacheService } from './config-cache-service';

describe('ConfigCacheService', () => {
  let service: ConfigCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfigCacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
