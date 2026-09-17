import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RaiseTicket } from './raise-ticket';

describe('RaiseTicket', () => {
  let component: RaiseTicket;
  let fixture: ComponentFixture<RaiseTicket>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RaiseTicket],
    }).compileComponents();

    fixture = TestBed.createComponent(RaiseTicket);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
