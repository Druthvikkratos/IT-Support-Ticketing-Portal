import { TestBed } from '@angular/core/testing';

import { IdleSession } from './idle-session';

describe('IdleSession', () => {
  let service: IdleSession;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IdleSession);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
