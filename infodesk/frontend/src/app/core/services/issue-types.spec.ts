import { TestBed } from '@angular/core/testing';

import { IssueTypes } from './issue-types';

describe('IssueTypes', () => {
  let service: IssueTypes;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IssueTypes);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
