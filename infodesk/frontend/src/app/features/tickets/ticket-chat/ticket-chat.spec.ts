import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketChat } from './ticket-chat';

describe('TicketChat', () => {
  let component: TicketChat;
  let fixture: ComponentFixture<TicketChat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketChat],
    }).compileComponents();

    fixture = TestBed.createComponent(TicketChat);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
